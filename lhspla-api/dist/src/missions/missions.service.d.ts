import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MissionDocumentService } from './mission-document.service';
import { N8nService } from '../n8n/n8n.service';
import { Role } from '@prisma/client';
export declare class CreateMissionDto {
    object: string;
    location: string;
    departureDate: string;
    returnDate: string;
    resumeDate: string;
    fundId: string;
    budgetId?: string;
    activityRefId?: string;
    participantIds: string[];
    isInvitation?: boolean;
}
export declare class UpdateMissionDto {
    object?: string;
    location?: string;
    departureDate?: string;
    returnDate?: string;
    resumeDate?: string;
    fundId?: string;
    budgetId?: string;
    activityRefId?: string;
    participantIds?: string[];
    isInvitation?: boolean;
}
export declare class CopReviewDto {
    decision: 'cop_approved' | 'cancelled';
    rejectionReason?: string;
}
export declare class MissionsService {
    private prisma;
    private notifications;
    private docService;
    private n8n;
    constructor(prisma: PrismaService, notifications: NotificationsService, docService: MissionDocumentService, n8n: N8nService);
    findAll(userRoles: Role[], entityCode?: string, userId?: string, isEntityResponsible?: boolean): Promise<({
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
    create(dto: CreateMissionDto, initiatorId: string, _initiatorRoles: Role[]): Promise<{
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
    update(id: string, dto: UpdateMissionDto, userId: string): Promise<{
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
    submit(id: string, userId: string, userRoles: Role[]): Promise<{
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
    tpmReview(id: string, dto: any, _userId: string): Promise<{
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
    copReview(id: string, dto: CopReviewDto, _userId: string): Promise<{
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
    generateDocs(id: string, _userId: string): Promise<{
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
    validateDg(id: string, _userId: string): Promise<{
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
    cancel(id: string, userId: string, userRoles: Role[]): Promise<{
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
    getDashboard(): Promise<any[]>;
    updateDashboardFields(id: string, dto: {
        orderNumber?: string;
        dashboardObservations?: string;
    }): Promise<{
        id: string;
        orderNumber: string | null;
        dashboardObservations: string | null;
    }>;
    autoComplete(): Promise<number>;
    uploadSignedDoc(id: string, file: Express.Multer.File, userId: string, userRoles: Role[]): Promise<{
        id: string;
        signedDocPath: string | null;
        signedDocExt: string | null;
    }>;
    getSignedDocPath(id: string): Promise<{
        filePath: string;
        ext: string;
    }>;
    private checkParticipantOverlap;
    private getRolePhones;
    private getUserPhone;
    private notifyByRole;
    private notifyUser;
}
