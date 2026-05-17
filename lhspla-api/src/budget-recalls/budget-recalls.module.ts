import { Module } from '@nestjs/common';
import { BudgetRecallsController } from './budget-recalls.controller';
import { BudgetRecallsService } from './budget-recalls.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { N8nModule } from '../n8n/n8n.module';

@Module({
  imports: [PrismaModule, NotificationsModule, N8nModule],
  controllers: [BudgetRecallsController],
  providers: [BudgetRecallsService],
})
export class BudgetRecallsModule {}
