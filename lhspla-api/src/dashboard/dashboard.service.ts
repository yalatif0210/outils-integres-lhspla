import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../app-config/app-config.service';
import { Role } from '@prisma/client';

const GLOBAL_ROLES: Role[] = [Role.super_admin, Role.admin_system, Role.admin_finance, Role.chief_of_party];
const ENTITY_CODES = ['CAD', 'CAC', 'PMO', 'QAD', 'SE', 'SI', 'FINANCES', 'COM'];
const DEADLINE_HOUR = 9; // Monday 9h00

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private appConfig: AppConfigService) {}

  // ─── ADMIN / CHIEF OF PARTY DASHBOARD ──────────────────────────────────────

  private buildWeekWhere(year?: string, weekStatus?: string, weekId?: string): any {
    if (weekId) return { id: weekId };
    const where: any = {};
    if (weekStatus) where.status = weekStatus;
    if (year) {
      const y = parseInt(year);
      where.weekStart = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31T23:59:59.999Z`) };
    }
    return where;
  }

  async getAdminOverview(year?: string, weekStatus?: string, weekId?: string) {
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

  /** Heatmap: entities × weeks — submission status */
  async getCompletionHeatmap(limit = 12, year?: string, weekStatus?: string, entityCode?: string, weekId?: string) {
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

  /** Global submission rate trend over last N weeks */
  async getSubmissionRateTrend(limit = 12, year?: string, weekStatus?: string, entityCode?: string, weekId?: string) {
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

  /** Risk distribution over time */
  async getRiskTrend(limit = 12, year?: string, weekStatus?: string, entityCode?: string, weekId?: string) {
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

  /** Pending critical risks (submitted but not resolved) */
  async getCriticalRisksAlert() {
    const activeWeeks = await this.prisma.week.findMany({
      where: { status: 'active' },
      include: {
        submissions: {
          include: { riskPoints: { where: { criticality: 'critique', description: { not: '' } } } },
        },
      },
    });
    return activeWeeks.flatMap(w =>
      w.submissions.flatMap(s =>
        s.riskPoints.map(r => ({
          weekReference: w.weekReference,
          weekId: w.id,
          entityCode: s.entityCode,
          category: r.category,
          description: r.description,
          expectedAction: r.expectedAction,
          createdAt: r.createdAt,
        })),
      ),
    );
  }

  /** Inter-entity comparison */
  async getEntityComparison(year?: string, weekStatus?: string, entityCode?: string, weekId?: string) {
    const where: any = this.buildWeekWhere(year, weekStatus, weekId);
    if (!year && !weekStatus) where.status = 'active'; // default to active weeks
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

  // ─── ENTITY DASHBOARD ──────────────────────────────────────────────────────

  async getEntityDashboard(entityCode: string, limit = 12) {
    const [submissionTrend, riskTrend, onTimeTrend, recentSubmissions] = await Promise.all([
      this.getEntitySubmissionTrend(entityCode, limit),
      this.getEntityRiskTrend(entityCode, limit),
      this.getEntityOnTimeTrend(entityCode, limit),
      this.getEntityRecentSubmissions(entityCode, limit),
    ]);
    return { submissionTrend, riskTrend, onTimeTrend, recentSubmissions };
  }

  private async getEntitySubmissionTrend(entityCode: string, limit: number) {
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

  private async getEntityRiskTrend(entityCode: string, limit: number) {
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

  private async getEntityOnTimeTrend(entityCode: string, limit: number) {
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

  private async getEntityRecentSubmissions(entityCode: string, limit: number) {
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

  /** All submissions for an entity (no limit) — used for history with filters */
  async getEntityHistory(entityCode: string) {
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

  private mapWeekRow(w: any, entityCode: string) {
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

  // ─── BUDGET KPIs ────────────────────────────────────────────────────────────

  async getBudgetKpis(
    userRoles: Role[],
    userEntityCode: string | null,
    entityCode?: string,
    from?: string,
    to?: string,
    fiscalYear?: string,
  ) {
    const isGlobal = userRoles.some(r => GLOBAL_ROLES.includes(r));
    const targetEntity = isGlobal ? entityCode : (userEntityCode ?? undefined);

    const where: any = { status: 'approved' };
    if (targetEntity) where.entityCode = targetEntity;
    if (fiscalYear) {
      const y = parseInt(fiscalYear);
      where.createdAt = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31T23:59:59.999Z`) };
    } else if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
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

    // Memo amounts per budget
    const budgetIds = budgets.map(b => b.id);
    const memoMap = new Map<string, { rallonge: number; reduction: number }>();
    try {
      const memos = await this.prisma.budgetMemo.findMany({
        where: { budgetId: { in: budgetIds }, status: 'approved' },
        select: { budgetId: true, category: true, amount: true },
      });
      for (const m of memos) {
        const e = memoMap.get(m.budgetId) ?? { rallonge: 0, reduction: 0 };
        if (m.category === 'rallonge_budgetaire') e.rallonge += m.amount;
        if (m.category === 'reduction_budgetaire') e.reduction += m.amount;
        memoMap.set(m.budgetId, e);
      }
    } catch { /* table not migrated yet */ }

    const totalAmountFcfa = budgets.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalMemoRallonge = [...memoMap.values()].reduce((s, m) => s + m.rallonge, 0);
    const totalMemoReduction = [...memoMap.values()].reduce((s, m) => s + m.reduction, 0);
    const effectiveTotalFcfa = totalAmountFcfa + totalMemoRallonge - totalMemoReduction;

    // Paid amount per budget (only proofs from paid PRs)
    const budgetPaidMap = new Map<string, number>();
    for (const b of budgets) {
      const paid = b.paymentRequests
        .filter(pr => pr.status === 'paid')
        .flatMap(pr => (pr as any).proofs ?? [])
        .reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
      budgetPaidMap.set(b.id, paid);
    }

    let kpiMemoEnabled = false;
    try {
      const cfg = await this.appConfig.getMap();
      kpiMemoEnabled = cfg['memo_enabled'] === 'true';
    } catch { /* défaut false */ }

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

    let byEntity: any[] | undefined;
    if (isGlobal && !targetEntity) {
      const map = new Map<string, any>();
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
        if (b.paymentRequests.some(pr => pr.status === 'uploaded')) e.pendingPayment++;
        if (b.paymentRequests.some(pr => pr.status === 'validated')) e.validatedPayment++;
        // Budget soldé = cumul paiements validés >= montant effectif (budget + MEMOs)
        const bPaid = budgetPaidMap.get(b.id) ?? 0;
        const bEffective = b.totalAmount + memo.rallonge - memo.reduction;
        if (bEffective > 0 && bPaid >= bEffective) e.solded++;
        if (b.recalls.some(r => r.status === 'open')) e.openRecalls++;
        if (b.recalls.some(r => r.status === 'closed')) e.closedRecalls++;
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

  // ─── MISSION KPIs ───────────────────────────────────────────────────────────

  async getMissionStats(
    userRoles: Role[],
    userId: string,
    userEntityCode: string | null,
    entityCode?: string,
    personnelId?: string,
    from?: string,
    to?: string,
    fiscalYear?: string,
  ) {
    const isGlobal = userRoles.some(r => ([Role.super_admin, Role.chief_of_party] as Role[]).includes(r));

    const where: any = {};
    if (!isGlobal) {
      where.initiatorId = userId;
    } else if (entityCode) {
      where.initiator = { entityCode };
    }
    if (personnelId) where.participants = { some: { personnelId } };
    if (fiscalYear) {
      const y = parseInt(fiscalYear);
      where.departureDate = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31T23:59:59.999Z`) };
    } else if (from || to) {
      where.departureDate = {};
      if (from) where.departureDate.gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); where.departureDate.lte = d; }
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

    const byStatus = (s: string) => missions.filter(m => m.status === s).length;
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

    let byPersonnel: any[] | undefined;
    if (isGlobal) {
      const map = new Map<string, any>();
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
          if (m.status === 'in_progress') e.inProgress++;
          if (m.status === 'completed') e.completed++;
          if (m.status === 'cancelled') e.cancelled++;
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

  // ─── FINANCIAL DASHBOARD ────────────────────────────────────────────────────

  async getFinancialDashboard(
    entityCode?: string,
    budgetType?: string,
    from?: string,
    to?: string,
  ) {
    const budgetWhere: any = {};
    if (entityCode) budgetWhere.entityCode = entityCode;
    if (budgetType) budgetWhere.budgetType = budgetType;
    if (from || to) {
      budgetWhere.createdAt = {};
      if (from) budgetWhere.createdAt.gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); budgetWhere.createdAt.lte = d; }
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
    } catch { /* défaut false */ }

    // Memos (approved only for financial impact)
    let memoMap = new Map<string, { rallonge: number; reduction: number; total: number }>();
    try {
      const memos = await this.prisma.budgetMemo.findMany({
        where: { budgetId: { in: budgetIds } },
        select: { budgetId: true, category: true, amount: true, status: true },
      });
      for (const m of memos) {
        const e = memoMap.get(m.budgetId) ?? { rallonge: 0, reduction: 0, total: 0 };
        e.total++;
        if (m.status === 'approved') {
          if (m.category === 'rallonge_budgetaire') e.rallonge += m.amount;
          if (m.category === 'reduction_budgetaire') e.reduction += m.amount;
        }
        memoMap.set(m.budgetId, e);
      }
    } catch { /* table may not exist yet */ }

    // Aggregate per budget
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

    // Global KPIs
    const totalBudgetAmount = budgetStats.reduce((s, b) => s + b.totalAmount, 0);
    const totalApprovedAmount = approved.reduce((s, b) => s + b.totalAmount, 0);
    const totalEngaged = budgetStats.reduce((s, b) => s + b.engagedAmount, 0);
    const totalPaid = budgetStats.reduce((s, b) => s + b.paidAmount, 0);
    const totalRemaining = approved.reduce((s, b) => s + b.remainingToPay, 0);
    const totalMemoRallonge = approved.reduce((s, b) => s + b.memoRallonge, 0);
    const totalMemoReduction = approved.reduce((s, b) => s + b.memoReduction, 0);
    const totalMemos = budgetStats.reduce((s, b) => s + b.memoCount, 0);
    const budgetsWithMemo = budgetStats.filter(b => b.hasMemo).length;

    // By entity
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

    // By budget type
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

    // Monthly trend (creations + payments)
    const monthlyMap = new Map<string, { created: number; createdAmount: number; paid: number }>();
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

    // Top budgets with highest remaining (top 10) + all approved budgets
    const mapBudgetSummary = (b: any) => ({
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

  // ─── Week Periods & Available Years ─────────────────────────────────────────

  async getWeekPeriods(): Promise<any[]> {
    return this.prisma.week.findMany({
      select: { id: true, weekReference: true, weekStart: true, weekEnd: true, status: true },
      orderBy: { weekStart: 'desc' },
    });
  }

  async getAvailableYears(): Promise<string[]> {
    const weeks = await this.prisma.week.findMany({ select: { weekStart: true } });
    const years = [...new Set(weeks.map(w => String(new Date(w.weekStart).getFullYear())))];
    return years.sort();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private isOnTime(submittedAt: Date, weekEnd: Date): boolean {
    // Deadline: Monday after weekEnd at DEADLINE_HOUR:00
    const deadline = new Date(weekEnd);
    deadline.setDate(deadline.getDate() + (1 - deadline.getDay() + 7) % 7 || 7);
    deadline.setHours(DEADLINE_HOUR, 0, 0, 0);
    return submittedAt <= deadline;
  }

  private getDelayHours(submittedAt: Date, weekEnd: Date): number {
    const deadline = new Date(weekEnd);
    deadline.setDate(deadline.getDate() + (1 - deadline.getDay() + 7) % 7 || 7);
    deadline.setHours(DEADLINE_HOUR, 0, 0, 0);
    return Math.round((submittedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60));
  }
}
