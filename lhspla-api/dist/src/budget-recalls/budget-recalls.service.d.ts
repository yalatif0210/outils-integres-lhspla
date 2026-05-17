import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { N8nService } from '../n8n/n8n.service';
import { Role } from '@prisma/client';
export declare class CreateRecallDto {
    budgetId: string;
    reason: string;
}
export declare class AddDocumentDto {
    budgetLineId: string;
    name?: string;
    description?: string;
}
export declare class ReviewDocumentDto {
    decision: 'approved' | 'rejected' | 'pending';
    rejectionNote?: string;
}
export declare class RejectRecallDto {
    reason: string;
}
export declare class BudgetRecallsService {
    private prisma;
    private notifications;
    private n8n;
    constructor(prisma: PrismaService, notifications: NotificationsService, n8n: N8nService);
    findByBudget(budgetId: string, userRoles: Role[], entityCode?: string): Promise<({
        closedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        documents: {
            id: string;
            name: string;
            description: string;
            reviewedAt: Date | null;
            reviewedById: string | null;
            filePath: string;
            fileName: string;
            fileType: string;
            budgetLineId: string;
            rejectionNote: string | null;
            recallId: string;
            fileSize: number;
            addedAt: Date;
            docStatus: string;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    })[]>;
    findAll(userRoles: Role[], entityCode?: string): Promise<({
        budget: {
            entityCode: string;
            id: string;
            _count: {
                lines: number;
            };
            title: string;
            budgetType: import("@prisma/client").$Enums.BudgetType;
        };
        closedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        documents: {
            id: string;
            name: string;
            fileType: string;
            budgetLineId: string;
            addedAt: Date;
            docStatus: string;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    })[]>;
    getAuditLog(recallId: string, userRoles: Role[], entityCode?: string): Promise<({
        user: {
            firstName: string;
            lastName: string;
            roles: import("@prisma/client").$Enums.Role[];
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        recallId: string;
        action: import("@prisma/client").$Enums.RecallAction;
        detail: string;
    })[]>;
    getCoverage(recallId: string, userRoles: Role[], entityCode?: string): Promise<{
        total: number;
        covered: number;
        percentage: number;
    }>;
    create(dto: CreateRecallDto, entityCode: string, userId: string): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    }>;
    addDocument(recallId: string, dto: AddDocumentDto, file: Express.Multer.File, entityCode: string, userId: string, userRoles: Role[]): Promise<{
        id: string;
        name: string;
        description: string;
        reviewedAt: Date | null;
        reviewedById: string | null;
        filePath: string;
        fileName: string;
        fileType: string;
        budgetLineId: string;
        rejectionNote: string | null;
        recallId: string;
        fileSize: number;
        addedAt: Date;
        docStatus: string;
    }>;
    deleteDocument(recallId: string, docId: string, entityCode: string, userId: string, userRoles: Role[]): Promise<{
        deleted: boolean;
    }>;
    reviewDocument(recallId: string, docId: string, dto: ReviewDocumentDto, userId: string): Promise<({
        closedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        documents: {
            id: string;
            name: string;
            description: string;
            reviewedAt: Date | null;
            reviewedById: string | null;
            filePath: string;
            fileName: string;
            fileType: string;
            budgetLineId: string;
            rejectionNote: string | null;
            recallId: string;
            fileSize: number;
            addedAt: Date;
            docStatus: string;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    }) | null>;
    rejectRecall(recallId: string, dto: RejectRecallDto, userId: string): Promise<({
        closedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        documents: {
            id: string;
            name: string;
            description: string;
            reviewedAt: Date | null;
            reviewedById: string | null;
            filePath: string;
            fileName: string;
            fileType: string;
            budgetLineId: string;
            rejectionNote: string | null;
            recallId: string;
            fileSize: number;
            addedAt: Date;
            docStatus: string;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    }) | null>;
    cancelRecall(recallId: string, entityCode: string, userId: string): Promise<({
        closedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        documents: {
            id: string;
            name: string;
            description: string;
            reviewedAt: Date | null;
            reviewedById: string | null;
            filePath: string;
            fileName: string;
            fileType: string;
            budgetLineId: string;
            rejectionNote: string | null;
            recallId: string;
            fileSize: number;
            addedAt: Date;
            docStatus: string;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    }) | null>;
    close(recallId: string, userId: string): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    }>;
    reopen(recallId: string, userId: string): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RecallStatus;
        closedAt: Date | null;
        rejectionReason: string | null;
        budgetId: string;
        reason: string;
        closedById: string | null;
        cancelledAt: Date | null;
    }>;
    private getEntityPhone;
    private getRolePhones;
}
