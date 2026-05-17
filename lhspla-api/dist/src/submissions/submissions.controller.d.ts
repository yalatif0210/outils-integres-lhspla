import { SubmissionsService } from './submissions.service';
export declare class SubmissionsController {
    private submissionsService;
    constructor(submissionsService: SubmissionsService);
    findOne(weekId: string, entityCode: string): Promise<any>;
    getLocks(weekId: string, entityCode: string): Promise<({
        lockedBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        submissionId: string;
        section: import("@prisma/client").$Enums.SectionType;
        lockedById: string;
        lockedAt: Date;
        expiresAt: Date;
    })[]>;
    acquireLock(weekId: string, entityCode: string, section: string, user: any): Promise<{
        lockedBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        submissionId: string;
        section: import("@prisma/client").$Enums.SectionType;
        lockedById: string;
        lockedAt: Date;
        expiresAt: Date;
    }>;
    releaseLock(weekId: string, entityCode: string, section: string, user: any): Promise<{
        released: boolean;
    }>;
    save(weekId: string, entityCode: string, section: string, data: any, user: any): Promise<{
        submittedBy: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        activities: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderIndex: number;
            title: string;
            submissionId: string;
            location: string;
            objectives: string;
            dates: string;
            startDate: Date | null;
            endDate: Date | null;
            recommendations: string;
        }[];
        plannedActivities: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderIndex: number;
            title: string;
            submissionId: string;
            location: string;
            objectives: string;
            startDate: Date | null;
            endDate: Date | null;
            plannedDates: string;
            dosParticipation: import("@prisma/client").$Enums.DosParticipation | null;
            observations: string;
        }[];
        riskPoints: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderIndex: number;
            submissionId: string;
            theme: string;
            category: string;
            description: string;
            criticality: import("@prisma/client").$Enums.CriticalityLevel | null;
            expectedAction: string;
        }[];
    } & {
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubmissionStatus;
        weekId: string;
        responsible: string;
        submissionDate: string;
        lastSavedAt: Date | null;
        submittedAt: Date | null;
        submittedById: string | null;
    }>;
    submit(weekId: string, entityCode: string, user: any): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubmissionStatus;
        weekId: string;
        responsible: string;
        submissionDate: string;
        lastSavedAt: Date | null;
        submittedAt: Date | null;
        submittedById: string | null;
    }>;
    reopen(weekId: string, entityCode: string, user: any): Promise<{
        entityCode: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubmissionStatus;
        weekId: string;
        responsible: string;
        submissionDate: string;
        lastSavedAt: Date | null;
        submittedAt: Date | null;
        submittedById: string | null;
    }>;
    private assertCanEdit;
}
