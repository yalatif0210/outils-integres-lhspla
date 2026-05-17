import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateCostItemDto {
  @IsString() nature: string;
  @IsString() designation: string;
  @IsNumber() unitCost: number;
  @IsOptional() @IsString() justificatif?: string;
  @IsOptional() @IsNumber() order?: number;
}

export class UpdateCostItemDto {
  @IsOptional() @IsString() nature?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsNumber() unitCost?: number;
  @IsOptional() @IsString() justificatif?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() order?: number;
}

@Injectable()
export class CostItemsService {
  constructor(private prisma: PrismaService) {}

  findAll(activeOnly = true) {
    return this.prisma.costItem.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ nature: 'asc' }, { order: 'asc' }, { designation: 'asc' }],
    });
  }

  findNatures() {
    return this.prisma.costItem.groupBy({
      by: ['nature'],
      where: { isActive: true },
      orderBy: { nature: 'asc' },
    });
  }

  async create(dto: CreateCostItemDto) {
    const maxOrder = await this.prisma.costItem.count({ where: { nature: dto.nature } });
    return this.prisma.costItem.create({
      data: {
        nature: dto.nature,
        designation: dto.designation,
        unitCost: dto.unitCost,
        justificatif: dto.justificatif ?? '',
        order: dto.order ?? maxOrder,
      },
    });
  }

  async update(id: string, dto: UpdateCostItemDto) {
    const item = await this.prisma.costItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();
    return this.prisma.costItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const item = await this.prisma.costItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();
    return this.prisma.costItem.update({ where: { id }, data: { isActive: false } });
  }
}
