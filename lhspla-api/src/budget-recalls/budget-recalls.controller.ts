import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import {
  BudgetRecallsService, CreateRecallDto, AddDocumentDto,
  ReviewDocumentDto, RejectRecallDto,
} from './budget-recalls.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
];
const ALLOWED_EXTS = /\.(pdf|xls|xlsx|png|jpg|jpeg|zip)$/i;
const MAX_SIZE = 10 * 1024 * 1024;

const recallFileStorage = diskStorage({
  destination: (req: any, _file, cb) => {
    const recallId = req.params.id;
    const dir = join(process.cwd(), 'uploads', 'recalls', recallId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

@Controller('budget-recalls')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetRecallsController {
  constructor(private svc: BudgetRecallsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.svc.findAll(req.user.roles, req.user.entityCode);
  }

  @Get('by-budget/:budgetId')
  findByBudget(@Request() req: any, @Param('budgetId') budgetId: string) {
    return this.svc.findByBudget(budgetId, req.user.roles, req.user.entityCode);
  }

  @Get(':id/coverage')
  getCoverage(@Request() req: any, @Param('id') id: string) {
    return this.svc.getCoverage(id, req.user.roles, req.user.entityCode);
  }

  @Get(':id/audit')
  getAudit(@Request() req: any, @Param('id') id: string) {
    return this.svc.getAuditLog(id, req.user.roles, req.user.entityCode);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateRecallDto) {
    return this.svc.create(dto, req.user.entityCode, req.user.id);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', {
    storage: recallFileStorage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTS.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Format non supporté. Acceptés : PDF, Excel, PNG, JPG, ZIP') as any, false);
      }
    },
  }))
  addDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.svc.addDocument(id, dto, file, req.user.entityCode, req.user.id, req.user.roles);
  }

  @Patch(':id/documents/:docId/review')
  @Roles(Role.admin_finance, Role.super_admin)
  reviewDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.svc.reviewDocument(id, docId, dto, req.user.id);
  }

  @Delete(':id/documents/:docId')
  deleteDocument(@Request() req: any, @Param('id') id: string, @Param('docId') docId: string) {
    return this.svc.deleteDocument(id, docId, req.user.entityCode, req.user.id, req.user.roles);
  }

  @Post(':id/reject')
  @Roles(Role.admin_finance, Role.super_admin)
  rejectRecall(@Request() req: any, @Param('id') id: string, @Body() dto: RejectRecallDto) {
    return this.svc.rejectRecall(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  cancelRecall(@Request() req: any, @Param('id') id: string) {
    return this.svc.cancelRecall(id, req.user.entityCode, req.user.id);
  }

  @Post(':id/close')
  @Roles(Role.admin_finance, Role.super_admin)
  close(@Request() req: any, @Param('id') id: string) {
    return this.svc.close(id, req.user.id);
  }

  @Post(':id/reopen')
  @Roles(Role.admin_finance, Role.super_admin)
  reopen(@Request() req: any, @Param('id') id: string) {
    return this.svc.reopen(id, req.user.id);
  }
}
