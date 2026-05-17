import { Module } from '@nestjs/common';
import { ActivityReferencesController } from './activity-references.controller';
import { ActivityReferencesService } from './activity-references.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityReferencesController],
  providers: [ActivityReferencesService],
})
export class ActivityReferencesModule {}
