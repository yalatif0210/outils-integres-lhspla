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
exports.RiskCategoriesService = exports.UpdateRiskCategoryDto = exports.CreateRiskCategoryDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreateRiskCategoryDto {
    name;
    themeId;
    order;
}
exports.CreateRiskCategoryDto = CreateRiskCategoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRiskCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRiskCategoryDto.prototype, "themeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateRiskCategoryDto.prototype, "order", void 0);
class UpdateRiskCategoryDto {
    name;
    themeId;
    isActive;
    order;
}
exports.UpdateRiskCategoryDto = UpdateRiskCategoryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRiskCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRiskCategoryDto.prototype, "themeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateRiskCategoryDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateRiskCategoryDto.prototype, "order", void 0);
let RiskCategoriesService = class RiskCategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(activeOnly = true, themeId) {
        const where = activeOnly ? { isActive: true } : {};
        if (themeId)
            where.themeId = themeId;
        return this.prisma.riskCategory.findMany({
            where,
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
    }
    create(dto) {
        return this.prisma.riskCategory.create({
            data: { name: dto.name, order: dto.order ?? 0, themeId: dto.themeId ?? null },
        });
    }
    async update(id, dto) {
        const cat = await this.prisma.riskCategory.findUnique({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException('Catégorie non trouvée');
        return this.prisma.riskCategory.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const cat = await this.prisma.riskCategory.findUnique({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException('Catégorie non trouvée');
        return this.prisma.riskCategory.update({ where: { id }, data: { isActive: false } });
    }
};
exports.RiskCategoriesService = RiskCategoriesService;
exports.RiskCategoriesService = RiskCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiskCategoriesService);
//# sourceMappingURL=risk-categories.service.js.map