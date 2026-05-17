import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { N8nService } from '../n8n/n8n.service';
import { AppConfigService } from '../app-config/app-config.service';
import { Role, MemoCategory } from '@prisma/client';
export declare class CreateBudgetMemoDto {
    category: MemoCategory;
    amount?: number;
    content?: string;
}
export declare class CopReviewMemoDto {
    decision: 'approved' | 'rejected';
    rejectionReason?: string;
}
export declare class BudgetMemosService {
    private prisma;
    private notifications;
    private n8n;
    private appConfig;
    constructor(prisma: PrismaService, notifications: NotificationsService, n8n: N8nService, appConfig: AppConfigService);
    private assertMemoEnabled;
    findByBudget(budgetId: string, userRoles: Role[], entityCode?: string): Promise<{
        memos: ({
            createdBy: {
                firstName: string;
                lastName: string;
                id: string;
            };
            reviewedBy: {
                firstName: string;
                lastName: string;
                id: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.MemoStatus;
            category: import("@prisma/client").$Enums.MemoCategory;
            rejectionReason: string | null;
            reviewedAt: Date | null;
            reviewedById: string | null;
            budgetId: string;
            filePath: string | null;
            fileName: string | null;
            fileType: string | null;
            amount: number;
            content: string | null;
            createdById: string;
        })[];
        budget: {
            totalAmount: number;
            effectiveTotal: number;
            rallonge: number;
            reduction: number;
        };
    }>;
    create(budgetId: string, dto: CreateBudgetMemoDto, file: Express.Multer.File | undefined, userId: string, userRoles: Role[]): Promise<{
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
        reviewedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.MemoStatus;
        category: import("@prisma/client").$Enums.MemoCategory;
        rejectionReason: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        budgetId: string;
        filePath: string | null;
        fileName: string | null;
        fileType: string | null;
        amount: number;
        content: string | null;
        createdById: string;
    }>;
    copReview(id: string, dto: CopReviewMemoDto, userId: string, userRoles: Role[]): Promise<{
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
        reviewedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.MemoStatus;
        category: import("@prisma/client").$Enums.MemoCategory;
        rejectionReason: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        budgetId: string;
        filePath: string | null;
        fileName: string | null;
        fileType: string | null;
        amount: number;
        content: string | null;
        createdById: string;
    }>;
    delete(id: string, userId: string, userRoles: Role[]): Promise<void>;
    downloadFile(id: string): Promise<{
        filePath: string;
        fileName: string;
        fileType: string;
    }>;
}
