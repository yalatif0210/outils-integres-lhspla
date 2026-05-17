import type { Response } from 'express';
import { BudgetProjectsService, CreateBudgetDto, UpdateBudgetDto, FinanceReviewDto, ReviewBudgetDto, COPReviewBudgetDto } from './budget-projects.service';
export declare class BudgetProjectsController {
    private svc;
    constructor(svc: BudgetProjectsService);
    findAll(req: any, entityCode?: string, budgetNumber?: string, createdAt?: string): Promise<({
        activityReference: {
            id: string;
            title: string;
            activityCode: string;
        } | null;
        _count: {
            recalls: number;
            paymentRequests: number;
        };
        fund: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    })[]>;
    findOne(req: any, id: string): Promise<{
        activityReference: {
            id: string;
            title: string;
            os: string;
            oo: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        lines: ({
            costItem: {
                id: string;
                designation: string;
                nature: string;
                justificatif: string;
            } | null;
        } & {
            id: string;
            updatedAt: Date;
            budgetId: string;
            rowKey: string;
            costItemId: string | null;
            designation: string;
            unitCost: number | null;
            quantity: number | null;
            frequency: number | null;
        })[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    create(req: any, dto: CreateBudgetDto): Promise<{
        activityReference: {
            id: string;
            title: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        lines: {
            id: string;
            updatedAt: Date;
            budgetId: string;
            rowKey: string;
            costItemId: string | null;
            designation: string;
            unitCost: number | null;
            quantity: number | null;
            frequency: number | null;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    update(req: any, id: string, dto: UpdateBudgetDto): Promise<{
        activityReference: {
            id: string;
            title: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        lines: ({
            costItem: {
                id: string;
                designation: string;
                nature: string;
                justificatif: string;
            } | null;
        } & {
            id: string;
            updatedAt: Date;
            budgetId: string;
            rowKey: string;
            costItemId: string | null;
            designation: string;
            unitCost: number | null;
            quantity: number | null;
            frequency: number | null;
        })[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    submit(req: any, id: string): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    financeReview(req: any, id: string, dto: FinanceReviewDto): Promise<{
        activityReference: {
            id: string;
            title: string;
            os: string;
            oo: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        lines: ({
            costItem: {
                id: string;
                designation: string;
                nature: string;
                justificatif: string;
            } | null;
        } & {
            id: string;
            updatedAt: Date;
            budgetId: string;
            rowKey: string;
            costItemId: string | null;
            designation: string;
            unitCost: number | null;
            quantity: number | null;
            frequency: number | null;
        })[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    tpmReview(req: any, id: string, dto: ReviewBudgetDto): Promise<{
        activityReference: {
            id: string;
            title: string;
            os: string;
            oo: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        lines: ({
            costItem: {
                id: string;
                designation: string;
                nature: string;
                justificatif: string;
            } | null;
        } & {
            id: string;
            updatedAt: Date;
            budgetId: string;
            rowKey: string;
            costItemId: string | null;
            designation: string;
            unitCost: number | null;
            quantity: number | null;
            frequency: number | null;
        })[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    copReview(req: any, id: string, dto: COPReviewBudgetDto): Promise<{
        activityReference: {
            id: string;
            title: string;
            os: string;
            oo: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        lines: ({
            costItem: {
                id: string;
                designation: string;
                nature: string;
                justificatif: string;
            } | null;
        } & {
            id: string;
            updatedAt: Date;
            budgetId: string;
            rowKey: string;
            costItemId: string | null;
            designation: string;
            unitCost: number | null;
            quantity: number | null;
            frequency: number | null;
        })[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    remove(req: any, id: string): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BudgetStatus;
        submittedAt: Date | null;
        title: string;
        budgetType: import("@prisma/client").$Enums.BudgetType;
        fundId: string;
        activityReferenceId: string | null;
        exchangeRate: number;
        transferFeeRate: number;
        totalAmount: number;
        rejectionReason: string | null;
        rejectedAt: Date | null;
        tpmReviewedAt: Date | null;
        tpmReviewedById: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
        tdrFilePath: string | null;
        tdrFileExt: string | null;
        budgetNumber: string | null;
        financeReviewedAt: Date | null;
        financeReviewedById: string | null;
    }>;
    uploadTdr(req: any, id: string, file: Express.Multer.File): Promise<any>;
    downloadTdr(id: string, res: Response): Promise<void>;
}
