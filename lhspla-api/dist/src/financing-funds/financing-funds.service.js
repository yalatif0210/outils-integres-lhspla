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
exports.FinancingFundsService = exports.UpdateFundDto = exports.CreateFundDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreateFundDto {
    name;
    code;
    order;
}
exports.CreateFundDto = CreateFundDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFundDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFundDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateFundDto.prototype, "order", void 0);
class UpdateFundDto {
    name;
    code;
    isActive;
    order;
}
exports.UpdateFundDto = UpdateFundDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFundDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFundDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateFundDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateFundDto.prototype, "order", void 0);
let FinancingFundsService = class FinancingFundsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(activeOnly = true) {
        return this.prisma.financingFund.findMany({
            where: activeOnly ? { isActive: true } : {},
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
    }
    create(dto) {
        return this.prisma.financingFund.create({ data: { name: dto.name, code: dto.code, order: dto.order ?? 0 } });
    }
    async update(id, dto) {
        const f = await this.prisma.financingFund.findUnique({ where: { id } });
        if (!f)
            throw new common_1.NotFoundException();
        return this.prisma.financingFund.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const f = await this.prisma.financingFund.findUnique({ where: { id } });
        if (!f)
            throw new common_1.NotFoundException();
        return this.prisma.financingFund.update({ where: { id }, data: { isActive: false } });
    }
};
exports.FinancingFundsService = FinancingFundsService;
exports.FinancingFundsService = FinancingFundsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinancingFundsService);
//# sourceMappingURL=financing-funds.service.js.map