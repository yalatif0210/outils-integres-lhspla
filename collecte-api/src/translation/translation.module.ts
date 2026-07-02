import { Module } from '@nestjs/common';
import { TranslationLlmService } from './translation-llm.service';

@Module({
  providers: [TranslationLlmService],
  exports: [TranslationLlmService],
})
export class TranslationModule {}
