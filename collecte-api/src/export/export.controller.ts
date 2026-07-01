import { Controller, Get, Param, Query, Res, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from './export.service';

function canExportGlobal(user: any): boolean {
  return user?.roles?.includes('super_admin') || user?.entityCode === 'PMO';
}

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('global/docx')
  async globalDocx(@Request() req: any, @Res() res: Response) {
    if (!canExportGlobal(req.user)) {
      throw new ForbiddenException('Export global réservé au Super Admin et au PMO.');
    }
    const buffer = await this.exportService.exportDocx();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="collecte-global-${Date.now()}.docx"`,
    });
    res.send(buffer);
  }

  @Get('global/xlsx')
  async globalXlsx(@Request() req: any, @Res() res: Response) {
    if (!canExportGlobal(req.user)) {
      throw new ForbiddenException('Export global réservé au Super Admin et au PMO.');
    }
    const buffer = await this.exportService.exportXlsx();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="collecte-global-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('global/json')
  async globalJson(@Request() req: any) {
    if (!canExportGlobal(req.user)) {
      throw new ForbiddenException('Export global réservé au Super Admin et au PMO.');
    }
    return this.exportService.exportJson();
  }

  @Get('section/:id/docx')
  async sectionDocx(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.exportService.exportDocx(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="collecte-${id}-${Date.now()}.docx"`,
    });
    res.send(buffer);
  }

  @Get('section/:id/xlsx')
  async sectionXlsx(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.exportService.exportXlsx(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="collecte-${id}-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }
}
