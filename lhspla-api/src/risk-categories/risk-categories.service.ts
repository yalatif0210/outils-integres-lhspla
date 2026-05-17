import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateRiskCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() themeId?: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateRiskCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() themeId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() order?: number;
}

@Injectable()
export class RiskCategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(activeOnly = true, themeId?: string) {
    const where: any = activeOnly ? { isActive: true } : {};
    if (themeId) where.themeId = themeId;
    return this.prisma.riskCategory.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateRiskCategoryDto) {
    return this.prisma.riskCategory.create({
      data: { name: dto.name, order: dto.order ?? 0, themeId: dto.themeId ?? null },
    });
  }

  async update(id: string, dto: UpdateRiskCategoryDto) {
    const cat = await this.prisma.riskCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Catégorie non trouvée');
    return this.prisma.riskCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const cat = await this.prisma.riskCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Catégorie non trouvée');
    return this.prisma.riskCategory.update({ where: { id }, data: { isActive: false } });
  }
}
