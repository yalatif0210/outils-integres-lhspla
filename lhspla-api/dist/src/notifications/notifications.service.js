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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("./mail.service");
const client_1 = require("@prisma/client");
let NotificationsService = class NotificationsService {
    prisma;
    mail;
    constructor(prisma, mail) {
        this.prisma = prisma;
        this.mail = mail;
    }
    async getUserNotifications(userId, search) {
        return this.prisma.notification.findMany({
            where: {
                userId,
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { message: { contains: search, mode: 'insensitive' } },
                    ],
                } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async markRead(userId, notifId) {
        return this.prisma.notification.updateMany({
            where: { id: notifId, userId },
            data: { isRead: true },
        });
    }
    async markAllRead(userId) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
    async getUnreadCount(userId) {
        return this.prisma.notification.count({ where: { userId, isRead: false } });
    }
    async createForUser(userId, type, title, message, metadata) {
        return this.prisma.notification.create({
            data: { userId, type, title, message, metadata: metadata ?? null },
        });
    }
    async createForRole(roles, type, title, message, metadata) {
        const users = await this.prisma.user.findMany({
            where: { isActive: true, roles: { hasSome: roles } },
        });
        await this.prisma.notification.createMany({
            data: users.map(u => ({ userId: u.id, type, title, message, metadata: metadata ?? null })),
        });
        return users;
    }
    async createForEntity(entityCode, type, title, message, metadata) {
        const users = await this.prisma.user.findMany({
            where: { entityCode, isActive: true },
        });
        await this.prisma.notification.createMany({
            data: users.map(u => ({ userId: u.id, type, title, message, metadata: metadata ?? null })),
        });
        return users;
    }
    async sendLateSubmissionReminders(weekId) {
        const week = await this.prisma.week.findUnique({
            where: { id: weekId },
            include: { submissions: { where: { status: 'draft' } } },
        });
        if (!week)
            return;
        for (const sub of week.submissions) {
            const entityUsers = await this.createForEntity(sub.entityCode, 'LATE_SUBMISSION', '⚠️ Soumission en attente', `Votre bulletin pour "${week.weekReference}" n'a pas encore été soumis. Deadline : lundi 9h00.`, { weekId, entityCode: sub.entityCode });
            for (const user of entityUsers) {
                await this.mail.sendMail(user.email, `[LHSPLA] Rappel bulletin — ${week.weekReference}`, this.mail.buildReminderHtml(sub.entityCode, week.weekReference));
            }
        }
    }
    async notifyCriticalRisks(entityCode, count, weekId) {
        const title = `🔴 Risque critique — ${entityCode}`;
        const message = `${count} risque(s) critique(s) signalé(s) par ${entityCode}`;
        const metadata = { weekId, entityCode };
        const admins = await this.createForRole([client_1.Role.admin_system, client_1.Role.chief_of_party], 'CRITICAL_RISK', title, message, metadata);
        for (const admin of admins) {
            await this.mail.sendMail(admin.email, `[LHSPLA] 🔴 Alerte risque critique — ${entityCode}`, this.mail.buildCriticalRiskHtml(entityCode, count, weekId));
        }
    }
    async notifySubmission(entityCode, weekId, weekReference) {
        await this.createForRole([client_1.Role.admin_system, client_1.Role.chief_of_party], 'SUBMISSION', `✅ Bulletin soumis — ${entityCode}`, `L'entité ${entityCode} a soumis son bulletin pour "${weekReference}"`, { weekId, entityCode });
    }
    async notifyBudgetSubmitted(entityCode, budgetType, title, budgetId) {
        await this.createForRole([client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.admin_tpm, client_1.Role.admin_finance], 'BUDGET_SUBMITTED', `📋 Budget soumis — ${entityCode}`, `${entityCode} a soumis un budget "${title}" (${budgetType}) — en attente de contrôle Finance`, { budgetId, entityCode });
    }
    async notifyBudgetReturnedToDraft(entityCode, budgetType, title, budgetId, reason, stage) {
        await this.createForEntity(entityCode, 'BUDGET_RETURNED', `↩️ Budget renvoyé pour correction`, `Votre budget "${title}" (${budgetType}) a été renvoyé en brouillon par le contrôle ${stage}. Motif : ${reason}`, { budgetId, reason, stage });
    }
    async notifyBudgetTPMApproved(entityCode, budgetType, title, budgetId) {
        await this.createForRole([client_1.Role.super_admin, client_1.Role.chief_of_party], 'BUDGET_TPM_APPROVED', `🔍 Budget vérifié par TPM — ${entityCode}`, `Le budget "${title}" (${budgetType}) de ${entityCode} a été vérifié par le TPM — en attente de validation COP`, { budgetId, entityCode });
    }
    async notifyBudgetApproved(entityCode, budgetType, title, budgetId) {
        await this.createForEntity(entityCode, 'BUDGET_APPROVED', '✅ Budget approuvé', `Votre budget "${title}" (${budgetType}) a été approuvé.`, { budgetId });
    }
    async notifyBudgetRejected(entityCode, budgetType, title, budgetId, reason) {
        await this.createForEntity(entityCode, 'BUDGET_REJECTED', '❌ Budget rejeté', `Votre budget "${title}" (${budgetType}) a été rejeté. Motif : ${reason}`, { budgetId, reason });
    }
    async notifyBudgetRecallCreated(entityCode, title, budgetType, recallId, reason) {
        await this.createForRole([client_1.Role.admin_system, client_1.Role.admin_finance, client_1.Role.chief_of_party], 'BUDGET_RECALL', `📎 Rappel budget — ${entityCode}`, `${entityCode} a initié un rappel pour "${title}" (${budgetType}) : ${reason}`, { recallId, entityCode });
    }
    async notifyBudgetRecallClosed(entityCode, title, budgetType, recallId) {
        await this.createForEntity(entityCode, 'BUDGET_RECALL_CLOSED', '✅ Rappel clôturé', `Votre rappel pour le budget "${title}" (${budgetType}) a été vérifié et clôturé.`, { recallId });
    }
    async notifyRecallDocReviewed(entityCode, recallReason, docName, decision, rejectionNote) {
        if (decision === 'approved') {
            await this.createForEntity(entityCode, 'RECALL_DOC_APPROVED', '✅ Pièce justificative approuvée', `La pièce "${docName}" du rappel "${recallReason}" a été approuvée.`, { entityCode });
        }
        else {
            await this.createForEntity(entityCode, 'RECALL_DOC_REJECTED', '❌ Pièce justificative rejetée', `La pièce "${docName}" du rappel "${recallReason}" a été rejetée.${rejectionNote ? ` Motif : ${rejectionNote}` : ''}`, { entityCode, rejectionNote });
        }
    }
    async notifyRecallRejected(entityCode, recallReason, reason) {
        await this.createForEntity(entityCode, 'RECALL_REJECTED', '❌ Rappel rejeté', `Votre rappel "${recallReason}" a été rejeté par l'Admin Finance. Motif : ${reason}`, { entityCode, reason });
    }
    async notifyRecallClosed(entityCode, recallReason) {
        await this.createForEntity(entityCode, 'BUDGET_RECALL_CLOSED', '✅ Rappel clôturé', `Votre rappel "${recallReason}" a été vérifié et clôturé par l'Admin Finance.`, { entityCode });
    }
    async notifyNewWeek(weekReference, weekId) {
        const users = await this.prisma.user.findMany({ where: { isActive: true, roles: { has: 'entity_member' } } });
        await this.prisma.notification.createMany({
            data: users.map(u => ({
                userId: u.id,
                type: 'NEW_WEEK',
                title: '📅 Nouvelle semaine ouverte',
                message: `La semaine "${weekReference}" est maintenant ouverte pour saisie.`,
                metadata: { weekId },
            })),
        });
        for (const user of users) {
            await this.mail.sendMail(user.email, `[LHSPLA] Nouvelle semaine — ${weekReference}`, `<p>La semaine <strong>${weekReference}</strong> est ouverte. Merci de saisir votre bulletin avant lundi 9h00.</p>`);
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, mail_service_1.MailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map