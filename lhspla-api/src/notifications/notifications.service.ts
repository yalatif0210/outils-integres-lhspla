import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { Role } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async getUserNotifications(userId: string, search?: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(search ? {
          OR: [
            { title:   { contains: search, mode: 'insensitive' } },
            { message: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, notifId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notifId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async createForUser(userId: string, type: string, title: string, message: string, metadata?: any) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, metadata: metadata ?? null },
    });
  }

  private async createForRole(roles: Role[], type: string, title: string, message: string, metadata?: any) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, roles: { hasSome: roles } },
    });
    await this.prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, type, title, message, metadata: metadata ?? null })),
    });
    return users;
  }

  private async createForEntity(entityCode: string, type: string, title: string, message: string, metadata?: any) {
    const users = await this.prisma.user.findMany({
      where: { entityCode, isActive: true },
    });
    await this.prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, type, title, message, metadata: metadata ?? null })),
    });
    return users;
  }

  // Called by cron every Monday 8h00
  async sendLateSubmissionReminders(weekId: string) {
    const week = await this.prisma.week.findUnique({
      where: { id: weekId },
      include: { submissions: { where: { status: 'draft' } } },
    });
    if (!week) return;

    for (const sub of week.submissions) {
      const entityUsers = await this.createForEntity(
        sub.entityCode,
        'LATE_SUBMISSION',
        '⚠️ Soumission en attente',
        `Votre bulletin pour "${week.weekReference}" n'a pas encore été soumis. Deadline : lundi 9h00.`,
        { weekId, entityCode: sub.entityCode },
      );
      // Send emails
      for (const user of entityUsers) {
        await this.mail.sendMail(
          user.email,
          `[LHSPLA] Rappel bulletin — ${week.weekReference}`,
          this.mail.buildReminderHtml(sub.entityCode, week.weekReference),
        );
      }
    }
  }

  // Called when a critical risk is saved
  async notifyCriticalRisks(entityCode: string, count: number, weekId: string) {
    const title = `🔴 Risque critique — ${entityCode}`;
    const message = `${count} risque(s) critique(s) signalé(s) par ${entityCode}`;
    const metadata = { weekId, entityCode };

    const admins = await this.createForRole(
      [Role.admin_system, Role.chief_of_party],
      'CRITICAL_RISK', title, message, metadata,
    );

    for (const admin of admins) {
      await this.mail.sendMail(
        admin.email,
        `[LHSPLA] 🔴 Alerte risque critique — ${entityCode}`,
        this.mail.buildCriticalRiskHtml(entityCode, count, weekId),
      );
    }
  }

  // Called when entity submits
  async notifySubmission(entityCode: string, weekId: string, weekReference: string) {
    await this.createForRole(
      [Role.admin_system, Role.chief_of_party],
      'SUBMISSION',
      `✅ Bulletin soumis — ${entityCode}`,
      `L'entité ${entityCode} a soumis son bulletin pour "${weekReference}"`,
      { weekId, entityCode },
    );
  }

  async notifyBudgetSubmitted(entityCode: string, budgetType: string, title: string, budgetId: string) {
    await this.createForRole(
      [Role.super_admin, Role.admin_system, Role.admin_tpm, Role.admin_finance],
      'BUDGET_SUBMITTED',
      `📋 Budget soumis — ${entityCode}`,
      `${entityCode} a soumis un budget "${title}" (${budgetType}) — en attente de contrôle Finance`,
      { budgetId, entityCode },
    );
  }

  async notifyBudgetReturnedToDraft(entityCode: string, budgetType: string, title: string, budgetId: string, reason: string, stage: 'Finance' | 'TPM') {
    await this.createForEntity(
      entityCode,
      'BUDGET_RETURNED',
      `↩️ Budget renvoyé pour correction`,
      `Votre budget "${title}" (${budgetType}) a été renvoyé en brouillon par le contrôle ${stage}. Motif : ${reason}`,
      { budgetId, reason, stage },
    );
  }

  async notifyBudgetTPMApproved(entityCode: string, budgetType: string, title: string, budgetId: string) {
    await this.createForRole(
      [Role.super_admin, Role.chief_of_party],
      'BUDGET_TPM_APPROVED',
      `🔍 Budget vérifié par TPM — ${entityCode}`,
      `Le budget "${title}" (${budgetType}) de ${entityCode} a été vérifié par le TPM — en attente de validation COP`,
      { budgetId, entityCode },
    );
  }

  async notifyBudgetApproved(entityCode: string, budgetType: string, title: string, budgetId: string) {
    await this.createForEntity(
      entityCode,
      'BUDGET_APPROVED',
      '✅ Budget approuvé',
      `Votre budget "${title}" (${budgetType}) a été approuvé.`,
      { budgetId },
    );
  }

  async notifyBudgetRejected(entityCode: string, budgetType: string, title: string, budgetId: string, reason: string) {
    await this.createForEntity(
      entityCode,
      'BUDGET_REJECTED',
      '❌ Budget rejeté',
      `Votre budget "${title}" (${budgetType}) a été rejeté. Motif : ${reason}`,
      { budgetId, reason },
    );
  }

  async notifyBudgetRecallCreated(entityCode: string, title: string, budgetType: string, recallId: string, reason: string) {
    await this.createForRole(
      [Role.admin_system, Role.admin_finance, Role.chief_of_party],
      'BUDGET_RECALL',
      `📎 Rappel budget — ${entityCode}`,
      `${entityCode} a initié un rappel pour "${title}" (${budgetType}) : ${reason}`,
      { recallId, entityCode },
    );
  }

  async notifyBudgetRecallClosed(entityCode: string, title: string, budgetType: string, recallId: string) {
    await this.createForEntity(
      entityCode,
      'BUDGET_RECALL_CLOSED',
      '✅ Rappel clôturé',
      `Votre rappel pour le budget "${title}" (${budgetType}) a été vérifié et clôturé.`,
      { recallId },
    );
  }

  async notifyRecallDocReviewed(entityCode: string, recallReason: string, docName: string, decision: 'approved' | 'rejected', rejectionNote?: string) {
    if (decision === 'approved') {
      await this.createForEntity(
        entityCode,
        'RECALL_DOC_APPROVED',
        '✅ Pièce justificative approuvée',
        `La pièce "${docName}" du rappel "${recallReason}" a été approuvée.`,
        { entityCode },
      );
    } else {
      await this.createForEntity(
        entityCode,
        'RECALL_DOC_REJECTED',
        '❌ Pièce justificative rejetée',
        `La pièce "${docName}" du rappel "${recallReason}" a été rejetée.${rejectionNote ? ` Motif : ${rejectionNote}` : ''}`,
        { entityCode, rejectionNote },
      );
    }
  }

  async notifyRecallRejected(entityCode: string, recallReason: string, reason: string) {
    await this.createForEntity(
      entityCode,
      'RECALL_REJECTED',
      '❌ Rappel rejeté',
      `Votre rappel "${recallReason}" a été rejeté par l'Admin Finance. Motif : ${reason}`,
      { entityCode, reason },
    );
  }

  async notifyRecallClosed(entityCode: string, recallReason: string) {
    await this.createForEntity(
      entityCode,
      'BUDGET_RECALL_CLOSED',
      '✅ Rappel clôturé',
      `Votre rappel "${recallReason}" a été vérifié et clôturé par l'Admin Finance.`,
      { entityCode },
    );
  }

  // Called by admin when creating a new week
  async notifyNewWeek(weekReference: string, weekId: string) {
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
      await this.mail.sendMail(
        user.email,
        `[LHSPLA] Nouvelle semaine — ${weekReference}`,
        `<p>La semaine <strong>${weekReference}</strong> est ouverte. Merci de saisir votre bulletin avant lundi 9h00.</p>`,
      );
    }
  }
}
