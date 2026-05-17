import { PrismaService } from '../prisma/prisma.service';
import { WeekStatus } from '@prisma/client';
export declare class CreateWeekDto {
    weekStart: string;
    weekEnd: string;
    weekReference: string;
}
export declare class WeeksService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        submissions: {
            entityCode: string;
            status: import("@prisma/client").$Enums.SubmissionStatus;
            lastSavedAt: Date | null;
            submittedAt: Date | null;
        }[];
        _count: {
            submissions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        weekStart: Date;
        weekEnd: Date;
        weekReference: string;
        status: import("@prisma/client").$Enums.WeekStatus;
        createdBy: string;
        closedAt: Date | null;
    })[]>;
    findById(id: string): Promise<{
        submissions: ({
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        weekStart: Date;
        weekEnd: Date;
        weekReference: string;
        status: import("@prisma/client").$Enums.WeekStatus;
        createdBy: string;
        closedAt: Date | null;
    }>;
    findActive(): Promise<({
        submissions: {
            entityCode: string;
            status: import("@prisma/client").$Enums.SubmissionStatus;
        }[];
    } & {
        id: string;
        createdAt: Date;
        weekStart: Date;
        weekEnd: Date;
        weekReference: string;
        status: import("@prisma/client").$Enums.WeekStatus;
        createdBy: string;
        closedAt: Date | null;
    })[]>;
    create(dto: CreateWeekDto, userId: string): Promise<{
        submissions: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        weekStart: Date;
        weekEnd: Date;
        weekReference: string;
        status: import("@prisma/client").$Enums.WeekStatus;
        createdBy: string;
        closedAt: Date | null;
    }>;
    setStatus(id: string, status: WeekStatus): Promise<{
        id: string;
        createdAt: Date;
        weekStart: Date;
        weekEnd: Date;
        weekReference: string;
        status: import("@prisma/client").$Enums.WeekStatus;
        createdBy: string;
        closedAt: Date | null;
    }>;
    getSubmissionMatrix(weekId: string): Promise<{
        submissions: {
            entityCode: string;
            _count: {
                activities: number;
                plannedActivities: number;
                riskPoints: number;
            };
            status: import("@prisma/client").$Enums.SubmissionStatus;
            responsible: string;
            lastSavedAt: Date | null;
            submittedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        weekStart: Date;
        weekEnd: Date;
        weekReference: string;
        status: import("@prisma/client").$Enums.WeekStatus;
        createdBy: string;
        closedAt: Date | null;
    }>;
}
