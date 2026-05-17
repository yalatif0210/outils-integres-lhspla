import { BudgetRecallsService, CreateRecallDto, AddDocumentDto, ReviewDocumentDto, RejectRecallDto } from './budget-recalls.service';
export declare class BudgetRecallsController {
    private svc;
    constructor(svc: BudgetRecallsService);
    findAll(req: any): Promise<({
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
    findByBudget(req: any, budgetId: string): Promise<({
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
    getCoverage(req: any, id: string): Promise<{
        total: number;
        covered: number;
        percentage: number;
    }>;
    getAudit(req: any, id: string): Promise<({
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
    create(req: any, dto: CreateRecallDto): Promise<{
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
    addDocument(req: any, id: string, dto: AddDocumentDto, file: Express.Multer.File): Promise<{
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
    reviewDocument(req: any, id: string, docId: string, dto: ReviewDocumentDto): Promise<({
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
    deleteDocument(req: any, id: string, docId: string): Promise<{
        deleted: boolean;
    }>;
    rejectRecall(req: any, id: string, dto: RejectRecallDto): Promise<({
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
    cancelRecall(req: any, id: string): Promise<({
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
    close(req: any, id: string): Promise<{
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
    reopen(req: any, id: string): Promise<{
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
}
