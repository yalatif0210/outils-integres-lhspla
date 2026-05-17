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
exports.RiskThemesService = exports.UpdateRiskThemeDto = exports.CreateRiskThemeDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
const XLSX = __importStar(require("xlsx"));
class CreateRiskThemeDto {
    name;
    order;
}
exports.CreateRiskThemeDto = CreateRiskThemeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRiskThemeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateRiskThemeDto.prototype, "order", void 0);
class UpdateRiskThemeDto {
    name;
    isActive;
    order;
}
exports.UpdateRiskThemeDto = UpdateRiskThemeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRiskThemeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateRiskThemeDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateRiskThemeDto.prototype, "order", void 0);
let RiskThemesService = class RiskThemesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(activeOnly = true) {
        return this.prisma.riskTheme.findMany({
            where: activeOnly ? { isActive: true } : {},
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
    }
    create(dto) {
        return this.prisma.riskTheme.create({
            data: { name: dto.name, order: dto.order ?? 0 },
        });
    }
    async update(id, dto) {
        const theme = await this.prisma.riskTheme.findUnique({ where: { id } });
        if (!theme)
            throw new common_1.NotFoundException('Thème non trouvé');
        return this.prisma.riskTheme.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const theme = await this.prisma.riskTheme.findUnique({ where: { id } });
        if (!theme)
            throw new common_1.NotFoundException('Thème non trouvé');
        return this.prisma.riskTheme.update({ where: { id }, data: { isActive: false } });
    }
    async importFromExcel(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-]+/g, '_').trim();
        const result = {
            themes: { created: 0, existing: 0 },
            categories: { created: 0, existing: 0 },
        };
        const themeCache = new Map();
        for (const raw of rows) {
            const row = {};
            for (const [k, v] of Object.entries(raw)) {
                row[norm(k)] = String(v ?? '').trim();
            }
            const themeName = row['theme'] || row['themes'] || '';
            const catName = row['categorie'] || row['catégorie'] || row['category'] || '';
            if (!themeName && !catName)
                continue;
            let themeId = null;
            if (themeName) {
                if (themeCache.has(themeName)) {
                    themeId = themeCache.get(themeName);
                }
                else {
                    const existing = await this.prisma.riskTheme.findUnique({ where: { name: themeName } });
                    if (existing) {
                        themeId = existing.id;
                        result.themes.existing++;
                    }
                    else {
                        const created = await this.prisma.riskTheme.create({ data: { name: themeName } });
                        themeId = created.id;
                        result.themes.created++;
                    }
                    themeCache.set(themeName, themeId);
                }
            }
            if (catName) {
                try {
                    const existing = await this.prisma.riskCategory.findUnique({ where: { name: catName } });
                    if (existing) {
                        await this.prisma.riskCategory.update({ where: { name: catName }, data: { themeId } });
                        result.categories.existing++;
                    }
                    else {
                        await this.prisma.riskCategory.create({ data: { name: catName, themeId } });
                        result.categories.created++;
                    }
                }
                catch { }
            }
        }
        return result;
    }
};
exports.RiskThemesService = RiskThemesService;
exports.RiskThemesService = RiskThemesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiskThemesService);
//# sourceMappingURL=risk-themes.service.js.map