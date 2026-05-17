import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppConfigService } from '../app-config/app-config.service';
import { N8nService } from '../n8n/n8n.service';
import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetType, BudgetStatus, Role } from '@prisma/client';

export class BudgetLineDto {
  @IsString() rowKey: string;
  @IsOptional() @IsString() costItemId?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsNumber() unitCost?: number;
  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsNumber() frequency?: number;
}

export class CreateBudgetDto {
  @IsEnum(BudgetType) budgetType: BudgetType;
  @IsString() title: string;
  @IsString() fundId: string;
  @IsOptional() @IsString() activityReferenceId?: string;
  @IsOptional() @IsNumber() exchangeRate?: number;
  @IsOptional() @IsNumber() transferFeeRate?: number;
  @IsOptional() @IsNumber() totalAmount?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BudgetLineDto) lines?: BudgetLineDto[];
}

export class UpdateBudgetDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() fundId?: string;
  @IsOptional() @IsString() activityReferenceId?: string;
  @IsOptional() @IsNumber() exchangeRate?: number;
  @IsOptional() @IsNumber() transferFeeRate?: number;
  @IsOptional() @IsNumber() totalAmount?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BudgetLineDto) lines?: BudgetLineDto[];
}

export class FinanceReviewDto {
  @IsEnum(['finance_reviewed', 'rejected']) decision: 'finance_reviewed' | 'rejected';
  @IsOptional() @IsString() rejectionReason?: string;
}

export class ReviewBudgetDto {
  @IsEnum(['tpm_approved', 'rejected']) decision: 'tpm_approved' | 'rejected';
  @IsOptional() @IsString() rejectionReason?: string;
}

export class COPReviewBudgetDto {
  @IsEnum(['approved', 'rejected']) decision: 'approved' | 'rejected';
  @IsOptional() @IsString() rejectionReason?: string;
}

// Rôles pouvant voir tous les budgets
const VIEWER_ROLES: Role[] = [Role.super_admin, Role.admin_system, Role.admin_finance, Role.admin_tpm, Role.chief_of_party, Role.assistant_direction, Role.chargee_tresorerie];

