import { Module } from '@nestjs/common';
import { BudgetMemosService } from './budget-memos.service';
import { BudgetMemosController } from './budget-memos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { N8nModule } from '../n8n/n8n.module';
import { AppConfigModule } from '../app-config/app-config.module';

@Module({
  imports: [PrismaModule, NotificationsModule, N8nModule, AppConfigModule],
  controllers: [BudgetMemosController],
  providers: [BudgetMemosService],
  exports: [BudgetMemosService],
})
export class BudgetMemosModule {}
