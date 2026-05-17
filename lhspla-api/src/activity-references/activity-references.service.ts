import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import * as XLSX from 'xlsx';

export class CreateActivityReferenceDto {
  @IsString() entityCode: string;
  @IsOptional() @IsString() os?: string;
  @IsOptional() @IsString() oo?: string;
  @IsOptional() @IsString() activityCode?: string;
  @IsOptional() @IsString() taskId?: string;
  @IsString() title: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateActivityReferenceDto {
  @IsOptional() @IsString() os?: string;
  @IsOptional() @IsString() oo?: string;
  @IsOptional() @IsString() activityCode?: string;
  @IsOptional() @IsString() taskId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() order?: number;
}

@Injectable()
export class ActivityReferencesService {
  constructor(private prisma: PrismaService) {}

  findByEntity(entityCode: string) {
    return this.prisma.activityReference.findMany({
      where: { entityCode, isActive: true },
      orderBy: [{ order: 'asc' }, { taskId: 'asc' }, { title: 'asc' }],
    });
  }

  findAll() {
    return this.prisma.activityReference.findMany({
      orderBy: [{ entityCode: 'asc' }, { order: 'asc' }, { taskId: 'asc' }],
    });
  }

  create(dto: CreateActivityReferenceDto) {
    return this.prisma.activityReference.create({
      data: {
        entityCode: dto.entityCode,
        os: dto.os ?? '',
        oo: dto.oo ?? '',
        activityCode: dto.activityCode ?? '',
        taskId: dto.taskId ?? '',
        title: dto.title,
        order: dto.order ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateActivityReferenceDto) {
    const ref = await this.prisma.activityReference.findUnique({ where: { id } });
    if (!ref) throw new NotFoundException('Référence non trouvée');
    return this.prisma.activityReference.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const ref = await this.prisma.activityReference.findUnique({ where: { id } });
    if (!ref) throw new NotFoundException('Référence non trouvée');
    return this.prisma.activityReference.update({ where: { id }, data: { isActive: false } });
  }

  async importFromExcel(buffer: Buffer): Promise<{ created: number; skipped: number }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const norm = (s: string) =>
      String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-]+/g, '_').trim();

    let created = 0;
    let skipped = 0;

    for (const raw of rows) {
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        row[norm(k)] = String(v ?? '').trim();
      }

      const entityCode = row['entite'] || row['entity'] || row['code_entite'] || row['entité'] || '';
      const os = row['os'] || '';
      const oo = row['oo'] || '';
      const activityCode = row['code_activite'] || row['code_activité'] || row['code'] || '';
      const taskId = row['id_tache'] || row['id_tâche'] || row['id_task'] || row['tache'] || '';
      const title = row['titre_activite'] || row['titre_activité'] || row['titre'] || row['title'] || row['activite'] || row['activité'] || '';

      if (!entityCode || !title) { skipped++; continue; }

      try {
        await this.prisma.activityReference.create({
          data: { entityCode, os, oo, activityCode, taskId, title, order: 0 },
        });
        created++;
      } catch {
        skipped++;
      }
    }

    return { created, skipped };
  }
}