@Injectable()
export class BudgetProjectsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private appConfig: AppConfigService,
    private n8n: N8nService,
  ) {}

  async findAll(userRoles: Role[], entityCode?: string, budgetNumber?: string, createdAt?: string) {
    const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
    const where: any = {};
    if (!isViewer) {
      if (!entityCode) throw new ForbiddenException();
      where.entityCode = entityCode;
    }
    if (budgetNumber) {
      where.budgetNumber = { contains: budgetNumber, mode: 'insensitive' };
    }
    if (createdAt) {
      const d = new Date(createdAt);
      where.createdAt = {
        gte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
        lte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
      };
    }

    const budgets = await this.prisma.budgetProject.findMany({
      where,
      include: {
        fund: { select: { id: true, name: true, code: true } },
        activityReference: { select: { id: true, title: true, activityCode: true } },
        _count: {
          select: {
            paymentRequests: { where: { status: 'uploaded' } },
            recalls: { where: { status: 'open' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (budgets.length === 0) return budgets;

    const budgetIds = budgets.map(b => b.id);

    // Calculer totalPaid via Prisma (évite les problèmes de cast uuid[] en raw SQL)
    const paidMap: Record<string, number> = {};
    try {
      const proofs = await this.prisma.paymentProof.findMany({
        where: { paymentRequest: { budgetId: { in: budgetIds } } },
        select: { amount: true, paymentRequest: { select: { budgetId: true } } },
      });
      for (const proof of proofs) {
        const bid = proof.paymentRequest.budgetId;
        paidMap[bid] = (paidMap[bid] ?? 0) + (proof.amount ?? 0);
      }
    } catch { /* avant migration : totalPaid = 0 pour tous */ }

    // Calculer memoImpact + comptes par statut — requête résiliente
    const memoMap: Record<string, {
      rallonge: number; reduction: number;
      approvedCount: number; pendingCount: number; rejectedCount: number;
    }> = {};
    try {
      const memoRows = await this.prisma.budgetMemo.groupBy({
        by: ['budgetId', 'category', 'status'],
        where: { budgetId: { in: budgetIds } },
        _sum: { amount: true },
        _count: { id: true },
      });
      for (const row of memoRows) {
        if (!memoMap[row.budgetId]) memoMap[row.budgetId] = { rallonge: 0, reduction: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0 };
        if (row.status === 'approved') {
          memoMap[row.budgetId].approvedCount += row._count.id;
          if (row.category === 'rallonge_budgetaire') memoMap[row.budgetId].rallonge += row._sum.amount ?? 0;
          if (row.category === 'reduction_budgetaire') memoMap[row.budgetId].reduction += row._sum.amount ?? 0;
        } else if (row.status === 'pending_cop') {
          memoMap[row.budgetId].pendingCount += row._count.id;
        } else if (row.status === 'rejected') {
          memoMap[row.budgetId].rejectedCount += row._count.id;
        }
      }
    } catch { /* avant migration : aucun memo */ }

    let memoEnabled = false;
    try {
      const cfg = await this.appConfig.getMap();
      memoEnabled = cfg['memo_enabled'] === 'true';
    } catch { /* config absente : MEMO désactivé par défaut */ }

    return budgets.map(b => {
      const totalPaid = paidMap[b.id] ?? 0;
      const memo = memoMap[b.id] ?? { rallonge: 0, reduction: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0 };
      const effectiveTotal = b.totalAmount + memo.rallonge - memo.reduction;
      const totalBudget = memoEnabled ? effectiveTotal : b.totalAmount;
      const isFullyPaid = b.status === 'approved' && totalBudget > 0 && totalPaid >= totalBudget;
      return {
        ...b,
        totalPaid,
        effectiveTotal,
        totalBudget,
        memoRallonge: memo.rallonge,
        memoReduction: memo.reduction,
        memoApprovedCount: memo.approvedCount,
        memoPendingCount: memo.pendingCount,
        memoRejectedCount: memo.rejectedCount,
        _count: { ...b._count, memos: memo.approvedCount + memo.pendingCount + memo.rejectedCount },
        isFullyPaid,
        resteAPayer: Math.max(0, totalBudget - totalPaid),
      };
    });
  }

  async findOne(id: string, userRoles: Role[], entityCode?: string) {
    const budget = await this.prisma.budgetProject.findUnique({
      where: { id },
      include: {
        fund: { select: { id: true, name: true, code: true } },
        activityReference: { select: { id: true, title: true, activityCode: true, os: true, oo: true } },
        lines: { include: { costItem: { select: { id: true, nature: true, designation: true, justificatif: true } } }, orderBy: { rowKey: 'asc' } },
      },
    });
    if (!budget) throw new NotFoundException();
    const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
    if (!isViewer && budget.entityCode !== entityCode) throw new ForbiddenException();
    return budget;
  }

  async create(dto: CreateBudgetDto, entityCode: string) {
    const fund = await this.prisma.financingFund.findUnique({ where: { id: dto.fundId } });
    if (!fund || !fund.isActive) throw new BadRequestException('Fonds introuvable ou inactif');

    const exchangeRate = dto.exchangeRate ?? await this.getConfigRate('exchange_rate', 655);
    const transferFeeRate = dto.transferFeeRate ?? await this.getConfigRate('transfer_fee_rate', 0.05);
    const configMap = await this.appConfig.getMap();
    const fiscalYearTag = configMap['fiscal_year_tag'] ?? 'FY2026';

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.budgetProject.count({ where: { budgetNumber: { not: null } } });
      const budgetNumber = `A${String(count + 1).padStart(3, '0')}${fiscalYearTag}`;

      return tx.budgetProject.create({
        data: {
          entityCode,
          budgetType: dto.budgetType,
          title: dto.title,
          fundId: dto.fundId,
          activityReferenceId: dto.activityReferenceId ?? null,
          exchangeRate,
          transferFeeRate,
          totalAmount: dto.totalAmount ?? 0,
          budgetNumber,
          lines: dto.lines?.length
            ? {
                createMany: {
                  data: dto.lines.map(l => ({
                    rowKey: l.rowKey,
                    costItemId: l.costItemId ?? null,
                    designation: l.designation ?? '',
                    unitCost: l.unitCost,
                    quantity: l.quantity,
                    frequency: l.frequency,
                  })),
                },
              }
            : undefined,
        },
        include: {
          fund: { select: { id: true, name: true, code: true } },
          activityReference: { select: { id: true, title: true, activityCode: true } },
          lines: true,
        },
      });
    });
  }

  async update(id: string, dto: UpdateBudgetDto, userRoles: Role[], entityCode?: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException();
    const isSuperAdmin = userRoles.includes(Role.super_admin);
    if (!isSuperAdmin && budget.entityCode !== entityCode) throw new ForbiddenException();
    if (budget.status !== BudgetStatus.draft && budget.status !== BudgetStatus.rejected) {
      throw new BadRequestException('Seuls les budgets en brouillon ou rejetés peuvent être modifiés');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.fundId !== undefined) data.fundId = dto.fundId;
    if (dto.activityReferenceId !== undefined) data.activityReferenceId = dto.activityReferenceId || null;
    if (dto.exchangeRate !== undefined) data.exchangeRate = dto.exchangeRate;
    if (dto.transferFeeRate !== undefined) data.transferFeeRate = dto.transferFeeRate;
    if (dto.totalAmount !== undefined) data.totalAmount = dto.totalAmount;

    if (dto.lines !== undefined) {
      await this.prisma.budgetLine.deleteMany({ where: { budgetId: id } });
      if (dto.lines.length) {
        await this.prisma.budgetLine.createMany({
          data: dto.lines.map(l => ({
            budgetId: id,
            rowKey: l.rowKey,
            costItemId: l.costItemId ?? null,
            designation: l.designation ?? '',
            unitCost: l.unitCost,
            quantity: l.quantity,
            frequency: l.frequency,
          })),
        });
      }
    }

    return this.prisma.budgetProject.update({
      where: { id },
      data,
      include: {
        fund: { select: { id: true, name: true, code: true } },
        activityReference: { select: { id: true, title: true, activityCode: true } },
        lines: { include: { costItem: { select: { id: true, nature: true, designation: true, justificatif: true } } }, orderBy: { rowKey: 'asc' } },
      },
    });
  }

  async submit(id: string, entityCode: string, userRoles: Role[]) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException();
    if (budget.entityCode !== entityCode) throw new ForbiddenException();
    if (budget.status !== BudgetStatus.draft && budget.status !== BudgetStatus.rejected) {
      throw new BadRequestException('Ce budget ne peut pas être soumis');
    }
    if (!budget.tdrFilePath) {
      throw new BadRequestException('Un TDR (Termes de Référence) est requis avant de soumettre ce budget');
    }

    // admin_tpm soumettant son propre budget → bypass finance + TPM → directement tpm_approved
    const isAdminTpm = userRoles.includes(Role.admin_tpm) || userRoles.includes(Role.super_admin);
    const nextStatus = isAdminTpm ? BudgetStatus.tpm_approved : BudgetStatus.submitted;

    const updated = await this.prisma.budgetProject.update({
      where: { id },
      data: { status: nextStatus, submittedAt: new Date(), rejectionReason: null, rejectedAt: null },
    });

    await this.notifications.notifyBudgetSubmitted(budget.entityCode, budget.budgetType, budget.title, id);
    if (isAdminTpm) {
      // Budget saute directement à tpm_approved → le COP est le prochain valideur
      const copPhones = await this.getRolePhones(Role.chief_of_party);
      for (const u of copPhones) {
        await this.n8n.onBudgetTpmApproved({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title });
      }
    } else {
      const financePhones = await this.getRolePhones(Role.admin_finance);
      for (const u of financePhones) {
        await this.n8n.onBudgetSubmitted({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, entityCode: budget.entityCode });
      }
    }
    return updated;
  }

  // Étape 1 : contrôle admin_finance (submitted → finance_reviewed ou rejected)
  async financeReview(id: string, dto: FinanceReviewDto, financeUserId: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException();
    if (budget.status !== BudgetStatus.submitted) {
      throw new BadRequestException('Ce budget n\'est pas en attente de contrôle Finance');
    }
    if (dto.decision === 'rejected' && !dto.rejectionReason) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    if (dto.decision === 'rejected') {
      await this.prisma.budgetProject.update({
        where: { id },
        data: {
          status: BudgetStatus.draft,
          financeReviewedAt: new Date(),
          financeReviewedById: financeUserId,
          rejectionReason: dto.rejectionReason ?? null,
        },
      });
      await this.notifications.notifyBudgetReturnedToDraft(budget.entityCode, budget.budgetType, budget.title, id, dto.rejectionReason!, 'Finance');
      const ep = await this.getEntityPhone(budget.entityCode);
      if (ep) await this.n8n.onBudgetRejected({ phone: ep.phone, firstName: ep.firstName, budgetTitle: budget.title, reason: dto.rejectionReason! });
    } else {
      await this.prisma.budgetProject.update({
        where: { id },
        data: { status: BudgetStatus.finance_reviewed, financeReviewedAt: new Date(), financeReviewedById: financeUserId },
      });
      await this.notifications.notifyBudgetTPMApproved(budget.entityCode, budget.budgetType, budget.title, id);
      const tpmPhones = await this.getRolePhones(Role.admin_tpm);
      for (const u of tpmPhones) {
        await this.n8n.onBudgetFinanceReviewed({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title });
      }
    }

    return this.findOne(id, [Role.admin_finance]);
  }

  // Étape 2 : vérification TPM (finance_reviewed → tpm_approved ou rejected)
  async tpmReview(id: string, dto: ReviewBudgetDto, tpmUserId: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException();
    if (budget.status !== BudgetStatus.finance_reviewed && budget.status !== BudgetStatus.tpm_approved) {
      throw new BadRequestException('Ce budget n\'est pas en attente de vérification TPM');
    }
    if (dto.decision === 'rejected' && !dto.rejectionReason) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    if (dto.decision === 'rejected') {
      await this.prisma.budgetProject.update({
        where: { id },
        data: {
          status: BudgetStatus.draft,
          tpmReviewedAt: new Date(),
          tpmReviewedById: tpmUserId,
          rejectionReason: dto.rejectionReason ?? null,
        },
      });
      await this.notifications.notifyBudgetReturnedToDraft(budget.entityCode, budget.budgetType, budget.title, id, dto.rejectionReason!, 'TPM');
      const ep = await this.getEntityPhone(budget.entityCode);
      if (ep) await this.n8n.onBudgetRejected({ phone: ep.phone, firstName: ep.firstName, budgetTitle: budget.title, reason: dto.rejectionReason! });
    } else {
      await this.prisma.budgetProject.update({
        where: { id },
        data: { status: BudgetStatus.tpm_approved, tpmReviewedAt: new Date(), tpmReviewedById: tpmUserId },
      });
      await this.notifications.notifyBudgetTPMApproved(budget.entityCode, budget.budgetType, budget.title, id);
      const copPhones = await this.getRolePhones(Role.chief_of_party);
      for (const u of copPhones) {
        await this.n8n.onBudgetTpmApproved({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title });
      }
    }

    return this.findOne(id, [Role.admin_tpm]);
  }

  // Étape 2 : validation COP (tpm_approved → approved ou rejected)
  async copReview(id: string, dto: COPReviewBudgetDto, copUserId: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException();
    if (budget.status !== BudgetStatus.tpm_approved) {
      throw new BadRequestException('Ce budget n\'a pas encore été vérifié par le TPM');
    }
    if (dto.decision === 'rejected' && !dto.rejectionReason) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    if (dto.decision === 'rejected') {
      await this.prisma.budgetProject.update({
        where: { id },
        data: {
          status: BudgetStatus.rejected,
          reviewedAt: new Date(),
          reviewedById: copUserId,
          rejectionReason: dto.rejectionReason ?? null,
          rejectedAt: new Date(),
        },
      });
      await this.notifications.notifyBudgetRejected(budget.entityCode, budget.budgetType, budget.title, id, dto.rejectionReason!);
      const epRej = await this.getEntityPhone(budget.entityCode);
      if (epRej) await this.n8n.onBudgetRejected({ phone: epRej.phone, firstName: epRej.firstName, budgetTitle: budget.title, reason: dto.rejectionReason! });
    } else {
      await this.prisma.budgetProject.update({
        where: { id },
        data: { status: BudgetStatus.approved, reviewedAt: new Date(), reviewedById: copUserId, rejectionReason: null },
      });
      await this.notifications.notifyBudgetApproved(budget.entityCode, budget.budgetType, budget.title, id);
      const epAppr = await this.getEntityPhone(budget.entityCode);
      if (epAppr) await this.n8n.onBudgetApproved({ phone: epAppr.phone, firstName: epAppr.firstName, budgetTitle: budget.title });
    }

    return this.findOne(id, [Role.chief_of_party]);
  }

  async remove(id: string, userRoles: Role[], entityCode?: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException();
    const isSuperAdmin = userRoles.includes(Role.super_admin);
    if (!isSuperAdmin && budget.entityCode !== entityCode) throw new ForbiddenException();
    if (budget.status === BudgetStatus.approved) throw new BadRequestException('Un budget approuvé ne peut pas être supprimé');

    return this.prisma.budgetProject.update({ where: { id }, data: { status: BudgetStatus.archived } });
  }

  async uploadTdr(id: string, file: Express.Multer.File, userRoles: Role[], entityCode: string | undefined, userId: string): Promise<any> {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id } });
    if (!budget) throw new NotFoundException();

    const canUpload =
      userRoles.includes(Role.super_admin) ||
      userRoles.includes(Role.admin_tpm) ||
      userRoles.includes(Role.chief_of_party) ||
      budget.entityCode === entityCode;
    if (!canUpload) throw new ForbiddenException('Vous n\'êtes pas autorisé à importer un TDR pour ce budget');

    // Sauvegarder l'ancien TDR dans l'historique avant remplacement
    if (budget.tdrFilePath) {
      const uploadedRole = userRoles.includes(Role.super_admin) ? 'super_admin'
        : userRoles.includes(Role.admin_tpm)       ? 'admin_tpm'
        : userRoles.includes(Role.chief_of_party)  ? 'chief_of_party'
        : 'entity_member';
      await this.prisma.budgetTdrHistory.create({
        data: {
          budgetId: id,
          filePath: budget.tdrFilePath,
          fileExt: budget.tdrFileExt ?? 'pdf',
          uploadedById: userId,
          uploadedRole,
        },
      });
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
    const updated = await this.prisma.budgetProject.update({
      where: { id },
      data: { tdrFilePath: file.path, tdrFileExt: ext },
    });
    const { lines: _, ...safe } = updated as any;
    return safe;
  }

  async getTdrPath(id: string): Promise<{ filePath: string; ext: string }> {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id }, select: { tdrFilePath: true, tdrFileExt: true } });
    if (!budget?.tdrFilePath) throw new NotFoundException('Aucun TDR associé à ce budget');
    return { filePath: budget.tdrFilePath, ext: budget.tdrFileExt ?? 'pdf' };
  }

  private async getEntityPhone(entityCode: string): Promise<{ phone: string; firstName: string } | null> {
    const user = await this.prisma.user.findFirst({
      where: { entityCode, isEntityResponsible: true, isActive: true, phone: { not: null } },
      select: { phone: true, firstName: true },
    });
    return user?.phone ? { phone: user.phone, firstName: user.firstName } : null;
  }

  private async getRolePhones(role: Role): Promise<{ phone: string; firstName: string }[]> {
    const users = await this.prisma.user.findMany({
      where: { roles: { has: role }, isActive: true, phone: { not: null } },
      select: { phone: true, firstName: true },
    });
    return users.filter(u => u.phone).map(u => ({ phone: u.phone!, firstName: u.firstName }));
  }

  private async getConfigRate(key: string, defaultValue: number): Promise<number> {
    const cfg = await this.prisma.appConfig.findUnique({ where: { key } });
    return cfg ? parseFloat(cfg.value) : defaultValue;
  }
}
