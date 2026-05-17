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
exports.AppConfigController = void 0;
const common_1 = require("@nestjs/common");
const app_config_service_1 = require("./app-config.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let AppConfigController = class AppConfigController {
    service;
    constructor(service) {
        this.service = service;
    }
    getAll() {
        return this.service.getMap();
    }
    getFull() {
        return this.service.getAll();
    }
    update(key, value) {
        return this.service.upsert(key, value);
    }
};
exports.AppConfigController = AppConfigController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppConfigController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('full'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_system, client_1.Role.admin_finance, client_1.Role.super_admin),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppConfigController.prototype, "getFull", null);
__decorate([
    (0, common_1.Patch)(':key'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_system, client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AppConfigController.prototype, "update", null);
exports.AppConfigController = AppConfigController = __decorate([
    (0, common_1.Controller)('config'),
    __metadata("design:paramtypes", [app_config_service_1.AppConfigService])
], AppConfigController);
//# sourceMappingURL=app-config.controller.js.map