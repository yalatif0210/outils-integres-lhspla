import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CostItemsService, CreateCostItemDto, UpdateCostItemDto } from './cost-items.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('cost-items')
@UseGuards(JwtAuthGuard)
export class CostItemsController {
  constructor(private svc: CostItemsService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.svc.findAll(all !== 'true');
  }

  @Get('natures')
  findNatures() {
    return this.svc.findNatures();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.super_admin, Role.admin_system, Role.admin_finance)
  create(@Body() dto: CreateCostItemDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.super_admin, Role.admin_system, Role.admin_finance)
  update(@Param('id') id: string, @Body() dto: UpdateCostItemDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.super_admin, Role.admin_system, Role.admin_finance)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
