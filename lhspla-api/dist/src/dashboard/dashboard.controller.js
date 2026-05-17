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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const dashboard_service_1 = require("./dashboard.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let DashboardController = class DashboardController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    getAdminDashboard(year, weekStatus, weekId) {
        return this.dashboardService.getAdminOverview(year, weekStatus, weekId);
    }
    getHeatmap(limit, year, weekStatus, entityCode, weekId) {
        return this.dashboardService.getCompletionHeatmap(limit ? parseInt(limit) : 12, year, weekStatus, entityCode, weekId);
    }
    getSubmissionTrend(limit, year, weekStatus, entityCode, weekId) {
        return this.dashboardService.getSubmissionRateTrend(limit ? parseInt(limit) : 12, year, weekStatus, entityCode, weekId);
    }
    getRiskTrend(limit, year, weekStatus, entityCode, weekId) {
        return this.dashboardService.getRiskTrend(limit ? parseInt(limit) : 12, year, weekStatus, entityCode, weekId);
    }
    getCriticalRisks() {
        return this.dashboardService.getCriticalRisksAlert();
    }
    getEntityComparison(year, weekStatus, entityCode, weekId) {
        return this.dashboardService.getEntityComparison(year, weekStatus, entityCode, weekId);
    }
    getWeekPeriods() {
        return this.dashboardService.getWeekPeriods();
    }
    getEntityDashboard(code, user, limit) {
        if (user.roles.includes(client_1.Role.entity_member) &&
            !user.roles.some((r) => ['super_admin', 'admin_system', 'chief_of_party', 'admin_tpm', 'admin_finance', 'assistant_direction'].includes(r)) &&
            user.entityCode !== code) {
            return { error: 'Accès refusé' };
        }
        return this.dashboardService.getEntityDashboard(code, limit ? parseInt(limit) : 12);
    }
    getEntityHistory(code, user) {
        if (user.roles.includes(client_1.Role.entity_member) &&
            !user.roles.some((r) => ['super_admin', 'admin_system', 'chief_of_party', 'admin_tpm', 'admin_finance', 'assistant_direction'].includes(r)) &&
            user.entityCode !== code) {
            return { error: 'Accès refusé' };
        }
        return this.dashboardService.getEntityHistory(code);
    }
    getMyEntityDashboard(user) {
        if (!user.entityCode)
            return { error: 'Aucune entité associée' };
        return this.dashboardService.getEntityDashboard(user.entityCode);
    }
    getBudgetKpis(req, entityCode, from, to, fiscalYear) {
        return this.dashboardService.getBudgetKpis(req.user.roles, req.user.entityCode, entityCode, from, to, fiscalYear);
    }
    getFinancialDashboard(entityCode, budgetType, from, to) {
        return this.dashboardService.getFinancialDashboard(entityCode, budgetType, from, to);
    }
    getAvailableYears() {
        return this.dashboardService.getAvailableYears();
    }
    getMissionStats(req, entityCode, personnelId, from, to, fiscalYear) {
        return this.dashboardService.getMissionStats(req.user.roles, req.user.id, req.user.entityCode, entityCode, personnelId, from, to, fiscalYear);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('admin'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_tpm, client_1.Role.admin_finance),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('weekStatus')),
    __param(2, (0, common_1.Query)('weekId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getAdminDashboard", null);
__decorate([
    (0, common_1.Get)('admin/heatmap'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_tpm, client_1.Role.admin_finance),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('weekStatus')),
    __param(3, (0, common_1.Query)('entityCode')),
    __param(4, (0, common_1.Query)('weekId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getHeatmap", null);
__decorate([
    (0, common_1.Get)('admin/submission-trend'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_tpm, client_1.Role.admin_finance),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('weekStatus')),
    __param(3, (0, common_1.Query)('entityCode')),
    __param(4, (0, common_1.Query)('weekId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getSubmissionTrend", null);
__decorate([
    (0, common_1.Get)('admin/risk-trend'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_tpm, client_1.Role.admin_finance),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('weekStatus')),
    __param(3, (0, common_1.Query)('entityCode')),
    __param(4, (0, common_1.Query)('weekId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getRiskTrend", null);
__decorate([
    (0, common_1.Get)('admin/critical-risks'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_tpm, client_1.Role.admin_finance),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getCriticalRisks", null);
__decorate([
    (0, common_1.Get)('admin/entity-comparison'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_tpm, client_1.Role.admin_finance),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('weekStatus')),
    __param(2, (0, common_1.Query)('entityCode')),
    __param(3, (0, common_1.Query)('weekId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getEntityComparison", null);
__decorate([
    (0, common_1.Get)('week-periods'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_tpm, client_1.Role.admin_finance),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getWeekPeriods", null);
__decorate([
    (0, common_1.Get)('entity/:code'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getEntityDashboard", null);
__decorate([
    (0, common_1.Get)('entity/:code/history'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getEntityHistory", null);
__decorate([
    (0, common_1.Get)('my-entity'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getMyEntityDashboard", null);
__decorate([
    (0, common_1.Get)('budget-kpis'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('entityCode')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('fiscalYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getBudgetKpis", null);
__decorate([
    (0, common_1.Get)('financial'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_system, client_1.Role.chief_of_party, client_1.Role.admin_finance),
    __param(0, (0, common_1.Query)('entityCode')),
    __param(1, (0, common_1.Query)('budgetType')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getFinancialDashboard", null);
__decorate([
    (0, common_1.Get)('available-years'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getAvailableYears", null);
__decorate([
    (0, common_1.Get)('mission-stats'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('entityCode')),
    __param(2, (0, common_1.Query)('personnelId')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __param(5, (0, common_1.Query)('fiscalYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getMissionStats", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map