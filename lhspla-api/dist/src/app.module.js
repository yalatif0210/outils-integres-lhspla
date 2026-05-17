"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const weeks_module_1 = require("./weeks/weeks.module");
const submissions_module_1 = require("./submissions/submissions.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const notifications_module_1 = require("./notifications/notifications.module");
const cron_module_1 = require("./cron/cron.module");
const app_config_module_1 = require("./app-config/app-config.module");
const activity_references_module_1 = require("./activity-references/activity-references.module");
const risk_categories_module_1 = require("./risk-categories/risk-categories.module");
const risk_themes_module_1 = require("./risk-themes/risk-themes.module");
const financing_funds_module_1 = require("./financing-funds/financing-funds.module");
const budget_projects_module_1 = require("./budget-projects/budget-projects.module");
const budget_recalls_module_1 = require("./budget-recalls/budget-recalls.module");
const cost_items_module_1 = require("./cost-items/cost-items.module");
const personnel_module_1 = require("./personnel/personnel.module");
const missions_module_1 = require("./missions/missions.module");
const n8n_module_1 = require("./n8n/n8n.module");
const payment_requests_module_1 = require("./payment-requests/payment-requests.module");
const budget_memos_module_1 = require("./budget-memos/budget-memos.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            weeks_module_1.WeeksModule,
            submissions_module_1.SubmissionsModule,
            dashboard_module_1.DashboardModule,
            notifications_module_1.NotificationsModule,
            cron_module_1.CronModule,
            app_config_module_1.AppConfigModule,
            activity_references_module_1.ActivityReferencesModule,
            risk_categories_module_1.RiskCategoriesModule,
            risk_themes_module_1.RiskThemesModule,
            financing_funds_module_1.FinancingFundsModule,
            budget_projects_module_1.BudgetProjectsModule,
            budget_recalls_module_1.BudgetRecallsModule,
            cost_items_module_1.CostItemsModule,
            personnel_module_1.PersonnelModule,
            missions_module_1.MissionsModule,
            n8n_module_1.N8nModule,
            payment_requests_module_1.PaymentRequestsModule,
            budget_memos_module_1.BudgetMemosModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map