import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppConfigService } from '../app-config/app-config.service';
import { N8nService } from '../n8n/n8n.service';
import { BudgetType, Role } from '@prisma/client';
export declare class BudgetLineDto {
    rowKey: string;
    costItemId?: string;
    designation?: string;
    unitCost?: number;
    quantity?: number;
    frequency?: number;
}
export declare class CreateBudgetDto {
    budgetType: BudgetType;
    title: string;
    fundId: string;
    activityReferenceId?: string;
    exchangeRate?: number;
    transferFeeRate?: number;
    totalAmount?: number;
    lines?: BudgetLineDto[];
}
export declare class UpdateBudgetDto {
    title?: string;
    fundId?: string;
    activityReferenceId?: string;
    exchangeRate?: number;
    transferFeeRate?: number;
    totalAmount?: number;
    lines?: BudgetLineDto[];
}
export declare class FinanceReviewDto {
    decision: 'finance_reviewed' | 'rejected';
    rejectionReason?: string;
}
export declare class ReviewBudgetDto {
    decision: 'tpm_approved' | 'rejected';
    rejectionReason?: string;
}
export declare class COPReviewBudgetDto {
    decision: 'approved' | 'rejected';
    rejectionReason?: string;
}
export declare class BudgetProjectsService {
    private prisma;
    private notifications;
    private appConfig;
    private n8n;
    constructor(prisma: PrismaService, notifications: NotificationsService, appConfig: AppConfigService, n8n: N8nService);
    findAll(userRoles: Role[], entityCode?: string, budgetNumber?: string, createdAt?: string): Promise<({
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
    findOne(id: string, userRoles: Role[], entityCode?: string): Promise<{
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
    create(dto: CreateBudgetDto, entityCode: string): Promise<{
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
    update(id: string, dto: UpdateBudgetDto, userRoles: Role[], entityCode?: string): Promise<{
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
    submit(id: string, entityCode: string, userRoles: Role[]): Promise<{
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
    financeReview(id: string, dto: FinanceReviewDto, financeUserId: string): Promise<{
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
    tpmReview(id: string, dto: ReviewBudgetDto, tpmUserId: string): Promise<{
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
    copReview(id: string, dto: COPReviewBudgetDto, copUserId: string): Promise<{
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
    remove(id: string, userRoles: Role[], entityCode?: string): Promise<{
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
    uploadTdr(id: string, file: Express.Multer.File, userRoles: Role[], entityCode: string | undefined, userId: string): Promise<any>;
    getTdrPath(id: string): Promise<{
        filePath: string;
        ext: string;
    }>;
    private getEntityPhone;
    private getRolePhones;
    private getConfigRate;
}
