import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { N8nService } from '../n8n/n8n.service';
import { Role } from '@prisma/client';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateRecallDto {
  @IsString() budgetId: string;
  @IsString() reason: string;
}

export class AddDocumentDto {
  @IsString() budgetLineId: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}

export class ReviewDocumentDto {
  @IsEnum(['approved', 'rejected', 'pending']) decision: 'approved' | 'rejected' | 'pending';
  @IsOptional() @IsString() rejectionNote?: string;
}

export class RejectRecallDto {
  @IsString() reason: string;
}

const CLOSE_ROLES: Role[] = [Role.super_admin, Role.admin_finance];
const REVIEWER_ROLES = [Role.super_admin, Role.admin_finance, Role.admin_system, Role.chief_of_party, Role.chargee_tresorerie] as Role[];

function isReviewer(userRoles: Role[]): boolean {
  return userRoles.some(r => REVIEWER_ROLES.includes(r));
}

const RECALL_INCLUDE = {
  documents: { orderBy: { addedAt: 'desc' as const } },
  closedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class BudgetRecallsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService, private n8n: N8nService) {}

  async findByBudget(budgetId: string, userRoles: Role[], entityCode?: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundException('Budget introuvable');
    if (!isReviewer(userRoles) && budget.entityCode !== entityCode) throw new ForbiddenException();

    return this.prisma.budgetRecall.findMany({
      where: { budgetId },
      include: RECALL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(userRoles: Role[], entityCode?: string) {
    const reviewer = isReviewer(userRoles);
    const where: any = {};
    if (!reviewer) {
      if (!entityCode) throw new ForbiddenException();
      where.entityCode = entityCode;
    }

    return this.prisma.budgetRecall.findMany({
      where,
      include: {
        budget: {
          select: {
            id: true, title: true, budgetType: true, entityCode: true,
            _count: { select: { lines: true } },
          },
        },
        documents: {
          select: { id: true, name: true, fileType: true, addedAt: true, docStatus: true, budgetLineId: true },
        },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuditLog(recallId: string, userRoles: Role[], entityCode?: string) {
    const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
    if (!recall) throw new NotFoundException();
    if (!isReviewer(userRoles) && recall.entityCode !== entityCode) throw new ForbiddenException();

    return this.prisma.recallAuditLog.findMany({
      where: { recallId },
      include: { user: { select: { id: true, firstName: true, lastName: true, roles: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCoverage(recallId: string, userRoles: Role[], entityCode?: string) {
    const recall = await this.prisma.budgetRecall.findUnique({
      where: { id: recallId },
      include: { documents: { select: { budgetLineId: true, docStatus: true } } },
    });
    if (!recall) throw new NotFoundException();
    if (!isReviewer(userRoles) && recall.entityCode !== entityCode) throw new ForbiddenException();

    const totalLines = await this.prisma.budgetLine.count({ where: { budgetId: recall.budgetId } });
    const approvedIds = [...new Set(recall.documents.filter(d => d.docStatus === 'approved').map(d => d.budgetLineId))];

    return {
      total: totalLines,
      covered: approvedIds.length,
      percentage: totalLines > 0 ? Math.round((approvedIds.length / totalLines) * 100) : 0,
    };
  }

  async create(dto: CreateRecallDto, entityCode: string, userId: string) {
    const budget = await this.prisma.budgetProject.findUnique({ where: { id: dto.budgetId } });
    if (!budget) throw new NotFoundException('Budget introuvable');
    if (budget.entityCode !== entityCode) throw new ForbiddenException();
    if (budget.status !== 'approved') throw new BadRequestException('Le budget doit être approuvé pour créer un rappel');

    const recall = await this.prisma.budgetRecall.create({
      data: { budgetId: dto.budgetId, entityCode, reason: dto.reason },
    });

    await this.prisma.recallAuditLog.create({
      data: { recallId: recall.id, userId, action: 'created', detail: dto.reason },
    });

    const financePhones = await this.getRolePhones(Role.admin_finance);
    for (const u of financePhones) {
      await this.n8n.onRecallCreated({ phone: u.phone, firstName: u.firstName, budgetTitle: budget.title, entityCode });
    }

    return recall;
  }

  async addDocument(
    recallId: string,
    dto: AddDocumentDto,
    file: Express.Multer.File,
    entityCode: string,
    userId: string,
    userRoles: Role[],
  ) {
    const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
    if (!recall) throw new NotFoundException();
    const isPrivileged = userRoles.some(r => CLOSE_ROLES.includes(r));
    if (!isPrivileged && recall.entityCode !== entityCode) throw new ForbiddenException();
    if (recall.status !== 'open') throw new BadRequestException('Ce rappel n\'est plus ouvert');

    const line = await this.prisma.budgetLine.findUnique({ where: { id: dto.budgetLineId } });
    if (!line || line.budgetId !== recall.budgetId) throw new BadRequestException('Ligne budgétaire invalide');

    const doc = await this.prisma.recallDocument.create({
      data: {
        recallId,
        budgetLineId: dto.budgetLineId,
        name: dto.name ?? file.originalname,
        description: dto.description ?? '',
        filePath: file.path,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });

    await this.prisma.recallAuditLog.create({
      data: { recallId, userId, action: 'doc_added', detail: dto.name },
    });

    return doc;
  }

  async deleteDocument(recallId: string, docId: string, entityCode: string, userId: string, userRoles: Role[]) {
    const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
    if (!recall) throw new NotFoundException();
    const isPrivileged = userRoles.some(r => CLOSE_ROLES.includes(r));
    if (!isPrivileged && recall.entityCode !== entityCode) throw new ForbiddenException();
    if (recall.status !== 'open') throw new BadRequestException('Ce rappel n\'est plus ouvert');

    const doc = await this.prisma.recallDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.recallId !== recallId) throw new NotFoundException('Document introuvable');

    await this.prisma.recallDocument.delete({ where: { id: docId } });

    await this.prisma.recallAuditLog.create({
      data: { recallId, userId, action: 'doc_deleted', detail: doc.name },
    });

    return { deleted: true };
  }

  async reviewDocument(recallId: string, docId: string, dto: ReviewDocumentDto, userId: string) {
    const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
    if (!recall) throw new NotFoundException();
    if (recall.status !== 'open') throw new BadRequestException('Ce rappel n\'est plus ouvert');

    const doc = await this.prisma.recallDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.recallId !== recallId) throw new NotFoundException('Document introuvable');
    if (dto.decision === 'rejected' && !dto.rejectionNote?.trim()) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    if (dto.decision === 'pending') {
      await this.prisma.recallDocument.update({
        where: { id: docId },
        data: { docStatus: 'pending', rejectionNote: null, reviewedAt: null, reviewedById: null },
      });
      return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
    }

    await this.prisma.recallDocument.update({
      where: { id: docId },
      data: {
        docStatus: dto.decision,
        rejectionNote: dto.decision === 'rejected' ? dto.rejectionNote : null,
        reviewedAt: new Date(),
        reviewedById: userId,
      },
    });

    await this.prisma.recallAuditLog.create({
      data: {
        recallId,
        userId,
        action: dto.decision === 'approved' ? 'doc_approved' : 'doc_rejected',
        detail: dto.decision === 'rejected' ? `${doc.name} — ${dto.rejectionNote}` : doc.name,
      },
    });

    if (dto.decision === 'approved') {
      await this.notifications.notifyRecallDocReviewed(recall.entityCode, recall.reason, doc.name, 'approved');
    } else {
      await this.notifications.notifyRecallDocReviewed(recall.entityCode, recall.reason, doc.name, 'rejected', dto.rejectionNote);
    }

    return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
  }

  async rejectRecall(recallId: string, dto: RejectRecallDto, userId: string) {
    if (!dto.reason?.trim()) throw new BadRequestException('Un motif de rejet est requis');

    const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
    if (!recall) throw new NotFoundException();
    if (recall.status !== 'open') throw new BadRequestException('Ce rappel n\'est plus ouvert');

    await this.prisma.budgetRecall.update({
      where: { id: recallId },
      data: { status: 'rejected', rejectionReason: dto.reason, closedAt: new Date(), closedById: userId },
    });

    await this.prisma.recallAuditLog.create({
      data: { recallId, userId, action: 'rejected', detail: dto.reason },
    });

    await this.notifications.notifyRecallRejected(recall.entityCode, recall.reason, dto.reason);
    const rejBudget = await this.prisma.budgetProject.findUnique({ where: { id: recall.budgetId }, select: { title: true } });
    const rejEp = await this.getEntityPhone(recall.entityCode);
    if (rejEp) await this.n8n.onRecallRejected({ phone: rejEp.phone, firstName: rejEp.firstName, budgetTitle: rejBudget?.title ?? '', reason: dto.reason });

    return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
  }

  async cancelRecall(recallId: string, entityCode: string, userId: string) {
    const recall = await this.prisma.budgetRecall.findUnique({
      where: { id: recallId },
      include: { documents: { select: { docStatus: true } } },
    });
    if (!recall) throw new NotFoundException();
    if (recall.entityCode !== entityCode) throw new ForbiddenException();
    if (recall.status !== 'open') throw new BadRequestException('Ce rappel ne peut plus être annulé');

    const financeHasInteracted = recall.documents.some(d => d.docStatus !== 'pending');
    if (financeHasInteracted) {
      throw new ConflictException('L\'Admin Finance a déjà interagi avec ce rappel — annulation impossible');
    }

    await this.prisma.budgetRecall.update({
      where: { id: recallId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    await this.prisma.recallAuditLog.create({
      data: { recallId, userId, action: 'cancelled', detail: '' },
    });

    return this.prisma.budgetRecall.findUnique({ where: { id: recallId }, include: RECALL_INCLUDE });
  }

  async close(recallId: string, userId: string) {
    const recall = await this.prisma.budgetRecall.findUnique({
      where: { id: recallId },
      include: { documents: { select: { budgetLineId: true, docStatus: true } } },
    });
    if (!recall) throw new NotFoundException();
    if (recall.status !== 'open') throw new BadRequestException('Ce rappel n\'est plus ouvert');

    // Vérifier que toutes les lignes requises ont au moins un document approuvé
    const requiredLines = await this.prisma.budgetLine.findMany({
      where: { budgetId: recall.budgetId },
      select: { id: true, unitCost: true, quantity: true, frequency: true },
    });

    const required = requiredLines.filter(l => {
      const amt = (l.unitCost ?? 0) * (l.quantity ?? 1) * (l.frequency ?? 1);
      return amt > 0;
    });

    const approvedLineIds = new Set(
      recall.documents.filter(d => d.docStatus === 'approved').map(d => d.budgetLineId)
    );

    const uncovered = required.filter(l => !approvedLineIds.has(l.id));
    if (uncovered.length > 0) {
      throw new BadRequestException(
        `${uncovered.length} poste(s) requis sans pièce approuvée. Approuvez toutes les pièces ou rejetez le rappel.`
      );
    }

    const updated = await this.prisma.budgetRecall.update({
      where: { id: recallId },
      data: { status: 'closed', closedAt: new Date(), closedById: userId },
    });

    await this.prisma.recallAuditLog.create({
      data: {
        recallId,
        userId,
        action: 'closed',
        detail: JSON.stringify({ coveredLines: required.length, totalLines: required.length }),
      },
    });

    await this.notifications.notifyRecallClosed(recall.entityCode, recall.reason);
    const closedBudget = await this.prisma.budgetProject.findUnique({ where: { id: recall.budgetId }, select: { title: true } });
    const closedEp = await this.getEntityPhone(recall.entityCode);
    if (closedEp) await this.n8n.onRecallClosed({ phone: closedEp.phone, firstName: closedEp.firstName, budgetTitle: closedBudget?.title ?? '' });

    return updated;
  }

  async reopen(recallId: string, userId: string) {
    const recall = await this.prisma.budgetRecall.findUnique({ where: { id: recallId } });
    if (!recall) throw new NotFoundException();
    if (recall.status !== 'closed') throw new BadRequestException('Ce rappel n\'est pas clôturé');

    const updated = await this.prisma.budgetRecall.update({
      where: { id: recallId },
      data: { status: 'open', closedAt: null, closedById: null },
    });

    await this.prisma.recallAuditLog.create({
      data: { recallId, userId, action: 'reopened', detail: '' },
    });

    return updated;
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
}
