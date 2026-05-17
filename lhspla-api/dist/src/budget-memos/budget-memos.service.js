"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetMemosService = exports.CopReviewMemoDto = exports.CreateBudgetMemoDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const n8n_service_1 = require("../n8n/n8n.service");
const app_config_service_1 = require("../app-config/app-config.service");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateBudgetMemoDto {
    category;
    amount;
    content;
}
exports.CreateBudgetMemoDto = CreateBudgetMemoDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.MemoCategory),
    __metadata("design:type", String)
], CreateBudgetMemoDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateBudgetMemoDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBudgetMemoDto.prototype, "content", void 0);
class CopReviewMemoDto {
    decision;
    rejectionReason;
}
exports.CopReviewMemoDto = CopReviewMemoDto;
__decorate([
    (0, class_validator_1.IsEnum)(['approved', 'rejected']),
    __metadata("design:type", String)
], CopReviewMemoDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CopReviewMemoDto.prototype, "rejectionReason", void 0);
const VIEWER_ROLES = [
    client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.admin_finance,
    client_1.Role.admin_tpm, client_1.Role.chief_of_party, client_1.Role.assistant_direction, client_1.Role.chargee_tresorerie,
];
const FINANCE_ROLES = [client_1.Role.admin_finance, client_1.Role.super_admin];
const COP_ROLES = [client_1.Role.chief_of_party, client_1.Role.super_admin];
const MEMO_ALLOWED_ROLES = [
    client_1.Role.admin_finance, client_1.Role.chief_of_party, client_1.Role.super_admin, client_1.Role.admin_tpm, client_1.Role.entity_member,
];
const CATEGORY_LABELS = {
    rallonge_budgetaire: 'Rallonge budgétaire',
    reduction_budgetaire: 'Réduction budgétaire',
    sans_incidence: 'Sans incidence budgétaire',
};
let BudgetMemosService = class BudgetMemosService {
    prisma;
    notifications;
    n8n;
    appConfig;
    constructor(prisma, notifications, n8n, appConfig) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.n8n = n8n;
        this.appConfig = appConfig;
    }
    async assertMemoEnabled() {
        const map = await this.appConfig.getMap();
        if (map['memo_enabled'] !== 'true') {
            throw new common_1.BadRequestException('La gestion des MEMOs budgétaires est désactivée');
        }
    }
    async findByBudget(budgetId, userRoles, entityCode) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
        if (!budget)
            throw new common_1.NotFoundException('Budget introuvable');
        const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
        if (!isViewer && budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        const memos = await this.prisma.budgetMemo.findMany({
            where: { budgetId },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                reviewedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        const approved = memos.filter(m => m.status === 'approved');
        const rallonge = approved.filter(m => m.category === 'rallonge_budgetaire').reduce((s, m) => s + m.amount, 0);
        const reduction = approved.filter(m => m.category === 'reduction_budgetaire').reduce((s, m) => s + m.amount, 0);
        const effectiveTotal = budget.totalAmount + rallonge - reduction;
        return {
            memos,
            budget: { totalAmount: budget.totalAmount, effectiveTotal, rallonge, reduction },
        };
    }
    async create(budgetId, dto, file, userId, userRoles) {
        await this.assertMemoEnabled();
        if (!userRoles.some(r => MEMO_ALLOWED_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
        if (!budget)
            throw new common_1.NotFoundException('Budget introuvable');
        if (budget.status !== 'approved')
            throw new common_1.BadRequestException('Un MEMO ne peut être ajouté qu\'à un budget approuvé');
        let amount = 0;
        if (dto.category === 'rallonge_budgetaire' || dto.category === 'reduction_budgetaire') {
            const raw = dto.amount ?? 0;
            if (!raw || raw <= 0)
                throw new common_1.BadRequestException('Le montant est obligatoire et doit être > 0 pour ce type de MEMO');
            amount = raw;
        }
        const memo = await this.prisma.budgetMemo.create({
            data: {
                budgetId,
                category: dto.category,
                status: client_1.MemoStatus.pending_cop,
                amount,
                content: dto.content ?? null,
                filePath: file?.path ?? null,
                fileName: file?.originalname ?? null,
                fileType: file?.mimetype ?? null,
                createdById: userId,
            },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                reviewedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        await this.prisma.paymentAuditLog.create({
            data: {
                budgetId,
                userId,
                action: 'memo_created',
                detail: `MEMO "${CATEGORY_LABELS[dto.category]}" créé — montant: ${amount} FCFA (budget: ${budget.title}) — en attente COP`,
            },
        });
        const copUsers = await this.prisma.user.findMany({
            where: { roles: { has: client_1.Role.chief_of_party }, isActive: true },
            select: { id: true, phone: true, firstName: true },
        });
        for (const u of copUsers) {
            await this.notifications.createForUser(u.id, 'budget_memo_pending_cop', 'Nouveau MEMO à valider', `Un MEMO (${CATEGORY_LABELS[dto.category]}) a été ajouté au budget "${budget.title}" et attend votre approbation.`, { budgetId, memoId: memo.id });
            if (u.phone) {
                await this.n8n.onBudgetMemoAdded({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, category: CATEGORY_LABELS[dto.category] });
            }
        }
        const finTreasTargets = await this.prisma.user.findMany({
            where: { roles: { hasSome: [client_1.Role.admin_finance, client_1.Role.chargee_tresorerie] }, isActive: true },
            select: { id: true },
        });
        for (const u of finTreasTargets) {
            if (u.id === userId)
                continue;
            await this.notifications.createForUser(u.id, 'budget_memo_created', 'MEMO budgétaire créé', `Un MEMO (${CATEGORY_LABELS[dto.category]}) a été créé sur le budget "${budget.title}" — en attente d'approbation COP.`, { budgetId, memoId: memo.id });
        }
        return memo;
    }
    async copReview(id, dto, userId, userRoles) {
        await this.assertMemoEnabled();
        if (!userRoles.some(r => COP_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        const memo = await this.prisma.budgetMemo.findUnique({
            where: { id },
            include: { budget: true, createdBy: { select: { id: true, phone: true, firstName: true } } },
        });
        if (!memo)
            throw new common_1.NotFoundException();
        if (memo.status !== client_1.MemoStatus.pending_cop) {
            throw new common_1.BadRequestException('Ce MEMO n\'est pas en attente de validation COP');
        }
        if (dto.decision === 'rejected' && !dto.rejectionReason?.trim()) {
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        }
        const newStatus = dto.decision === 'approved' ? client_1.MemoStatus.approved : client_1.MemoStatus.rejected;
        const updated = await this.prisma.budgetMemo.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: dto.decision === 'rejected' ? dto.rejectionReason : null,
                reviewedAt: new Date(),
                reviewedById: userId,
            },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                reviewedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        await this.prisma.paymentAuditLog.create({
            data: {
                budgetId: memo.budgetId,
                userId,
                action: dto.decision === 'approved' ? 'memo_approved' : 'memo_rejected',
                detail: dto.decision === 'approved'
                    ? `MEMO "${CATEGORY_LABELS[memo.category]}" approuvé par le COP (budget: ${memo.budget.title})`
                    : `MEMO "${CATEGORY_LABELS[memo.category]}" rejeté par le COP. Motif : ${dto.rejectionReason} (budget: ${memo.budget.title})`,
            },
        });
        const initiator = memo.createdBy;
        if (initiator) {
            if (dto.decision === 'approved') {
                await this.notifications.createForUser(initiator.id, 'budget_memo_approved', 'MEMO approuvé', `Votre MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été approuvé par le COP.`, { budgetId: memo.budgetId, memoId: id });
                if (initiator.phone) {
                    await this.n8n.onBudgetMemoApproved({ phone: initiator.phone, firstName: initiator.firstName, budgetTitle: memo.budget.title, category: CATEGORY_LABELS[memo.category] });
                }
            }
            else {
                await this.notifications.createForUser(initiator.id, 'budget_memo_rejected', 'MEMO rejeté', `Votre MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été rejeté par le COP. Motif : ${dto.rejectionReason}`, { budgetId: memo.budgetId, memoId: id });
                if (initiator.phone) {
                    await this.n8n.onBudgetMemoRejected({ phone: initiator.phone, firstName: initiator.firstName, budgetTitle: memo.budget.title, category: CATEGORY_LABELS[memo.category], reason: dto.rejectionReason });
                }
            }
        }
        const finTreasTargets = await this.prisma.user.findMany({
            where: { roles: { hasSome: [client_1.Role.admin_finance, client_1.Role.chargee_tresorerie] }, isActive: true },
            select: { id: true },
        });
        for (const u of finTreasTargets) {
            await this.notifications.createForUser(u.id, dto.decision === 'approved' ? 'budget_memo_approved' : 'budget_memo_rejected', dto.decision === 'approved' ? 'MEMO approuvé' : 'MEMO rejeté', dto.decision === 'approved'
                ? `Le MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été approuvé par le COP.`
                : `Le MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été rejeté. Motif : ${dto.rejectionReason}`, { budgetId: memo.budgetId, memoId: id });
        }
        return updated;
    }
    async delete(id, userId, userRoles) {
        await this.assertMemoEnabled();
        if (!userRoles.some(r => FINANCE_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        const memo = await this.prisma.budgetMemo.findUnique({ where: { id }, include: { budget: true } });
        if (!memo)
            throw new common_1.NotFoundException();
        await this.prisma.paymentAuditLog.create({
            data: {
                budgetId: memo.budgetId,
                userId,
                action: 'memo_deleted',
                detail: `MEMO "${CATEGORY_LABELS[memo.category]}" [${memo.status}] supprimé (budget: ${memo.budget.title})`,
            },
        });
        await this.prisma.budgetMemo.delete({ where: { id } });
    }
    async downloadFile(id) {
        const memo = await this.prisma.budgetMemo.findUnique({ where: { id } });
        if (!memo || !memo.filePath)
            throw new common_1.NotFoundException('Fichier non disponible');
        return { filePath: memo.filePath, fileName: memo.fileName, fileType: memo.fileType };
    }
};
exports.BudgetMemosService = BudgetMemosService;
exports.BudgetMemosService = BudgetMemosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        n8n_service_1.N8nService,
        app_config_service_1.AppConfigService])
], BudgetMemosService);
//# sourceMappingURL=budget-memos.service.js.map