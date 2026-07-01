import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto, UpdateStatusDto } from './dto/update-input.dto';

const INPUT_INCLUDE = {
  author: { select: { id: true, email: true, entityId: true } },
  entity: { select: { id: true, code: true, label: true } },
  referenceSection: { select: { id: true, titre: true } },
  revisions: {
    orderBy: { createdAt: 'desc' as const },
    include: { editor: { select: { id: true, email: true } } },
  },
} as const;

@Injectable()
export class InputsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { sectionId?: string; entityId?: string; type?: string; status?: string }) {
    return this.prisma.input.findMany({
      where: {
        ...(filters.sectionId && { referenceSectionId: filters.sectionId }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.type && { type: filters.type as any }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: INPUT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const input = await this.prisma.input.findUnique({ where: { id }, include: INPUT_INCLUDE });
    if (!input) throw new NotFoundException(`Input ${id} introuvable`);
    return input;
  }

  async create(dto: CreateInputDto, user: { userId: string; entityId: string | null }) {
    if (!user.entityId) {
      throw new ForbiddenException("Aucune entité associée à votre compte. Contactez l'administrateur.");
    }

    const section = await this.prisma.referenceSection.findUnique({ where: { id: dto.referenceSectionId } });
    if (!section) throw new NotFoundException(`Section ${dto.referenceSectionId} introuvable`);
    if (section.contributionMode === 'lecture_seule') {
      throw new ForbiddenException('Cette section est en lecture seule — aucune contribution possible.');
    }

    const input = await this.prisma.input.create({
      data: {
        referenceSectionId: dto.referenceSectionId,
        entityId: user.entityId,
        authorUserId: user.userId,
        type: dto.type as any,
        title: dto.title,
        content: dto.content,
        means: dto.means,
        output: dto.output,
        verificationMethod: dto.verificationMethod,
        targetValue: dto.targetValue,
        dueMonth: dto.dueMonth,
      },
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

  async update(id: string, dto: UpdateInputDto, user: { userId: string }) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.input.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type as any }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.means !== undefined && { means: dto.means }),
        ...(dto.output !== undefined && { output: dto.output }),
        ...(dto.verificationMethod !== undefined && { verificationMethod: dto.verificationMethod }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.dueMonth !== undefined && { dueMonth: dto.dueMonth }),
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

  async updateStatus(id: string, dto: UpdateStatusDto, user: { userId: string }) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.input.update({
      where: { id },
      data: { status: dto.status as any },
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'status_changed',
        snapshot: { before: existing.status, after: dto.status } as any,
      },
    });

    return updated;
  }

  async remove(id: string, user: { userId: string }) {
    await this.findOne(id);
    await this.prisma.input.delete({ where: { id } });
    return { deleted: id };
  }

  async getStats() {
    const bySection = await this.prisma.input.groupBy({
      by: ['referenceSectionId', 'status'],
      _count: true,
    });
    const byEntity = await this.prisma.input.groupBy({
      by: ['entityId', 'status'],
      _count: true,
    });
    return { bySection, byEntity };
  }
}
