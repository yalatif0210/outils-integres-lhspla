import { Module } from '@nestjs/common';
import { RiskThemesController } from './risk-themes.controller';
import { RiskThemesService } from './risk-themes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RiskThemesController],
  providers: [RiskThemesService],
})
export class RiskThemesModule {}
