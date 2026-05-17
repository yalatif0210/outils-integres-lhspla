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
exports.BudgetProjectsService = exports.COPReviewBudgetDto = exports.ReviewBudgetDto = exports.FinanceReviewDto = exports.UpdateBudgetDto = exports.CreateBudgetDto = exports.BudgetLineDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const app_config_service_1 = require("../app-config/app-config.service");
const n8n_service_1 = require("../n8n/n8n.service");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class BudgetLineDto {
    rowKey;
    costItemId;
    designation;
    unitCost;
    quantity;
    frequency;
}
exports.BudgetLineDto = BudgetLineDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BudgetLineDto.prototype, "rowKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BudgetLineDto.prototype, "costItemId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BudgetLineDto.prototype, "designation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BudgetLineDto.prototype, "unitCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BudgetLineDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BudgetLineDto.prototype, "frequency", void 0);
class CreateBudgetDto {
    budgetType;
    title;
    fundId;
    activityReferenceId;
    exchangeRate;
    transferFeeRate;
    totalAmount;
    lines;
}
exports.CreateBudgetDto = CreateBudgetDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.BudgetType),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "budgetType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "fundId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "activityReferenceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "exchangeRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "transferFeeRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "totalAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BudgetLineDto),
    __metadata("design:type", Array)
], CreateBudgetDto.prototype, "lines", void 0);
class UpdateBudgetDto {
    title;
    fundId;
    activityReferenceId;
    exchangeRate;
    transferFeeRate;
    totalAmount;
    lines;
}
exports.UpdateBudgetDto = UpdateBudgetDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBudgetDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBudgetDto.prototype, "fundId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBudgetDto.prototype, "activityReferenceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateBudgetDto.prototype, "exchangeRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateBudgetDto.prototype, "transferFeeRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateBudgetDto.prototype, "totalAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BudgetLineDto),
    __metadata("design:type", Array)
], UpdateBudgetDto.prototype, "lines", void 0);
class FinanceReviewDto {
    decision;
    rejectionReason;
}
exports.FinanceReviewDto = FinanceReviewDto;
__decorate([
    (0, class_validator_1.IsEnum)(['finance_reviewed', 'rejected']),
    __metadata("design:type", String)
], FinanceReviewDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FinanceReviewDto.prototype, "rejectionReason", void 0);
class ReviewBudgetDto {
    decision;
    rejectionReason;
}
exports.ReviewBudgetDto = ReviewBudgetDto;
__decorate([
    (0, class_validator_1.IsEnum)(['tpm_approved', 'rejected']),
    __metadata("design:type", String)
], ReviewBudgetDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReviewBudgetDto.prototype, "rejectionReason", void 0);
class COPReviewBudgetDto {
    decision;
    rejectionReason;
}
exports.COPReviewBudgetDto = COPReviewBudgetDto;
__decorate([
    (0, class_validator_1.IsEnum)(['approved', 'rejected']),
    __metadata("design:type", String)
], COPReviewBudgetDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], COPReviewBudgetDto.prototype, "rejectionReason", void 0);
const VIEWER_ROLES = [client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.admin_finance, client_1.Role.admin_tpm, client_1.Role.chief_of_party, client_1.Role.assistant_direction, client_1.Role.chargee_tresorerie];
let BudgetProjectsService = class BudgetProjectsService {
    prisma;
    notifications;
    appConfig;
    n8n;
    constructor(prisma, notifications, appConfig, n8n) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.appConfig = appConfig;
        this.n8n = n8n;
    }
    async findAll(userRoles, entityCode, budgetNumber, createdAt) {
        const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
        const where = {};
        if (!isViewer) {
            if (!entityCode)
                throw new common_1.ForbiddenException();
            where.entityCode = entityCode;
        }
        if (budgetNumber) {
            where.budgetNumber = { contains: budgetNumber, mode: 'insensitive' };
        }
        if (createdAt) {
            const d = new Date(createdAt);
            where.createdAt = {
                gte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
                lte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
            };
        }
        const budgets = await this.prisma.budgetProject.findMany({
            where,
            include: {
                fund: { select: { id: true, name: true, code: true } },
                activityReference: { select: { id: true, title: true, activityCode: true } },
                _count: {
                    select: {
                        paymentRequests: { where: { status: 'uploaded' } },
                        recalls: { where: { status: 'open' } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (budgets.length === 0)
            return budgets;
        const budgetIds = budgets.map(b => b.id);
        const paidMap = {};
        try {
            const proofs = await this.prisma.paymentProof.findMany({
                where: { paymentRequest: { budgetId: { in: budgetIds } } },
                select: { amount: true, paymentRequest: { select: { budgetId: true } } },
            });
            for (const proof of proofs) {
                const bid = proof.paymentRequest.budgetId;
                paidMap[bid] = (paidMap[bid] ?? 0) + (proof.amount ?? 0);
            }
        }
        catch { }
        const memoMap = {};
        try {
            const memoRows = await this.prisma.budgetMemo.groupBy({
                by: ['budgetId', 'category', 'status'],
                where: { budgetId: { in: budgetIds } },
                _sum: { amount: true },
                _count: { id: true },
            });
            for (const row of memoRows) {
                if (!memoMap[row.budgetId])
                    memoMap[row.budgetId] = { rallonge: 0, reduction: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0 };
                if (row.status === 'approved') {
                    memoMap[row.budgetId].approvedCount += row._count.id;
                    if (row.category === 'rallonge_budgetaire')
                        memoMap[row.budgetId].rallonge += row._sum.amount ?? 0;
                    if (row.category === 'reduction_budgetaire')
                        memoMap[row.budgetId].reduction += row._sum.amount ?? 0;
                }
                else if (row.status === 'pending_cop') {
                    memoMap[row.budgetId].pendingCount += row._count.id;
                }
                else if (row.status === 'rejected') {
                    memoMap[row.budgetId].rejectedCount += row._count.id;
                }
            }
        }
        catch { }
        let memoEnabled = false;
        try {
            const cfg = await this.appConfig.getMap();
            memoEnabled = cfg['memo_enabled'] === 'true';
        }
        catch { }
        return budgets.map(b => {
            const totalPaid = paidMap[b.id] ?? 0;
            const memo = memoMap[b.id] ?? { rallonge: 0, reduction: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0 };
            const effectiveTotal = b.totalAmount + memo.rallonge - memo.reduction;
            const totalBudget = memoEnabled ? effectiveTotal : b.totalAmount;
            const isFullyPaid = b.status === 'approved' && totalBudget > 0 && totalPaid >= totalBudget;
            return {
                ...b,
                totalPaid,
                effectiveTotal,
                totalBudget,
                memoRallonge: memo.rallonge,
                memoReduction: memo.reduction,
                memoApprovedCount: memo.approvedCount,
                memoPendingCount: memo.pendingCount,
                memoRejectedCount: memo.rejectedCount,
                _count: { ...b._count, memos: memo.approvedCount + memo.pendingCount + memo.rejectedCount },
                isFullyPaid,
                resteAPayer: Math.max(0, totalBudget - totalPaid),
            };
        });
    }
    async findOne(id, userRoles, entityCode) {
        const budget = await this.prisma.budgetProject.findUnique({
            where: { id },
            include: {
                fund: { select: { id: true, name: true, code: true } },
                activityReference: { select: { id: true, title: true, activityCode: true, os: true, oo: true } },
                lines: { include: { costItem: { select: { id: true, nature: true, designation: true, justificatif: true } } }, orderBy: { rowKey: 'asc' } },
            },
        });
        if (!budget)
            throw new common_1.NotFoundException();
        const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
        if (!isViewer && budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        return budget;
    }
    async create(dto, entityCode) {
        const fund = await this.prisma.financingFund.findUnique({ where: { id: dto.fundId } });
        if (!fund || !fund.isActive)
            throw new common_1.BadRequestException('Fonds introuvable ou inactif');
        const exchangeRate = dto.exchangeRate ?? await this.getConfigRate('exchange_rate', 655);
        const transferFeeRate = dto.transferFeeRate ?? await this.getConfigRate('transfer_fee_rate', 0.05);
        const configMap = await this.appConfig.getMap();
        const fiscalYearTag = configMap['fiscal_year_tag'] ?? 'FY2026';
        return this.prisma.$transaction(async (tx) => {
            const count = await tx.budgetProject.count({ where: { budgetNumber: { not: null } } });
            const budgetNumber = `A${String(count + 1).padStart(3, '0')}${fiscalYearTag}`;
            return tx.budgetProject.create({
                data: {
                    entityCode,
                    budgetType: dto.budgetType,
                    title: dto.title,
                    fundId: dto.fundId,
                    activityReferenceId: dto.activityReferenceId ?? null,
                    exchangeRate,
                    transferFeeRate,
                    totalAmount: dto.totalAmount ?? 0,
                    budgetNumber,
                    lines: dto.lines?.length
                        ? {
                            createMany: {
                                data: dto.lines.map(l => ({
                                    rowKey: l.rowKey,
                                    costItemId: l.costItemId ?? null,
                                    designation: l.designation ?? '',
                                    unitCost: l.unitCost,
                                    quantity: l.quantity,
                                    frequency: l.frequency,
                                })),
                            },
                        }
                        : undefined,
                },
                include: {
                    fund: { select: { id: true, name: true, code: true } },
                    activityReference: { select: { id: true, title: true, activityCode: true } },
                    lines: true,
                },
            });
        });
    }
    async update(id, dto, userRoles, entityCode) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
        if (!budget)
            throw new common_1.NotFoundException();
        const isSuperAdmin = userRoles.includes(client_1.Role.super_admin);
        if (!isSuperAdmin && budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (budget.status !== client_1.BudgetStatus.draft && budget.status !== client_1.BudgetStatus.rejected) {
            throw new common_1.BadRequestException('Seuls les budgets en brouillon ou rejetés peuvent être modifiés');
        }
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.fundId !== undefined)
            data.fundId = dto.fundId;
        if (dto.activityReferenceId !== undefined)
            data.activityReferenceId = dto.activityReferenceId || null;
        if (dto.exchangeRate !== undefined)
            data.exchangeRate = dto.exchangeRate;
        if (dto.transferFeeRate !== undefined)
            data.transferFeeRate = dto.transferFeeRate;
        if (dto.totalAmount !== undefined)
            data.totalAmount = dto.totalAmount;
        if (dto.lines !== undefined) {
            await this.prisma.budgetLine.deleteMany({ where: { budgetId: id } });
            if (dto.lines.length) {
                await this.prisma.budgetLine.createMany({
                    data: dto.lines.map(l => ({
                        budgetId: id,
                        rowKey: l.rowKey,
                        costItemId: l.costItemId ?? null,
                        designation: l.designation ?? '',
                        unitCost: l.unitCost,
                        quantity: l.quantity,
                        frequency: l.frequency,
                    })),
                });
            }
        }
        return this.prisma.budgetProject.update({
            where: { id },
            data,
            include: {
                fund: { select: { id: true, name: true, code: true } },
                activityReference: { select: { id: true, title: true, activityCode: true } },
                lines: { include: { costItem: { select: { id: true, nature: true, designation: true, justificatif: true } } }, orderBy: { rowKey: 'asc' } },
            },
        });
    }
    async submit(id, entityCode, userRoles) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
        if (!budget)
            throw new common_1.NotFoundException();
        if (budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (budget.status !== client_1.BudgetStatus.draft && budget.status !== client_1.BudgetStatus.rejected) {
            throw new common_1.BadRequestException('Ce budget ne peut pas être soumis');
        }
        if (!budget.tdrFilePath) {
            throw new common_1.BadRequestException('Un TDR (Termes de Référence) est requis avant de soumettre ce budget');
        }
        const isAdminTpm = userRoles.includes(client_1.Role.admin_tpm) || userRoles.includes(client_1.Role.super_admin);
        const nextStatus = isAdminTpm ? client_1.BudgetStatus.tpm_approved : client_1.BudgetStatus.submitted;
        const updated = await this.prisma.budgetProject.update({
            where: { id },
            data: { status: nextStatus, submittedAt: new Date(), rejectionReason: null, rejectedAt: null },
        });
        await this.notifications.notifyBudgetSubmitted(budget.entityCode, budget.budgetType, budget.title, id);
        if (isAdminTpm) {
            const copPhones = await this.getRolePhones(client_1.Role.chief_of_party);
            for (const u of copPhones) {
                await this.n8n.onBudgetTpmApproved({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title });
            }
        }
        else {
            const financePhones = await this.getRolePhones(client_1.Role.admin_finance);
            for (const u of financePhones) {
                await this.n8n.onBudgetSubmitted({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, entityCode: budget.entityCode });
            }
        }
        return updated;
    }
    async financeReview(id, dto, financeUserId) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
        if (!budget)
            throw new common_1.NotFoundException();
        if (budget.status !== client_1.BudgetStatus.submitted) {
            throw new common_1.BadRequestException('Ce budget n\'est pas en attente de contrôle Finance');
        }
        if (dto.decision === 'rejected' && !dto.rejectionReason) {
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        }
        if (dto.decision === 'rejected') {
            await this.prisma.budgetProject.update({
                where: { id },
                data: {
                    status: client_1.BudgetStatus.draft,
                    financeReviewedAt: new Date(),
                    financeReviewedById: financeUserId,
                    rejectionReason: dto.rejectionReason ?? null,
                },
            });
            await this.notifications.notifyBudgetReturnedToDraft(budget.entityCode, budget.budgetType, budget.title, id, dto.rejectionReason, 'Finance');
            const ep = await this.getEntityPhone(budget.entityCode);
            if (ep)
                await this.n8n.onBudgetRejected({ phone: ep.phone, firstName: ep.firstName, budgetTitle: budget.title, reason: dto.rejectionReason });
        }
        else {
            await this.prisma.budgetProject.update({
                where: { id },
                data: { status: client_1.BudgetStatus.finance_reviewed, financeReviewedAt: new Date(), financeReviewedById: financeUserId },
            });
            await this.notifications.notifyBudgetTPMApproved(budget.entityCode, budget.budgetType, budget.title, id);
            const tpmPhones = await this.getRolePhones(client_1.Role.admin_tpm);
            for (const u of tpmPhones) {
                await this.n8n.onBudgetFinanceReviewed({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title });
            }
        }
        return this.findOne(id, [client_1.Role.admin_finance]);
    }
    async tpmReview(id, dto, tpmUserId) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
        if (!budget)
            throw new common_1.NotFoundException();
        if (budget.status !== client_1.BudgetStatus.finance_reviewed && budget.status !== client_1.BudgetStatus.tpm_approved) {
            throw new common_1.BadRequestException('Ce budget n\'est pas en attente de vérification TPM');
        }
        if (dto.decision === 'rejected' && !dto.rejectionReason) {
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        }
        if (dto.decision === 'rejected') {
            await this.prisma.budgetProject.update({
                where: { id },
                data: {
                    status: client_1.BudgetStatus.draft,
                    tpmReviewedAt: new Date(),
                    tpmReviewedById: tpmUserId,
                    rejectionReason: dto.rejectionReason ?? null,
                },
            });
            await this.notifications.notifyBudgetReturnedToDraft(budget.entityCode, budget.budgetType, budget.title, id, dto.rejectionReason, 'TPM');
            const ep = await this.getEntityPhone(budget.entityCode);
            if (ep)
                await this.n8n.onBudgetRejected({ phone: ep.phone, firstName: ep.firstName, budgetTitle: budget.title, reason: dto.rejectionReason });
        }
        else {
            await this.prisma.budgetProject.update({
                where: { id },
                data: { status: client_1.BudgetStatus.tpm_approved, tpmReviewedAt: new Date(), tpmReviewedById: tpmUserId },
            });
            await this.notifications.notifyBudgetTPMApproved(budget.entityCode, budget.budgetType, budget.title, id);
            const copPhones = await this.getRolePhones(client_1.Role.chief_of_party);
            for (const u of copPhones) {
                await this.n8n.onBudgetTpmApproved({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title });
            }
        }
        return this.findOne(id, [client_1.Role.admin_tpm]);
    }
    async copReview(id, dto, copUserId) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
        if (!budget)
            throw new common_1.NotFoundException();
        if (budget.status !== client_1.BudgetStatus.tpm_approved) {
            throw new common_1.BadRequestException('Ce budget n\'a pas encore été vérifié par le TPM');
        }
        if (dto.decision === 'rejected' && !dto.rejectionReason) {
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        }
        if (dto.decision === 'rejected') {
            await this.prisma.budgetProject.update({
                where: { id },
                data: {
                    status: client_1.BudgetStatus.rejected,
                    reviewedAt: new Date(),
                    reviewedById: copUserId,
                    rejectionReason: dto.rejectionReason ?? null,
                    rejectedAt: new Date(),
                },
            });
            await this.notifications.notifyBudgetRejected(budget.entityCode, budget.budgetType, budget.title, id, dto.rejectionReason);
            const epRej = await this.getEntityPhone(budget.entityCode);
            if (epRej)
                await this.n8n.onBudgetRejected({ phone: epRej.phone, firstName: epRej.firstName, budgetTitle: budget.title, reason: dto.rejectionReason });
        }
        else {
            await this.prisma.budgetProject.update({
                where: { id },
                data: { status: client_1.BudgetStatus.approved, reviewedAt: new Date(), reviewedById: copUserId, rejectionReason: null },
            });
            await this.notifications.notifyBudgetApproved(budget.entityCode, budget.budgetType, budget.title, id);
            const epAppr = await this.getEntityPhone(budget.entityCode);
            if (epAppr)
                await this.n8n.onBudgetApproved({ phone: epAppr.phone, firstName: epAppr.firstName, budgetTitle: budget.title });
        }
        return this.findOne(id, [client_1.Role.chief_of_party]);
    }
    async remove(id, userRoles, entityCode) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
        if (!budget)
            throw new common_1.NotFoundException();
        const isSuperAdmin = userRoles.includes(client_1.Role.super_admin);
        if (!isSuperAdmin && budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (budget.status === client_1.BudgetStatus.approved)
            throw new common_1.BadRequestException('Un budget approuvé ne peut pas être supprimé');
        return this.prisma.budgetProject.update({ where: { id }, data: { status: client_1.BudgetStatus.archived } });
    }
    async uploadTdr(id, file, userRoles, entityCode, userId) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
        if (!budget)
            throw new common_1.NotFoundException();
        const canUpload = userRoles.includes(client_1.Role.super_admin) ||
            userRoles.includes(client_1.Role.admin_tpm) ||
            userRoles.includes(client_1.Role.chief_of_party) ||
            budget.entityCode === entityCode;
        if (!canUpload)
            throw new common_1.ForbiddenException('Vous n\'êtes pas autorisé à importer un TDR pour ce budget');
        if (budget.tdrFilePath) {
            const uploadedRole = userRoles.includes(client_1.Role.super_admin) ? 'super_admin'
                : userRoles.includes(client_1.Role.admin_tpm) ? 'admin_tpm'
                    : userRoles.includes(client_1.Role.chief_of_party) ? 'chief_of_party'
                        : 'entity_member';
            await this.prisma.budgetTdrHistory.create({
                data: {
                    budgetId: id,
                    filePath: budget.tdrFilePath,
                    fileExt: budget.tdrFileExt ?? 'pdf',
                    uploadedById: userId,
                    uploadedRole,
                },
            });
        }
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
        const updated = await this.prisma.budgetProject.update({
            where: { id },
            data: { tdrFilePath: file.path, tdrFileExt: ext },
        });
        const { lines: _, ...safe } = updated;
        return safe;
    }
    async getTdrPath(id) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id }, select: { tdrFilePath: true, tdrFileExt: true } });
        if (!budget?.tdrFilePath)
            throw new common_1.NotFoundException('Aucun TDR associé à ce budget');
        return { filePath: budget.tdrFilePath, ext: budget.tdrFileExt ?? 'pdf' };
    }
    async getEntityPhone(entityCode) {
        const user = await this.prisma.user.findFirst({
            where: { entityCode, isEntityResponsible: true, isActive: true, phone: { not: null } },
            select: { phone: true, firstName: true },
        });
        return user?.phone ? { phone: user.phone, firstName: user.firstName } : null;
    }
    async getRolePhones(role) {
        const users = await this.prisma.user.findMany({
            where: { roles: { has: role }, isActive: true, phone: { not: null } },
            select: { phone: true, firstName: true },
        });
        return users.filter(u => u.phone).map(u => ({ phone: u.phone, firstName: u.firstName }));
    }
    async getConfigRate(key, defaultValue) {
        const cfg = await this.prisma.appConfig.findUnique({ where: { key } });
        return cfg ? parseFloat(cfg.value) : defaultValue;
    }
};
exports.BudgetProjectsService = BudgetProjectsService;
exports.BudgetProjectsService = BudgetProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        app_config_service_1.AppConfigService,
        n8n_service_1.N8nService])
], BudgetProjectsService);
//# sourceMappingURL=budget-projects.service.js.map