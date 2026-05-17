"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionsService = exports.CopReviewDto = exports.UpdateMissionDto = exports.CreateMissionDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const mission_document_service_1 = require("./mission-document.service");
const n8n_service_1 = require("../n8n/n8n.service");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class CreateMissionDto {
    object;
    location;
    departureDate;
    returnDate;
    resumeDate;
    fundId;
    budgetId;
    activityRefId;
    participantIds;
    isInvitation;
}
exports.CreateMissionDto = CreateMissionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "object", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "departureDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "returnDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "resumeDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "fundId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "budgetId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMissionDto.prototype, "activityRefId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateMissionDto.prototype, "participantIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMissionDto.prototype, "isInvitation", void 0);
class UpdateMissionDto {
    object;
    location;
    departureDate;
    returnDate;
    resumeDate;
    fundId;
    budgetId;
    activityRefId;
    participantIds;
    isInvitation;
}
exports.UpdateMissionDto = UpdateMissionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "object", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "departureDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "returnDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "resumeDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "fundId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "budgetId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMissionDto.prototype, "activityRefId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateMissionDto.prototype, "participantIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateMissionDto.prototype, "isInvitation", void 0);
class CopReviewDto {
    decision;
    rejectionReason;
}
exports.CopReviewDto = CopReviewDto;
__decorate([
    (0, class_validator_1.IsEnum)(['cop_approved', 'cancelled']),
    __metadata("design:type", String)
], CopReviewDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CopReviewDto.prototype, "rejectionReason", void 0);
const MISSION_VIEWER_ROLES = [
    client_1.Role.super_admin,
    client_1.Role.admin_tpm,
    client_1.Role.assistant_direction,
    client_1.Role.chief_of_party,
];
const MISSION_STAFF_ROLES = [
    client_1.Role.super_admin,
    client_1.Role.assistant_direction,
    client_1.Role.chief_of_party,
];
function hasRole(userRoles, ...roles) {
    return roles.some(r => userRoles.includes(r));
}
let MissionsService = class MissionsService {
    prisma;
    notifications;
    docService;
    n8n;
    constructor(prisma, notifications, docService, n8n) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.docService = docService;
        this.n8n = n8n;
    }
    async findAll(userRoles, entityCode, userId, isEntityResponsible) {
        const isViewer = userRoles.some(r => MISSION_VIEWER_ROLES.includes(r));
        const where = {};
        if (isViewer) {
            where.cancelledFromDraft = false;
            where.status = { not: client_1.MissionStatus.draft };
        }
        if (!isViewer) {
            if (!userId)
                throw new common_1.ForbiddenException();
            if (isEntityResponsible && entityCode) {
                where.initiator = { entityCode };
            }
            else {
                const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
                const orConds = [{ initiatorId: userId }];
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
    async findOne(id) {
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
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        return mission;
    }
    async create(dto, initiatorId, _initiatorRoles) {
        const fund = await this.prisma.financingFund.findUnique({ where: { id: dto.fundId } });
        if (!fund || !fund.isActive) {
            throw new common_1.BadRequestException('Fonds introuvable ou inactif');
        }
        if (dto.budgetId) {
            const budget = await this.prisma.budgetProject.findUnique({ where: { id: dto.budgetId } });
            if (!budget)
                throw new common_1.BadRequestException('Budget introuvable');
            if (budget.status !== 'approved' && budget.status !== 'mission_cop') {
                throw new common_1.BadRequestException('Le budget doit être approuvé ou mission_cop');
            }
        }
        if (dto.participantIds?.length) {
            const found = await this.prisma.personnel.count({
                where: { id: { in: dto.participantIds }, isActive: true },
            });
            if (found !== dto.participantIds.length) {
                throw new common_1.BadRequestException('Un ou plusieurs participants sont introuvables ou inactifs');
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
    async update(id, dto, userId) {
        const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        if (mission.initiatorId !== userId)
            throw new common_1.ForbiddenException('Seul l\'initiateur peut modifier cette mission');
        if (mission.status !== client_1.MissionStatus.draft) {
            throw new common_1.BadRequestException('Seules les missions en brouillon peuvent être modifiées');
        }
        const data = {};
        if (dto.object !== undefined)
            data.object = dto.object;
        if (dto.location !== undefined)
            data.location = dto.location;
        if (dto.departureDate !== undefined)
            data.departureDate = new Date(dto.departureDate);
        if (dto.returnDate !== undefined)
            data.returnDate = new Date(dto.returnDate);
        if (dto.resumeDate !== undefined)
            data.resumeDate = new Date(dto.resumeDate);
        if (dto.fundId !== undefined)
            data.fundId = dto.fundId;
        if (dto.budgetId !== undefined)
            data.budgetId = dto.budgetId || null;
        if (dto.activityRefId !== undefined)
            data.activityRefId = dto.activityRefId || null;
        if (dto.isInvitation !== undefined)
            data.isInvitation = dto.isInvitation;
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
    async submit(id, userId, userRoles) {
        const mission = await this.prisma.missionRequest.findUnique({
            where: { id },
            include: { participants: { select: { personnelId: true } } },
        });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        if (mission.initiatorId !== userId)
            throw new common_1.ForbiddenException();
        if (mission.status !== client_1.MissionStatus.draft) {
            throw new common_1.BadRequestException('La mission doit être en brouillon pour être soumise');
        }
        const participantIds = mission.participants.map(p => p.personnelId);
        if (participantIds.length) {
            await this.checkParticipantOverlap(participantIds, mission.departureDate, mission.returnDate, id);
        }
        const isCop = hasRole(userRoles, client_1.Role.chief_of_party);
        const isTpm = hasRole(userRoles, client_1.Role.admin_tpm);
        const newStatus = isCop
            ? client_1.MissionStatus.cop_approved
            : isTpm
                ? client_1.MissionStatus.pending_cop
                : client_1.MissionStatus.pending_tpm;
        const updated = await this.prisma.missionRequest.update({
            where: { id },
            data: { status: newStatus },
        });
        if (isCop) {
            await this.notifyByRole([client_1.Role.assistant_direction], 'MISSION_COP_APPROVED', 'Demande de mission approuvée par le COP', `La demande de mission "${mission.object}" a été approuvée par le COP. Vous pouvez générer les documents.`, { missionId: id });
            const adPhones = await this.getRolePhones(client_1.Role.assistant_direction);
            for (const u of adPhones) {
                await this.n8n.onMissionCopApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
            }
        }
        else if (isTpm) {
            await this.notifyByRole([client_1.Role.chief_of_party], 'MISSION_SUBMITTED', 'Demande de mission en attente de votre avis', `Une demande de mission "${mission.object}" (soumise par le TPM) est en attente de votre avis COP.`, { missionId: id });
            const copPhonesT = await this.getRolePhones(client_1.Role.chief_of_party);
            for (const u of copPhonesT) {
                await this.n8n.onMissionTpmApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
            }
        }
        else {
            await this.notifyByRole([client_1.Role.admin_tpm], 'MISSION_SUBMITTED', 'Demande de mission à viser', `Une demande de mission "${mission.object}" est en attente de votre avis TPM.`, { missionId: id });
            const tpmPhones = await this.getRolePhones(client_1.Role.admin_tpm);
            for (const u of tpmPhones) {
                await this.n8n.onMissionSubmitted({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
            }
        }
        return updated;
    }
    async tpmReview(id, dto, _userId) {
        const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        if (mission.status !== client_1.MissionStatus.pending_tpm) {
            throw new common_1.BadRequestException('La mission n\'est pas en attente d\'avis TPM');
        }
        const approved = dto.decision === 'pending_cop' || dto.approved === true;
        const rejectionReason = dto.rejectionReason ?? dto.reason;
        if (!approved && !rejectionReason) {
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        }
        const updated = await this.prisma.missionRequest.update({
            where: { id },
            data: {
                status: approved ? client_1.MissionStatus.pending_cop : client_1.MissionStatus.draft,
                rejectionReason: approved ? null : (rejectionReason ?? null),
            },
        });
        if (approved) {
            await this.notifyByRole([client_1.Role.chief_of_party], 'MISSION_TPM_APPROVED', 'Demande de mission visée par le TPM', `La demande de mission "${mission.object}" a été visée par l'admin TPM. Elle est en attente de votre avis.`, { missionId: id });
            const copPhones = await this.getRolePhones(client_1.Role.chief_of_party);
            for (const u of copPhones) {
                await this.n8n.onMissionTpmApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
            }
        }
        else {
            await this.notifyUser(mission.initiatorId, 'MISSION_TPM_REJECTED', 'Demande de mission renvoyée pour correction', `Votre demande de mission "${mission.object}" a été renvoyée pour correction. Motif : ${rejectionReason}`, { missionId: id, reason: rejectionReason });
            const initiatorPhone = await this.getUserPhone(mission.initiatorId);
            if (initiatorPhone)
                await this.n8n.onMissionTpmRejected({ phone: initiatorPhone.phone, firstName: initiatorPhone.firstName, missionTitle: mission.object, reason: rejectionReason });
        }
        return updated;
    }
    async copReview(id, dto, _userId) {
        const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        if (mission.status !== client_1.MissionStatus.pending_cop) {
            throw new common_1.BadRequestException('La mission n\'est pas en attente d\'avis COP');
        }
        if (dto.decision === 'cancelled' && !dto.rejectionReason) {
            throw new common_1.BadRequestException('Un motif de rejet est requis');
        }
        const updated = await this.prisma.missionRequest.update({
            where: { id },
            data: {
                status: dto.decision === 'cop_approved' ? client_1.MissionStatus.cop_approved : client_1.MissionStatus.cancelled,
                rejectionReason: dto.decision === 'cancelled' ? (dto.rejectionReason ?? null) : null,
            },
        });
        if (dto.decision === 'cop_approved') {
            await this.notifyByRole([client_1.Role.assistant_direction], 'MISSION_COP_APPROVED', 'Demande de mission approuvée par le COP', `La demande de mission "${mission.object}" a été approuvée par le COP. Vous pouvez générer les documents.`, { missionId: id });
            const adPhones = await this.getRolePhones(client_1.Role.assistant_direction);
            for (const u of adPhones) {
                await this.n8n.onMissionCopApproved({ phone: u.phone, firstName: u.firstName, missionTitle: mission.object });
            }
        }
        else {
            await this.notifyUser(mission.initiatorId, 'MISSION_REJECTED', 'Demande de mission rejetée', `Votre demande de mission "${mission.object}" a été rejetée. Motif : ${dto.rejectionReason}`, { missionId: id, reason: dto.rejectionReason });
            await this.notifyByRole([client_1.Role.assistant_direction], 'MISSION_REJECTED', 'Demande de mission rejetée par le COP', `La demande de mission "${mission.object}" a été rejetée par le COP. Motif : ${dto.rejectionReason}`, { missionId: id, reason: dto.rejectionReason });
            const initiatorPhone = await this.getUserPhone(mission.initiatorId);
            if (initiatorPhone)
                await this.n8n.onMissionRejected({ phone: initiatorPhone.phone, firstName: initiatorPhone.firstName, missionTitle: mission.object, reason: dto.rejectionReason });
        }
        return updated;
    }
    async generateDocs(id, _userId) {
        const mission = await this.prisma.missionRequest.findUnique({
            where: { id },
            include: {
                initiator: { select: { id: true, firstName: true, lastName: true, email: true, roles: true, entityCode: true } },
                budget: { select: { id: true, title: true, budgetType: true } },
                activityRef: { select: { id: true, title: true, activityCode: true } },
                fund: { select: { id: true, name: true, code: true } },
                participants: {
                    include: { personnel: { select: { id: true, fullName: true, service: true, function: true, waveNumber: true, email: true } } },
                },
            },
        });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        if (mission.status !== client_1.MissionStatus.cop_approved) {
            throw new common_1.BadRequestException('La mission doit être approuvée par le COP pour générer les documents');
        }
        await this.docService.generateDocuments(mission);
        const updated = await this.prisma.missionRequest.update({
            where: { id },
            data: { status: client_1.MissionStatus.pending_dg },
        });
        await this.notifyUser(mission.initiatorId, 'MISSION_DOCS_GENERATED', 'Documents de mission générés', `Les documents DM et ODM pour la mission "${mission.object}" ont été générés et sont en attente de validation DG.`, { missionId: id });
        await this.notifyByRole([client_1.Role.assistant_direction], 'MISSION_DOCS_GENERATED', 'Documents générés — validation DG requise', `Les documents DM et ODM pour la mission "${mission.object}" sont prêts. Faites valider par le Directeur Général.`, { missionId: id });
        return updated;
    }
    async validateDg(id, _userId) {
        const mission = await this.prisma.missionRequest.findUnique({
            where: { id },
            include: {
                participants: { include: { personnel: { select: { email: true, fullName: true } } } },
            },
        });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        if (mission.status !== client_1.MissionStatus.pending_dg) {
            throw new common_1.BadRequestException('La mission doit être en attente de validation DG');
        }
        const updated = await this.prisma.missionRequest.update({
            where: { id },
            data: { status: client_1.MissionStatus.in_progress },
        });
        await this.notifyUser(mission.initiatorId, 'MISSION_DG_VALIDATED', 'Demande de mission validée par le DG', `Votre demande de mission "${mission.object}" a été validée par le DG. La mission est maintenant en cours.`, { missionId: id });
        const initiatorPhone = await this.getUserPhone(mission.initiatorId);
        if (initiatorPhone)
            await this.n8n.onMissionDgValidated({ phone: initiatorPhone.phone, firstName: initiatorPhone.firstName, missionTitle: mission.object });
        return updated;
    }
    async cancel(id, userId, userRoles) {
        const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        const isStaff = userRoles.some(r => MISSION_STAFF_ROLES.includes(r));
        const isInitiator = mission.initiatorId === userId;
        if (!isStaff && !isInitiator) {
            throw new common_1.ForbiddenException('Vous n\'êtes pas autorisé à annuler cette mission');
        }
        if (isInitiator && !isStaff && mission.status !== client_1.MissionStatus.draft) {
            throw new common_1.BadRequestException('L\'initiateur ne peut annuler qu\'une mission en brouillon');
        }
        if ([client_1.MissionStatus.completed, client_1.MissionStatus.cancelled].includes(mission.status)) {
            throw new common_1.BadRequestException('Cette mission ne peut plus être annulée');
        }
        return this.prisma.missionRequest.update({
            where: { id },
            data: {
                status: client_1.MissionStatus.cancelled,
                cancelledFromDraft: !isStaff && isInitiator && mission.status === client_1.MissionStatus.draft,
            },
        });
    }
    async getDashboard() {
        const missions = await this.prisma.missionRequest.findMany({
            where: { cancelledFromDraft: false },
            include: {
                initiator: { select: { id: true, firstName: true, lastName: true, entityCode: true } },
                budget: { select: { id: true, title: true } },
                fund: { select: { id: true, name: true, code: true } },
                activityRef: { select: { id: true, activityCode: true, title: true } },
                participants: {
                    include: {
                        personnel: { select: { id: true, fullName: true, service: true, function: true, waveNumber: true } },
                    },
                },
            },
            orderBy: { departureDate: 'desc' },
        });
        const rows = [];
        let rowNum = 1;
        for (const m of missions) {
            const imputation = m.fund ? `${m.fund.code} — ${m.fund.name}` : '—';
            const depDate = new Date(m.departureDate);
            const retDate = new Date(m.returnDate);
            const duree = Math.ceil((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const baseRow = {
                id: m.id,
                missionNo: rowNum,
                destination: m.location,
                dateDepart: m.departureDate,
                dateRetour: m.returnDate,
                dureeJours: duree,
                dateReprise: m.resumeDate,
                objet: m.object,
                imputation,
                status: m.status,
                transmittedAt: m.transmittedAt ?? null,
                rejectionReason: m.rejectionReason ?? null,
                orderNumber: m.orderNumber ?? null,
                dashboardObservations: m.dashboardObservations ?? null,
                initiatorEntityCode: m.initiator?.entityCode ?? null,
                activityCode: m.activityRef?.activityCode ?? null,
            };
            if (m.participants.length === 0) {
                rows.push({
                    ...baseRow,
                    service: m.initiator?.entityCode ?? '—',
                    fullName: `${m.initiator?.firstName ?? ''} ${m.initiator?.lastName ?? ''}`.trim() || '—',
                    fonction: '—',
                    wave: '—',
                });
                rowNum++;
            }
            else {
                for (const mp of m.participants) {
                    const p = mp.personnel;
                    rows.push({
                        ...baseRow,
                        service: p.service ?? '—',
                        fullName: p.fullName ?? '—',
                        fonction: p.function ?? '—',
                        wave: p.waveNumber ?? '—',
                    });
                    rowNum++;
                }
            }
        }
        return rows;
    }
    async updateDashboardFields(id, dto) {
        const mission = await this.prisma.missionRequest.findUnique({ where: { id }, select: { id: true } });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        return this.prisma.missionRequest.update({
            where: { id },
            data: {
                ...(dto.orderNumber !== undefined ? { orderNumber: dto.orderNumber || null } : {}),
                ...(dto.dashboardObservations !== undefined ? { dashboardObservations: dto.dashboardObservations || null } : {}),
            },
            select: { id: true, orderNumber: true, dashboardObservations: true },
        });
    }
    async autoComplete() {
        const now = new Date();
        const expired = await this.prisma.missionRequest.findMany({
            where: {
                status: client_1.MissionStatus.in_progress,
                returnDate: { lt: now },
            },
            select: { id: true, object: true },
        });
        if (!expired.length)
            return 0;
        await this.prisma.missionRequest.updateMany({
            where: {
                status: client_1.MissionStatus.in_progress,
                returnDate: { lt: now },
            },
            data: { status: client_1.MissionStatus.completed },
        });
        for (const mission of expired) {
            await this.notifyByRole([client_1.Role.assistant_direction], 'MISSION_COMPLETED', 'Mission terminée automatiquement', `La mission "${mission.object}" a été marquée comme terminée automatiquement.`, { missionId: mission.id });
        }
        return expired.length;
    }
    async uploadSignedDoc(id, file, userId, userRoles) {
        const mission = await this.prisma.missionRequest.findUnique({ where: { id } });
        if (!mission)
            throw new common_1.NotFoundException('Demande de mission introuvable');
        const canUpload = mission.initiatorId === userId ||
            userRoles.some(r => r === client_1.Role.assistant_direction || r === client_1.Role.super_admin);
        if (!canUpload)
            throw new common_1.ForbiddenException('Vous n\'êtes pas autorisé à importer un document pour cette mission');
        const uploadableStatuses = [
            client_1.MissionStatus.pending_dg,
            client_1.MissionStatus.in_progress,
            client_1.MissionStatus.completed,
        ];
        if (!uploadableStatuses.includes(mission.status)) {
            throw new common_1.BadRequestException('L\'import de document n\'est disponible qu\'après génération des documents DM/ODM');
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
    async getSignedDocPath(id) {
        const mission = await this.prisma.missionRequest.findUnique({
            where: { id },
            select: { signedDocPath: true, signedDocExt: true },
        });
        if (!mission?.signedDocPath)
            throw new common_1.NotFoundException('Aucun document signé associé à cette mission');
        return { filePath: mission.signedDocPath, ext: mission.signedDocExt ?? 'pdf' };
    }
    async checkParticipantOverlap(participantIds, departureDate, returnDate, excludeMissionId) {
        if (!participantIds.length)
            return;
        const conflicting = await this.prisma.missionRequest.findMany({
            where: {
                ...(excludeMissionId ? { id: { not: excludeMissionId } } : {}),
                status: {
                    in: [
                        client_1.MissionStatus.pending_tpm,
                        client_1.MissionStatus.pending_cop,
                        client_1.MissionStatus.cop_approved,
                        client_1.MissionStatus.pending_dg,
                        client_1.MissionStatus.in_progress,
                    ],
                },
                departureDate: { lte: returnDate },
                returnDate: { gte: departureDate },
                participants: { some: { personnelId: { in: participantIds } } },
            },
            include: {
                participants: {
                    where: { personnelId: { in: participantIds } },
                    include: { personnel: { select: { fullName: true } } },
                },
            },
        });
        if (conflicting.length) {
            const names = [
                ...new Set(conflicting.flatMap(m => m.participants
                    .filter(p => p.personnel)
                    .map(p => p.personnel.fullName))),
            ].join(', ');
            throw new common_1.BadRequestException(`Chevauchement de missions détecté pour : ${names}`);
        }
    }
    async getRolePhones(role) {
        const users = await this.prisma.user.findMany({
            where: { roles: { has: role }, isActive: true, phone: { not: null } },
            select: { phone: true, firstName: true },
        });
        return users.filter(u => u.phone).map(u => ({ phone: u.phone, firstName: u.firstName }));
    }
    async getUserPhone(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true, firstName: true },
        });
        return user?.phone ? { phone: user.phone, firstName: user.firstName } : null;
    }
    async notifyByRole(roles, type, title, message, metadata) {
        const users = await this.prisma.user.findMany({
            where: { isActive: true, roles: { hasSome: roles } },
        });
        if (!users.length)
            return;
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
    async notifyUser(userId, type, title, message, metadata) {
        await this.prisma.notification.create({
            data: { userId, type, title, message, metadata: metadata ?? null },
        });
    }
};
exports.MissionsService = MissionsService;
exports.MissionsService = MissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        mission_document_service_1.MissionDocumentService,
        n8n_service_1.N8nService])
], MissionsService);
//# sourceMappingURL=missions.service.js.map