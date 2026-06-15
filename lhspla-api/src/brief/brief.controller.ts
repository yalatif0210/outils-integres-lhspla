import {
  Controller, Get, Post, Patch, Query, Param, Body,
  UseGuards, Request, Res, BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { BriefService } from './brief.service';
import { BriefLlmService } from './brief-llm.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('brief')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BriefController {
  constructor(private svc: BriefService, private llm: BriefLlmService) {}

  @Get('preview')
  preview(@Query('semaine_id') semaineId: string) {
    if (!semaineId) throw new BadRequestException('Paramètre semaine_id requis (UUID)');
    return this.svc.preview(semaineId);
  }

  @Get('generate')
  async generate(
    @Query('semaine_id') semaineId: string,
    @Query('force') force: string,
    @Query('format') format: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!semaineId) throw new BadRequestException('Paramètre semaine_id requis (UUID)');
    if (format === 'docx') {
      const buffer = await this.svc.generateDocx(semaineId, req.user.id, req.user.roles);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="LHSPLA_Brief_${semaineId}.docx"`);
      res.send(buffer);
    } else {
      const buffer = await this.svc.generatePdf(semaineId, req.user.id, req.user.roles, force === 'true');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="LHSPLA_Brief_${semaineId}.pdf"`);
      res.send(buffer);
    }
  }

  // ── LLM Section Generation ────────────────────────────────────────────────

  @Post('generate-sections')
  async generateSections(
    @Query('semaine_id') semaineId: string,
    @Request() req: any,
  ) {
    if (!semaineId) throw new BadRequestException('Paramètre semaine_id requis');
    return this.svc.generateLlmSections(semaineId, req.user.id, req.user.roles, this.llm);
  }

  @Get('draft')
  async getDraft(@Query('semaine_id') semaineId: string) {
    if (!semaineId) throw new BadRequestException('Paramètre semaine_id requis');
    return this.svc.getDraft(semaineId);
  }

  @Patch('draft/:id')
  async updateDraft(
    @Param('id') id: string,
    @Body() body: { sectionB?: string; sectionC?: string; sectionD?: string; validated?: boolean },
  ) {
    return this.svc.updateDraft(id, body);
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  @Get('timeline')
  async timeline(@Query('semaine_id') semaineId: string, @Res() res: Response) {
    if (!semaineId) throw new BadRequestException('Paramètre semaine_id requis (UUID)');
    const buffer = await this.svc.generateTimelinePng(semaineId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="timeline.png"');
    res.send(buffer);
  }

  @Get('history')
  getHistory() {
    return this.svc.getHistory();
  }

  @Get('history/:id/download')
  async downloadHistory(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename, mime } = await this.svc.downloadBriefFile(id);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
