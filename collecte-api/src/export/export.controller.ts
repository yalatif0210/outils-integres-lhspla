import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('global/docx')
  async globalDocx(@Res() res: Response) {
    const buffer = await this.exportService.exportDocx();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="collecte-global-${Date.now()}.docx"`,
    });
    res.send(buffer);
  }

  @Get('global/xlsx')
  async globalXlsx(@Res() res: Response) {
    const buffer = await this.exportService.exportXlsx();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="collecte-global-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('global/json')
  async globalJson() {
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
