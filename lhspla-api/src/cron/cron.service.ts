import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { MissionsService } from '../missions/missions.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private submissions: SubmissionsService,
    private missions: MissionsService,
  ) {}

  // Every Monday at 8:00 AM — send reminders for pending submissions
  @Cron('0 8 * * 1', { timeZone: 'Africa/Abidjan' })
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

  // Every Monday at 12:00 — auto-close active weeks whose weekEnd has passed
  @Cron('0 12 * * 1', { timeZone: 'Africa/Abidjan' })
  async autoCloseExpiredWeeks() {
    this.logger.log('Running auto-close expired weeks cron...');
    const now = new Date();
    // Use midnight of this Monday as boundary so any week ending before today (Sunday or earlier) is matched
    const thisMonday = new Date(now);
    thisMonday.setHours(0, 0, 0, 0);
    const expiredWeeks = await this.prisma.week.findMany({
      where: { status: 'active', weekEnd: { lt: thisMonday } },
    });
    for (const week of expiredWeeks) {
      await this.prisma.week.update({
        where: { id: week.id },
        data: { status: 'closed', closedAt: now },
      });
      this.logger.log(`Auto-closed week: ${week.weekReference}`);
    }
    this.logger.log(`Auto-closed ${expiredWeeks.length} expired week(s)`);
  }

  // Every hour — cleanup expired section locks
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredLocks() {
    await this.submissions.cleanExpiredLocks();
  }

  // Every day at 06:00 — mark in_progress missions as completed if returnDate has passed
  @Cron('0 6 * * *', { timeZone: 'Africa/Abidjan' })
  async autoCompleteMissions() {
    this.logger.log('Running mission auto-complete cron...');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const count = await this.missions.autoComplete();
    this.logger.log(`${count} mission(s) marked as completed`);
  }
}
