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
exports.CostItemsService = exports.UpdateCostItemDto = exports.CreateCostItemDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreateCostItemDto {
    nature;
    designation;
    unitCost;
    justificatif;
    order;
}
exports.CreateCostItemDto = CreateCostItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostItemDto.prototype, "nature", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostItemDto.prototype, "designation", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateCostItemDto.prototype, "unitCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostItemDto.prototype, "justificatif", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateCostItemDto.prototype, "order", void 0);
class UpdateCostItemDto {
    nature;
    designation;
    unitCost;
    justificatif;
    isActive;
    order;
}
exports.UpdateCostItemDto = UpdateCostItemDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostItemDto.prototype, "nature", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostItemDto.prototype, "designation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateCostItemDto.prototype, "unitCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostItemDto.prototype, "justificatif", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCostItemDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateCostItemDto.prototype, "order", void 0);
let CostItemsService = class CostItemsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(activeOnly = true) {
        return this.prisma.costItem.findMany({
            where: activeOnly ? { isActive: true } : {},
            orderBy: [{ nature: 'asc' }, { order: 'asc' }, { designation: 'asc' }],
        });
    }
    findNatures() {
        return this.prisma.costItem.groupBy({
            by: ['nature'],
            where: { isActive: true },
            orderBy: { nature: 'asc' },
        });
    }
    async create(dto) {
        const maxOrder = await this.prisma.costItem.count({ where: { nature: dto.nature } });
        return this.prisma.costItem.create({
            data: {
                nature: dto.nature,
                designation: dto.designation,
                unitCost: dto.unitCost,
                justificatif: dto.justificatif ?? '',
                order: dto.order ?? maxOrder,
            },
        });
    }
    async update(id, dto) {
        const item = await this.prisma.costItem.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException();
        return this.prisma.costItem.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const item = await this.prisma.costItem.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException();
        return this.prisma.costItem.update({ where: { id }, data: { isActive: false } });
    }
};
exports.CostItemsService = CostItemsService;
exports.CostItemsService = CostItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CostItemsService);
//# sourceMappingURL=cost-items.service.js.map