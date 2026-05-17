import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RiskCategoriesService, CreateRiskCategoryDto, UpdateRiskCategoryDto } from './risk-categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('risk-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiskCategoriesController {
  constructor(private svc: RiskCategoriesService) {}

  @Get()
  findAll(@Query('all') all?: string, @Query('themeId') themeId?: string) {
    return this.svc.findAll(all !== 'true', themeId);
  }

  @Post()
  @Roles(Role.admin_system)
  create(@Body() dto: CreateRiskCategoryDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(Role.admin_system)
  update(@Param('id') id: string, @Body() dto: UpdateRiskCategoryDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.admin_system)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
