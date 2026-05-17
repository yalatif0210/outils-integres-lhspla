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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeeksService = exports.CreateWeekDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const ENTITY_CODES = ['CAD', 'CAC', 'PMO', 'QAD', 'SE', 'SI', 'FINANCES', 'COM'];
class CreateWeekDto {
    weekStart;
    weekEnd;
    weekReference;
}
exports.CreateWeekDto = CreateWeekDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateWeekDto.prototype, "weekStart", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateWeekDto.prototype, "weekEnd", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWeekDto.prototype, "weekReference", void 0);
let WeeksService = class WeeksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.week.findMany({
            orderBy: { weekStart: 'desc' },
            include: {
                _count: { select: { submissions: true } },
                submissions: {
                    select: { entityCode: true, status: true, lastSavedAt: true, submittedAt: true },
                },
            },
        });
    }
    async findById(id) {
        const week = await this.prisma.week.findUnique({
            where: { id },
            include: {
                submissions: {
                    include: {
                        activities: { orderBy: { orderIndex: 'asc' } },
                        plannedActivities: { orderBy: { orderIndex: 'asc' } },
                        riskPoints: { orderBy: { orderIndex: 'asc' } },
                    },
                },
            },
        });
        if (!week)
            throw new common_1.NotFoundException('Semaine non trouvée');
        return week;
    }
    async findActive() {
        return this.prisma.week.findMany({
            where: { status: client_1.WeekStatus.active },
            orderBy: { weekStart: 'desc' },
            include: {
                submissions: { select: { entityCode: true, status: true } },
            },
        });
    }
    async create(dto, userId) {
        const week = await this.prisma.week.create({
            data: {
                weekReference: dto.weekReference,
                weekStart: new Date(dto.weekStart),
                weekEnd: new Date(dto.weekEnd),
                createdBy: userId,
                submissions: {
                    create: ENTITY_CODES.map(code => ({ entityCode: code })),
                },
            },
            include: { submissions: true },
        });
        return week;
    }
    async setStatus(id, status) {
        const week = await this.prisma.week.findUnique({ where: { id } });
        if (!week)
            throw new common_1.NotFoundException('Semaine non trouvée');
        return this.prisma.week.update({
            where: { id },
            data: {
                status,
                closedAt: status === client_1.WeekStatus.closed ? new Date() : null,
            },
        });
    }
    async getSubmissionMatrix(weekId) {
        const week = await this.prisma.week.findUnique({
            where: { id: weekId },
            include: {
                submissions: {
                    select: {
                        entityCode: true, status: true, responsible: true,
                        submittedAt: true, lastSavedAt: true,
                        _count: { select: { activities: true, plannedActivities: true, riskPoints: true } },
                    },
                },
            },
        });
        if (!week)
            throw new common_1.NotFoundException();
        return week;
    }
};
exports.WeeksService = WeeksService;
exports.WeeksService = WeeksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WeeksService);
//# sourceMappingURL=weeks.service.js.map