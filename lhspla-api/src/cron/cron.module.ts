import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [NotificationsModule, SubmissionsModule, MissionsModule],
  providers: [CronService],
})
export class CronModule {}
