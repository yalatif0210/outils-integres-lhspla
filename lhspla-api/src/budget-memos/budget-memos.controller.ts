import {
  Controller, Get, Post, Delete, Param, Body, Request, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { BudgetMemosService, CreateBudgetMemoDto, CopReviewMemoDto } from './budget-memos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

const MEMO_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function memoFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (MEMO_MIMES.includes(file.mimetype) || /\.(pdf|doc|docx)$/i.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Format non supporté — PDF ou Word uniquement'), false);
  }
}

@Controller('budget-memos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetMemosController {
  constructor(private svc: BudgetMemosService) {}

  @Get('by-budget/:budgetId')
  findByBudget(@Request() req: any, @Param('budgetId') budgetId: string) {
    return this.svc.findByBudget(budgetId, req.user.roles, req.user.entityCode);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'budget-memos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
        cb(null, `memo_${Date.now()}.${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: memoFileFilter,
  }))
  create(
    @Request() req: any,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dto: CreateBudgetMemoDto = {
      category: body.category,
      amount: body.amount ? parseFloat(body.amount) : undefined,
      content: body.content,
    };
    const budgetId = body.budgetId;
    if (!budgetId) throw new BadRequestException('budgetId requis');
    return this.svc.create(budgetId, dto, file, req.user.id, req.user.roles);
  }

  @Post(':id/cop-review')
  @Roles(Role.chief_of_party, Role.super_admin)
  copReview(@Request() req: any, @Param('id') id: string, @Body() dto: CopReviewMemoDto) {
    return this.svc.copReview(id, dto, req.user.id, req.user.roles);
  }

  @Delete(':id')
  @Roles(Role.admin_finance, Role.super_admin)
  delete(@Request() req: any, @Param('id') id: string) {
    return this.svc.delete(id, req.user.id, req.user.roles);
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const { filePath, fileName, fileType } = await this.svc.downloadFile(id);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable');
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(filePath);
  }
}
