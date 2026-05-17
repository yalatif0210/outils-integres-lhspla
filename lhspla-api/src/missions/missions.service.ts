import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MissionDocumentService } from './mission-document.service';
import { N8nService } from '../n8n/n8n.service';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { MissionStatus, Role } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateMissionDto {
  @IsString() object: string;
  @IsString() location: string;
  @IsDateString() departureDate: string;
  @IsDateString() returnDate: string;
  @IsDateString() resumeDate: string;
  @IsString() fundId: string;
  @IsOptional() @IsString() budgetId?: string;
  @IsOptional() @IsString() activityRefId?: string;
  @IsArray() @IsString({ each: true }) participantIds: string[];
  @IsOptional() @IsBoolean() isInvitation?: boolean;
}

export class UpdateMissionDto {
  @IsOptional() @IsString() object?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() departureDate?: string;
  @IsOptional() @IsDateString() returnDate?: string;
  @IsOptional() @IsDateString() resumeDate?: string;
  @IsOptional() @IsString() fundId?: string;
  @IsOptional() @IsString() budgetId?: string;
  @IsOptional() @IsString() activityRefId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) participantIds?: string[];
  @IsOptional() @IsBoolean() isInvitation?: boolean;
}

export class CopReviewDto {
  @IsEnum(['cop_approved', 'cancelled']) decision: 'cop_approved' | 'cancelled';
  @IsOptional() @IsString() rejectionReason?: string;
}

// ─── Helpers rôles ────────────────────────────────────────────────────────────

// Rôles qui voient TOUTES les missions (pas seulement les leurs)
const MISSION_VIEWER_ROLES: Role[] = [
  Role.super_admin,
  Role.admin_tpm,
  Role.assistant_direction,
  Role.chief_of_party,
];

// Rôles qui peuvent annuler / interagir avec les missions en dehors du workflow normal
const MISSION_STAFF_ROLES: Role[] = [
  Role.super_admin,
  Role.assistant_direction,
  Role.chief_of_party,
];

