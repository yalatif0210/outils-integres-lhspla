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
exports.SubmissionsController = void 0;
const common_1 = require("@nestjs/common");
const submissions_service_1 = require("./submissions.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let SubmissionsController = class SubmissionsController {
    submissionsService;
    constructor(submissionsService) {
        this.submissionsService = submissionsService;
    }
    findOne(weekId, entityCode) {
        return this.submissionsService.findByWeekAndEntity(weekId, entityCode);
    }
    getLocks(weekId, entityCode) {
        return this.submissionsService.getLocksStatus(weekId, entityCode);
    }
    acquireLock(weekId, entityCode, section, user) {
        this.assertCanEdit(user, entityCode);
        return this.submissionsService.acquireLock(weekId, entityCode, section, user.id);
    }
    releaseLock(weekId, entityCode, section, user) {
        return this.submissionsService.releaseLock(weekId, entityCode, section, user.id);
    }
    save(weekId, entityCode, section, data, user) {
        this.assertCanEdit(user, entityCode);
        return this.submissionsService.saveSection(weekId, entityCode, { section, data }, user.id);
    }
    submit(weekId, entityCode, user) {
        this.assertCanEdit(user, entityCode);
        return this.submissionsService.submit(weekId, entityCode, user.id);
    }
    reopen(weekId, entityCode, user) {
        if (!user.roles?.includes(client_1.Role.admin_system))
            throw new common_1.ForbiddenException('Seul un admin peut réouvrir une saisie');
        return this.submissionsService.reopenSubmission(weekId, entityCode);
    }
    assertCanEdit(user, entityCode) {
        if (user.roles?.includes(client_1.Role.admin_system))
            return;
        if (user.entityCode === entityCode)
            return;
        if (user.roles?.includes(client_1.Role.chief_of_party))
            throw new common_1.ForbiddenException('Le Chief of Party ne peut pas modifier les saisies');
        throw new common_1.ForbiddenException('Vous ne pouvez modifier que les saisies de votre entité');
    }
};
exports.SubmissionsController = SubmissionsController;
__decorate([
    (0, common_1.Get)(':entityCode'),
    __param(0, (0, common_1.Param)('weekId')),
    __param(1, (0, common_1.Param)('entityCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':entityCode/locks'),
    __param(0, (0, common_1.Param)('weekId')),
    __param(1, (0, common_1.Param)('entityCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getLocks", null);
__decorate([
    (0, common_1.Post)(':entityCode/lock/:section'),
    __param(0, (0, common_1.Param)('weekId')),
    __param(1, (0, common_1.Param)('entityCode')),
    __param(2, (0, common_1.Param)('section')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "acquireLock", null);
__decorate([
    (0, common_1.Post)(':entityCode/unlock/:section'),
    __param(0, (0, common_1.Param)('weekId')),
    __param(1, (0, common_1.Param)('entityCode')),
    __param(2, (0, common_1.Param)('section')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "releaseLock", null);
__decorate([
    (0, common_1.Patch)(':entityCode/save'),
    __param(0, (0, common_1.Param)('weekId')),
    __param(1, (0, common_1.Param)('entityCode')),
    __param(2, (0, common_1.Body)('section')),
    __param(3, (0, common_1.Body)('data')),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "save", null);
__decorate([
    (0, common_1.Post)(':entityCode/submit'),
    __param(0, (0, common_1.Param)('weekId')),
    __param(1, (0, common_1.Param)('entityCode')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':entityCode/reopen'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('weekId')),
    __param(1, (0, common_1.Param)('entityCode')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "reopen", null);
exports.SubmissionsController = SubmissionsController = __decorate([
    (0, common_1.Controller)('weeks/:weekId/submissions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [submissions_service_1.SubmissionsService])
], SubmissionsController);
//# sourceMappingURL=submissions.controller.js.map