import type { Response } from 'express';
import { BudgetMemosService, CopReviewMemoDto } from './budget-memos.service';
export declare class BudgetMemosController {
    private svc;
    constructor(svc: BudgetMemosService);
    findByBudget(req: any, budgetId: string): Promise<{
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
    create(req: any, body: any, file?: Express.Multer.File): Promise<{
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
    copReview(req: any, id: string, dto: CopReviewMemoDto): Promise<{
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
    delete(req: any, id: string): Promise<void>;
    downloadFile(id: string, res: Response): Promise<void>;
}