function hasRole(userRoles: Role[], ...roles: Role[]): boolean {
  return roles.some(r => userRoles.includes(r));
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class MissionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private docService: MissionDocumentService,
    private n8n: N8nService,
  ) {}

  // ── findAll ────────────────────────────────────────────────────────────────
  async findAll(userRoles: Role[], entityCode?: string, userId?: string, isEntityResponsible?: boolean) {
    const isViewer = userRoles.some(r => MISSION_VIEWER_ROLES.includes(r));
    const where: any = {};

    if (isViewer) {
      // Masquer les missions annulées par leur initiateur avant soumission
      where.cancelledFromDraft = false;
      where.status = { not: MissionStatus.draft };
    }

    if (!isViewer) {
      if (!userId) throw new ForbiddenException();
      if (isEntityResponsible && entityCode) {
        // Chef d'entité : voit toutes les missions de son entité
        where.initiator = { entityCode };
      } else {
        // Membre normal : ses missions + missions où il est participant (via email)
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        const orConds: any[] = [{ initiatorId: userId }];
        if (user?.email) {
          orConds.push({ participants: { some: { personnel: { email: user.email } } } });
        }
        where.OR = orConds;
      }
    }

    return this.prisma.missionRequest.findMany({
      where,
      include: {
        initiator: {
          select: { id: true, firstName: true, lastName: true, email: true, roles: true, entityCode: true },
        },
        budget: { select: { id: true, title: true, budgetType: true } },
        activityRef: { select: { id: true, title: true, activityCode: true } },
        fund: { select: { id: true, name: true, code: true } },
        participants: {
          include: {
            personnel: { select: { id: true, fullName: true, service: true, function: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── findOne ────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const mission = await this.prisma.missionRequest.findUnique({
      where: { id },
      include: {
        initiator: {
          select: { id: true, firstName: true, lastName: true, email: true, roles: true, entityCode: true },
        },
        budget: {
          select: { id: true, title: true, budgetType: true, entityCode: true },
        },
        activityRef: {
          select: { id: true, title: true, activityCode: true, os: true, oo: true },
        },
        fund: { select: { id: true, name: true, code: true } },
        participants: {
          include: {
            personnel: {
              select: {
                id: true,
                fullName: true,
                service: true,
                function: true,
                waveNumber: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    return mission;
  }

  // ── create ─────────────────────────────────────────────────────────────────
  async create(dto: CreateMissionDto, initiatorId: string, _initiatorRoles: Role[]) {
    // Vérifier le fonds
    const fund = await this.prisma.financingFund.findUnique({ where: { id: dto.fundId } });
    if (!fund || !fund.isActive) {
      throw new BadRequestException('Fonds introuvable ou inactif');
    }

    // Vérifier le budget si fourni
    if (dto.budgetId) {
      const budget = await this.prisma.budgetProject.findUnique({ where: { id: dto.budgetId } });
      if (!budget) throw new BadRequestException('Budget introuvable');
      if (budget.status !== 'approved' && budget.status !== 'mission_cop') {
        throw new BadRequestException('Le budget doit être approuvé ou mission_cop');
      }
    }

    // Vérifier les participants
    if (dto.participantIds?.length) {
      const found = await this.prisma.personnel.count({
        where: { id: { in: dto.participantIds }, isActive: true },
      });
      if (found !== dto.participantIds.length) {
        throw new BadRequestException('Un ou plusieurs participants sont introuvables ou inactifs');
      }
    }

    return this.prisma.missionRequest.create({
      data: {
        initiatorId,
        object: dto.object,
        location: dto.location,
        departureDate: new Date(dto.departureDate),
        returnDate: new Date(dto.returnDate),
        resumeDate: new Date(dto.resumeDate),
        fundId: dto.fundId,
        budgetId: dto.budgetId ?? null,
        activityRefId: dto.activityRefId ?? null,
        isInvitation: dto.isInvitation ?? false,
        participants: dto.participantIds?.length
          ? {
              createMany: {
                data: dto.participantIds.map(personnelId => ({ personnelId })),
              },
            }
          : undefined,
      },
      include: {
        initiator: {
          select: { id: true, firstName: true, lastName: true, email: true, roles: true },
        },
        budget: { select: { id: true, title: true, budgetType: true } },
        activityRef: { select: { id: true, title: true, activityCode: true } },
        fund: { select: { id: true, name: true, code: true } },
        participants: {
          include: { personnel: { select: { id: true, fullName: true, service: true, function: true } } },
        },
      },
    });
  }

  // ── update ─────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateMissionDto, userId: string) {
    const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    if (mission.initiatorId !== userId) throw new ForbiddenException('Seul l\'initiateur peut modifier cette mission');
    if (mission.status !== MissionStatus.draft) {
      throw new BadRequestException('Seules les missions en brouillon peuvent être modifiées');
    }

    const data: any = {};
    if (dto.object !== undefined) data.object = dto.object;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.departureDate !== undefined) data.departureDate = new Date(dto.departureDate);
    if (dto.returnDate !== undefined) data.returnDate = new Date(dto.returnDate);
    if (dto.resumeDate !== undefined) data.resumeDate = new Date(dto.resumeDate);
    if (dto.fundId !== undefined) data.fundId = dto.fundId;
    if (dto.budgetId !== undefined) data.budgetId = dto.budgetId || null;
    if (dto.activityRefId !== undefined) data.activityRefId = dto.activityRefId || null;
    if (dto.isInvitation !== undefined) data.isInvitation = dto.isInvitation;

    // Mise à jour des participants si fournis
    if (dto.participantIds !== undefined) {
      await this.prisma.missionParticipant.deleteMany({ where: { missionId: id } });
      if (dto.participantIds.length) {
        await this.prisma.missionParticipant.createMany({
          data: dto.participantIds.map(personnelId => ({ missionId: id, personnelId })),
        });
      }
    }

    return this.prisma.missionRequest.update({
      where: { id },
      data,
      include: {
        initiator: {
          select: { id: true, firstName: true, lastName: true, email: true, roles: true },
        },
        budget: { select: { id: true, title: true, budgetType: true } },
        activityRef: { select: { id: true, title: true, activityCode: true } },
        fund: { select: { id: true, name: true, code: true } },
        participants: {
          include: { personnel: { select: { id: true, fullName: true, service: true, function: true } } },
        },
      },
    });
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  // COP → cop_approved directement ; sinon → pending_tpm
  async submit(id: string, userId: string, userRoles: Role[]) {
    const mission = await this.prisma.missionRequest.findUnique({
      where: { id },
      include: { participants: { select: { personnelId: true } } },
    });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    if (mission.initiatorId !== userId) throw new ForbiddenException();
    if (mission.status !== MissionStatus.draft) {
      throw new BadRequestException('La mission doit être en brouillon pour être soumise');
    }

    // Vérifier les chevauchements au moment de la soumission
    const participantIds = mission.participants.map(p => p.personnelId);
    if (participantIds.length) {
      await this.checkParticipantOverlap(
        participantIds,
        mission.departureDate,
        mission.returnDate,
        id,
      );
    }

    // COP s'auto-approuve ; admin_tpm saute l'étape TPM (ils sont le TPM) → pending_cop
    const isCop    = hasRole(userRoles, Role.chief_of_party);
    const isTpm    = hasRole(userRoles, Role.admin_tpm);
    const newStatus = isCop
      ? MissionStatus.cop_approved
      : isTpm
        ? MissionStatus.pending_cop
        : MissionStatus.pending_tpm;

    const updated = await this.prisma.missionRequest.update({
      where: { id },
      data: { status: newStatus },
    });

    if (isCop) {
      await this.notifyByRole(
        [Role.assistant_direction],
        'MISSION_COP_APPROVED',
        'Demande de mission approuvée par le COP',
        `La demande de mission "${mission.object}" a été approuvée par le COP. Vous pouvez générer les documents.`,
        { missionId: id },
      );
      const adPhones = await this.getRolePhones(Role.assistant_direction);
      for (const u of adPhones) {
        await this.n8n.onMissionCopApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
      }
    } else if (isTpm) {
      await this.notifyByRole(
        [Role.chief_of_party],
        'MISSION_SUBMITTED',
        'Demande de mission en attente de votre avis',
        `Une demande de mission "${mission.object}" (soumise par le TPM) est en attente de votre avis COP.`,
        { missionId: id },
      );
      const copPhonesT = await this.getRolePhones(Role.chief_of_party);
      for (const u of copPhonesT) {
        await this.n8n.onMissionTpmApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
      }
    } else {
      await this.notifyByRole(
        [Role.admin_tpm],
        'MISSION_SUBMITTED',
        'Demande de mission à viser',
        `Une demande de mission "${mission.object}" est en attente de votre avis TPM.`,
        { missionId: id },
      );
      const tpmPhones = await this.getRolePhones(Role.admin_tpm);
      for (const u of tpmPhones) {
        await this.n8n.onMissionSubmitted({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
      }
    }

    return updated;
  }

  // ── tpmReview ──────────────────────────────────────────────────────────────
  // admin_tpm approuve → pending_cop | rejette → draft (initiateur peut corriger)
  // Accepte { decision: 'pending_cop'|'draft', rejectionReason? }
  //      ou { approved: boolean, reason? }
  async tpmReview(id: string, dto: any, _userId: string) {
    const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    if (mission.status !== MissionStatus.pending_tpm) {
      throw new BadRequestException('La mission n\'est pas en attente d\'avis TPM');
    }

    // Normaliser les deux formats de payload
    const approved: boolean = dto.decision === 'pending_cop' || dto.approved === true;
    const rejectionReason: string | undefined = dto.rejectionReason ?? dto.reason;

    if (!approved && !rejectionReason) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    const updated = await this.prisma.missionRequest.update({
      where: { id },
      data: {
        status: approved ? MissionStatus.pending_cop : MissionStatus.draft,
        rejectionReason: approved ? null : (rejectionReason ?? null),
      },
    });

    if (approved) {
      await this.notifyByRole(
        [Role.chief_of_party],
        'MISSION_TPM_APPROVED',
        'Demande de mission visée par le TPM',
        `La demande de mission "${mission.object}" a été visée par l'admin TPM. Elle est en attente de votre avis.`,
        { missionId: id },
      );
      const copPhones = await this.getRolePhones(Role.chief_of_party);
      for (const u of copPhones) {
        await this.n8n.onMissionTpmApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
      }
    } else {
      await this.notifyUser(
        mission.initiatorId,
        'MISSION_TPM_REJECTED',
        'Demande de mission renvoyée pour correction',
        `Votre demande de mission "${mission.object}" a été renvoyée pour correction. Motif : ${rejectionReason}`,
        { missionId: id, reason: rejectionReason },
      );
      const initiatorPhone = await this.getUserPhone(mission.initiatorId);
      if (initiatorPhone) await this.n8n.onMissionTpmRejected({ phone: initiatorPhone.phone, firstName: initiatorPhone.firstName, missionTitle: mission.object, reason: rejectionReason! });
    }

    return updated;
  }

  // ── copReview ──────────────────────────────────────────────────────────────
  // COP valide → cop_approved | rejette → cancelled
  async copReview(id: string, dto: CopReviewDto, _userId: string) {
    const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    if (mission.status !== MissionStatus.pending_cop) {
      throw new BadRequestException('La mission n\'est pas en attente d\'avis COP');
    }
    if (dto.decision === 'cancelled' && !dto.rejectionReason) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    const updated = await this.prisma.missionRequest.update({
      where: { id },
      data: {
        status: dto.decision === 'cop_approved' ? MissionStatus.cop_approved : MissionStatus.cancelled,
        rejectionReason: dto.decision === 'cancelled' ? (dto.rejectionReason ?? null) : null,
      },
    });

    if (dto.decision === 'cop_approved') {
      await this.notifyByRole(
        [Role.assistant_direction],
        'MISSION_COP_APPROVED',
        'Demande de mission approuvée par le COP',
        `La demande de mission "${mission.object}" a été approuvée par le COP. Vous pouvez générer les documents.`,
        { missionId: id },
      );
      const adPhones = await this.getRolePhones(Role.assistant_direction);
      for (const u of adPhones) {
        await this.n8n.onMissionCopApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
      }
    } else {
      await this.notifyUser(
        mission.initiatorId,
        'MISSION_REJECTED',
        'Demande de mission rejetée',
        `Votre demande de mission "${mission.object}" a été rejetée. Motif : ${dto.rejectionReason}`,
        { missionId: id, reason: dto.rejectionReason },
      );
      await this.notifyByRole(
        [Role.assistant_direction],
        'MISSION_REJECTED',
        'Demande de mission rejetée par le COP',
        `La demande de mission "${mission.object}" a été rejetée par le COP. Motif : ${dto.rejectionReason}`,
        { missionId: id, reason: dto.rejectionReason },
      );
      const initiatorPhone = await this.getUserPhone(mission.initiatorId);
      if (initiatorPhone) await this.n8n.onMissionRejected({ phone: initiatorPhone.phone, firstName: initiatorPhone.firstName, missionTitle: mission.object, reason: dto.rejectionReason! });
    }

    return updated;
  }

  // ── generateDocs ───────────────────────────────────────────────────────────
  // cop_approved → pending_dg : génère DM.docx + ODM.docx dans uploads/missions/{id}/
  async generateDocs(id: string, _userId: string) {
    const mission = await this.prisma.missionRequest.findUnique({
      where: { id },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, email: true, roles: true, entityCode: true } },
        budget:    { select: { id: true, title: true, budgetType: true } },
        activityRef: { select: { id: true, title: true, activityCode: true } },
        fund:      { select: { id: true, name: true, code: true } },
        participants: {
          include: { personnel: { select: { id: true, fullName: true, service: true, function: true, waveNumber: true, email: true } } },
        },
      },
    });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    if (mission.status !== MissionStatus.cop_approved) {
      throw new BadRequestException('La mission doit être approuvée par le COP pour générer les documents');
    }

    await this.docService.generateDocuments(mission);

    const updated = await this.prisma.missionRequest.update({
      where: { id },
      data: { status: MissionStatus.pending_dg },
    });

    // Notifier l'initiateur et les assistant_direction
    await this.notifyUser(
      mission.initiatorId,
      'MISSION_DOCS_GENERATED',
      'Documents de mission générés',
      `Les documents DM et ODM pour la mission "${mission.object}" ont été générés et sont en attente de validation DG.`,
      { missionId: id },
    );
    await this.notifyByRole(
      [Role.assistant_direction],
      'MISSION_DOCS_GENERATED',
      'Documents générés — validation DG requise',
      `Les documents DM et ODM pour la mission "${mission.object}" sont prêts. Faites valider par le Directeur Général.`,
      { missionId: id },
    );

    return updated;
  }

  // ── validateDg ─────────────────────────────────────────────────────────────
  // pending_dg → in_progress, notifie initiateur
  async validateDg(id: string, _userId: string) {
    const mission = await this.prisma.missionRequest.findUnique({
      where: { id },
      include: {
        participants: { include: { personnel: { select: { email: true, fullName: true } } } },
      },
    });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    if (mission.status !== MissionStatus.pending_dg) {
      throw new BadRequestException('La mission doit être en attente de validation DG');
    }

    const updated = await this.prisma.missionRequest.update({
      where: { id },
      data: { status: MissionStatus.in_progress },
    });

    await this.notifyUser(
      mission.initiatorId,
      'MISSION_DG_VALIDATED',
      'Demande de mission validée par le DG',
      `Votre demande de mission "${mission.object}" a été validée par le DG. La mission est maintenant en cours.`,
      { missionId: id },
    );
    const initiatorPhone = await this.getUserPhone(mission.initiatorId);
    if (initiatorPhone) await this.n8n.onMissionDgValidated({ phone: initiatorPhone.phone, firstName: initiatorPhone.firstName, missionTitle: mission.object });

    return updated;
  }

  // ── cancel ─────────────────────────────────────────────────────────────────
  async cancel(id: string, userId: string, userRoles: Role[]) {
    const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');

    const isStaff = userRoles.some(r => MISSION_STAFF_ROLES.includes(r));
    const isInitiator = mission.initiatorId === userId;

    if (!isStaff && !isInitiator) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à annuler cette mission');
    }

    // L'initiateur ne peut annuler que si statut draft
    if (isInitiator && !isStaff && mission.status !== MissionStatus.draft) {
      throw new BadRequestException('L\'initiateur ne peut annuler qu\'une mission en brouillon');
    }

    // Le staff peut annuler dans tous les statuts sauf completed / cancelled
    if (([MissionStatus.completed, MissionStatus.cancelled] as MissionStatus[]).includes(mission.status)) {
      throw new BadRequestException('Cette mission ne peut plus être annulée');
    }

    return this.prisma.missionRequest.update({
      where: { id },
      data: {
        status: MissionStatus.cancelled,
        cancelledFromDraft: !isStaff && isInitiator && mission.status === MissionStatus.draft,
      },
    });
  }

  // ── getDashboard ───────────────────────────────────────────────────────────
  // Retourne une ligne par participant par mission (vue tableau de bord Excel)
  async getDashboard() {
    const missions = await this.prisma.missionRequest.findMany({
      where: { cancelledFromDraft: false },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, entityCode: true } },
        budget:    { select: { id: true, title: true } },
        fund:      { select: { id: true, name: true, code: true } },
        activityRef: { select: { id: true, activityCode: true, title: true } },
        participants: {
          include: {
            personnel: { select: { id: true, fullName: true, service: true, function: true, waveNumber: true } },
          },
        },
      },
      orderBy: { departureDate: 'desc' },
    });

    // Aplatir : une ligne par participant (ou une ligne mission si aucun participant)
    const rows: any[] = [];
    let rowNum = 1;

    for (const m of missions) {
      const imputation = m.fund ? `${m.fund.code} — ${m.fund.name}` : '—';

      const depDate = new Date(m.departureDate);
      const retDate = new Date(m.returnDate);
      const duree = Math.ceil((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const baseRow = {
        id:                   m.id,
        missionNo:            rowNum,
        destination:          m.location,
        dateDepart:           m.departureDate,
        dateRetour:           m.returnDate,
        dureeJours:           duree,
        dateReprise:          m.resumeDate,
        objet:                m.object,
        imputation,
        status:               m.status,
        transmittedAt:        m.transmittedAt ?? null,
        rejectionReason:      m.rejectionReason ?? null,
        orderNumber:          m.orderNumber ?? null,
        dashboardObservations: m.dashboardObservations ?? null,
        initiatorEntityCode:  m.initiator?.entityCode ?? null,
        activityCode:         m.activityRef?.activityCode ?? null,
      };

      if (m.participants.length === 0) {
        rows.push({
          ...baseRow,
          service:  m.initiator?.entityCode ?? '—',
          fullName: `${m.initiator?.firstName ?? ''} ${m.initiator?.lastName ?? ''}`.trim() || '—',
          fonction: '—',
          wave:     '—',
        });
        rowNum++;
      } else {
        for (const mp of m.participants) {
          const p = mp.personnel;
          rows.push({
            ...baseRow,
            service:  p.service  ?? '—',
            fullName: p.fullName ?? '—',
            fonction: p.function ?? '—',
            wave:     p.waveNumber ?? '—',
          });
          rowNum++;
        }
      }
    }

    return rows;
  }

  // ── updateDashboardFields ──────────────────────────────────────────────────
  // assistant_direction peut renseigner N° OM et Observations depuis le tableau de bord
  async updateDashboardFields(id: string, dto: { orderNumber?: string; dashboardObservations?: string }) {
    const mission = await this.prisma.missionRequest.findUnique({ where: { id }, select: { id: true } });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');
    return this.prisma.missionRequest.update({
      where: { id },
      data: {
        ...(dto.orderNumber !== undefined ? { orderNumber: dto.orderNumber || null } : {}),
        ...(dto.dashboardObservations !== undefined ? { dashboardObservations: dto.dashboardObservations || null } : {}),
      },
      select: { id: true, orderNumber: true, dashboardObservations: true },
    });
  }

  // ── autoComplete ───────────────────────────────────────────────────────────
  // Appelé par le CronService : passe in_progress → completed si returnDate dépassée
  async autoComplete() {
    const now = new Date();

    const expired = await this.prisma.missionRequest.findMany({
      where: {
        status: MissionStatus.in_progress,
        returnDate: { lt: now },
      },
      select: { id: true, object: true },
    });

    if (!expired.length) return 0;

    await this.prisma.missionRequest.updateMany({
      where: {
        status: MissionStatus.in_progress,
        returnDate: { lt: now },
      },
      data: { status: MissionStatus.completed },
    });

    // Notifier tous les assistant_direction pour chaque mission terminée
    for (const mission of expired) {
      await this.notifyByRole(
        [Role.assistant_direction],
        'MISSION_COMPLETED',
        'Mission terminée automatiquement',
        `La mission "${mission.object}" a été marquée comme terminée automatiquement.`,
        { missionId: mission.id },
      );
    }

    return expired.length;
  }

  // ── uploadSignedDoc ────────────────────────────────────────────────────────
  async uploadSignedDoc(id: string, file: Express.Multer.File, userId: string, userRoles: Role[]) {
    const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException('Demande de mission introuvable');

    const canUpload =
      mission.initiatorId === userId ||
      userRoles.some(r => r === Role.assistant_direction || r === Role.super_admin);
    if (!canUpload) throw new ForbiddenException('Vous n\'êtes pas autorisé à importer un document pour cette mission');

    const uploadableStatuses: MissionStatus[] = [
      MissionStatus.pending_dg,
      MissionStatus.in_progress,
      MissionStatus.completed,
    ];
    if (!uploadableStatuses.includes(mission.status)) {
      throw new BadRequestException('L\'import de document n\'est disponible qu\'après génération des documents DM/ODM');
    }

    const ext = path.extname(file.originalname).replace('.', '').toLowerCase() || 'pdf';
    const dir = path.join(process.cwd(), 'uploads', 'missions', id, 'signed');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `signed.${ext}`);
    fs.renameSync(file.path, dest);

    return this.prisma.missionRequest.update({
      where: { id },
      data: { signedDocPath: dest, signedDocExt: ext },
      select: { id: true, signedDocPath: true, signedDocExt: true },
    });
  }

  async getSignedDocPath(id: string): Promise<{ filePath: string; ext: string }> {
    const mission = await this.prisma.missionRequest.findUnique({
      where: { id },
      select: { signedDocPath: true, signedDocExt: true },
    });
    if (!mission?.signedDocPath) throw new NotFoundException('Aucun document signé associé à cette mission');
    return { filePath: mission.signedDocPath, ext: mission.signedDocExt ?? 'pdf' };
  }

  // ─── Helper chevauchements ────────────────────────────────────────────────

  private async checkParticipantOverlap(
    participantIds: string[],
    departureDate: Date,
    returnDate: Date,
    excludeMissionId?: string,
  ) {
    if (!participantIds.length) return;

    // Requête depuis MissionRequest : conditions de dates en top-level (fiable)
    const conflicting = await this.prisma.missionRequest.findMany({
      where: {
        ...(excludeMissionId ? { id: { not: excludeMissionId } } : {}),
        status: {
          in: [
            MissionStatus.pending_tpm,
            MissionStatus.pending_cop,
            MissionStatus.cop_approved,
            MissionStatus.pending_dg,
            MissionStatus.in_progress,
          ],
        },
        departureDate: { lte: returnDate },
        returnDate:    { gte: departureDate },
        participants:  { some: { personnelId: { in: participantIds } } },
      },
      include: {
        participants: {
          where:   { personnelId: { in: participantIds } },
          include: { personnel: { select: { fullName: true } } },
        },
      },
    });

    if (conflicting.length) {
      const names = [
        ...new Set(
          conflicting.flatMap(m =>
            m.participants
              .filter(p => p.personnel)
              .map(p => p.personnel.fullName),
          ),
        ),
      ].join(', ');
      throw new BadRequestException(
        `Chevauchement de missions détecté pour : ${names}`,
      );
    }
  }

  // ─── Helpers notifications ─────────────────────────────────────────────────

  private async getRolePhones(role: Role): Promise<{ phone: string; firstName: string }[]> {
    const users = await this.prisma.user.findMany({
      where: { roles: { has: role }, isActive: true, phone: { not: null } },
      select: { phone: true, firstName: true },
    });
    return users.filter(u => u.phone).map(u => ({ phone: u.phone!, firstName: u.firstName }));
  }

  private async getUserPhone(userId: string): Promise<{ phone: string; firstName: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, firstName: true },
    });
    return user?.phone ? { phone: user.phone, firstName: user.firstName } : null;
  }

  private async notifyByRole(roles: Role[], type: string, title: string, message: string, metadata?: any) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, roles: { hasSome: roles } },
    });
    if (!users.length) return;
    await this.prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type,
        title,
        message,
        metadata: metadata ?? null,
      })),
    });
  }

  private async notifyUser(userId: string, type: string, title: string, message: string, metadata?: any) {
    await this.prisma.notification.create({
      data: { userId, type, title, message, metadata: metadata ?? null },
    });
  }
}
