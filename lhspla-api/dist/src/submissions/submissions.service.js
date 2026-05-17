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
var SubmissionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
const LOCK_TTL_MINUTES = 15;
const SUBMISSION_INCLUDE = {
    activities: { orderBy: { orderIndex: 'asc' } },
    plannedActivities: { orderBy: { orderIndex: 'asc' } },
    riskPoints: { orderBy: { orderIndex: 'asc' } },
    submittedBy: { select: { id: true, firstName: true, lastName: true } },
};
let SubmissionsService = SubmissionsService_1 = class SubmissionsService {
    prisma;
    notifications;
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async findByWeekAndEntity(weekId, entityCode) {
        let submission = await this.prisma.entitySubmission.findUnique({
            where: { weekId_entityCode: { weekId, entityCode } },
            include: SUBMISSION_INCLUDE,
        });
        if (!submission) {
            const week = await this.prisma.week.findUnique({ where: { id: weekId } });
            if (!week)
                throw new common_1.NotFoundException('Semaine introuvable');
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
    normalizeSubmission(sub) {
        return {
            ...sub,
            plannedActivities: (sub.plannedActivities ?? []).map((a) => ({
                ...a,
                dosParticipation: SubmissionsService_1.toDoDisplay(a.dosParticipation),
            })),
            riskPoints: (sub.riskPoints ?? []).map((r) => ({
                ...r,
                criticality: SubmissionsService_1.toCritDisplay(r.criticality),
            })),
        };
    }
    static toDoDisplay(v) {
        if (v === 'oui')
            return '✅ OUI';
        if (v === 'non')
            return '❌ NON';
        return v ?? '';
    }
    static toCritDisplay(v) {
        const map = {
            critique: '🔴 Critique',
            eleve: '🟠 Élevé',
            modere: '🟡 Modéré',
            faible: '🟢 Faible',
        };
        return map[v ?? ''] ?? (v ?? '');
    }
    async getLocksStatus(weekId, entityCode) {
        const submission = await this.prisma.entitySubmission.findUnique({
            where: { weekId_entityCode: { weekId, entityCode } },
            select: { id: true },
        });
        if (!submission)
            return [];
        return this.prisma.sectionLock.findMany({
            where: { submissionId: submission.id, expiresAt: { gt: new Date() } },
            include: { lockedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
    }
    async acquireLock(weekId, entityCode, section, userId) {
        const submission = await this.findOrCreate(weekId, entityCode);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + LOCK_TTL_MINUTES * 60 * 1000);
        const existing = await this.prisma.sectionLock.findUnique({
            where: { submissionId_section: { submissionId: submission.id, section } },
        });
        if (existing && existing.expiresAt > now && existing.lockedById !== userId) {
            throw new common_1.ConflictException('Cette section est déjà verrouillée par un autre utilisateur');
        }
        return this.prisma.sectionLock.upsert({
            where: { submissionId_section: { submissionId: submission.id, section } },
            update: { lockedById: userId, lockedAt: now, expiresAt },
            create: { submissionId: submission.id, section, lockedById: userId, expiresAt },
            include: { lockedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
    }
    async releaseLock(weekId, entityCode, section, userId) {
        const submission = await this.prisma.entitySubmission.findUnique({
            where: { weekId_entityCode: { weekId, entityCode } },
            select: { id: true },
        });
        if (!submission)
            return { released: false };
        await this.prisma.sectionLock.deleteMany({
            where: { submissionId: submission.id, section, lockedById: userId },
        });
        return { released: true };
    }
    async saveSection(weekId, entityCode, dto, userId) {
        const submission = await this.findOrCreate(weekId, entityCode);
        if (submission.status === 'submitted')
            throw new common_1.BadRequestException('La saisie est déjà soumise');
        switch (dto.section) {
            case client_1.SectionType.A:
                await this.saveSectionA(submission.id, dto.data);
                break;
            case client_1.SectionType.B:
                await this.saveSectionB(submission.id, dto.data);
                break;
            case client_1.SectionType.C:
                await this.saveSectionC(submission.id, dto.data);
                break;
            case client_1.SectionType.D:
                await this.saveSectionD(submission.id, dto.data);
                break;
            default: throw new common_1.BadRequestException('Section invalide');
        }
        return this.prisma.entitySubmission.update({
            where: { id: submission.id },
            data: { lastSavedAt: new Date() },
            include: SUBMISSION_INCLUDE,
        });
    }
    async submit(weekId, entityCode, userId) {
        const submission = await this.prisma.entitySubmission.findUnique({
            where: { weekId_entityCode: { weekId, entityCode } },
        });
        if (!submission)
            throw new common_1.NotFoundException('Saisie introuvable');
        if (submission.status === 'submitted')
            throw new common_1.BadRequestException('La saisie est déjà soumise');
        const week = await this.prisma.week.findUnique({ where: { id: weekId } });
        if (!week)
            throw new common_1.NotFoundException('Semaine introuvable');
        if (week.status === 'closed')
            throw new common_1.BadRequestException('La semaine est clôturée');
        const updated = await this.prisma.entitySubmission.update({
            where: { id: submission.id },
            data: { status: 'submitted', submittedAt: new Date(), submittedById: userId },
        });
        await this.notifications.notifySubmission(entityCode, weekId, week.weekReference);
        return updated;
    }
    async reopenSubmission(weekId, entityCode) {
        const submission = await this.prisma.entitySubmission.findUnique({
            where: { weekId_entityCode: { weekId, entityCode } },
        });
        if (!submission)
            throw new common_1.NotFoundException('Saisie introuvable');
        if (submission.status !== 'submitted')
            throw new common_1.BadRequestException("La saisie n'est pas soumise");
        return this.prisma.entitySubmission.update({
            where: { id: submission.id },
            data: { status: 'draft', submittedAt: null, submittedById: null },
        });
    }
    async cleanExpiredLocks() {
        await this.prisma.sectionLock.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    }
    async findOrCreate(weekId, entityCode) {
        let sub = await this.prisma.entitySubmission.findUnique({
            where: { weekId_entityCode: { weekId, entityCode } },
        });
        if (!sub) {
            const week = await this.prisma.week.findUnique({ where: { id: weekId } });
            if (!week)
                throw new common_1.NotFoundException('Semaine introuvable');
            sub = await this.prisma.entitySubmission.create({ data: { weekId, entityCode } });
        }
        return sub;
    }
    async saveSectionA(submissionId, data) {
        await this.prisma.entitySubmission.update({
            where: { id: submissionId },
            data: {
                responsible: data.responsible ?? '',
                submissionDate: data.submissionDate ?? '',
            },
        });
    }
    async saveSectionB(submissionId, data) {
        const items = data.activities ?? [];
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
    async saveSectionC(submissionId, data) {
        const items = data.plannedActivities ?? [];
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
                    dosParticipation: SubmissionsService_1.mapDos(a.dosParticipation),
                    observations: a.observations ?? '',
                    startDate: a.startDate ? new Date(a.startDate) : null,
                    endDate: a.endDate ? new Date(a.endDate) : null,
                })),
            });
        }
    }
    async saveSectionD(submissionId, data) {
        const items = data.riskPoints ?? [];
        await this.prisma.riskPoint.deleteMany({ where: { submissionId } });
        if (items.length > 0) {
            await this.prisma.riskPoint.createMany({
                data: items.map((r, idx) => ({
                    submissionId,
                    orderIndex: idx,
                    theme: r.theme ?? '',
                    category: r.category ?? '',
                    description: r.description ?? '',
                    criticality: SubmissionsService_1.mapCriticality(r.criticality),
                    expectedAction: r.expectedAction ?? '',
                })),
            });
        }
    }
    static mapDos(v) {
        if (v === '✅ OUI' || v === 'oui')
            return client_1.DosParticipation.oui;
        if (v === '❌ NON' || v === 'non')
            return client_1.DosParticipation.non;
        return null;
    }
    static mapCriticality(v) {
        if (v === '🔴 Critique' || v === 'critique')
            return client_1.CriticalityLevel.critique;
        if (v === '🟠 Élevé' || v === 'eleve')
            return client_1.CriticalityLevel.eleve;
        if (v === '🟡 Modéré' || v === 'modere')
            return client_1.CriticalityLevel.modere;
        if (v === '🟢 Faible' || v === 'faible')
            return client_1.CriticalityLevel.faible;
        return null;
    }
};
exports.SubmissionsService = SubmissionsService;
exports.SubmissionsService = SubmissionsService = SubmissionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], SubmissionsService);
//# sourceMappingURL=submissions.service.js.map