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
exports.UsersService = exports.ChangePasswordDto = exports.UpdateUserDto = exports.CreateUserDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const class_validator_1 = require("class-validator");
class CreateUserDto {
    email;
    firstName;
    lastName;
    roles;
    entityCode;
    phone;
    password;
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(client_1.Role, { each: true }),
    __metadata("design:type", Array)
], CreateUserDto.prototype, "roles", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "entityCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
class UpdateUserDto {
    email;
    firstName;
    lastName;
    roles;
    entityCode;
    phone;
    isActive;
    password;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(client_1.Role, { each: true }),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "roles", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "entityCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "password", void 0);
class ChangePasswordDto {
    currentPassword;
    newPassword;
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.user.findMany({
            select: { id: true, email: true, firstName: true, lastName: true, roles: true, entityCode: true, phone: true, isActive: true, isEntityResponsible: true, createdAt: true },
            orderBy: [{ lastName: 'asc' }],
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({ where: { id } });
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async create(dto, requestorRoles) {
        if (dto.roles.includes(client_1.Role.super_admin) && !requestorRoles.includes(client_1.Role.super_admin)) {
            throw new common_1.ForbiddenException('Seul un super admin peut créer un autre super admin');
        }
        const existing = await this.findByEmail(dto.email);
        if (existing)
            throw new common_1.ConflictException('Un utilisateur avec cet email existe déjà');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: { email: dto.email, firstName: dto.firstName, lastName: dto.lastName, roles: dto.roles, entityCode: dto.entityCode ?? null, phone: dto.phone ?? null, passwordHash },
        });
        const { passwordHash: _, ...safe } = user;
        return safe;
    }
    async update(id, dto, requestorRoles) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('Utilisateur non trouvé');
        if (dto.roles?.includes(client_1.Role.super_admin) && !requestorRoles.includes(client_1.Role.super_admin)) {
            throw new common_1.ForbiddenException('Seul un super admin peut attribuer le rôle super admin');
        }
        if (user.roles.includes(client_1.Role.super_admin) && !requestorRoles.includes(client_1.Role.super_admin)) {
            throw new common_1.ForbiddenException('Seul un super admin peut modifier un autre super admin');
        }
        const data = {};
        if (dto.email !== undefined)
            data.email = dto.email;
        if (dto.firstName !== undefined)
            data.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            data.lastName = dto.lastName;
        if (dto.roles !== undefined)
            data.roles = dto.roles;
        if (dto.entityCode !== undefined)
            data.entityCode = dto.entityCode || null;
        if (dto.phone !== undefined)
            data.phone = dto.phone || null;
        if (dto.isActive !== undefined)
            data.isActive = dto.isActive;
        if (dto.password)
            data.passwordHash = await bcrypt.hash(dto.password, 12);
        const updated = await this.prisma.user.update({ where: { id }, data });
        const { passwordHash, ...safe } = updated;
        return safe;
    }
    async changePassword(id, dto) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException();
        const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.ConflictException('Mot de passe actuel incorrect');
        const passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await this.prisma.user.update({ where: { id }, data: { passwordHash } });
        return { message: 'Mot de passe mis à jour' };
    }
    async toggleActive(id) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException();
        const updated = await this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
        const { passwordHash, ...safe } = updated;
        return safe;
    }
    async setEntityResponsible(id) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('Utilisateur non trouvé');
        if (!user.roles.includes(client_1.Role.entity_member) || !user.entityCode) {
            throw new common_1.ConflictException('Seul un membre d\'entité peut être désigné responsable');
        }
        await this.prisma.user.updateMany({
            where: { entityCode: user.entityCode, isEntityResponsible: true },
            data: { isEntityResponsible: false },
        });
        const updated = await this.prisma.user.update({ where: { id }, data: { isEntityResponsible: true } });
        const { passwordHash, ...safe } = updated;
        return safe;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map