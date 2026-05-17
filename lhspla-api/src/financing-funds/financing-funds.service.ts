import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateFundDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsInt() order?: number;
}
export class UpdateFundDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() order?: number;
}

@Injectable()
export class FinancingFundsService {
  constructor(private prisma: PrismaService) {}

  findAll(activeOnly = true) {
    return this.prisma.financingFund.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateFundDto) {
    return this.prisma.financingFund.create({ data: { name: dto.name, code: dto.code, order: dto.order ?? 0 } });
  }

  async update(id: string, dto: UpdateFundDto) {
    const f = await this.prisma.financingFund.findUnique({ where: { id } });
    if (!f) throw new NotFoundException();
    return this.prisma.financingFund.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const f = await this.prisma.financingFund.findUnique({ where: { id } });
    if (!f) throw new NotFoundException();
    return this.prisma.financingFund.update({ where: { id }, data: { isActive: false } });
  }
}
