import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Request,
  Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import {
  StockService,
  CreateStockEntryDto,
  UpdateStockEntryDto,
  CreateRefDenominationDto,
} from './stock.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Programme, StockStatus } from '@prisma/client';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private svc: StockService) {}

  // ── Référentiel dénominations ────────────────────────────────────────────

  @Get('denominations')
  getDenominations(@Query('programme') programme?: Programme) {
    return this.svc.getRefDenominations(programme);
  }

  @Post('denominations')
  createDenomination(@Body() dto: CreateRefDenominationDto, @Request() req: any) {
    return this.svc.createRefDenomination(dto, req.user.roles, req.user.entityCode);
  }

  @Put('denominations/:id')
  updateDenomination(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRefDenominationDto>,
    @Request() req: any,
  ) {
    return this.svc.updateRefDenomination(id, dto, req.user.roles, req.user.entityCode);
  }

  // ── Template Excel ───────────────────────────────────────────────────────

  @Get('template/download')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.svc.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="modele_stock_lhspla.xlsx"');
    res.send(buffer);
  }

  // ── Annexe A ─────────────────────────────────────────────────────────────

  @Get('annexe-a')
  getAnnexeA(
    @Query('semaine') semaine: string,
    @Query('critiques') critiques?: string,
  ) {
    return this.svc.getAnnexeA(semaine, critiques === 'true');
  }

  // ── Import Excel ─────────────────────────────────────────────────────────

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new Error('Fichier manquant');
    return this.svc.importExcel(
      file.buffer, req.user.id, req.user.roles, req.user.entityCode,
      req.body?.semaineOverride || undefined,
      req.body?.dateEtatStock || undefined,
    );
  }

  // ── Import PowerPoint ─────────────────────────────────────────────────────

  @Post('import-pptx')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importPptx(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new Error('Fichier manquant');
    return this.svc.importPptx(
      file.buffer, req.user.id, req.user.roles, req.user.entityCode,
      req.body?.semaineOverride || undefined,
      req.body?.dateEtatStock || undefined,
    );
  }

  // ── CRUD StockEntry ──────────────────────────────────────────────────────

  @Get()
  findAll(
    @Query('semaine') semaine?: string,
    @Query('programme') programme?: Programme,
    @Query('statut') statut?: StockStatus,
  ) {
    return this.svc.findAll(semaine, programme, statut);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStockEntryDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id, req.user.roles, req.user.entityCode);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStockEntryDto, @Request() req: any) {
    return this.svc.update(id, dto, req.user.roles, req.user.entityCode);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(id, req.user.roles, req.user.entityCode);
  }
}
