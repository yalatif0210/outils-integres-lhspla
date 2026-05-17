"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_config_service_1 = require("../app-config/app-config.service");
const client_1 = require("@prisma/client");
const GLOBAL_ROLES = [client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.admin_finance, client_1.Role.chief_of_party];
const ENTITY_CODES = ['CAD', 'CAC', 'PMO', 'QAD', 'SE', 'SI', 'FINANCES', 'COM'];
const DEADLINE_HOUR = 9;
let DashboardService = class DashboardService {
    prisma;
    appConfig;
    constructor(prisma, appConfig) {
        this.prisma = prisma;
        this.appConfig = appConfig;
    }
    buildWeekWhere(year, weekStatus, weekId) {
        if (weekId)
            return { id: weekId };
        const where = {};
        if (weekStatus)
            where.status = weekStatus;
        if (year) {
            const y = parseInt(year);
            where.weekStart = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31T23:59:59.999Z`) };
        }
        return where;
    }
    async getAdminOverview(year, weekStatus, weekId) {
        const weekWhere = this.buildWeekWhere(year, weekStatus, weekId);
        const [totalUsers, activeUsers, totalWeeks, activeWeeks] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { isActive: true } }),
            this.prisma.week.count({ where: weekWhere }),
            this.prisma.week.count({ where: { ...weekWhere, status: 'active' } }),
        ]);
        const recentWeeks = await this.prisma.week.findMany({
            where: weekWhere,
            orderBy: { weekStart: 'desc' },
            take: 10,
            include: {
                submissions: { select: { entityCode: true, status: true, submittedAt: true } },
            },
        });
        return { totalUsers, activeUsers, totalWeeks, activeWeeks, recentWeeks };
    }
    async getCompletionHeatmap(limit = 12, year, weekStatus, entityCode, weekId) {
        const where = this.buildWeekWhere(year, weekStatus, weekId);
        const weeks = await this.prisma.week.findMany({
            where,
            orderBy: { weekStart: 'desc' },
            take: limit,
            include: {
                submissions: { select: { entityCode: true, status: true, submittedAt: true, lastSavedAt: true } },
            },
        });
        const displayEntities = entityCode ? [entityCode] : ENTITY_CODES;
        return weeks.map(w => ({
            weekId: w.id,
            weekReference: w.weekReference,
            weekStart: w.weekStart,
            status: w.status,
            entities: displayEntities.map(code => {
                const sub = w.submissions.find(s => s.entityCode === code);
                return {
                    code,
                    status: sub?.status ?? 'missing',
                    submittedAt: sub?.submittedAt ?? null,
                    onTime: sub?.submittedAt ? this.isOnTime(sub.submittedAt, w.weekEnd) : null,
                };
            }),
        }));
    }
    async getSubmissionRateTrend(limit = 12, year, weekStatus, entityCode, weekId) {
        const where = this.buildWeekWhere(year, weekStatus, weekId);
        const weeks = await this.prisma.week.findMany({
            where,
            orderBy: { weekStart: 'desc' },
            take: limit,
            include: {
                submissions: {
                    where: entityCode ? { entityCode } : undefined,
                    select: { status: true, submittedAt: true },
                },
            },
        });
        const entityCount = entityCode ? 1 : 8;
        return weeks.reverse().map(w => {
            const submitted = w.submissions.filter(s => s.status === 'submitted').length;
            const onTime = w.submissions.filter(s => s.submittedAt && this.isOnTime(s.submittedAt, w.weekEnd)).length;
            return {
                weekReference: w.weekReference,
                weekStart: w.weekStart,
                total: entityCount,
                submitted,
                submissionRate: Math.round((submitted / entityCount) * 100),
                onTimeRate: Math.round((onTime / entityCount) * 100),
            };
        });
    }
    async getRiskTrend(limit = 12, year, weekStatus, entityCode, weekId) {
        const where = this.buildWeekWhere(year, weekStatus, weekId);
        const weeks = await this.prisma.week.findMany({
            where,
            orderBy: { weekStart: 'desc' },
            take: limit,
            include: {
                submissions: {
                    where: entityCode ? { entityCode } : undefined,
                    include: { riskPoints: { select: { criticality: true } } },
                },
            },
        });
        return weeks.reverse().map(w => {
            const all = w.submissions.flatMap(s => s.riskPoints.filter(r => r.criticality));
            return {
                weekReference: w.weekReference,
                weekStart: w.weekStart,
                critique: all.filter(r => r.criticality === 'critique').length,
                eleve: all.filter(r => r.criticality === 'eleve').length,
                modere: all.filter(r => r.criticality === 'modere').length,
                faible: all.filter(r => r.criticality === 'faible').length,
                total: all.length,
            };
        });
    }
    async getCriticalRisksAlert() {
        const activeWeeks = await this.prisma.week.findMany({
            where: { status: 'active' },
            include: {
                submissions: {
                    include: { riskPoints: { where: { criticality: 'critique', description: { not: '' } } } },
                },
            },
        });
        return activeWeeks.flatMap(w => w.submissions.flatMap(s => s.riskPoints.map(r => ({
            weekReference: w.weekReference,
            weekId: w.id,
            entityCode: s.entityCode,
            category: r.category,
            description: r.description,
            expectedAction: r.expectedAction,
            createdAt: r.createdAt,
        }))));
    }
    async getEntityComparison(year, weekStatus, entityCode, weekId) {
        const where = this.buildWeekWhere(year, weekStatus, weekId);
        if (!year && !weekStatus)
            where.status = 'active';
        const weeks = await this.prisma.week.findMany({
            where,
            include: {
                submissions: {
                    include: {
                        _count: { select: { activities: true, plannedActivities: true, riskPoints: true } },
                    },
                },
            },
        });
        const displayEntities = entityCode ? [entityCode] : ENTITY_CODES;
        return displayEntities.map(code => {
            const subs = weeks.flatMap(w => w.submissions.filter(s => s.entityCode === code));
            return {
                entityCode: code,
                submittedCount: subs.filter(s => s.status === 'submitted').length,
                totalCount: subs.length,
                totalActivities: subs.reduce((sum, s) => sum + s._count.activities, 0),
                totalPlanned: subs.reduce((sum, s) => sum + s._count.plannedActivities, 0),
                totalRisks: subs.reduce((sum, s) => sum + s._count.riskPoints, 0),
                avgActivities: subs.length ? Math.round(subs.reduce((sum, s) => sum + s._count.activities, 0) / subs.length) : 0,
            };
        });
    }
    async getEntityDashboard(entityCode, limit = 12) {
        const [submissionTrend, riskTrend, onTimeTrend, recentSubmissions] = await Promise.all([
            this.getEntitySubmissionTrend(entityCode, limit),
            this.getEntityRiskTrend(entityCode, limit),
            this.getEntityOnTimeTrend(entityCode, limit),
            this.getEntityRecentSubmissions(entityCode, limit),
        ]);
        return { submissionTrend, riskTrend, onTimeTrend, recentSubmissions };
    }
    async getEntitySubmissionTrend(entityCode, limit) {
        const weeks = await this.prisma.week.findMany({
            orderBy: { weekStart: 'desc' },
            take: limit,
            include: {
                submissions: {
                    where: { entityCode },
                    include: { _count: { select: { activities: true, plannedActivities: true, riskPoints: true } } },
                },
            },
        });
        return weeks.reverse().map(w => {
            const sub = w.submissions[0];
            return {
                weekReference: w.weekReference,
                weekStart: w.weekStart,
                status: sub?.status ?? 'missing',
                activitiesCount: sub?._count.activities ?? 0,
                plannedCount: sub?._count.plannedActivities ?? 0,
                risksCount: sub?._count.riskPoints ?? 0,
                submittedAt: sub?.submittedAt ?? null,
            };
        });
    }
    async getEntityRiskTrend(entityCode, limit) {
        const weeks = await this.prisma.week.findMany({
            orderBy: { weekStart: 'desc' },
            take: limit,
            include: {
                submissions: {
                    where: { entityCode },
                    include: { riskPoints: { select: { criticality: true } } },
                },
            },
        });
        return weeks.reverse().map(w => {
            const risks = w.submissions[0]?.riskPoints.filter(r => r.criticality) ?? [];
            return {
                weekReference: w.weekReference,
                weekStart: w.weekStart,
                critique: risks.filter(r => r.criticality === 'critique').length,
                eleve: risks.filter(r => r.criticality === 'eleve').length,
                modere: risks.filter(r => r.criticality === 'modere').length,
                faible: risks.filter(r => r.criticality === 'faible').length,
            };
        });
    }
    async getEntityOnTimeTrend(entityCode, limit) {
        const submissions = await this.prisma.entitySubmission.findMany({
            where: { entityCode, status: 'submitted' },
            include: { week: { select: { weekEnd: true, weekReference: true, weekStart: true } } },
            orderBy: { submittedAt: 'desc' },
            take: limit,
        });
        return submissions.reverse().map(s => ({
            weekReference: s.week.weekReference,
            weekStart: s.week.weekStart,
            submittedAt: s.submittedAt,
            onTime: s.submittedAt ? this.isOnTime(s.submittedAt, s.week.weekEnd) : false,
            delayHours: s.submittedAt ? this.getDelayHours(s.submittedAt, s.week.weekEnd) : null,
        }));
    }
    async getEntityRecentSubmissions(entityCode, limit) {
        const weeks = await this.prisma.week.findMany({
            orderBy: { weekStart: 'desc' },
            take: limit,
            include: {
                submissions: {
                    where: { entityCode },
                    include: {
                        _count: { select: { activities: true, plannedActivities: true, riskPoints: true } },
                        riskPoints: { where: { criticality: 'critique' }, select: { id: true } },
                    },
                },
            },
        });
        return weeks.map(w => this.mapWeekRow(w, entityCode));
    }
    async getEntityHistory(entityCode) {
        const weeks = await this.prisma.week.findMany({
            orderBy: { weekStart: 'desc' },
            include: {
                submissions: {
                    where: { entityCode },
                    include: {
                        _count: { select: { activities: true, plannedActivities: true, riskPoints: true } },
                        riskPoints: { where: { criticality: 'critique' }, select: { id: true } },
                    },
                },
            },
        });
        return weeks.map(w => this.mapWeekRow(w, entityCode));
    }
    mapWeekRow(w, entityCode) {
        const sub = w.submissions[0];
        return {
            weekId: w.id,
            weekReference: w.weekReference,
            weekStart: w.weekStart,
            weekEnd: w.weekEnd,
            weekStatus: w.status,
            submissionStatus: sub?.status ?? 'missing',
            responsible: sub?.responsible ?? '',
            submittedAt: sub?.submittedAt ?? null,
            onTime: sub?.submittedAt ? this.isOnTime(sub.submittedAt, w.weekEnd) : null,
            activitiesCount: sub?._count.activities ?? 0,
            plannedCount: sub?._count.plannedActivities ?? 0,
            risksCount: sub?._count.riskPoints ?? 0,
            critiqueCount: sub?.riskPoints.length ?? 0,
        };
    }
    async getBudgetKpis(userRoles, userEntityCode, entityCode, from, to, fiscalYear) {
        const isGlobal = userRoles.some(r => GLOBAL_ROLES.includes(r));
        const targetEntity = isGlobal ? entityCode : (userEntityCode ?? undefined);
        const where = { status: 'approved' };
        if (targetEntity)
            where.entityCode = targetEntity;
        if (fiscalYear) {
            const y = parseInt(fiscalYear);
            where.createdAt = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31T23:59:59.999Z`) };
        }
        else if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = new Date(from);
            if (to) {
                const d = new Date(to);
                d.setHours(23, 59, 59, 999);
                where.createdAt.lte = d;
            }
        }
        const budgets = await this.prisma.budgetProject.findMany({
            where,
            include: {
                paymentRequests: {
                    select: { status: true, proofs: { select: { amount: true } } },
                },
                recalls: { select: { status: true } },
                fund: { select: { name: true, code: true } },
            },
        });
        const budgetIds = budgets.map(b => b.id);
        const memoMap = new Map();
        try {
            const memos = await this.prisma.budgetMemo.findMany({
                where: { budgetId: { in: budgetIds }, status: 'approved' },
                select: { budgetId: true, category: true, amount: true },
            });
            for (const m of memos) {
                const e = memoMap.get(m.budgetId) ?? { rallonge: 0, reduction: 0 };
                if (m.category === 'rallonge_budgetaire')
                    e.rallonge += m.amount;
                if (m.category === 'reduction_budgetaire')
                    e.reduction += m.amount;
                memoMap.set(m.budgetId, e);
            }
        }
        catch { }
        const totalAmountFcfa = budgets.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalMemoRallonge = [...memoMap.values()].reduce((s, m) => s + m.rallonge, 0);
        const totalMemoReduction = [...memoMap.values()].reduce((s, m) => s + m.reduction, 0);
        const effectiveTotalFcfa = totalAmountFcfa + totalMemoRallonge - totalMemoReduction;
        const budgetPaidMap = new Map();
        for (const b of budgets) {
            const paid = b.paymentRequests
                .filter(pr => pr.status === 'paid')
                .flatMap(pr => pr.proofs ?? [])
                .reduce((s, p) => s + (p.amount ?? 0), 0);
            budgetPaidMap.set(b.id, paid);
        }
        let kpiMemoEnabled = false;
        try {
            const cfg = await this.appConfig.getMap();
            kpiMemoEnabled = cfg['memo_enabled'] === 'true';
        }
        catch { }
        const total = budgets.length;
        const idle = budgets.filter(b => b.paymentRequests.length === 0 && b.recalls.length === 0).length;
        const withPendingPayment = budgets.filter(b => b.paymentRequests.some(pr => pr.status === 'uploaded')).length;
        const withValidatedPayment = budgets.filter(b => b.paymentRequests.some(pr => pr.status === 'validated')).length;
        const fullySolded = budgets.filter(b => {
            const memo = memoMap.get(b.id) ?? { rallonge: 0, reduction: 0 };
            const effective = b.totalAmount + memo.rallonge - memo.reduction;
            const totalBudget = kpiMemoEnabled ? effective : b.totalAmount;
            const paid = budgetPaidMap.get(b.id) ?? 0;
            return totalBudget > 0 && paid >= totalBudget;
        }).length;
        const withOpenRecalls = budgets.filter(b => b.recalls.some(r => r.status === 'open')).length;
        const withClosedRecalls = budgets.filter(b => b.recalls.some(r => r.status === 'closed')).length;
        let byEntity;
        if (isGlobal && !targetEntity) {
            const map = new Map();
            for (const b of budgets) {
                const memo = memoMap.get(b.id) ?? { rallonge: 0, reduction: 0 };
                const e = map.get(b.entityCode) ?? {
                    entityCode: b.entityCode, total: 0, totalAmountFcfa: 0,
                    memoRallonge: 0, memoReduction: 0, effectiveAmountFcfa: 0,
                    pendingPayment: 0, validatedPayment: 0, solded: 0, openRecalls: 0, closedRecalls: 0,
                };
                e.total++;
                e.totalAmountFcfa += b.totalAmount;
                e.memoRallonge += memo.rallonge;
                e.memoReduction += memo.reduction;
                e.effectiveAmountFcfa += b.totalAmount + memo.rallonge - memo.reduction;
                if (b.paymentRequests.some(pr => pr.status === 'uploaded'))
                    e.pendingPayment++;
                if (b.paymentRequests.some(pr => pr.status === 'validated'))
                    e.validatedPayment++;
                const bPaid = budgetPaidMap.get(b.id) ?? 0;
                const bEffective = b.totalAmount + memo.rallonge - memo.reduction;
                if (bEffective > 0 && bPaid >= bEffective)
                    e.solded++;
                if (b.recalls.some(r => r.status === 'open'))
                    e.openRecalls++;
                if (b.recalls.some(r => r.status === 'closed'))
                    e.closedRecalls++;
                map.set(b.entityCode, e);
            }
            byEntity = Array.from(map.values()).sort((a, b) => b.totalAmountFcfa - a.totalAmountFcfa);
        }
        return {
            total, totalAmountFcfa, totalMemoRallonge, totalMemoReduction, effectiveTotalFcfa,
            idle, withPendingPayment, withValidatedPayment, fullySolded, withOpenRecalls, withClosedRecalls,
            byEntity,
        };
    }
    async getMissionStats(userRoles, userId, userEntityCode, entityCode, personnelId, from, to, fiscalYear) {
        const isGlobal = userRoles.some(r => [client_1.Role.super_admin, client_1.Role.chief_of_party].includes(r));
        const where = {};
        if (!isGlobal) {
            where.initiatorId = userId;
        }
        else if (entityCode) {
            where.initiator = { entityCode };
        }
        if (personnelId)
            where.participants = { some: { personnelId } };
        if (fiscalYear) {
            const y = parseInt(fiscalYear);
            where.departureDate = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31T23:59:59.999Z`) };
        }
        else if (from || to) {
            where.departureDate = {};
            if (from)
                where.departureDate.gte = new Date(from);
            if (to) {
                const d = new Date(to);
                d.setHours(23, 59, 59, 999);
                where.departureDate.lte = d;
            }
        }
        const missions = await this.prisma.missionRequest.findMany({
            where,
            include: {
                initiator: { select: { id: true, firstName: true, lastName: true, entityCode: true } },
                participants: { include: { personnel: { select: { id: true, fullName: true, service: true, function: true } } } },
                fund: { select: { name: true, code: true } },
            },
            orderBy: { departureDate: 'desc' },
        });
        const byStatus = (s) => missions.filter(m => m.status === s).length;
        const stats = {
            total: missions.length,
            draft: byStatus('draft'),
            pendingTpm: byStatus('pending_tpm'),
            pendingCop: byStatus('pending_cop'),
            copApproved: byStatus('cop_approved'),
            pendingDg: byStatus('pending_dg'),
            inProgress: byStatus('in_progress'),
            completed: byStatus('completed'),
            cancelled: byStatus('cancelled'),
        };
        let byPersonnel;
        if (isGlobal) {
            const map = new Map();
            for (const m of missions) {
                for (const p of m.participants) {
                    const key = p.personnelId;
                    const e = map.get(key) ?? {
                        personnelId: key,
                        fullName: p.personnel.fullName,
                        service: p.personnel.service,
                        function: p.personnel.function,
                        total: 0, inProgress: 0, completed: 0, cancelled: 0,
                    };
                    e.total++;
                    if (m.status === 'in_progress')
                        e.inProgress++;
                    if (m.status === 'completed')
                        e.completed++;
                    if (m.status === 'cancelled')
                        e.cancelled++;
                    map.set(key, e);
                }
            }
            byPersonnel = Array.from(map.values()).sort((a, b) => b.total - a.total);
        }
        return { stats, byPersonnel, missions: isGlobal ? undefined : missions.map(m => ({
                id: m.id, object: m.object, location: m.location,
                departureDate: m.departureDate, returnDate: m.returnDate,
                status: m.status, fund: m.fund?.name,
            })) };
    }
    async getFinancialDashboard(entityCode, budgetType, from, to) {
        const budgetWhere = {};
        if (entityCode)
            budgetWhere.entityCode = entityCode;
        if (budgetType)
            budgetWhere.budgetType = budgetType;
        if (from || to) {
            budgetWhere.createdAt = {};
            if (from)
                budgetWhere.createdAt.gte = new Date(from);
            if (to) {
                const d = new Date(to);
                d.setHours(23, 59, 59, 999);
                budgetWhere.createdAt.lte = d;
            }
        }
        const budgets = await this.prisma.budgetProject.findMany({
            where: budgetWhere,
            include: {
                paymentRequests: {
                    include: { proofs: { select: { amount: true } } },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        const budgetIds = budgets.map(b => b.id);
        let finMemoEnabled = false;
        try {
            const cfg = await this.appConfig.getMap();
            finMemoEnabled = cfg['memo_enabled'] === 'true';
        }
        catch { }
        let memoMap = new Map();
        try {
            const memos = await this.prisma.budgetMemo.findMany({
                where: { budgetId: { in: budgetIds } },
                select: { budgetId: true, category: true, amount: true, status: true },
            });
            for (const m of memos) {
                const e = memoMap.get(m.budgetId) ?? { rallonge: 0, reduction: 0, total: 0 };
                e.total++;
                if (m.status === 'approved') {
                    if (m.category === 'rallonge_budgetaire')
                        e.rallonge += m.amount;
                    if (m.category === 'reduction_budgetaire')
                        e.reduction += m.amount;
                }
                memoMap.set(m.budgetId, e);
            }
        }
        catch { }
        const budgetStats = budgets.map(b => {
            const memos = memoMap.get(b.id) ?? { rallonge: 0, reduction: 0, total: 0 };
            const effectiveTotal = b.totalAmount + memos.rallonge - memos.reduction;
            const totalBudget = finMemoEnabled ? effectiveTotal : b.totalAmount;
            const allProofs = b.paymentRequests.flatMap(pr => pr.proofs);
            const paidProofs = b.paymentRequests.filter(pr => pr.status === 'paid').flatMap(pr => pr.proofs);
            const engagedAmount = allProofs.reduce((s, p) => s + p.amount, 0);
            const paidAmount = paidProofs.reduce((s, p) => s + p.amount, 0);
            return {
                entityCode: b.entityCode,
                budgetType: b.budgetType,
                status: b.status,
                title: b.title,
                budgetNumber: b.budgetNumber,
                totalAmount: b.totalAmount,
                effectiveTotal,
                totalBudget,
                memoRallonge: memos.rallonge,
                memoReduction: memos.reduction,
                memoCount: memos.total,
                hasMemo: memos.total > 0,
                engagedAmount,
                paidAmount,
                remainingToPay: Math.max(0, totalBudget - paidAmount),
                createdAt: b.createdAt,
            };
        });
        const approved = budgetStats.filter(b => b.status === 'approved');
        const totalBudgetAmount = budgetStats.reduce((s, b) => s + b.totalAmount, 0);
        const totalApprovedAmount = approved.reduce((s, b) => s + b.totalAmount, 0);
        const totalEngaged = budgetStats.reduce((s, b) => s + b.engagedAmount, 0);
        const totalPaid = budgetStats.reduce((s, b) => s + b.paidAmount, 0);
        const totalRemaining = approved.reduce((s, b) => s + b.remainingToPay, 0);
        const totalMemoRallonge = approved.reduce((s, b) => s + b.memoRallonge, 0);
        const totalMemoReduction = approved.reduce((s, b) => s + b.memoReduction, 0);
        const totalMemos = budgetStats.reduce((s, b) => s + b.memoCount, 0);
        const budgetsWithMemo = budgetStats.filter(b => b.hasMemo).length;
        const allEntityCodes = [...new Set(budgetStats.map(b => b.entityCode))].sort();
        const byEntity = allEntityCodes.map(code => {
            const group = budgetStats.filter(b => b.entityCode === code);
            const approvedGroup = group.filter(b => b.status === 'approved');
            return {
                entityCode: code,
                totalBudgets: group.length,
                totalAmount: group.reduce((s, b) => s + b.totalAmount, 0),
                approvedAmount: approvedGroup.reduce((s, b) => s + b.totalAmount, 0),
                engagedAmount: group.reduce((s, b) => s + b.engagedAmount, 0),
                paidAmount: group.reduce((s, b) => s + b.paidAmount, 0),
                remainingToPay: approvedGroup.reduce((s, b) => s + b.remainingToPay, 0),
                memoRallonge: approvedGroup.reduce((s, b) => s + b.memoRallonge, 0),
                memoReduction: approvedGroup.reduce((s, b) => s + b.memoReduction, 0),
                budgetsWithMemo: group.filter(b => b.hasMemo).length,
                memoEmissionRate: group.length > 0 ? Math.round((group.filter(b => b.hasMemo).length / group.length) * 100) : 0,
            };
        }).sort((a, b) => b.approvedAmount - a.approvedAmount);
        const allTypes = [...new Set(budgetStats.map(b => b.budgetType))].sort();
        const byBudgetType = allTypes.map(type => {
            const group = budgetStats.filter(b => b.budgetType === type);
            const approvedGroup = group.filter(b => b.status === 'approved');
            return {
                budgetType: type,
                count: group.length,
                totalAmount: group.reduce((s, b) => s + b.totalAmount, 0),
                memoRallonge: approvedGroup.reduce((s, b) => s + b.memoRallonge, 0),
                memoReduction: approvedGroup.reduce((s, b) => s + b.memoReduction, 0),
                effectiveTotal: approvedGroup.reduce((s, b) => s + b.effectiveTotal, 0),
                paidAmount: group.reduce((s, b) => s + b.paidAmount, 0),
            };
        }).sort((a, b) => b.totalAmount - a.totalAmount);
        const monthlyMap = new Map();
        for (const b of budgetStats) {
            const month = new Date(b.createdAt).toISOString().substring(0, 7);
            const e = monthlyMap.get(month) ?? { created: 0, createdAmount: 0, paid: 0 };
            e.created++;
            e.createdAmount += b.totalAmount;
            e.paid += b.paidAmount;
            monthlyMap.set(month, e);
        }
        const monthlyTrend = Array.from(monthlyMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([month, data]) => ({ month, ...data }));
        const mapBudgetSummary = (b) => ({
            entityCode: b.entityCode,
            title: b.title,
            budgetNumber: b.budgetNumber,
            budgetType: b.budgetType,
            effectiveTotal: b.effectiveTotal,
            memoRallonge: b.memoRallonge,
            memoReduction: b.memoReduction,
            paidAmount: b.paidAmount,
            remainingToPay: b.remainingToPay,
        });
        const topRemaining = approved
            .filter(b => b.remainingToPay > 0)
            .sort((a, b) => b.remainingToPay - a.remainingToPay)
            .slice(0, 10)
            .map(mapBudgetSummary);
        const allApprovedBudgets = approved
            .sort((a, b) => b.remainingToPay - a.remainingToPay)
            .map(mapBudgetSummary);
        return {
            global: {
                totalBudgets: budgetStats.length,
                totalBudgetAmount,
                totalApprovedAmount,
                totalEngaged,
                totalPaid,
                totalRemaining,
                totalMemoRallonge,
                totalMemoReduction,
                netMemoImpact: totalMemoRallonge - totalMemoReduction,
                totalMemos,
                budgetsWithMemo,
                memoEmissionRate: budgetStats.length > 0 ? Math.round((budgetsWithMemo / budgetStats.length) * 100) : 0,
            },
            byEntity,
            byBudgetType,
            monthlyTrend,
            topRemaining,
            allApprovedBudgets,
        };
    }
    async getWeekPeriods() {
        return this.prisma.week.findMany({
            select: { id: true, weekReference: true, weekStart: true, weekEnd: true, status: true },
            orderBy: { weekStart: 'desc' },
        });
    }
    async getAvailableYears() {
        const weeks = await this.prisma.week.findMany({ select: { weekStart: true } });
        const years = [...new Set(weeks.map(w => String(new Date(w.weekStart).getFullYear())))];
        return years.sort();
    }
    isOnTime(submittedAt, weekEnd) {
        const deadline = new Date(weekEnd);
        deadline.setDate(deadline.getDate() + (1 - deadline.getDay() + 7) % 7 || 7);
        deadline.setHours(DEADLINE_HOUR, 0, 0, 0);
        return submittedAt <= deadline;
    }
    getDelayHours(submittedAt, weekEnd) {
        const deadline = new Date(weekEnd);
        deadline.setDate(deadline.getDate() + (1 - deadline.getDay() + 7) % 7 || 7);
        deadline.setHours(DEADLINE_HOUR, 0, 0, 0);
        return Math.round((submittedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60));
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, app_config_service_1.AppConfigService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map