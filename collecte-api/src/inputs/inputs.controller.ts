import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InputsService } from './inputs.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto, UpdateStatusDto, UpdatePmoDto, UpsertTranslationDto } from './dto/update-input.dto';

@Controller('inputs')
@UseGuards(JwtAuthGuard)
export class InputsController {
  constructor(private inputsService: InputsService) {}

  @Get()
  findAll(
    @Query('sectionId') sectionId?: string,
    @Query('entityId') entityId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.inputsService.findAll({ sectionId, entityId, type, status });
  }

  @Get('mine')
  findMine(
    @Request() req: any,
    @Query('sectionId') sectionId?: string,
    @Query('status') status?: string,
    @Query('entityCode') entityCode?: string,
  ) {
    return this.inputsService.findMine(req.user.userId, { sectionId, status, entityCode });
  }

  @Get('trash')
  findTrashed(@Request() req: any) {
    if (!req.user.roles?.includes('super_admin')) {
      throw new ForbiddenException('Réservé au Super Admin.');
    }
    return this.inputsService.findTrashed();
  }

  @Get('stats')
  getStats() {
    return this.inputsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inputsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInputDto, @Request() req: any) {
    return this.inputsService.create(dto, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInputDto, @Request() req: any) {
    return this.inputsService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @Request() req: any) {
    return this.inputsService.updateStatus(id, dto, req.user);
  }

  @Patch(':id/pmo')
  updatePmo(@Param('id') id: string, @Body() dto: UpdatePmoDto, @Request() req: any) {
    return this.inputsService.updatePmo(id, dto, req.user);
  }

  @Patch(':id/translation')
  upsertTranslation(@Param('id') id: string, @Body() dto: UpsertTranslationDto, @Request() req: any) {
    return this.inputsService.upsertTranslation(id, dto, req.user);
  }

  @Post(':id/translation/auto')
  autoTranslate(@Param('id') id: string, @Request() req: any) {
    return this.inputsService.autoTranslate(id, req.user);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @Request() req: any) {
    return this.inputsService.restore(id, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.inputsService.remove(id, req.user);
  }
}
