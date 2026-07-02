import { Module } from '@nestjs/common';
import { InputsController } from './inputs.controller';
import { InputsService } from './inputs.service';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [TranslationModule],
  controllers: [InputsController],
  providers: [InputsService],
  exports: [InputsService],
})
export class InputsModule {}
