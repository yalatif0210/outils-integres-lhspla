"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronModule = void 0;
const common_1 = require("@nestjs/common");
const cron_service_1 = require("./cron.service");
const notifications_module_1 = require("../notifications/notifications.module");
const submissions_module_1 = require("../submissions/submissions.module");
const missions_module_1 = require("../missions/missions.module");
let CronModule = class CronModule {
};
exports.CronModule = CronModule;
exports.CronModule = CronModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule, submissions_module_1.SubmissionsModule, missions_module_1.MissionsModule],
        providers: [cron_service_1.CronService],
    })
], CronModule);
//# sourceMappingURL=cron.module.js.map