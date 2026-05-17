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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityReferencesController = void 0;
const common_1 = require("@nestjs/common");
const activity_references_service_1 = require("./activity-references.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
let ActivityReferencesController = class ActivityReferencesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    find(entityCode) {
        if (entityCode)
            return this.svc.findByEntity(entityCode);
        return this.svc.findAll();
    }
    create(dto) {
        return this.svc.create(dto);
    }
    update(id, dto) {
        return this.svc.update(id, dto);
    }
    remove(id) {
        return this.svc.remove(id);
    }
    importExcel(file) {
        if (!file)
            throw new common_1.BadRequestException('Fichier Excel requis');
        return this.svc.importFromExcel(file.buffer);
    }
};
exports.ActivityReferencesController = ActivityReferencesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('entityCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivityReferencesController.prototype, "find", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_system),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activity_references_service_1.CreateActivityReferenceDto]),
    __metadata("design:returntype", void 0)
], ActivityReferencesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_system),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, activity_references_service_1.UpdateActivityReferenceDto]),
    __metadata("design:returntype", void 0)
], ActivityReferencesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_system),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivityReferencesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_system, client_1.Role.super_admin),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ActivityReferencesController.prototype, "importExcel", null);
exports.ActivityReferencesController = ActivityReferencesController = __decorate([
    (0, common_1.Controller)('activity-references'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [activity_references_service_1.ActivityReferencesService])
], ActivityReferencesController);
//# sourceMappingURL=activity-references.controller.js.map