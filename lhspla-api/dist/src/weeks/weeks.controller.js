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
exports.WeeksController = void 0;
const common_1 = require("@nestjs/common");
const weeks_service_1 = require("./weeks.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let WeeksController = class WeeksController {
    weeksService;
    constructor(weeksService) {
        this.weeksService = weeksService;
    }
    findAll() {
        return this.weeksService.findAll();
    }
    findActive() {
        return this.weeksService.findActive();
    }
    findOne(id) {
        return this.weeksService.findById(id);
    }
    getMatrix(id) {
        return this.weeksService.getSubmissionMatrix(id);
    }
    create(dto, user) {
        return this.weeksService.create(dto, user.id);
    }
    close(id) {
        return this.weeksService.setStatus(id, client_1.WeekStatus.closed);
    }
    reopen(id) {
        return this.weeksService.setStatus(id, client_1.WeekStatus.active);
    }
};
exports.WeeksController = WeeksController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WeeksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WeeksController.prototype, "findActive", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WeeksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/matrix'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WeeksController.prototype, "getMatrix", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [weeks_service_1.CreateWeekDto, Object]),
    __metadata("design:returntype", void 0)
], WeeksController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/close'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WeeksController.prototype, "close", null);
__decorate([
    (0, common_1.Patch)(':id/reopen'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WeeksController.prototype, "reopen", null);
exports.WeeksController = WeeksController = __decorate([
    (0, common_1.Controller)('weeks'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [weeks_service_1.WeeksService])
], WeeksController);
//# sourceMappingURL=weeks.controller.js.map