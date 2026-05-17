import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SectionType, DosParticipation, CriticalityLevel } from '@prisma/client';

export interface SaveSectionDto {
  section: string;
  data: any;
}

const LOCK_TTL_MINUTES = 15;

const SUBMISSION_INCLUDE = {
  activities: { orderBy: { orderIndex: 'asc' as const } },
  plannedActivities: { orderBy: { orderIndex: 'asc' as const } },
  riskPoints: { orderBy: { orderIndex: 'asc' as const } },
  submittedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findByWeekAndEntity(weekId: string, entityCode: string) {
    let submission = await this.prisma.entitySubmission.findUnique({
      where: { weekId_entityCode: { weekId, entityCode } },
      include: SUBMISSION_INCLUDE,
    });

    if (!submission) {
      const week = await this.prisma.week.findUnique({ where: { id: weekId } });
      if (!week) throw new NotFoundException('Semaine introuvable');
      submission = await this.prisma.entitySubmission.create({
        data: { weekId, entityCode },
        include: SUBMISSION_INCLUDE,
      });
    }

    const entityChief = await this.prisma.user.findFirst({
      where: { entityCode, isEntityResponsible: true, isActive: true },
      select: { firstName: true, lastName: true },
    });

    const entityChiefName = entityChief
      ? `${entityChief.firstName} ${entityChief.lastName}`.trim()
      : null;

    return { ...this.normalizeSubmission(submission), entityChiefName };
  }

  private normalizeSubmission(sub: any) {
    return {
      ...sub,
      plannedActivities: (sub.plannedActivities ?? []).map((a: any) => ({
        ...a,
        dosParticipation: SubmissionsService.toDoDisplay(a.dosParticipation),
      })),
      riskPoints: (sub.riskPoints ?? []).map((r: any) => ({
        ...r,
        criticality: SubmissionsService.toCritDisplay(r.criticality),
      })),
    };
  }

  private static toDoDisplay(v: string | null | undefined): string {
    if (v === 'oui') return '✅ OUI';
    if (v === 'non') return '❌ NON';
    return v ?? '';
  }

  private static toCritDisplay(v: string | null | undefined): string {
    const map: Record<string, string> = {
      critique: '🔴 Critique',
      eleve:    '🟠 Élevé',
      modere:   '🟡 Modéré',
      faible:   '🟢 Faible',
    };
    return map[v ?? ''] ?? (v ?? '');
  }

  async getLocksStatus(weekId: string, entityCode: string) {
    const submission = await this.prisma.entitySubmission.findUnique({
      where: { weekId_entityCode: { weekId, entityCode } },
      select: { id: true },
    });
    if (!submission) return [];

    return this.prisma.sectionLock.findMany({
      where: { submissionId: submission.id, expiresAt: { gt: new Date() } },
      include: { lockedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async acquireLock(weekId: string, entityCode: string, section: SectionType, userId: string) {
    const submission = await this.findOrCreate(weekId, entityCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_TTL_MINUTES * 60 * 1000);

    const existing = await this.prisma.sectionLock.findUnique({
      where: { submissionId_section: { submissionId: submission.id, section } },
    });

    if (existing && existing.expiresAt > now && existing.lockedById !== userId) {
      throw new ConflictException('Cette section est déjà verrouillée par un autre utilisateur');
    }

    return this.prisma.sectionLock.upsert({
      where: { submissionId_section: { submissionId: submission.id, section } },
      update: { lockedById: userId, lockedAt: now, expiresAt },
      create: { submissionId: submission.id, section, lockedById: userId, expiresAt },
      include: { lockedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async releaseLock(weekId: string, entityCode: string, section: SectionType, userId: string) {
    const submission = await this.prisma.entitySubmission.findUnique({
      where: { weekId_entityCode: { weekId, entityCode } },
      select: { id: true },
    });
    if (!submission) return { released: false };

    await this.prisma.sectionLock.deleteMany({
      where: { submissionId: submission.id, section, lockedById: userId },
    });
    return { released: true };
  }

  async saveSection(weekId: string, entityCode: string, dto: SaveSectionDto, userId: string) {
    const submission = await this.findOrCreate(weekId, entityCode);
    if (submission.status === 'submitted') throw new BadRequestException('La saisie est déjà soumise');

    switch (dto.section as SectionType) {
      case SectionType.A: await this.saveSectionA(submission.id, dto.data); break;
      case SectionType.B: await this.saveSectionB(submission.id, dto.data); break;
      case SectionType.C: await this.saveSectionC(submission.id, dto.data); break;
      case SectionType.D: await this.saveSectionD(submission.id, dto.data); break;
      default: throw new BadRequestException('Section invalide');
    }

    return this.prisma.entitySubmission.update({
      where: { id: submission.id },
      data: { lastSavedAt: new Date() },
      include: SUBMISSION_INCLUDE,
    });
  }

  async submit(weekId: string, entityCode: string, userId: string) {
    const submission = await this.prisma.entitySubmission.findUnique({
      where: { weekId_entityCode: { weekId, entityCode } },
    });
    if (!submission) throw new NotFoundException('Saisie introuvable');
    if (submission.status === 'submitted') throw new BadRequestException('La saisie est déjà soumise');

    const week = await this.prisma.week.findUnique({ where: { id: weekId } });
    if (!week) throw new NotFoundException('Semaine introuvable');
    if (week.status === 'closed') throw new BadRequestException('La semaine est clôturée');

    const updated = await this.prisma.entitySubmission.update({
      where: { id: submission.id },
      data: { status: 'submitted', submittedAt: new Date(), submittedById: userId },
    });

    await this.notifications.notifySubmission(entityCode, weekId, week.weekReference);
    return updated;
  }

  async reopenSubmission(weekId: string, entityCode: string) {
    const submission = await this.prisma.entitySubmission.findUnique({
      where: { weekId_entityCode: { weekId, entityCode } },
    });
    if (!submission) throw new NotFoundException('Saisie introuvable');
    if (submission.status !== 'submitted') throw new BadRequestException("La saisie n'est pas soumise");

    return this.prisma.entitySubmission.update({
      where: { id: submission.id },
      data: { status: 'draft', submittedAt: null, submittedById: null },
    });
  }

  async cleanExpiredLocks() {
    await this.prisma.sectionLock.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOrCreate(weekId: string, entityCode: string) {
    let sub = await this.prisma.entitySubmission.findUnique({
      where: { weekId_entityCode: { weekId, entityCode } },
    });
    if (!sub) {
      const week = await this.prisma.week.findUnique({ where: { id: weekId } });
      if (!week) throw new NotFoundException('Semaine introuvable');
      sub = await this.prisma.entitySubmission.create({ data: { weekId, entityCode } });
    }
    return sub;
  }

  private async saveSectionA(submissionId: string, data: any) {
    await this.prisma.entitySubmission.update({
      where: { id: submissionId },
      data: {
        responsible: data.responsible ?? '',
        submissionDate: data.submissionDate ?? '',
      },
    });
  }

  private async saveSectionB(submissionId: string, data: any) {
    const items: any[] = data.activities ?? [];
    await this.prisma.activity.deleteMany({ where: { submissionId } });
    if (items.length > 0) {
      await this.prisma.activity.createMany({
        data: items.map((a, idx) => ({
          submissionId,
          orderIndex: idx,
          title: a.title ?? '',
          objectives: a.objectives ?? '',
          location: a.location ?? '',
          dates: a.dates ?? '',
          recommendations: a.recommendations ?? '',
          startDate: a.startDate ? new Date(a.startDate) : null,
          endDate: a.endDate ? new Date(a.endDate) : null,
        })),
      });
    }
  }

  private async saveSectionC(submissionId: string, data: any) {
    const items: any[] = data.plannedActivities ?? [];
    await this.prisma.plannedActivity.deleteMany({ where: { submissionId } });
    if (items.length > 0) {
      await this.prisma.plannedActivity.createMany({
        data: items.map((a, idx) => ({
          submissionId,
          orderIndex: idx,
          title: a.title ?? '',
          objectives: a.objectives ?? '',
          location: a.location ?? '',
          plannedDates: a.plannedDates ?? '',
          dosParticipation: SubmissionsService.mapDos(a.dosParticipation),
          observations: a.observations ?? '',
          startDate: a.startDate ? new Date(a.startDate) : null,
          endDate: a.endDate ? new Date(a.endDate) : null,
        })),
      });
    }
  }

  private async saveSectionD(submissionId: string, data: any) {
    const items: any[] = data.riskPoints ?? [];
    await this.prisma.riskPoint.deleteMany({ where: { submissionId } });
    if (items.length > 0) {
      await this.prisma.riskPoint.createMany({
        data: items.map((r, idx) => ({
          submissionId,
          orderIndex: idx,
          theme: r.theme ?? '',
          category: r.category ?? '',
          description: r.description ?? '',
          criticality: SubmissionsService.mapCriticality(r.criticality),
          expectedAction: r.expectedAction ?? '',
        })),
      });
    }
  }

  private static mapDos(v: string | null | undefined): DosParticipation | null {
    if (v === '✅ OUI' || v === 'oui') return DosParticipation.oui;
    if (v === '❌ NON' || v === 'non') return DosParticipation.non;
    return null;
  }

  private static mapCriticality(v: string | null | undefined): CriticalityLevel | null {
    if (v === '🔴 Critique' || v === 'critique') return CriticalityLevel.critique;
    if (v === '🟠 Élevé'   || v === 'eleve')    return CriticalityLevel.eleve;
    if (v === '🟡 Modéré'  || v === 'modere')   return CriticalityLevel.modere;
    if (v === '🟢 Faible'  || v === 'faible')   return CriticalityLevel.faible;
    return null;
  }
}
