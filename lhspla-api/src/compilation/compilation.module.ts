import { Module } from '@nestjs/common';
import { CompilationController } from './compilation.controller';

@Module({
  controllers: [CompilationController],
})
export class CompilationModule {}
