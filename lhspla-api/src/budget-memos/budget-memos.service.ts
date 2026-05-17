import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { N8nService } from '../n8n/n8n.service';
import { AppConfigService } from '../app-config/app-config.service';
import { Role, MemoCategory, MemoStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetMemoDto {
  @IsEnum(MemoCategory) category: MemoCategory;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) amount?: number;
  @IsOptional() @IsString() content?: string;
}

export class CopReviewMemoDto {
  @IsEnum(['approved', 'rejected']) decision: 'approved' | 'rejected';
  @IsOptional() @IsString() rejectionReason?: string;
}

const VIEWER_ROLES: Role[] = [
  Role.super_admin, Role.admin_system, Role.admin_finance,
  Role.admin_tpm, Role.chief_of_party, Role.assistant_direction, Role.chargee_tresorerie,
];
const FINANCE_ROLES: Role[] = [Role.admin_finance, Role.super_admin];
const COP_ROLES: Role[] = [Role.chief_of_party, Role.super_admin];
const MEMO_ALLOWED_ROLES: Role[] = [
  Role.admin_finance, Role.chief_of_party, Role.super_admin, Role.admin_tpm, Role.entity_member,
];

const CATEGORY_LABELS: Record<MemoCategory, string> = {
  rallonge_budgetaire: 'Rallonge budgétaire',
  reduction_budgetaire: 'Réduction budgétaire',
  sans_incidence: 'Sans incidence budgétaire',
};

