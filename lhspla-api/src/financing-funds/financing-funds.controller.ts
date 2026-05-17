import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FinancingFundsService, CreateFundDto, UpdateFundDto } from './financing-funds.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('financing-funds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinancingFundsController {
  constructor(private svc: FinancingFundsService) {}

  @Get()
  findAll(@Query('all') all?: string) { return this.svc.findAll(all !== 'true'); }

  @Post()
  @Roles(Role.super_admin, Role.admin_system)
  create(@Body() dto: CreateFundDto) { return this.svc.create(dto); }

  @Patch(':id')
  @Roles(Role.super_admin, Role.admin_system)
  update(@Param('id') id: string, @Body() dto: UpdateFundDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @Roles(Role.super_admin, Role.admin_system)
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
