import { Module } from '@nestjs/common';
import { CompilationController } from './compilation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompilationController],
})
export class CompilationModule {}