@Injectable()
export class BudgetMemosService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private n8n: N8nService,
    private appConfig: AppConfigService,
  ) {}

  private async assertMemoEnabled() {
    const map = await this.appConfig.getMap();
    if (map['memo_enabled'] !== 'true') {
      throw new BadRequestException('La gestion des MEMOs budgétaires est désactivée');
    }
  }

  // Seuls les memos approuvés par le COP entrent dans les calculs
  async findByBudget(budgetId: string, userRoles: Role[], entityCode?: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundException('Budget introuvable');
    const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
    if (!isViewer && budget.entityCode !== entityCode) throw new ForbiddenException();

    const memos = await this.prisma.budgetMemo.findMany({
      where: { budgetId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const approved = memos.filter(m => m.status === 'approved');
    const rallonge = approved.filter(m => m.category === 'rallonge_budgetaire').reduce((s, m) => s + m.amount, 0);
    const reduction = approved.filter(m => m.category === 'reduction_budgetaire').reduce((s, m) => s + m.amount, 0);
    const effectiveTotal = budget.totalAmount + rallonge - reduction;

    return {
      memos,
      budget: { totalAmount: budget.totalAmount, effectiveTotal, rallonge, reduction },
    };
  }

  async create(
    budgetId: string,
    dto: CreateBudgetMemoDto,
    file: Express.Multer.File | undefined,
    userId: string,
    userRoles: Role[],
  ) {
    await this.assertMemoEnabled();
    if (!userRoles.some(r => MEMO_ALLOWED_ROLES.includes(r))) throw new ForbiddenException();

    const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundException('Budget introuvable');
    if (budget.status !== 'approved') throw new BadRequestException('Un MEMO ne peut être ajouté qu\'à un budget approuvé');

    let amount = 0;
    if (dto.category === 'rallonge_budgetaire' || dto.category === 'reduction_budgetaire') {
      const raw = dto.amount ?? 0;
      if (!raw || raw <= 0) throw new BadRequestException('Le montant est obligatoire et doit être > 0 pour ce type de MEMO');
      amount = raw;
    }

    const memo = await this.prisma.budgetMemo.create({
      data: {
        budgetId,
        category: dto.category,
        status: MemoStatus.pending_cop,
        amount,
        content: dto.content ?? null,
        filePath: file?.path ?? null,
        fileName: file?.originalname ?? null,
        fileType: file?.mimetype ?? null,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.paymentAuditLog.create({
      data: {
        budgetId,
        userId,
        action: 'memo_created',
        detail: `MEMO "${CATEGORY_LABELS[dto.category]}" créé — montant: ${amount} FCFA (budget: ${budget.title}) — en attente COP`,
      },
    });

    // Notifier le COP pour validation
    const copUsers = await this.prisma.user.findMany({
      where: { roles: { has: Role.chief_of_party }, isActive: true },
      select: { id: true, phone: true, firstName: true },
    });
    for (const u of copUsers) {
      await this.notifications.createForUser(u.id, 'budget_memo_pending_cop',
        'Nouveau MEMO à valider',
        `Un MEMO (${CATEGORY_LABELS[dto.category]}) a été ajouté au budget "${budget.title}" et attend votre approbation.`,
        { budgetId, memoId: memo.id },
      );
      if (u.phone) {
        await this.n8n.onBudgetMemoAdded({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, category: CATEGORY_LABELS[dto.category] });
      }
    }

    // Notifier aussi finance et trésorerie (pour information)
    const finTreasTargets = await this.prisma.user.findMany({
      where: { roles: { hasSome: [Role.admin_finance, Role.chargee_tresorerie] }, isActive: true },
      select: { id: true },
    });
    for (const u of finTreasTargets) {
      if (u.id === userId) continue;
      await this.notifications.createForUser(u.id, 'budget_memo_created',
        'MEMO budgétaire créé',
        `Un MEMO (${CATEGORY_LABELS[dto.category]}) a été créé sur le budget "${budget.title}" — en attente d'approbation COP.`,
        { budgetId, memoId: memo.id },
      );
    }

    return memo;
  }

  async copReview(
    id: string,
    dto: CopReviewMemoDto,
    userId: string,
    userRoles: Role[],
  ) {
    await this.assertMemoEnabled();
    if (!userRoles.some(r => COP_ROLES.includes(r))) throw new ForbiddenException();

    const memo = await this.prisma.budgetMemo.findUnique({
      where: { id },
      include: { budget: true, createdBy: { select: { id: true, phone: true, firstName: true } } },
    });
    if (!memo) throw new NotFoundException();
    if (memo.status !== MemoStatus.pending_cop) {
      throw new BadRequestException('Ce MEMO n\'est pas en attente de validation COP');
    }
    if (dto.decision === 'rejected' && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    const newStatus = dto.decision === 'approved' ? MemoStatus.approved : MemoStatus.rejected;
    const updated = await this.prisma.budgetMemo.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: dto.decision === 'rejected' ? dto.rejectionReason : null,
        reviewedAt: new Date(),
        reviewedById: userId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.paymentAuditLog.create({
      data: {
        budgetId: memo.budgetId,
        userId,
        action: dto.decision === 'approved' ? 'memo_approved' : 'memo_rejected',
        detail: dto.decision === 'approved'
          ? `MEMO "${CATEGORY_LABELS[memo.category]}" approuvé par le COP (budget: ${memo.budget.title})`
          : `MEMO "${CATEGORY_LABELS[memo.category]}" rejeté par le COP. Motif : ${dto.rejectionReason} (budget: ${memo.budget.title})`,
      },
    });

    // Notifier l'initiateur du memo
    const initiator = memo.createdBy;
    if (initiator) {
      if (dto.decision === 'approved') {
        await this.notifications.createForUser(initiator.id, 'budget_memo_approved',
          'MEMO approuvé',
          `Votre MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été approuvé par le COP.`,
          { budgetId: memo.budgetId, memoId: id },
        );
        if (initiator.phone) {
          await this.n8n.onBudgetMemoApproved({ phone: initiator.phone, firstName: initiator.firstName, budgetTitle: memo.budget.title, category: CATEGORY_LABELS[memo.category] });
        }
      } else {
        await this.notifications.createForUser(initiator.id, 'budget_memo_rejected',
          'MEMO rejeté',
          `Votre MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été rejeté par le COP. Motif : ${dto.rejectionReason}`,
          { budgetId: memo.budgetId, memoId: id },
        );
        if (initiator.phone) {
          await this.n8n.onBudgetMemoRejected({ phone: initiator.phone, firstName: initiator.firstName, budgetTitle: memo.budget.title, category: CATEGORY_LABELS[memo.category], reason: dto.rejectionReason! });
        }
      }
    }

    // Notifier finance et trésorerie
    const finTreasTargets = await this.prisma.user.findMany({
      where: { roles: { hasSome: [Role.admin_finance, Role.chargee_tresorerie] }, isActive: true },
      select: { id: true },
    });
    for (const u of finTreasTargets) {
      await this.notifications.createForUser(u.id,
        dto.decision === 'approved' ? 'budget_memo_approved' : 'budget_memo_rejected',
        dto.decision === 'approved' ? 'MEMO approuvé' : 'MEMO rejeté',
        dto.decision === 'approved'
          ? `Le MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été approuvé par le COP.`
          : `Le MEMO (${CATEGORY_LABELS[memo.category]}) sur le budget "${memo.budget.title}" a été rejeté. Motif : ${dto.rejectionReason}`,
        { budgetId: memo.budgetId, memoId: id },
      );
    }

    return updated;
  }

  async delete(id: string, userId: string, userRoles: Role[]) {
    await this.assertMemoEnabled();
    if (!userRoles.some(r => FINANCE_ROLES.includes(r))) throw new ForbiddenException();

    const memo = await this.prisma.budgetMemo.findUnique({ where: { id }, include: { budget: true } });
    if (!memo) throw new NotFoundException();

    await this.prisma.paymentAuditLog.create({
      data: {
        budgetId: memo.budgetId,
        userId,
        action: 'memo_deleted',
        detail: `MEMO "${CATEGORY_LABELS[memo.category]}" [${memo.status}] supprimé (budget: ${memo.budget.title})`,
      },
    });

    await this.prisma.budgetMemo.delete({ where: { id } });
  }

  async downloadFile(id: string): Promise<{ filePath: string; fileName: string; fileType: string }> {
    const memo = await this.prisma.budgetMemo.findUnique({ where: { id } });
    if (!memo || !memo.filePath) throw new NotFoundException('Fichier non disponible');
    return { filePath: memo.filePath, fileName: memo.fileName!, fileType: memo.fileType! };
  }
}
