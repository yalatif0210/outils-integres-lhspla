import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SectionType } from '@prisma/client';
export interface SaveSectionDto {
    section: string;
    data: any;
}
export declare class SubmissionsService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    findByWeekAndEntity(weekId: string, entityCode: string): Promise<any>;
    private normalizeSubmission;
    private static toDoDisplay;
    private static toCritDisplay;
    getLocksStatus(weekId: string, entityCode: string): Promise<({
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
    acquireLock(weekId: string, entityCode: string, section: SectionType, userId: string): Promise<{
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
    releaseLock(weekId: string, entityCode: string, section: SectionType, userId: string): Promise<{
        released: boolean;
    }>;
    saveSection(weekId: string, entityCode: string, dto: SaveSectionDto, userId: string): Promise<{
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
    submit(weekId: string, entityCode: string, userId: string): Promise<{
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
    reopenSubmission(weekId: string, entityCode: string): Promise<{
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
    cleanExpiredLocks(): Promise<void>;
    private findOrCreate;
    private saveSectionA;
    private saveSectionB;
    private saveSectionC;
    private saveSectionD;
    private static mapDos;
    private static mapCriticality;
}
