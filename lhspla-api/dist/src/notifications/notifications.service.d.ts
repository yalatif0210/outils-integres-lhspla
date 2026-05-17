import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
export declare class NotificationsService {
    private prisma;
    private mail;
    constructor(prisma: PrismaService, mail: MailService);
    getUserNotifications(userId: string, search?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
    markRead(userId: string, notifId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getUnreadCount(userId: string): Promise<number>;
    createForUser(userId: string, type: string, title: string, message: string, metadata?: any): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    private createForRole;
    private createForEntity;
    sendLateSubmissionReminders(weekId: string): Promise<void>;
    notifyCriticalRisks(entityCode: string, count: number, weekId: string): Promise<void>;
    notifySubmission(entityCode: string, weekId: string, weekReference: string): Promise<void>;
    notifyBudgetSubmitted(entityCode: string, budgetType: string, title: string, budgetId: string): Promise<void>;
    notifyBudgetReturnedToDraft(entityCode: string, budgetType: string, title: string, budgetId: string, reason: string, stage: 'Finance' | 'TPM'): Promise<void>;
    notifyBudgetTPMApproved(entityCode: string, budgetType: string, title: string, budgetId: string): Promise<void>;
    notifyBudgetApproved(entityCode: string, budgetType: string, title: string, budgetId: string): Promise<void>;
    notifyBudgetRejected(entityCode: string, budgetType: string, title: string, budgetId: string, reason: string): Promise<void>;
    notifyBudgetRecallCreated(entityCode: string, title: string, budgetType: string, recallId: string, reason: string): Promise<void>;
    notifyBudgetRecallClosed(entityCode: string, title: string, budgetType: string, recallId: string): Promise<void>;
    notifyRecallDocReviewed(entityCode: string, recallReason: string, docName: string, decision: 'approved' | 'rejected', rejectionNote?: string): Promise<void>;
    notifyRecallRejected(entityCode: string, recallReason: string, reason: string): Promise<void>;
    notifyRecallClosed(entityCode: string, recallReason: string): Promise<void>;
    notifyNewWeek(weekReference: string, weekId: string): Promise<void>;
}
