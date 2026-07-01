import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto, UpdateStatusDto, UpdatePmoDto } from './dto/update-input.dto';

const INPUT_INCLUDE = {
  author: { select: { id: true, email: true, entityId: true } },
  entity: { select: { id: true, code: true, label: true } },
  referenceSection: { select: { id: true, titre: true } },
  revisions: {
    orderBy: { createdAt: 'desc' as const },
    include: { editor: { select: { id: true, email: true } } },
  },
} as const;

type AuthUser = { userId: string; roles: string[]; entityCode: string | null; entityId: string | null };

function isSuperAdmin(user: Pick<AuthUser, 'roles'>): boolean {
  return Array.isArray(user.roles) && user.roles.includes('super_admin');
}
function isPmo(user: Pick<AuthUser, 'entityCode'>): boolean {
  return user.entityCode === 'PMO';
}

function buildInputData(dto: Partial<CreateInputDto>) {
  return {
    ...(dto.content !== undefined && { content: dto.content }),
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.means !== undefined && { means: dto.means }),
    ...(dto.output !== undefined && { output: dto.output }),
    ...(dto.verificationMethod !== undefined && { verificationMethod: dto.verificationMethod }),
    ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
    ...(dto.dueMonth !== undefined && { dueMonth: dto.dueMonth }),
    ...(dto.objective !== undefined && { objective: dto.objective }),
    ...(dto.sourceRef !== undefined && { sourceRef: dto.sourceRef }),
    ...(dto.deliverable !== undefined && { deliverable: dto.deliverable }),
    ...(dto.paymentAmountProposed !== undefined && { paymentAmountProposed: dto.paymentAmountProposed }),
    ...(dto.baseline !== undefined && { baseline: dto.baseline }),
    ...(dto.dataSource !== undefined && { dataSource: dto.dataSource }),
    ...(dto.frequency !== undefined && { frequency: dto.frequency }),
    ...(dto.likelihood !== undefined && { likelihood: dto.likelihood }),
    ...(dto.impact !== undefined && { impact: dto.impact }),
    ...(dto.mitigation !== undefined && { mitigation: dto.mitigation }),
    ...(dto.targetRef !== undefined && { targetRef: dto.targetRef }),
  };
}

function validateTypeRequiredFields(type: string, dto: Partial<CreateInputDto>): void {
  const missing: string[] = [];
  if (type === 'activity') {
    if (!dto.content?.trim()) missing.push('content (description)');
  } else if (type === 'milestone') {
    if (!dto.title?.trim()) missing.push('title (description du jalon)');
    if (!dto.deliverable?.trim()) missing.push('deliverable (livrable attendu)');
    if (!dto.verificationMethod?.trim()) missing.push('verificationMethod (méthode de vérification)');
    if (!dto.dueMonth?.trim()) missing.push('dueMonth (mois d\'échéance)');
  } else if (type === 'indicator') {
    if (!dto.title?.trim()) missing.push('title (intitulé)');
    if (!dto.targetValue?.trim()) missing.push('targetValue (valeur cible)');
    if (!dto.dataSource?.trim()) missing.push('dataSource (source de donnée)');
    if (!dto.frequency?.trim()) missing.push('frequency (fréquence)');
  } else if (type === 'risk') {
    if (!dto.title?.trim()) missing.push('title (description du risque)');
    if (!dto.likelihood?.trim()) missing.push('likelihood (probabilité)');
    if (!dto.impact?.trim()) missing.push('impact');
    if (!dto.mitigation?.trim()) missing.push('mitigation (mesure d\'atténuation)');
  } else if (type === 'comment') {
    if (!dto.content?.trim()) missing.push('content');
  }
  if (missing.length > 0) {
    throw new BadRequestException(`Champs obligatoires manquants pour le type '${type}' : ${missing.join(', ')}`);
  }
}

