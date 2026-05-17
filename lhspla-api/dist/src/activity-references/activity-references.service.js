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
exports.ActivityReferencesService = exports.UpdateActivityReferenceDto = exports.CreateActivityReferenceDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
const XLSX = __importStar(require("xlsx"));
class CreateActivityReferenceDto {
    entityCode;
    os;
    oo;
    activityCode;
    taskId;
    title;
    order;
}
exports.CreateActivityReferenceDto = CreateActivityReferenceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityReferenceDto.prototype, "entityCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityReferenceDto.prototype, "os", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityReferenceDto.prototype, "oo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityReferenceDto.prototype, "activityCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityReferenceDto.prototype, "taskId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityReferenceDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateActivityReferenceDto.prototype, "order", void 0);
class UpdateActivityReferenceDto {
    os;
    oo;
    activityCode;
    taskId;
    title;
    isActive;
    order;
}
exports.UpdateActivityReferenceDto = UpdateActivityReferenceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateActivityReferenceDto.prototype, "os", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateActivityReferenceDto.prototype, "oo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateActivityReferenceDto.prototype, "activityCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateActivityReferenceDto.prototype, "taskId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateActivityReferenceDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateActivityReferenceDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateActivityReferenceDto.prototype, "order", void 0);
let ActivityReferencesService = class ActivityReferencesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findByEntity(entityCode) {
        return this.prisma.activityReference.findMany({
            where: { entityCode, isActive: true },
            orderBy: [{ order: 'asc' }, { taskId: 'asc' }, { title: 'asc' }],
        });
    }
    findAll() {
        return this.prisma.activityReference.findMany({
            orderBy: [{ entityCode: 'asc' }, { order: 'asc' }, { taskId: 'asc' }],
        });
    }
    create(dto) {
        return this.prisma.activityReference.create({
            data: {
                entityCode: dto.entityCode,
                os: dto.os ?? '',
                oo: dto.oo ?? '',
                activityCode: dto.activityCode ?? '',
                taskId: dto.taskId ?? '',
                title: dto.title,
                order: dto.order ?? 0,
            },
        });
    }
    async update(id, dto) {
        const ref = await this.prisma.activityReference.findUnique({ where: { id } });
        if (!ref)
            throw new common_1.NotFoundException('Référence non trouvée');
        return this.prisma.activityReference.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const ref = await this.prisma.activityReference.findUnique({ where: { id } });
        if (!ref)
            throw new common_1.NotFoundException('Référence non trouvée');
        return this.prisma.activityReference.update({ where: { id }, data: { isActive: false } });
    }
    async importFromExcel(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-]+/g, '_').trim();
        let created = 0;
        let skipped = 0;
        for (const raw of rows) {
            const row = {};
            for (const [k, v] of Object.entries(raw)) {
                row[norm(k)] = String(v ?? '').trim();
            }
            const entityCode = row['entite'] || row['entity'] || row['code_entite'] || row['entité'] || '';
            const os = row['os'] || '';
            const oo = row['oo'] || '';
            const activityCode = row['code_activite'] || row['code_activité'] || row['code'] || '';
            const taskId = row['id_tache'] || row['id_tâche'] || row['id_task'] || row['tache'] || '';
            const title = row['titre_activite'] || row['titre_activité'] || row['titre'] || row['title'] || row['activite'] || row['activité'] || '';
            if (!entityCode || !title) {
                skipped++;
                continue;
            }
            try {
                await this.prisma.activityReference.create({
                    data: { entityCode, os, oo, activityCode, taskId, title, order: 0 },
                });
                created++;
            }
            catch {
                skipped++;
            }
        }
        return { created, skipped };
    }
};
exports.ActivityReferencesService = ActivityReferencesService;
exports.ActivityReferencesService = ActivityReferencesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityReferencesService);
//# sourceMappingURL=activity-references.service.js.map