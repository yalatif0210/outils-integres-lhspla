import { Module } from '@nestjs/common';
import { BriefService } from './brief.service';
import { BriefController } from './brief.controller';
import { BriefLlmService } from './brief-llm.service';

@Module({
  providers: [BriefService, BriefLlmService],
  controllers: [BriefController],
})
export class BriefModule {}
