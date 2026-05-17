import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('config')
export class AppConfigController {
  constructor(private service: AppConfigService) {}

  @Get()
  getAll() {
    return this.service.getMap();
  }

  @Get('full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin_system, Role.admin_finance, Role.super_admin)
  getFull() {
    return this.service.getAll();
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin_system, Role.admin_finance, Role.super_admin)
  update(@Param('key') key: string, @Body('value') value: string) {
    return this.service.upsert(key, value);
  }
}
