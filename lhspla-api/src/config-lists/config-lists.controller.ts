import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ConfigListsService, CreateConfigListDto, UpdateConfigListDto } from './config-lists.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('config-lists')
@UseGuards(JwtAuthGuard)
export class ConfigListsController {
  constructor(private svc: ConfigListsService) {}

  @Get()
  findAll(@Query('type') type?: string) {
    return this.svc.findAll(type);
  }

  @Get('by-type/:type')
  findByType(@Param('type') type: string) {
    return this.svc.findByType(type);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateConfigListDto) {
    return this.svc.create(dto, req.user.roles);
  }

  @Post('seed')
  seed(@Request() req: any, @Body() body: { type: string; values: string[] }) {
    return this.svc.seed(body.type, body.values, req.user.roles);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateConfigListDto) {
    return this.svc.update(id, dto, req.user.roles);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(id, req.user.roles);
  }
}
