import { Module } from '@nestjs/common';
import { WeeksService } from './weeks.service';
import { WeeksController } from './weeks.controller';

@Module({
  providers: [WeeksService],
  controllers: [WeeksController],
  exports: [WeeksService],
})
export class WeeksModule {}
