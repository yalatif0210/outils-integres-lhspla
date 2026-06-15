import { Module } from '@nestjs/common';
import { ConfigListsService } from './config-lists.service';
import { ConfigListsController } from './config-lists.controller';

@Module({
  controllers: [ConfigListsController],
  providers: [ConfigListsService],
  exports: [ConfigListsService],
})
export class ConfigListsModule {}
