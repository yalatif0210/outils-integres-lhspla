import { Module } from '@nestjs/common';
import { BudgetProjectsController } from './budget-projects.controller';
import { BudgetProjectsService } from './budget-projects.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { N8nModule } from '../n8n/n8n.module';

@Module({
  imports: [PrismaModule, NotificationsModule, AppConfigModule, N8nModule],
  controllers: [BudgetProjectsController],
  providers: [BudgetProjectsService],
})
export class BudgetProjectsModule {}
