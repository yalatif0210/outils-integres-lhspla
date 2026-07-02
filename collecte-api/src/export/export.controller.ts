import { Controller, Get, Param, Query, Res, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from './export.service';

function canExportGlobal(user: any): boolean {
  return user?.roles?.includes('super_admin')
    || user?.entityCode === 'PMO'
    || user?.roles?.includes('chief_of_party');
}

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('global/docx')
  async globalDocx(@Request() req: any, @Res() res: Response, @Query('lang') lang: 'fr' | 'en' = 'fr') {
    if (!canExportGlobal(req.user)) {
      throw new ForbiddenException('Export global réservé au Super Admin, PMO et COP.');
    }
    const buffer = await this.exportService.exportDocx(undefined, lang);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="collecte-global-${lang}-${Date.now()}.docx"`,
    });
    res.send(buffer);
  }

  @Get('global/xlsx')
  async globalXlsx(@Request() req: any, @Res() res: Response, @Query('lang') lang: 'fr' | 'en' = 'fr') {
    if (!canExportGlobal(req.user)) {
      throw new ForbiddenException('Export global réservé au Super Admin, PMO et COP.');
    }
    const buffer = await this.exportService.exportXlsx(undefined, lang);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="collecte-global-${lang}-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('global/json')
  async globalJson(@Request() req: any) {
    if (!canExportGlobal(req.user)) {
      throw new ForbiddenException('Export global réservé au Super Admin, PMO et COP.');
    }
    return this.exportService.exportJson();
  }

  @Get('section/:id/docx')
  async sectionDocx(@Param('id') id: string, @Res() res: Response, @Query('lang') lang: 'fr' | 'en' = 'fr') {
    const buffer = await this.exportService.exportDocx(id, lang);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="collecte-${id}-${lang}-${Date.now()}.docx"`,
    });
    res.send(buffer);
  }

  @Get('section/:id/xlsx')
  async sectionXlsx(@Param('id') id: string, @Res() res: Response, @Query('lang') lang: 'fr' | 'en' = 'fr') {
    const buffer = await this.exportService.exportXlsx(id, lang);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="collecte-${id}-${lang}-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }
}
