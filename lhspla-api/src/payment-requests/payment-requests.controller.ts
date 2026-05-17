import {
  Controller, Get, Post, Delete, Param, Body, Request, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { PaymentRequestsService, RejectPaymentRequestDto } from './payment-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

const EXCEL_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const PROOF_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

function excelFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (EXCEL_MIMES.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Format non supporté — Excel uniquement (.xlsx, .xls)'), false);
  }
}

function proofFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (PROOF_MIMES.includes(file.mimetype) || /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Format non supporté — PDF ou image uniquement'), false);
  }
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentRequestsController {
  constructor(private svc: PaymentRequestsService) {}

  // ── Demandes de paiement ──────────────────────────────────────────────────

  @Get('payment-requests/budget/:budgetId/summary')
  getSummary(@Param('budgetId') budgetId: string) {
    return this.svc.getSummary(budgetId);
  }

  @Get('payment-requests/by-budget/:budgetId')
  findByBudget(@Request() req: any, @Param('budgetId') budgetId: string) {
    return this.svc.findByBudget(budgetId, req.user.roles, req.user.entityCode);
  }

  @Post('payment-requests/:budgetId')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'payment-requests', req.params.budgetId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'xlsx';
        cb(null, `demande_${Date.now()}.${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: excelFilter,
  }))
  upload(
    @Request() req: any,
    @Param('budgetId') budgetId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.svc.upload(budgetId, file, req.user.id, req.user.entityCode);
  }

  @Post('payment-requests/:id/validate')
  @Roles(Role.admin_finance, Role.super_admin)
  validate(@Request() req: any, @Param('id') id: string) {
    return this.svc.validate(id, req.user.id, req.user.roles);
  }

  @Post('payment-requests/:id/reject')
  @Roles(Role.admin_finance, Role.super_admin)
  reject(@Request() req: any, @Param('id') id: string, @Body() dto: RejectPaymentRequestDto) {
    return this.svc.reject(id, dto.reason, req.user.id, req.user.roles);
  }

  @Get('payment-requests/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { filePath, fileName } = await this.svc.getFilePath(id);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable');
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'xlsx';
    const mime = ext === 'xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(filePath);
  }

  @Post('payment-requests/:id/proofs')
  @Roles(Role.chargee_tresorerie, Role.super_admin)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'payment-proofs', req.params.id);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
        cb(null, `preuve_${Date.now()}.${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: proofFilter,
  }))
  uploadProof(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('amount') amountRaw: string,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    const amount = parseFloat(amountRaw);
    if (!amount || amount <= 0) throw new BadRequestException('Le montant de la preuve est obligatoire et doit être > 0');
    return this.svc.uploadProof(id, file, amount, req.user.id, req.user.roles);
  }

  @Get('payment-requests/:id/proofs/:proofId/download')
  async downloadProof(@Param('proofId') proofId: string, @Res() res: Response) {
    const { filePath, fileName, fileType } = await this.svc.getProofPath(proofId);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable');
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(filePath);
  }

  @Delete('payment-requests/:id')
  deleteRequest(@Request() req: any, @Param('id') id: string) {
    return this.svc.deleteRequest(id, req.user.id, req.user.roles, req.user.entityCode);
  }

  // Suppression preuve : chargee_tresorerie + super_admin (spec SECTION 1 §2.1)
  @Delete('payment-requests/:requestId/proofs/:proofId')
  @Roles(Role.chargee_tresorerie, Role.super_admin)
  deleteProof(
    @Request() req: any,
    @Param('requestId') requestId: string,
    @Param('proofId') proofId: string,
  ) {
    return this.svc.deleteProof(requestId, proofId, req.user.id, req.user.roles);
  }

  // ── Modèle global ─────────────────────────────────────────────────────────

  @Post('payment-template')
  @Roles(Role.admin_finance, Role.super_admin)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'payment-template');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'xlsx';
        cb(null, `modele_demande_paiement.${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: excelFilter,
  }))
  uploadTemplate(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.svc.uploadTemplate(file, req.user.id, req.user.roles);
  }

  @Get('payment-template/download')
  async downloadTemplate(@Res() res: Response) {
    const { filePath, fileName } = await this.svc.getTemplatePath();
    if (!fs.existsSync(filePath)) throw new NotFoundException('Modèle introuvable');
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'xlsx';
    const mime = ext === 'xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(filePath);
  }
}
