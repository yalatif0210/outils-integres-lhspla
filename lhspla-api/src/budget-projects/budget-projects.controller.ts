import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, Res, NotFoundException,
  UseInterceptors, UploadedFile, BadRequestException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { BudgetProjectsService, CreateBudgetDto, UpdateBudgetDto, FinanceReviewDto, ReviewBudgetDto, COPReviewBudgetDto } from './budget-projects.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

const TDR_MIMES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const TDR_EXTS  = /\.(pdf|doc|docx)$/i;

@Controller('budget-projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetProjectsController {
  constructor(private svc: BudgetProjectsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('entityCode') entityCode?: string,
    @Query('budgetNumber') budgetNumber?: string,
    @Query('createdAt') createdAt?: string,
  ) {
    return this.svc.findAll(req.user.roles, entityCode ?? req.user.entityCode, budgetNumber, createdAt);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(id, req.user.roles, req.user.entityCode);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateBudgetDto) {
    return this.svc.create(dto, req.user.entityCode);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.svc.update(id, dto, req.user.roles, req.user.entityCode);
  }

  @Post(':id/submit')
  submit(@Request() req: any, @Param('id') id: string) {
    return this.svc.submit(id, req.user.entityCode, req.user.roles);
  }

  @Post(':id/finance-review')
  @Roles(Role.admin_finance, Role.super_admin)
  financeReview(@Request() req: any, @Param('id') id: string, @Body() dto: FinanceReviewDto) {
    return this.svc.financeReview(id, dto, req.user.id);
  }

  @Post(':id/tpm-review')
  @Roles(Role.admin_tpm, Role.super_admin)
  tpmReview(@Request() req: any, @Param('id') id: string, @Body() dto: ReviewBudgetDto) {
    return this.svc.tpmReview(id, dto, req.user.id);
  }

  @Post(':id/cop-review')
  @Roles(Role.chief_of_party, Role.super_admin)
  copReview(@Request() req: any, @Param('id') id: string, @Body() dto: COPReviewBudgetDto) {
    return this.svc.copReview(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(id, req.user.roles, req.user.entityCode);
  }

  // ── TDR ──────────────────────────────────────────────────────────────────

  @Post(':id/upload-tdr')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, _file, cb) => {
        const budgetId = req.params.id;
        const dir = join(process.cwd(), 'uploads', 'tdr', budgetId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
        cb(null, `TDR.${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (TDR_MIMES.includes(file.mimetype) || TDR_EXTS.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Format non supporté — PDF ou Word uniquement'), false);
      }
    },
  }))
  uploadTdr(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.svc.uploadTdr(id, file, req.user.roles, req.user.entityCode, req.user.id);
  }

  @Get(':id/download-tdr')
  async downloadTdr(@Param('id') id: string, @Res() res: Response) {
    const { filePath, ext } = await this.svc.getTdrPath(id);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier TDR introuvable');
    const mime = ext === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="TDR.${ext}"`);
    res.sendFile(filePath);
  }

  // ── Clôture ────────────────────────────────────────────────────────────────

  @Post(':id/cloturer')
  cloturer(@Param('id') id: string, @Request() req: any) {
    return this.svc.cloturer(id, req.user.id, req.user.roles);
  }

  @Post(':id/declassifier')
  declassifier(@Param('id') id: string, @Request() req: any) {
    return this.svc.declassifier(id, req.user.id, req.user.roles);
  }

  @Post(':id/archive-zip')
  async archiveZip(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { pdfBase64?: string },
    @Res() res: Response,
  ) {
    const logger = new Logger('BudgetArchiveZip');
    try {
      const pdfBuffer = body?.pdfBase64
        ? Buffer.from(body.pdfBase64, 'base64')
        : undefined;
      const { buffer, filename } = await this.svc.generateArchiveZip(id, req.user.roles, pdfBuffer);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err: any) {
      logger.error(`Archive ZIP erreur budget ${id} : ${err?.message}`, err?.stack);
      const status  = err?.status ?? err?.statusCode ?? 500;
      const message = err?.message ?? 'Erreur lors de la génération de l\'archive';
      if (!res.headersSent) {
        res.status(status).json({ statusCode: status, message });
      }
    }
  }
}
