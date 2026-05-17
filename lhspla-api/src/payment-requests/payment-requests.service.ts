import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { N8nService } from '../n8n/n8n.service';
import { AppConfigService } from '../app-config/app-config.service';
import { Role } from '@prisma/client';
import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RejectPaymentRequestDto {
  @IsString() reason: string;
}

export class UploadProofDto {
  @IsNumber() @Min(1) @Type(() => Number) amount: number;
}

const FINANCE_ROLES: Role[] = [Role.admin_finance, Role.super_admin];
const TREASURY_ROLES: Role[] = [Role.chargee_tresorerie, Role.super_admin];
const VIEWER_ROLES: Role[] = [Role.admin_finance, Role.chargee_tresorerie, Role.super_admin, Role.admin_system, Role.chief_of_party];

@Injectable()
export class PaymentRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private n8n: N8nService,
    private appConfig: AppConfigService,
  ) {}

  async findByBudget(budgetId: string, userRoles: Role[], entityCode?: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundException('Budget introuvable');
    const isViewer = userRoles.some(r => VIEWER_ROLES.includes(r));
    if (!isViewer && budget.entityCode !== entityCode) throw new ForbiddenException();

    return this.prisma.paymentRequest.findMany({
      where: { budgetId },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        validatedBy: { select: { id: true, firstName: true, lastName: true } },
        proofs: { orderBy: { uploadedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    budgetId: string,
    file: Express.Multer.File,
    userId: string,
    entityCode: string,
  ) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundException('Budget introuvable');
    if (budget.entityCode !== entityCode) throw new ForbiddenException();
    if (budget.status !== 'approved') throw new BadRequestException('Le budget doit être approuvé');

    // Bloquer si le budget est entièrement payé
    const [uploadCfg, uploadTotalPaid, uploadEffective] = await Promise.all([
      this.appConfig.getMap(),
      this.computeTotalPaid(budgetId),
      this.computeEffectiveTotal(budgetId, budget.totalAmount),
    ]);
    const uploadMemoEnabled = uploadCfg['memo_enabled'] === 'true';
    const uploadTotalBudget = uploadMemoEnabled ? uploadEffective : budget.totalAmount;
    if (uploadTotalBudget > 0 && uploadTotalPaid >= uploadTotalBudget) {
      throw new BadRequestException('Ce budget est entièrement payé — aucune nouvelle demande de paiement n\'est possible');
    }

    // Uniquement si une demande rejetée existe, elle est écrasée
    const existing = await this.prisma.paymentRequest.findFirst({
      where: { budgetId, status: 'uploaded', rejectionReason: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    const pr = existing
      ? await this.prisma.paymentRequest.update({
          where: { id: existing.id },
          data: {
            filePath: file.path,
            fileName: file.originalname,
            uploadedById: userId,
            uploadedAt: new Date(),
            rejectionReason: null,
          },
        })
      : await this.prisma.paymentRequest.create({
          data: {
            budgetId,
            entityCode,
            filePath: file.path,
            fileName: file.originalname,
            uploadedById: userId,
          },
        });

    const targets = await this.prisma.user.findMany({
      where: { roles: { hasSome: [Role.admin_finance, Role.chargee_tresorerie] }, isActive: true },
      select: { id: true, phone: true, firstName: true },
    });
    for (const u of targets) {
      await this.notifications.createForUser(u.id, 'payment_request_uploaded',
        'Nouvelle demande de paiement',
        `Une demande de paiement a été déposée pour le budget "${budget.title}" (${entityCode}).`,
        { budgetId, paymentRequestId: pr.id },
      );
      if (u.phone) {
        await this.n8n.onPaymentRequestUploaded({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, entityCode });
      }
    }

    return pr;
  }

  async validate(id: string, userId: string, userRoles: Role[]) {
    if (!userRoles.some(r => FINANCE_ROLES.includes(r))) throw new ForbiddenException();
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
    if (!pr) throw new NotFoundException();
    if (pr.status !== 'uploaded') throw new BadRequestException('Cette demande ne peut pas être validée');

    const updated = await this.prisma.paymentRequest.update({
      where: { id },
      data: { status: 'validated', validatedAt: new Date(), validatedById: userId, rejectionReason: null },
    });

    const targets = await this.getEntityTargets(pr.entityCode);
    for (const u of targets) {
      await this.notifications.createForUser(u.id, 'payment_request_validated',
        'Demande de paiement validée',
        `Votre demande de paiement pour le budget "${pr.budget.title}" a été validée.`,
        { budgetId: pr.budgetId, paymentRequestId: id },
      );
      if (u.phone) {
        await this.n8n.onPaymentRequestValidated({ phone: u.phone, firstName: u.firstName, budgetTitle: pr.budget.title });
      }
    }

    return updated;
  }

  async reject(id: string, reason: string, userId: string, userRoles: Role[]) {
    if (!userRoles.some(r => FINANCE_ROLES.includes(r))) throw new ForbiddenException();
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
    if (!pr) throw new NotFoundException();
    if (pr.status !== 'uploaded') throw new BadRequestException('Cette demande ne peut pas être rejetée');

    const updated = await this.prisma.paymentRequest.update({
      where: { id },
      data: { status: 'uploaded', rejectionReason: reason },
    });

    const targets = await this.getEntityTargets(pr.entityCode);
    for (const u of targets) {
      await this.notifications.createForUser(u.id, 'payment_request_rejected',
        'Demande de paiement rejetée',
        `Votre demande de paiement pour le budget "${pr.budget.title}" a été rejetée. Motif : ${reason}`,
        { budgetId: pr.budgetId, paymentRequestId: id },
      );
      if (u.phone) {
        await this.n8n.onPaymentRequestRejected({ phone: u.phone, firstName: u.firstName, budgetTitle: pr.budget.title, reason });
      }
    }

    return updated;
  }

  async uploadProof(
    id: string,
    file: Express.Multer.File,
    amount: number,
    userId: string,
    userRoles: Role[],
  ) {
    if (!userRoles.some(r => TREASURY_ROLES.includes(r))) throw new ForbiddenException();
    if (!amount || amount <= 0) throw new BadRequestException('Le montant de la preuve doit être supérieur à 0');

    const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
    if (!pr) throw new NotFoundException();
    if (pr.status !== 'validated') throw new BadRequestException('La demande doit être validée avant d\'ajouter une preuve');

    // Calculer le plafond autorisé selon le paramètre memo_enabled
    const [config, totalPaid, effectiveTotal] = await Promise.all([
      this.appConfig.getMap(),
      this.computeTotalPaid(pr.budgetId),
      this.computeEffectiveTotal(pr.budgetId, pr.budget.totalAmount),
    ]);
    const memoEnabled = config['memo_enabled'] === 'true';
    const totalBudget = memoEnabled ? effectiveTotal : pr.budget.totalAmount;

    if (totalPaid + amount > totalBudget) {
      throw new BadRequestException(
        `Dépassement du montant autorisé : déjà versé ${this.fmtFcfa(totalPaid)}, ` +
        `nouveau montant ${this.fmtFcfa(amount)}, ` +
        `plafond ${this.fmtFcfa(totalBudget)}.`,
      );
    }

    const proof = await this.prisma.paymentProof.create({
      data: {
        paymentRequestId: id,
        filePath: file.path,
        fileName: file.originalname,
        fileType: file.mimetype,
        amount,
        uploadedById: userId,
      },
    });

    await this.prisma.paymentAuditLog.create({
      data: {
        paymentRequestId: id,
        proofId: proof.id,
        budgetId: pr.budgetId,
        userId,
        action: 'proof_added',
        detail: `Preuve "${file.originalname}" versée — montant: ${this.fmtFcfa(amount)} (budget: ${pr.budget.title})`,
      },
    });

    // Passer à paid
    await this.prisma.paymentRequest.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
    });

    // Notifier admin_finance et entity_member
    const financeTargets = await this.prisma.user.findMany({
      where: { roles: { has: Role.admin_finance }, isActive: true },
      select: { id: true, phone: true, firstName: true },
    });
    const entityTargets = await this.getEntityTargets(pr.entityCode);
    const allTargets = [...financeTargets, ...entityTargets];

    for (const u of allTargets) {
      await this.notifications.createForUser(u.id, 'payment_proof_uploaded',
        'Paiement effectué',
        `La preuve de paiement pour le budget "${pr.budget.title}" a été versée (${this.fmtFcfa(amount)}). Statut : Payé.`,
        { budgetId: pr.budgetId, paymentRequestId: id },
      );
      if (u.phone) {
        await this.n8n.onPaymentProofUploaded({ phone: u.phone, firstName: u.firstName, budgetTitle: pr.budget.title });
      }
    }

    return proof;
  }

  async deleteRequest(id: string, userId: string, userRoles: Role[], entityCode: string) {
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, include: { budget: true } });
    if (!pr) throw new NotFoundException();
    if (pr.status !== 'uploaded') throw new BadRequestException('Seule une demande en attente peut être supprimée');
    const isSuperAdmin = userRoles.includes(Role.super_admin);
    if (!isSuperAdmin && pr.uploadedById !== userId && pr.entityCode !== entityCode)
      throw new ForbiddenException();

    await this.prisma.paymentAuditLog.create({
      data: {
        paymentRequestId: id,
        budgetId: pr.budgetId,
        userId,
        action: 'request_deleted',
        detail: `Demande "${pr.fileName}" supprimée par l'initiateur (budget: ${pr.budget.title})`,
      },
    });

    await this.prisma.paymentRequest.delete({ where: { id } });
  }

  // Suppression preuve : chargee_tresorerie uniquement (+ super_admin)
  async deleteProof(requestId: string, proofId: string, userId: string, userRoles: Role[]) {
    if (!userRoles.some(r => TREASURY_ROLES.includes(r))) throw new ForbiddenException();
    const proof = await this.prisma.paymentProof.findUnique({ where: { id: proofId } });
    if (!proof) throw new NotFoundException();
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id: requestId }, include: { budget: true } });
    if (!pr) throw new NotFoundException();

    await this.prisma.paymentAuditLog.create({
      data: {
        paymentRequestId: requestId,
        proofId,
        budgetId: pr.budgetId,
        userId,
        action: 'proof_deleted',
        detail: `Preuve "${proof.fileName}" (${this.fmtFcfa(proof.amount)}) supprimée par chargee_tresorerie (budget: ${pr.budget.title})`,
      },
    });

    await this.prisma.paymentProof.delete({ where: { id: proofId } });

    // Si la demande était paid et n'a plus de preuves → retour à validated
    const remainingProofs = await this.prisma.paymentProof.count({ where: { paymentRequestId: requestId } });
    if (pr.status === 'paid' && remainingProofs === 0) {
      await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'validated', paidAt: null },
      });
    }
  }

  async getFilePath(id: string): Promise<{ filePath: string; fileName: string }> {
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id }, select: { filePath: true, fileName: true } });
    if (!pr) throw new NotFoundException();
    return pr;
  }

  async getProofPath(proofId: string): Promise<{ filePath: string; fileName: string; fileType: string }> {
    const proof = await this.prisma.paymentProof.findUnique({ where: { id: proofId }, select: { filePath: true, fileName: true, fileType: true } });
    if (!proof) throw new NotFoundException();
    return proof;
  }

  // ── Résumé financier (endpoint dédié) ────────────────────────────────────

  async getSummary(budgetId: string) {
    const budget = await this.prisma.budgetProject.findUnique({
      where: { id: budgetId },
      select: { id: true, totalAmount: true },
    });
    if (!budget) throw new NotFoundException('Budget introuvable');

    const [config, totalPaid, effectiveTotal] = await Promise.all([
      this.appConfig.getMap(),
      this.computeTotalPaid(budgetId),
      this.computeEffectiveTotal(budgetId, budget.totalAmount),
    ]);

    const memoEnabled = config['memo_enabled'] === 'true';
    const initialTotal = budget.totalAmount;
    const totalBudget = memoEnabled ? effectiveTotal : initialTotal;
    const resteAPayer = Math.max(0, totalBudget - totalPaid);

    return { initialTotal, effectiveTotal, totalPaid, memoEnabled, totalBudget, resteAPayer };
  }

  // ── Calculs financiers ────────────────────────────────────────────────────

  async computeTotalPaid(budgetId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<{ total: string | null }[]>`
      SELECT SUM(pp.amount) as total
      FROM "PaymentProof" pp
      JOIN "PaymentRequest" pr ON pr.id = pp."paymentRequestId"
      WHERE pr."budgetId" = ${budgetId}
    `;
    return parseFloat(result[0]?.total ?? '0') || 0;
  }

  private async computeEffectiveTotal(budgetId: string, baseTotal: number): Promise<number> {
    const memos = await this.prisma.budgetMemo.findMany({ where: { budgetId, status: 'approved' } });
    const rallonges = memos.filter(m => m.category === 'rallonge_budgetaire').reduce((s, m) => s + m.amount, 0);
    const reductions = memos.filter(m => m.category === 'reduction_budgetaire').reduce((s, m) => s + m.amount, 0);
    return baseTotal + rallonges - reductions;
  }

  // ── Template global ───────────────────────────────────────────────────────

  async uploadTemplate(file: Express.Multer.File, userId: string, userRoles: Role[]) {
    if (!userRoles.some(r => FINANCE_ROLES.includes(r))) throw new ForbiddenException();
    await this.prisma.paymentTemplate.deleteMany({});
    return this.prisma.paymentTemplate.create({
      data: { filePath: file.path, fileName: file.originalname, uploadedById: userId },
    });
  }

  async getTemplatePath(): Promise<{ filePath: string; fileName: string }> {
    const tpl = await this.prisma.paymentTemplate.findFirst({ orderBy: { uploadedAt: 'desc' } });
    if (!tpl) throw new NotFoundException('Aucun modèle disponible');
    return tpl;
  }

  private async getEntityTargets(entityCode: string): Promise<{ id: string; phone: string | null; firstName: string }[]> {
    return this.prisma.user.findMany({
      where: { entityCode, isActive: true },
      select: { id: true, phone: true, firstName: true },
    });
  }

  private fmtFcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
  }
}
