import { Module } from '@nestjs/common';
import { FinancingFundsController } from './financing-funds.controller';
import { FinancingFundsService } from './financing-funds.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [FinancingFundsController], providers: [FinancingFundsService] })
export class FinancingFundsModule {}
