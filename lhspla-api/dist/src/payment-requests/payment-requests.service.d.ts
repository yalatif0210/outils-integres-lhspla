import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { N8nService } from '../n8n/n8n.service';
import { AppConfigService } from '../app-config/app-config.service';
import { Role } from '@prisma/client';
export declare class RejectPaymentRequestDto {
    reason: string;
}
export declare class UploadProofDto {
    amount: number;
}
export declare class PaymentRequestsService {
    private prisma;
    private notifications;
    private n8n;
    private appConfig;
    constructor(prisma: PrismaService, notifications: NotificationsService, n8n: N8nService, appConfig: AppConfigService);
    findByBudget(budgetId: string, userRoles: Role[], entityCode?: string): Promise<({
        uploadedBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
        validatedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        proofs: {
            id: string;
            filePath: string;
            fileName: string;
            uploadedAt: Date;
            uploadedById: string;
            paymentRequestId: string;
            fileType: string;
            amount: number;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentRequestStatus;
        rejectionReason: string | null;
        budgetId: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
        validatedAt: Date | null;
        validatedById: string | null;
        paidAt: Date | null;
    })[]>;
    upload(budgetId: string, file: Express.Multer.File, userId: string, entityCode: string): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentRequestStatus;
        rejectionReason: string | null;
        budgetId: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
        validatedAt: Date | null;
        validatedById: string | null;
        paidAt: Date | null;
    }>;
    validate(id: string, userId: string, userRoles: Role[]): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentRequestStatus;
        rejectionReason: string | null;
        budgetId: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
        validatedAt: Date | null;
        validatedById: string | null;
        paidAt: Date | null;
    }>;
    reject(id: string, reason: string, userId: string, userRoles: Role[]): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentRequestStatus;
        rejectionReason: string | null;
        budgetId: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
        validatedAt: Date | null;
        validatedById: string | null;
        paidAt: Date | null;
    }>;
    uploadProof(id: string, file: Express.Multer.File, amount: number, userId: string, userRoles: Role[]): Promise<{
        id: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
        paymentRequestId: string;
        fileType: string;
        amount: number;
    }>;
    deleteRequest(id: string, userId: string, userRoles: Role[], entityCode: string): Promise<void>;
    deleteProof(requestId: string, proofId: string, userId: string, userRoles: Role[]): Promise<void>;
    getFilePath(id: string): Promise<{
        filePath: string;
        fileName: string;
    }>;
    getProofPath(proofId: string): Promise<{
        filePath: string;
        fileName: string;
        fileType: string;
    }>;
    getSummary(budgetId: string): Promise<{
        initialTotal: number;
        effectiveTotal: number;
        totalPaid: number;
        memoEnabled: boolean;
        totalBudget: number;
        resteAPayer: number;
    }>;
    computeTotalPaid(budgetId: string): Promise<number>;
    private computeEffectiveTotal;
    uploadTemplate(file: Express.Multer.File, userId: string, userRoles: Role[]): Promise<{
        id: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
    }>;
    getTemplatePath(): Promise<{
        filePath: string;
        fileName: string;
    }>;
    private getEntityTargets;
    private fmtFcfa;
}