@Injectable()
export class InputsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    sectionId?: string; entityId?: string; type?: string; status?: string;
  }) {
    return this.prisma.input.findMany({
      where: {
        deletedAt: null,
        ...(filters.sectionId && { referenceSectionId: filters.sectionId }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.type && { type: filters.type as any }),
        ...(filters.status && { status: filters.status as any }),
      } as any,
      include: INPUT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(userId: string, filters: {
    sectionId?: string; status?: string; entityCode?: string;
  }) {
    return this.prisma.input.findMany({
      where: {
        deletedAt: null,
        ...(filters.entityCode
          ? { entity: { code: filters.entityCode } }
          : { authorUserId: userId }),
        ...(filters.sectionId && { referenceSectionId: filters.sectionId }),
        ...(filters.status && { status: filters.status as any }),
      } as any,
      include: INPUT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findTrashed() {
    return this.prisma.input.findMany({
      where: { deletedAt: { not: null } } as any,
      include: INPUT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const input = await this.prisma.input.findUnique({ where: { id }, include: INPUT_INCLUDE });
    if (!input) throw new NotFoundException(`Input ${id} introuvable`);
    return input;
  }

  async create(dto: CreateInputDto, user: AuthUser) {
    if (!user.entityId) {
      throw new ForbiddenException("Aucune entité associée à votre compte. Contactez l'administrateur.");
    }

    const section = await this.prisma.referenceSection.findUnique({
      where: { id: dto.referenceSectionId },
    });
    if (!section) throw new NotFoundException(`Section ${dto.referenceSectionId} introuvable`);
    if (section.contributionMode === 'lecture_seule') {
      throw new ForbiddenException('Cette section est en lecture seule.');
    }

    const sectionAny = section as any;
    if (sectionAny.inputTypes?.length > 0 && !sectionAny.inputTypes.includes(dto.type)) {
      throw new BadRequestException(
        `Type '${dto.type}' non autorisé pour cette section. Types acceptés : ${sectionAny.inputTypes.join(', ')}`,
      );
    }

    const input = await this.prisma.input.create({
      data: {
        referenceSectionId: dto.referenceSectionId,
        entityId: user.entityId,
        authorUserId: user.userId,
        type: dto.type as any,
        content: dto.content ?? '',
        ...buildInputData(dto),
      } as any,
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: input.id,
        editorUserId: user.userId,
        changeType: 'created',
        snapshot: input as any,
      },
    });

    return input;
  }

  async update(id: string, dto: UpdateInputDto, user: AuthUser) {
    const existing = await this.findOne(id);

    if (existing.status !== 'draft' && !isSuperAdmin(user)) {
      throw new ForbiddenException(
        'Cet input est verrouillé (statut : ' + existing.status + '). Contactez le Super Admin pour le déverrouiller.',
      );
    }

    const updated = await this.prisma.input.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type as any }),
        ...buildInputData(dto),
      },
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'updated',
        snapshot: { before: existing, after: updated } as any,
      },
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, user: AuthUser) {
    const existing = await this.findOne(id);
    const sa = isSuperAdmin(user);
    const pmo = isPmo(user);
    const requested = dto.status;

    if (requested === 'draft') {
      if (!sa) {
        throw new ForbiddenException('Seul le Super Admin peut déverrouiller un input soumis.');
      }
    } else if (requested === 'submitted') {
      if (existing.status !== 'draft') {
        throw new ForbiddenException('Seul un brouillon peut être soumis.');
      }
      if (existing.authorUserId !== user.userId && !sa) {
        throw new ForbiddenException("Seul l'auteur peut soumettre cet input.");
      }
      validateTypeRequiredFields(existing.type, existing as any);
    } else if (requested === 'retained' || requested === 'rejected') {
      if (!pmo && !sa) {
        throw new ForbiddenException('Seul le PMO peut qualifier les contributions.');
      }
    }

    const updated = await this.prisma.input.update({
      where: { id },
      data: { status: requested as any },
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: requested === 'draft' ? 'unlocked' : `status_${requested}`,
        snapshot: { before: existing.status, after: requested } as any,
      },
    });

    return updated;
  }

  async updatePmo(id: string, dto: UpdatePmoDto, user: AuthUser) {
    if (!isPmo(user) && !isSuperAdmin(user)) {
      throw new ForbiddenException('Action réservée au PMO.');
    }

    const existing = await this.findOne(id);

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.paymentAmountFinal !== undefined) data.paymentAmountFinal = dto.paymentAmountFinal;

    const updated = await this.prisma.input.update({
      where: { id },
      data,
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'pmo_update',
        snapshot: {
          before: { status: existing.status, paymentAmountFinal: (existing as any).paymentAmountFinal },
          after: data,
        } as any,
      },
    });

    return updated;
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.findOne(id);
    const sa = isSuperAdmin(user);

    if (!sa) {
      if (existing.status !== 'draft') {
        throw new ForbiddenException(
          'Seul un brouillon peut être supprimé. Contactez le Super Admin pour supprimer un input soumis.',
        );
      }
      if (existing.authorUserId !== user.userId) {
        throw new ForbiddenException('Vous ne pouvez supprimer que vos propres brouillons.');
      }
    }

    await this.prisma.input.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: user.userId } as any,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'soft_deleted',
        snapshot: { status: existing.status } as any,
      },
    });

    return { deleted: id };
  }

  async restore(id: string, user: AuthUser) {
    if (!isSuperAdmin(user)) {
      throw new ForbiddenException('Seul le Super Admin peut restaurer un input supprimé.');
    }

    const existing = await this.prisma.input.findUnique({ where: { id } }) as any;
    if (!existing) throw new NotFoundException(`Input ${id} introuvable`);
    if (!existing.deletedAt) throw new BadRequestException("Cet input n'est pas supprimé.");

    const restored = await this.prisma.input.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'restored',
        snapshot: { restoredStatus: restored.status } as any,
      },
    });

    return restored;
  }

  async getStats() {
    const bySection = await this.prisma.input.groupBy({
      by: ['referenceSectionId', 'status'],
      where: { deletedAt: null } as any,
      _count: true,
    });
    const byEntity = await this.prisma.input.groupBy({
      by: ['entityId', 'status'],
      where: { deletedAt: null } as any,
      _count: true,
    });
    return { bySection, byEntity };
  }
}
