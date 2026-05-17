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
var CronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const submissions_service_1 = require("../submissions/submissions.service");
const missions_service_1 = require("../missions/missions.service");
let CronService = CronService_1 = class CronService {
    prisma;
    notifications;
    submissions;
    missions;
    logger = new common_1.Logger(CronService_1.name);
    constructor(prisma, notifications, submissions, missions) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.submissions = submissions;
        this.missions = missions;
    }
    async sendMondayReminders() {
        this.logger.log('Running Monday submission reminder cron...');
        const activeWeeks = await this.prisma.week.findMany({
            where: { status: 'active' },
        });
        for (const week of activeWeeks) {
            await this.notifications.sendLateSubmissionReminders(week.id);
        }
        this.logger.log(`Reminders sent for ${activeWeeks.length} active week(s)`);
    }
    async cleanupExpiredLocks() {
        await this.submissions.cleanExpiredLocks();
    }
    async autoCompleteMissions() {
        this.logger.log('Running mission auto-complete cron...');
        const count = await this.missions.autoComplete();
        this.logger.log(`${count} mission(s) marked as completed`);
    }
};
exports.CronService = CronService;
__decorate([
    (0, schedule_1.Cron)('0 8 * * 1', { timeZone: 'Africa/Abidjan' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "sendMondayReminders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "cleanupExpiredLocks", null);
__decorate([
    (0, schedule_1.Cron)('0 6 * * *', { timeZone: 'Africa/Abidjan' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "autoCompleteMissions", null);
exports.CronService = CronService = CronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        submissions_service_1.SubmissionsService,
        missions_service_1.MissionsService])
], CronService);
//# sourceMappingURL=cron.service.js.map