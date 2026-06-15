import {
  Controller, Get, Query, Res, UseGuards, BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('compilation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompilationController {
  constructor(private prisma: PrismaService) {}

  @Get('export-excel')
  async exportExcel(
    @Query('semaine') semaine: string,
    @Res() res: Response,
  ) {
    if (!semaine) throw new BadRequestException('Paramètre semaine requis (YYYY-MM-DD)');

    const week = await this.prisma.week.findFirst({
      where: { weekStart: new Date(semaine) },
    });
    if (!week) throw new BadRequestException(`Aucune semaine trouvée pour la date ${semaine}`);

    const scriptDir = path.resolve(process.cwd(), 'scripts');
    const scriptPath = path.join(scriptDir, 'generate_bulletin.py');

    if (!fs.existsSync(scriptPath)) {
      throw new BadRequestException(`Script introuvable : ${scriptPath}`);
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulletin-'));

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python', [scriptPath, '--semaine', semaine, '--output-dir', tmpDir], {
        windowsHide: true,
      });

      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`generate_bulletin.py exited ${code}:\n${stderr}`));
      });
    });

    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.xlsx'));
    if (!files.length) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      throw new BadRequestException('Le script n\'a produit aucun fichier .xlsx');
    }

    const filename = files[0];
    const filePath = path.join(tmpDir, filename);
    const buffer = fs.readFileSync(filePath);

    fs.rmSync(tmpDir, { recursive: true, force: true });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
