import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../app-config/app-config.service';
import { Role } from '@prisma/client';
export declare class DashboardService {
    private prisma;
    private appConfig;
    constructor(prisma: PrismaService, appConfig: AppConfigService);
    private buildWeekWhere;
    getAdminOverview(year?: string, weekStatus?: string, weekId?: string): Promise<{
        totalUsers: number;
        activeUsers: number;
        totalWeeks: number;
        activeWeeks: number;
        recentWeeks: ({
            submissions: {
                entityCode: string;
                status: import("@prisma/client").$Enums.SubmissionStatus;
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
        })[];
    }>;
    getCompletionHeatmap(limit?: number, year?: string, weekStatus?: string, entityCode?: string, weekId?: string): Promise<{
        weekId: string;
        weekReference: string;
        weekStart: Date;
        status: import("@prisma/client").$Enums.WeekStatus;
        entities: {
            code: string;
            status: string;
            submittedAt: Date | null;
            onTime: boolean | null;
        }[];
    }[]>;
    getSubmissionRateTrend(limit?: number, year?: string, weekStatus?: string, entityCode?: string, weekId?: string): Promise<{
        weekReference: string;
        weekStart: Date;
        total: number;
        submitted: number;
        submissionRate: number;
        onTimeRate: number;
    }[]>;
    getRiskTrend(limit?: number, year?: string, weekStatus?: string, entityCode?: string, weekId?: string): Promise<{
        weekReference: string;
        weekStart: Date;
        critique: number;
        eleve: number;
        modere: number;
        faible: number;
        total: number;
    }[]>;
    getCriticalRisksAlert(): Promise<{
        weekReference: string;
        weekId: string;
        entityCode: string;
        category: string;
        description: string;
        expectedAction: string;
        createdAt: Date;
    }[]>;
    getEntityComparison(year?: string, weekStatus?: string, entityCode?: string, weekId?: string): Promise<{
        entityCode: string;
        submittedCount: number;
        totalCount: number;
        totalActivities: number;
        totalPlanned: number;
        totalRisks: number;
        avgActivities: number;
    }[]>;
    getEntityDashboard(entityCode: string, limit?: number): Promise<{
        submissionTrend: {
            weekReference: string;
            weekStart: Date;
            status: import("@prisma/client").$Enums.SubmissionStatus;
            activitiesCount: number;
            plannedCount: number;
            risksCount: number;
            submittedAt: Date | null;
        }[];
        riskTrend: {
            weekReference: string;
            weekStart: Date;
            critique: number;
            eleve: number;
            modere: number;
            faible: number;
        }[];
        onTimeTrend: {
            weekReference: string;
            weekStart: Date;
            submittedAt: Date | null;
            onTime: boolean;
            delayHours: number | null;
        }[];
        recentSubmissions: {
            weekId: any;
            weekReference: any;
            weekStart: any;
            weekEnd: any;
            weekStatus: any;
            submissionStatus: any;
            responsible: any;
            submittedAt: any;
            onTime: boolean | null;
            activitiesCount: any;
            plannedCount: any;
            risksCount: any;
            critiqueCount: any;
        }[];
    }>;
    private getEntitySubmissionTrend;
    private getEntityRiskTrend;
    private getEntityOnTimeTrend;
    private getEntityRecentSubmissions;
    getEntityHistory(entityCode: string): Promise<{
        weekId: any;
        weekReference: any;
        weekStart: any;
        weekEnd: any;
        weekStatus: any;
        submissionStatus: any;
        responsible: any;
        submittedAt: any;
        onTime: boolean | null;
        activitiesCount: any;
        plannedCount: any;
        risksCount: any;
        critiqueCount: any;
    }[]>;
    private mapWeekRow;
    getBudgetKpis(userRoles: Role[], userEntityCode: string | null, entityCode?: string, from?: string, to?: string, fiscalYear?: string): Promise<{
        total: number;
        totalAmountFcfa: number;
        totalMemoRallonge: number;
        totalMemoReduction: number;
        effectiveTotalFcfa: number;
        idle: number;
        withPendingPayment: number;
        withValidatedPayment: number;
        fullySolded: number;
        withOpenRecalls: number;
        withClosedRecalls: number;
        byEntity: any[] | undefined;
    }>;
    getMissionStats(userRoles: Role[], userId: string, userEntityCode: string | null, entityCode?: string, personnelId?: string, from?: string, to?: string, fiscalYear?: string): Promise<{
        stats: {
            total: number;
            draft: number;
            pendingTpm: number;
            pendingCop: number;
            copApproved: number;
            pendingDg: number;
            inProgress: number;
            completed: number;
            cancelled: number;
        };
        byPersonnel: any[] | undefined;
        missions: {
            id: string;
            object: string;
            location: string;
            departureDate: Date;
            returnDate: Date;
            status: import("@prisma/client").$Enums.MissionStatus;
            fund: string;
        }[] | undefined;
    }>;
    getFinancialDashboard(entityCode?: string, budgetType?: string, from?: string, to?: string): Promise<{
        global: {
            totalBudgets: number;
            totalBudgetAmount: number;
            totalApprovedAmount: number;
            totalEngaged: number;
            totalPaid: number;
            totalRemaining: number;
            totalMemoRallonge: number;
            totalMemoReduction: number;
            netMemoImpact: number;
            totalMemos: number;
            budgetsWithMemo: number;
            memoEmissionRate: number;
        };
        byEntity: {
            entityCode: string;
            totalBudgets: number;
            totalAmount: number;
            approvedAmount: number;
            engagedAmount: number;
            paidAmount: number;
            remainingToPay: number;
            memoRallonge: number;
            memoReduction: number;
            budgetsWithMemo: number;
            memoEmissionRate: number;
        }[];
        byBudgetType: {
            budgetType: import("@prisma/client").$Enums.BudgetType;
            count: number;
            totalAmount: number;
            memoRallonge: number;
            memoReduction: number;
            effectiveTotal: number;
            paidAmount: number;
        }[];
        monthlyTrend: {
            created: number;
            createdAmount: number;
            paid: number;
            month: string;
        }[];
        topRemaining: {
            entityCode: any;
            title: any;
            budgetNumber: any;
            budgetType: any;
            effectiveTotal: any;
            memoRallonge: any;
            memoReduction: any;
            paidAmount: any;
            remainingToPay: any;
        }[];
        allApprovedBudgets: {
            entityCode: any;
            title: any;
            budgetNumber: any;
            budgetType: any;
            effectiveTotal: any;
            memoRallonge: any;
            memoReduction: any;
            paidAmount: any;
            remainingToPay: any;
        }[];
    }>;
    getWeekPeriods(): Promise<any[]>;
    getAvailableYears(): Promise<string[]>;
    private isOnTime;
    private getDelayHours;
}
