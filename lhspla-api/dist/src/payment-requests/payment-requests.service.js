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
exports.PaymentRequestsService = exports.UploadProofDto = exports.RejectPaymentRequestDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const n8n_service_1 = require("../n8n/n8n.service");
const app_config_service_1 = require("../app-config/app-config.service");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class RejectPaymentRequestDto {
    reason;
}
exports.RejectPaymentRequestDto = RejectPaymentRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectPaymentRequestDto.prototype, "reason", void 0);
class UploadProofDto {
    amount;
}
exports.UploadProofDto = UploadProofDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UploadProofDto.prototype, "amount", void 0);
const FINANCE_ROLES = [client_1.Role.admin_finance, client_1.Role.super_admin];
const TREASURY_ROLES = [client_1.Role.chargee_tresorerie, client_1.Role.super_admin];
const VIEWER_ROLES = [client_1.Role.admin_finance, client_1.Role.chargee_tresorerie, client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party];
let PaymentRequestsService = class PaymentRequestsService {
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
    async findByBudget(budgetId, userRoles, entityCode) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
        if (!budget)
            throw new common_1.NotFoundException('Budget introuvable');
        const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
        if (!isViewer && budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        return this.prisma.paymentRequest.findMany({
            where: { budgetId },
            include: {
                uploadedBy: { select: { id: true, firstName: true, lastName: true } },
                validatedBy: { select: { id: true, firstName: true, lastName: true } },
                proofs: { orderBy: { uploadedAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async upload(budgetId, file, userId, entityCode) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
        if (!budget)
            throw new common_1.NotFoundException('Budget introuvable');
        if (budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (budget.status !== 'approved')
            throw new common_1.BadRequestException('Le budget doit être approuvé');
        const [uploadCfg, uploadTotalPaid, uploadEffective] = await Promise.all([
            this.appConfig.getMap(),
            this.computeTotalPaid(budgetId),
            this.computeEffectiveTotal(budgetId, budget.totalAmount),
        ]);
        const uploadMemoEnabled = uploadCfg['memo_enabled'] === 'true';
        const uploadTotalBudget = uploadMemoEnabled ? uploadEffective : budget.totalAmount;
        if (uploadTotalBudget > 0 && uploadTotalPaid >= uploadTotalBudget) {
            throw new common_1.BadRequestException('Ce budget est entièrement payé — aucune nouvelle demande de paiement n\'est possible');
        }
        const existing = await this.prisma.paymentRequest.findFirst({
            where: { budgetId, status: 'uploaded', rejectionReason: { not: null } },
            orderBy: { createdAt: 'desc' },
        });
        const pr = existing
            ? await this.prisma.paymentRequest.update({
                where: { id: existing.id },
                data: {
                    filePath: file.path,
                    fileName: file.originalname,
                    uploadedById: userId,
                    uploadedAt: new Date(),
                    rejectionReason: null,
                },
            })
            : await this.prisma.paymentRequest.create({
                data: {
                    budgetId,
                    entityCode,
                    filePath: file.path,
                    fileName: file.originalname,
                    uploadedById: userId,
                },
            });
        const targets = await this.prisma.user.findMany({
            where: { roles: { hasSome: [client_1.Role.admin_finance, client_1.Role.chargee_tresorerie] }, isActive: true },
            select: { id: true, phone: true, firstName: true },
        });
        for (const u of targets) {
            await this.notifications.createForUser(u.id, 'payment_request_uploaded', 'Nouvelle demande de paiement', `Une demande de paiement a été déposée pour le budget "${budget.title}" (${entityCode}).`, { budgetId, paymentRequestId: pr.id });
            if (u.phone) {
                await this.n8n.onPaymentRequestUploaded({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, entityCode });
            }
        }
        return pr;
    }
    async validate(id, userId, userRoles) {
        if (!userRoles.some(r => FINANCE_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
        if (!pr)
            throw new common_1.NotFoundException();
        if (pr.status !== 'uploaded')
            throw new common_1.BadRequestException('Cette demande ne peut pas être validée');
        const updated = await this.prisma.paymentRequest.update({
            where: { id },
            data: { status: 'validated', validatedAt: new Date(), validatedById: userId, rejectionReason: null },
        });
        const targets = await this.getEntityTargets(pr.entityCode);
        for (const u of targets) {
            await this.notifications.createForUser(u.id, 'payment_request_validated', 'Demande de paiement validée', `Votre demande de paiement pour le budget "${pr.budget.title}" a été validée.`, { budgetId: pr.budgetId, paymentRequestId: id });
            if (u.phone) {
                await this.n8n.onPaymentRequestValidated({ phone: u.phone, firstName: u.firstName, budgetTitle: pr.budget.title });
            }
        }
        return updated;
    }
    async reject(id, reason, userId, userRoles) {
        if (!userRoles.some(r => FINANCE_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
        if (!pr)
            throw new common_1.NotFoundException();
        if (pr.status !== 'uploaded')
            throw new common_1.BadRequestException('Cette demande ne peut pas être rejetée');
        const updated = await this.prisma.paymentRequest.update({
            where: { id },
            data: { status: 'uploaded', rejectionReason: reason },
        });
        const targets = await this.getEntityTargets(pr.entityCode);
        for (const u of targets) {
            await this.notifications.createForUser(u.id, 'payment_request_rejected', 'Demande de paiement rejetée', `Votre demande de paiement pour le budget "${pr.budget.title}" a été rejetée. Motif : ${reason}`, { budgetId: pr.budgetId, paymentRequestId: id });
            if (u.phone) {
                await this.n8n.onPaymentRequestRejected({ phone: u.phone, firstName: u.firstName, budgetTitle: pr.budget.title, reason });
            }
        }
        return updated;
    }
    async uploadProof(id, file, amount, userId, userRoles) {
        if (!userRoles.some(r => TREASURY_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        if (!amount || amount <= 0)
            throw new common_1.BadRequestException('Le montant de la preuve doit être supérieur à 0');
        const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
        if (!pr)
            throw new common_1.NotFoundException();
        if (pr.status !== 'validated')
            throw new common_1.BadRequestException('La demande doit être validée avant d\'ajouter une preuve');
        const [config, totalPaid, effectiveTotal] = await Promise.all([
            this.appConfig.getMap(),
            this.computeTotalPaid(pr.budgetId),
            this.computeEffectiveTotal(pr.budgetId, pr.budget.totalAmount),
        ]);
        const memoEnabled = config['memo_enabled'] === 'true';
        const totalBudget = memoEnabled ? effectiveTotal : pr.budget.totalAmount;
        if (totalPaid + amount > totalBudget) {
            throw new common_1.BadRequestException(`Dépassement du montant autorisé : déjà versé ${this.fmtFcfa(totalPaid)}, ` +
                `nouveau montant ${this.fmtFcfa(amount)}, ` +
                `plafond ${this.fmtFcfa(totalBudget)}.`);
        }
        const proof = await this.prisma.paymentProof.create({
            data: {
                paymentRequestId: id,
                filePath: file.path,
                fileName: file.originalname,
                fileType: file.mimetype,
                amount,
                uploadedById: userId,
            },
        });
        await this.prisma.paymentAuditLog.create({
            data: {
                paymentRequestId: id,
                proofId: proof.id,
                budgetId: pr.budgetId,
                userId,
                action: 'proof_added',
                detail: `Preuve "${file.originalname}" versée — montant: ${this.fmtFcfa(amount)} (budget: ${pr.budget.title})`,
            },
        });
        await this.prisma.paymentRequest.update({
            where: { id },
            data: { status: 'paid', paidAt: new Date() },
        });
        const financeTargets = await this.prisma.user.findMany({
            where: { roles: { has: client_1.Role.admin_finance }, isActive: true },
            select: { id: true, phone: true, firstName: true },
        });
        const entityTargets = await this.getEntityTargets(pr.entityCode);
        const allTargets = [...financeTargets, ...entityTargets];
        for (const u of allTargets) {
            await this.notifications.createForUser(u.id, 'payment_proof_uploaded', 'Paiement effectué', `La preuve de paiement pour le budget "${pr.budget.title}" a été versée (${this.fmtFcfa(amount)}). Statut : Payé.`, { budgetId: pr.budgetId, paymentRequestId: id });
            if (u.phone) {
                await this.n8n.onPaymentProofUploaded({ phone: u.phone, firstName: u.firstName, budgetTitle: pr.budget.title });
            }
        }
        return proof;
    }
    async deleteRequest(id, userId, userRoles, entityCode) {
        const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
        if (!pr)
            throw new common_1.NotFoundException();
        if (pr.status !== 'uploaded')
            throw new common_1.BadRequestException('Seule une demande en attente peut être supprimée');
        const isSuperAdmin = userRoles.includes(client_1.Role.super_admin);
        if (!isSuperAdmin && pr.uploadedById !== userId && pr.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        await this.prisma.paymentAuditLog.create({
            data: {
                paymentRequestId: id,
                budgetId: pr.budgetId,
                userId,
                action: 'request_deleted',
                detail: `Demande "${pr.fileName}" supprimée par l'initiateur (budget: ${pr.budget.title})`,
            },
        });
        await this.prisma.paymentRequest.delete({ where: { id } });
    }
    async deleteProof(requestId, proofId, userId, userRoles) {
        if (!userRoles.some(r => TREASURY_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        const proof = await this.prisma.paymentProof.findUnique({ where: { id: proofId } });
        if (!proof)
            throw new common_1.NotFoundException();
        const pr = await this.prisma.paymentRequest.findUnique({ where: { id: requestId }, include: { budget: true } });
        if (!pr)
            throw new common_1.NotFoundException();
        await this.prisma.paymentAuditLog.create({
            data: {
                paymentRequestId: requestId,
                proofId,
                budgetId: pr.budgetId,
                userId,
                action: 'proof_deleted',
                detail: `Preuve "${proof.fileName}" (${this.fmtFcfa(proof.amount)}) supprimée par chargee_tresorerie (budget: ${pr.budget.title})`,
            },
        });
        await this.prisma.paymentProof.delete({ where: { id: proofId } });
        const remainingProofs = await this.prisma.paymentProof.count({ where: { paymentRequestId: requestId } });
        if (pr.status === 'paid' && remainingProofs === 0) {
            await this.prisma.paymentRequest.update({
                where: { id: requestId },
                data: { status: 'validated', paidAt: null },
            });
        }
    }
    async getFilePath(id) {
        const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, select: { filePath: true, fileName: true } });
        if (!pr)
            throw new common_1.NotFoundException();
        return pr;
    }
    async getProofPath(proofId) {
        const proof = await this.prisma.paymentProof.findUnique({ where: { id: proofId }, select: { filePath: true, fileName: true, fileType: true } });
        if (!proof)
            throw new common_1.NotFoundException();
        return proof;
    }
    async getSummary(budgetId) {
        const budget = await this.prisma.budgetProject.findUnique({
            where: { id: budgetId },
            select: { id: true, totalAmount: true },
        });
        if (!budget)
            throw new common_1.NotFoundException('Budget introuvable');
        const [config, totalPaid, effectiveTotal] = await Promise.all([
            this.appConfig.getMap(),
            this.computeTotalPaid(budgetId),
            this.computeEffectiveTotal(budgetId, budget.totalAmount),
        ]);
        const memoEnabled = config['memo_enabled'] === 'true';
        const initialTotal = budget.totalAmount;
        const totalBudget = memoEnabled ? effectiveTotal : initialTotal;
        const resteAPayer = Math.max(0, totalBudget - totalPaid);
        return { initialTotal, effectiveTotal, totalPaid, memoEnabled, totalBudget, resteAPayer };
    }
    async computeTotalPaid(budgetId) {
        const result = await this.prisma.$queryRaw `
      SELECT SUM(pp.amount) as total
      FROM "PaymentProof" pp
      JOIN "PaymentRequest" pr ON pr.id = pp."paymentRequestId"
      WHERE pr."budgetId" = ${budgetId}
    `;
        return parseFloat(result[0]?.total ?? '0') || 0;
    }
    async computeEffectiveTotal(budgetId, baseTotal) {
        const memos = await this.prisma.budgetMemo.findMany({ where: { budgetId, status: 'approved' } });
        const rallonges = memos.filter(m => m.category === 'rallonge_budgetaire').reduce((s, m) => s + m.amount, 0);
        const reductions = memos.filter(m => m.category === 'reduction_budgetaire').reduce((s, m) => s + m.amount, 0);
        return baseTotal + rallonges - reductions;
    }
    async uploadTemplate(file, userId, userRoles) {
        if (!userRoles.some(r => FINANCE_ROLES.includes(r)))
            throw new common_1.ForbiddenException();
        await this.prisma.paymentTemplate.deleteMany({});
        return this.prisma.paymentTemplate.create({
            data: { filePath: file.path, fileName: file.originalname, uploadedById: userId },
        });
    }
    async getTemplatePath() {
        const tpl = await this.prisma.paymentTemplate.findFirst({ orderBy: { uploadedAt: 'desc' } });
        if (!tpl)
            throw new common_1.NotFoundException('Aucun modèle disponible');
        return tpl;
    }
    async getEntityTargets(entityCode) {
        return this.prisma.user.findMany({
            where: { entityCode, isActive: true },
            select: { id: true, phone: true, firstName: true },
        });
    }
    fmtFcfa(n) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
    }
};
exports.PaymentRequestsService = PaymentRequestsService;
exports.PaymentRequestsService = PaymentRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        n8n_service_1.N8nService,
        app_config_service_1.AppConfigService])
], PaymentRequestsService);
//# sourceMappingURL=payment-requests.service.js.map