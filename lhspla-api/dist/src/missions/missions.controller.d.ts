import type { Response } from 'express';
import { MissionsService, CreateMissionDto, UpdateMissionDto, CopReviewDto } from './missions.service';
export declare class MissionsController {
    private svc;
    constructor(svc: MissionsService);
    findAll(req: any, entityCode?: string): Promise<({
        initiator: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            roles: import("@prisma/client").$Enums.Role[];
            entityCode: string | null;
        };
        budget: {
            id: string;
            budgetType: import("@prisma/client").$Enums.BudgetType;
            title: string;
        } | null;
        activityRef: {
            id: string;
            title: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        participants: ({
            personnel: {
                function: string;
                id: string;
                fullName: string;
                service: string;
            };
        } & {
            id: string;
            missionId: string;
            personnelId: string;
        })[];
    } & {
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    missionDashboard(): Promise<any[]>;
    create(req: any, dto: CreateMissionDto): Promise<{
        initiator: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            roles: import("@prisma/client").$Enums.Role[];
        };
        budget: {
            id: string;
            budgetType: import("@prisma/client").$Enums.BudgetType;
            title: string;
        } | null;
        activityRef: {
            id: string;
            title: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        participants: ({
            personnel: {
                function: string;
                id: string;
                fullName: string;
                service: string;
            };
        } & {
            id: string;
            missionId: string;
            personnelId: string;
        })[];
    } & {
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findOne(id: string): Promise<{
        initiator: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            roles: import("@prisma/client").$Enums.Role[];
            entityCode: string | null;
        };
        budget: {
            id: string;
            entityCode: string;
            budgetType: import("@prisma/client").$Enums.BudgetType;
            title: string;
        } | null;
        activityRef: {
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
        participants: ({
            personnel: {
                function: string;
                id: string;
                email: string | null;
                fullName: string;
                service: string;
                waveNumber: string | null;
            };
        } & {
            id: string;
            missionId: string;
            personnelId: string;
        })[];
    } & {
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(req: any, id: string, dto: UpdateMissionDto): Promise<{
        initiator: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            roles: import("@prisma/client").$Enums.Role[];
        };
        budget: {
            id: string;
            budgetType: import("@prisma/client").$Enums.BudgetType;
            title: string;
        } | null;
        activityRef: {
            id: string;
            title: string;
            activityCode: string;
        } | null;
        fund: {
            id: string;
            name: string;
            code: string;
        };
        participants: ({
            personnel: {
                function: string;
                id: string;
                fullName: string;
                service: string;
            };
        } & {
            id: string;
            missionId: string;
            personnelId: string;
        })[];
    } & {
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    submit(req: any, id: string): Promise<{
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    tpmReview(req: any, id: string, dto: any): Promise<{
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    copReview(req: any, id: string, dto: CopReviewDto): Promise<{
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    generateDocs(req: any, id: string): Promise<{
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    validateDg(req: any, id: string): Promise<{
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateDashboard(id: string, dto: any): Promise<{
        id: string;
        orderNumber: string | null;
        dashboardObservations: string | null;
    }>;
    cancel(req: any, id: string): Promise<{
        object: string;
        id: string;
        initiatorId: string;
        budgetId: string | null;
        activityRefId: string | null;
        location: string;
        departureDate: Date;
        returnDate: Date;
        resumeDate: Date;
        fundId: string;
        requestDate: Date;
        status: import("@prisma/client").$Enums.MissionStatus;
        rejectionReason: string | null;
        transmittedAt: Date | null;
        orderNumber: string | null;
        dashboardObservations: string | null;
        isInvitation: boolean;
        cancelledFromDraft: boolean;
        signedDocPath: string | null;
        signedDocExt: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    download(id: string, docType: string, res: Response): void;
    uploadSignedDoc(req: any, id: string, file: Express.Multer.File): Promise<{
        id: string;
        signedDocPath: string | null;
        signedDocExt: string | null;
    }>;
    downloadSignedDoc(id: string, res: Response): Promise<void>;
}
