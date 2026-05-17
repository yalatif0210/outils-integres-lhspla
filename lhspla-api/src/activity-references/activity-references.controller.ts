import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ActivityReferencesService, CreateActivityReferenceDto, UpdateActivityReferenceDto } from './activity-references.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('activity-references')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityReferencesController {
  constructor(private svc: ActivityReferencesService) {}

  /** Public to all authenticated users — filtered by entityCode */
  @Get()
  find(@Query('entityCode') entityCode?: string) {
    if (entityCode) return this.svc.findByEntity(entityCode);
    return this.svc.findAll();
  }

  @Post()
  @Roles(Role.admin_system)
  create(@Body() dto: CreateActivityReferenceDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(Role.admin_system)
  update(@Param('id') id: string, @Body() dto: UpdateActivityReferenceDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.admin_system)
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
