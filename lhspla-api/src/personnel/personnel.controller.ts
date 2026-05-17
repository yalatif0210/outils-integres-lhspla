import { Controller, Get, Post, Patch, Delete, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PersonnelService, CreatePersonnelDto, UpdatePersonnelDto } from './personnel.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('personnel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PersonnelController {
  constructor(private svc: PersonnelService) {}

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.svc.findAll(includeInactive === 'true');
  }

  @Post()
  @Roles(Role.super_admin, Role.admin_system, Role.assistant_direction)
  create(@Body() dto: CreatePersonnelDto) { return this.svc.create(dto); }

  @Patch(':id')
  @Roles(Role.super_admin, Role.admin_system, Role.assistant_direction)
  update(@Param('id') id: string, @Body() dto: UpdatePersonnelDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @Roles(Role.super_admin, Role.admin_system)
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Put('reorder')
  @Roles(Role.super_admin, Role.admin_system, Role.assistant_direction)
  reorder(@Body() body: { ids: string[] }) { return this.svc.reorder(body.ids); }

  @Post('seed')
  @Roles(Role.super_admin)
  seed() { return this.svc.seed(); }
}
