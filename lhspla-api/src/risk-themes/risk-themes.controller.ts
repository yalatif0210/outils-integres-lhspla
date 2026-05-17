import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { RiskThemesService, CreateRiskThemeDto, UpdateRiskThemeDto } from './risk-themes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('risk-themes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiskThemesController {
  constructor(private svc: RiskThemesService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.svc.findAll(all !== 'true');
  }

  @Post()
  @Roles(Role.admin_system, Role.super_admin)
  create(@Body() dto: CreateRiskThemeDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(Role.admin_system, Role.super_admin)
  update(@Param('id') id: string, @Body() dto: UpdateRiskThemeDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.admin_system, Role.super_admin)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post('import')
  @Roles(Role.admin_system, Role.super_admin)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier Excel requis');
    return this.svc.importFromExcel(file.buffer);
  }
}
