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
exports.BudgetRecallsService = exports.RejectRecallDto = exports.ReviewDocumentDto = exports.AddDocumentDto = exports.CreateRecallDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const n8n_service_1 = require("../n8n/n8n.service");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class CreateRecallDto {
    budgetId;
    reason;
}
exports.CreateRecallDto = CreateRecallDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRecallDto.prototype, "budgetId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRecallDto.prototype, "reason", void 0);
class AddDocumentDto {
    budgetLineId;
    name;
    description;
}
exports.AddDocumentDto = AddDocumentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddDocumentDto.prototype, "budgetLineId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddDocumentDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddDocumentDto.prototype, "description", void 0);
class ReviewDocumentDto {
    decision;
    rejectionNote;
}
exports.ReviewDocumentDto = ReviewDocumentDto;
__decorate([
    (0, class_validator_1.IsEnum)(['approved', 'rejected', 'pending']),
    __metadata("design:type", String)
], ReviewDocumentDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReviewDocumentDto.prototype, "rejectionNote", void 0);
class RejectRecallDto {
    reason;
}
exports.RejectRecallDto = RejectRecallDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectRecallDto.prototype, "reason", void 0);
const CLOSE_ROLES = [client_1.Role.super_admin, client_1.Role.admin_finance];
const REVIEWER_ROLES = [client_1.Role.super_admin, client_1.Role.admin_finance, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.chargee_tresorerie];
function isReviewer(userRoles) {
    return userRoles.some(r => REVIEWER_ROLES.includes(r));
}
const RECALL_INCLUDE = {
    documents: { orderBy: { addedAt: 'desc' } },
    closedBy: { select: { id: true, firstName: true, lastName: true } },
};
let BudgetRecallsService = class BudgetRecallsService {
    prisma;
    notifications;
    n8n;
    constructor(prisma, notifications, n8n) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.n8n = n8n;
    }
    async findByBudget(budgetId, userRoles, entityCode) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
        if (!budget)
            throw new common_1.NotFoundException('Budget introuvable');
        if (!isReviewer(userRoles) && budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        return this.prisma.budgetRecall.findMany({
            where: { budgetId },
            include: RECALL_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAll(userRoles, entityCode) {
        const reviewer = isReviewer(userRoles);
        const where = {};
        if (!reviewer) {
            if (!entityCode)
                throw new common_1.ForbiddenException();
            where.entityCode = entityCode;
        }
        return this.prisma.budgetRecall.findMany({
            where,
            include: {
                budget: {
                    select: {
                        id: true, title: true, budgetType: true, entityCode: true,
                        _count: { select: { lines: true } },
                    },
                },
                documents: {
                    select: { id: true, name: true, fileType: true, addedAt: true, docStatus: true, budgetLineId: true },
                },
                closedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAuditLog(recallId, userRoles, entityCode) {
        const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
        if (!recall)
            throw new common_1.NotFoundException();
        if (!isReviewer(userRoles) && recall.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        return this.prisma.recallAuditLog.findMany({
            where: { recallId },
            include: { user: { select: { id: true, firstName: true, lastName: true, roles: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getCoverage(recallId, userRoles, entityCode) {
        const recall = await this.prisma.budgetRecall.findUnique({
            where: { id: recallId },
            include: { documents: { select: { budgetLineId: true, docStatus: true } } },
        });
        if (!recall)
            throw new common_1.NotFoundException();
        if (!isReviewer(userRoles) && recall.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        const totalLines = await this.prisma.budgetLine.count({ where: { budgetId: recall.budgetId } });
        const approvedIds = [...new Set(recall.documents.filter(d => d.docStatus === 'approved').map(d => d.budgetLineId))];
        return {
            total: totalLines,
            covered: approvedIds.length,
            percentage: totalLines > 0 ? Math.round((approvedIds.length / totalLines) * 100) : 0,
        };
    }
    async create(dto, entityCode, userId) {
        const budget = await this.prisma.budgetProject.findUnique({ where: { id: dto.budgetId } });
        if (!budget)
            throw new common_1.NotFoundException('Budget introuvable');
        if (budget.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (budget.status !== 'approved')
            throw new common_1.BadRequestException('Le budget doit être approuvé pour créer un rappel');
        const recall = await this.prisma.budgetRecall.create({
            data: { budgetId: dto.budgetId, entityCode, reason: dto.reason },
        });
        await this.prisma.recallAuditLog.create({
            data: { recallId: recall.id, userId, action: 'created', detail: dto.reason },
        });
        const financePhones = await this.getRolePhones(client_1.Role.admin_finance);
        for (const u of financePhones) {
            await this.n8n.onRecallCreated({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, entityCode });
        }
        return recall;
    }
    async addDocument(recallId, dto, file, entityCode, userId, userRoles) {
        const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
        if (!recall)
            throw new common_1.NotFoundException();
        const isPrivileged = userRoles.some(r => CLOSE_ROLES.includes(r));
        if (!isPrivileged && recall.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (recall.status !== 'open')
            throw new common_1.BadRequestException('Ce rappel n\'est plus ouvert');
        const line = await this.prisma.budgetLine.findUnique({ where: { id: dto.budgetLineId } });
        if (!line || line.budgetId !== recall.budgetId)
            throw new common_1.BadRequestException('Ligne budgétaire invalide');
        const doc = await this.prisma.recallDocument.create({
            data: {
                recallId,
                budgetLineId: dto.budgetLineId,
                name: dto.name ?? file.originalname,
                description: dto.description ?? '',
                filePath: file.path,
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
            },
        });
        await this.prisma.recallAuditLog.create({
            data: { recallId, userId, action: 'doc_added', detail: dto.name },
        });
        return doc;
    }
    async deleteDocument(recallId, docId, entityCode, userId, userRoles) {
        const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
        if (!recall)
            throw new common_1.NotFoundException();
        const isPrivileged = userRoles.some(r => CLOSE_ROLES.includes(r));
        if (!isPrivileged && recall.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (recall.status !== 'open')
            throw new common_1.BadRequestException('Ce rappel n\'est plus ouvert');
        const doc = await this.prisma.recallDocument.findUnique({ where: { id: docId } });
        if (!doc || doc.recallId !== recallId)
            throw new common_1.NotFoundException('Document introuvable');
        await this.prisma.recallDocument.delete({ where: { id: docId } });
        await this.prisma.recallAuditLog.create({
            data: { recallId, userId, action: 'doc_deleted', detail: doc.name },
        });
        return { deleted: true };
    }
    async reviewDocument(recallId, docId, dto, userId) {
        const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
        if (!recall)
            throw new common_1.NotFoundException();
        if (recall.status !== 'open')
            throw new common_1.BadRequestException('Ce rappel n\'est plus ouvert');
        const doc = await this.prisma.recallDocument.findUnique({ where: { id: docId } });
        if (!doc || doc.recallId !== recallId)
            throw new common_1.NotFoundException('Document introuvable');
        if (dto.decision === 'rejected' && !dto.rejectionNote?.trim()) {
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        }
        if (dto.decision === 'pending') {
            await this.prisma.recallDocument.update({
                where: { id: docId },
                data: { docStatus: 'pending', rejectionNote: null, reviewedAt: null, reviewedById: null },
            });
            return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
        }
        await this.prisma.recallDocument.update({
            where: { id: docId },
            data: {
                docStatus: dto.decision,
                rejectionNote: dto.decision === 'rejected' ? dto.rejectionNote : null,
                reviewedAt: new Date(),
                reviewedById: userId,
            },
        });
        await this.prisma.recallAuditLog.create({
            data: {
                recallId,
                userId,
                action: dto.decision === 'approved' ? 'doc_approved' : 'doc_rejected',
                detail: dto.decision === 'rejected' ? `${doc.name} — ${dto.rejectionNote}` : doc.name,
            },
        });
        if (dto.decision === 'approved') {
            await this.notifications.notifyRecallDocReviewed(recall.entityCode, recall.reason, doc.name, 'approved');
        }
        else {
            await this.notifications.notifyRecallDocReviewed(recall.entityCode, recall.reason, doc.name, 'rejected', dto.rejectionNote);
        }
        return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
    }
    async rejectRecall(recallId, dto, userId) {
        if (!dto.reason?.trim())
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
        if (!recall)
            throw new common_1.NotFoundException();
        if (recall.status !== 'open')
            throw new common_1.BadRequestException('Ce rappel n\'est plus ouvert');
        await this.prisma.budgetRecall.update({
            where: { id: recallId },
            data: { status: 'rejected', rejectionReason: dto.reason, closedAt: new Date(), closedById: userId },
        });
        await this.prisma.recallAuditLog.create({
            data: { recallId, userId, action: 'rejected', detail: dto.reason },
        });
        await this.notifications.notifyRecallRejected(recall.entityCode, recall.reason, dto.reason);
        const rejBudget = await this.prisma.budgetProject.findUnique({ where: { id: recall.budgetId }, select: { title: true } });
        const rejEp = await this.getEntityPhone(recall.entityCode);
        if (rejEp)
            await this.n8n.onRecallRejected({ phone: rejEp.phone, firstName: rejEp.firstName, budgetTitle: rejBudget?.title ?? '', reason: dto.reason });
        return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
    }
    async cancelRecall(recallId, entityCode, userId) {
        const recall = await this.prisma.budgetRecall.findUnique({
            where: { id: recallId },
            include: { documents: { select: { docStatus: true } } },
        });
        if (!recall)
            throw new common_1.NotFoundException();
        if (recall.entityCode !== entityCode)
            throw new common_1.ForbiddenException();
        if (recall.status !== 'open')
            throw new common_1.BadRequestException('Ce rappel ne peut plus être annulé');
        const financeHasInteracted = recall.documents.some(d => d.docStatus !== 'pending');
        if (financeHasInteracted) {
            throw new common_1.ConflictException('L\'Admin Finance a déjà interagi avec ce rappel — annulation impossible');
        }
        await this.prisma.budgetRecall.update({
            where: { id: recallId },
            data: { status: 'cancelled', cancelledAt: new Date() },
        });
        await this.prisma.recallAuditLog.create({
            data: { recallId, userId, action: 'cancelled', detail: '' },
        });
        return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
    }
    async close(recallId, userId) {
        const recall = await this.prisma.budgetRecall.findUnique({
            where: { id: recallId },
            include: { documents: { select: { budgetLineId: true, docStatus: true } } },
        });
        if (!recall)
            throw new common_1.NotFoundException();
        if (recall.status !== 'open')
            throw new common_1.BadRequestException('Ce rappel n\'est plus ouvert');
        const requiredLines = await this.prisma.budgetLine.findMany({
            where: { budgetId: recall.budgetId },
            select: { id: true, unitCost: true, quantity: true, frequency: true },
        });
        const required = requiredLines.filter(l => {
            const amt = (l.unitCost ?? 0) * (l.quantity ?? 1) * (l.frequency ?? 1);
            return amt > 0;
        });
        const approvedLineIds = new Set(recall.documents.filter(d => d.docStatus === 'approved').map(d => d.budgetLineId));
        const uncovered = required.filter(l => !approvedLineIds.has(l.id));
        if (uncovered.length > 0) {
            throw new common_1.BadRequestException(`${uncovered.length} poste(s) requis sans pièce approuvée. Approuvez toutes les pièces ou rejetez le rappel.`);
        }
        const updated = await this.prisma.budgetRecall.update({
            where: { id: recallId },
            data: { status: 'closed', closedAt: new Date(), closedById: userId },
        });
        await this.prisma.recallAuditLog.create({
            data: {
                recallId,
                userId,
                action: 'closed',
                detail: JSON.stringify({ coveredLines: required.length, totalLines: required.length }),
            },
        });
        await this.notifications.notifyRecallClosed(recall.entityCode, recall.reason);
        const closedBudget = await this.prisma.budgetProject.findUnique({ where: { id: recall.budgetId }, select: { title: true } });
        const closedEp = await this.getEntityPhone(recall.entityCode);
        if (closedEp)
            await this.n8n.onRecallClosed({ phone: closedEp.phone, firstName: closedEp.firstName, budgetTitle: closedBudget?.title ?? '' });
        return updated;
    }
    async reopen(recallId, userId) {
        const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
        if (!recall)
            throw new common_1.NotFoundException();
        if (recall.status !== 'closed')
            throw new common_1.BadRequestException('Ce rappel n\'est pas clôturé');
        const updated = await this.prisma.budgetRecall.update({
            where: { id: recallId },
            data: { status: 'open', closedAt: null, closedById: null },
        });
        await this.prisma.recallAuditLog.create({
            data: { recallId, userId, action: 'reopened', detail: '' },
        });
        return updated;
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
};
exports.BudgetRecallsService = BudgetRecallsService;
exports.BudgetRecallsService = BudgetRecallsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notifications_service_1.NotificationsService, n8n_service_1.N8nService])
], BudgetRecallsService);
//# sourceMappingURL=budget-recalls.service.js.map