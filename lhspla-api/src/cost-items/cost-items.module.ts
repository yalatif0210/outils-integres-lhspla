import { Module } from '@nestjs/common';
import { CostItemsController } from './cost-items.controller';
import { CostItemsService } from './cost-items.service';

@Module({
  controllers: [CostItemsController],
  providers: [CostItemsService],
  exports: [CostItemsService],
})
export class CostItemsModule {}
