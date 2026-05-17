import type { Response } from 'express';
import { PaymentRequestsService, RejectPaymentRequestDto } from './payment-requests.service';
export declare class PaymentRequestsController {
    private svc;
    constructor(svc: PaymentRequestsService);
    getSummary(budgetId: string): Promise<{
        initialTotal: number;
        effectiveTotal: number;
        totalPaid: number;
        memoEnabled: boolean;
        totalBudget: number;
        resteAPayer: number;
    }>;
    findByBudget(req: any, budgetId: string): Promise<({
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
    upload(req: any, budgetId: string, file: Express.Multer.File): Promise<{
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
    validate(req: any, id: string): Promise<{
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
    reject(req: any, id: string, dto: RejectPaymentRequestDto): Promise<{
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
    download(id: string, res: Response): Promise<void>;
    uploadProof(req: any, id: string, file: Express.Multer.File, amountRaw: string): Promise<{
        id: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
        paymentRequestId: string;
        fileType: string;
        amount: number;
    }>;
    downloadProof(proofId: string, res: Response): Promise<void>;
    deleteRequest(req: any, id: string): Promise<void>;
    deleteProof(req: any, requestId: string, proofId: string): Promise<void>;
    uploadTemplate(req: any, file: Express.Multer.File): Promise<{
        id: string;
        filePath: string;
        fileName: string;
        uploadedAt: Date;
        uploadedById: string;
    }>;
    downloadTemplate(res: Response): Promise<void>;
}
