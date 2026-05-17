"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetProjectsModule = void 0;
const common_1 = require("@nestjs/common");
const budget_projects_controller_1 = require("./budget-projects.controller");
const budget_projects_service_1 = require("./budget-projects.service");
const prisma_module_1 = require("../prisma/prisma.module");
const notifications_module_1 = require("../notifications/notifications.module");
const app_config_module_1 = require("../app-config/app-config.module");
const n8n_module_1 = require("../n8n/n8n.module");
let BudgetProjectsModule = class BudgetProjectsModule {
};
exports.BudgetProjectsModule = BudgetProjectsModule;
exports.BudgetProjectsModule = BudgetProjectsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notifications_module_1.NotificationsModule, app_config_module_1.AppConfigModule, n8n_module_1.N8nModule],
        controllers: [budget_projects_controller_1.BudgetProjectsController],
        providers: [budget_projects_service_1.BudgetProjectsService],
    })
], BudgetProjectsModule);
//# sourceMappingURL=budget-projects.module.js.map