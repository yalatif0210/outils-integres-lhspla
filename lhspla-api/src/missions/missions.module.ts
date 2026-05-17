import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { MissionDocumentService } from './mission-document.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { N8nModule } from '../n8n/n8n.module';

@Module({
  imports: [PrismaModule, NotificationsModule, N8nModule],
  controllers: [MissionsController],
  providers: [MissionsService, MissionDocumentService],
  exports: [MissionsService],
})
export class MissionsModule {}
