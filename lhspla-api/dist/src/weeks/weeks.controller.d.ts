import { WeeksService, CreateWeekDto } from './weeks.service';
export declare class WeeksController {
    private weeksService;
    constructor(weeksService: WeeksService);
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
    findOne(id: string): Promise<{
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
    getMatrix(id: string): Promise<{
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
    create(dto: CreateWeekDto, user: any): Promise<{
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
    close(id: string): Promise<{
        id: string;
        createdAt: Date;
        weekStart: Date;
        weekEnd: Date;
        weekReference: string;
        status: import("@prisma/client").$Enums.WeekStatus;
        createdBy: string;
        closedAt: Date | null;
    }>;
    reopen(id: string): Promise<{
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
