import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import * as XLSX from 'xlsx';

export class CreateRiskThemeDto {
  @IsString() name: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateRiskThemeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() order?: number;
}

@Injectable()
export class RiskThemesService {
  constructor(private prisma: PrismaService) {}

  findAll(activeOnly = true) {
    return this.prisma.riskTheme.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateRiskThemeDto) {
    return this.prisma.riskTheme.create({
      data: { name: dto.name, order: dto.order ?? 0 },
    });
  }

  async update(id: string, dto: UpdateRiskThemeDto) {
    const theme = await this.prisma.riskTheme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('Thème non trouvé');
    return this.prisma.riskTheme.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const theme = await this.prisma.riskTheme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('Thème non trouvé');
    return this.prisma.riskTheme.update({ where: { id }, data: { isActive: false } });
  }

  async importFromExcel(buffer: Buffer): Promise<{
    themes: { created: number; existing: number };
    categories: { created: number; existing: number };
  }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const norm = (s: string) =>
      String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-]+/g, '_').trim();

    const result = {
      themes: { created: 0, existing: 0 },
      categories: { created: 0, existing: 0 },
    };

    // theme name → id cache (avoids redundant DB lookups per row)
    const themeCache = new Map<string, string | null>();

    for (const raw of rows) {
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        row[norm(k)] = String(v ?? '').trim();
      }

      const themeName = row['theme'] || row['themes'] || '';
      const catName = row['categorie'] || row['catégorie'] || row['category'] || '';

      if (!themeName && !catName) continue;

      // Upsert theme (count unique)
      let themeId: string | null = null;
      if (themeName) {
        if (themeCache.has(themeName)) {
          themeId = themeCache.get(themeName)!;
        } else {
          const existing = await this.prisma.riskTheme.findUnique({ where: { name: themeName } });
          if (existing) {
            themeId = existing.id;
            result.themes.existing++;
          } else {
            const created = await this.prisma.riskTheme.create({ data: { name: themeName } });
            themeId = created.id;
            result.themes.created++;
          }
          themeCache.set(themeName, themeId);
        }
      }

      // Upsert category
      if (catName) {
        try {
          const existing = await this.prisma.riskCategory.findUnique({ where: { name: catName } });
          if (existing) {
            await this.prisma.riskCategory.update({ where: { name: catName }, data: { themeId } });
            result.categories.existing++;
          } else {
            await this.prisma.riskCategory.create({ data: { name: catName, themeId } });
            result.categories.created++;
          }
        } catch { /* skip malformed category */ }
      }
    }

    return result;
  }
}
