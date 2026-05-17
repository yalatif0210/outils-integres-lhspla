import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { WeeksService, CreateWeekDto } from './weeks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, WeekStatus } from '@prisma/client';

@Controller('weeks')
@UseGuards(JwtAuthGuard)
export class WeeksController {
  constructor(private weeksService: WeeksService) {}

  @Get()
  findAll() {
    return this.weeksService.findAll();
  }

  @Get('active')
  findActive() {
    return this.weeksService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.weeksService.findById(id);
  }

  @Get(':id/matrix')
  getMatrix(@Param('id') id: string) {
    return this.weeksService.getSubmissionMatrix(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.super_admin, Role.admin_system)
  create(@Body() dto: CreateWeekDto, @CurrentUser() user: any) {
    return this.weeksService.create(dto, user.id);
  }

  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles(Role.super_admin, Role.admin_system)
  close(@Param('id') id: string) {
    return this.weeksService.setStatus(id, WeekStatus.closed);
  }

  @Patch(':id/reopen')
  @UseGuards(RolesGuard)
  @Roles(Role.super_admin, Role.admin_system)
  reopen(@Param('id') id: string) {
    return this.weeksService.setStatus(id, WeekStatus.active);
  }
}
