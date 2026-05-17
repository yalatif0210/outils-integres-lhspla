import { Module } from '@nestjs/common';
import { RiskCategoriesController } from './risk-categories.controller';
import { RiskCategoriesService } from './risk-categories.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RiskCategoriesController],
  providers: [RiskCategoriesService],
})
export class RiskCategoriesModule {}
