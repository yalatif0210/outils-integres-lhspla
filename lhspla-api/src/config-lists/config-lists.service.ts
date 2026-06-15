import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateConfigListDto {
  @IsString() type: string;
  @IsString() value: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateConfigListDto {
  @IsOptional() @IsString() value?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

const ALLOWED_ROLES: Role[] = [Role.super_admin, Role.admin_system, Role.admin_finance];

@Injectable()
export class ConfigListsService {
  constructor(private prisma: PrismaService) {}

  async findByType(type: string) {
    return this.prisma.configList.findMany({
      where: { type, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async findAll(type?: string) {
    return this.prisma.configList.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
    });
  }

  async create(dto: CreateConfigListDto, userRoles: Role[]) {
    this.checkPermission(userRoles);
    return this.prisma.configList.create({ data: dto });
  }

  async update(id: string, dto: UpdateConfigListDto, userRoles: Role[]) {
    this.checkPermission(userRoles);
    const item = await this.prisma.configList.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();
    return this.prisma.configList.update({ where: { id }, data: dto });
  }

  async remove(id: string, userRoles: Role[]) {
    this.checkPermission(userRoles);
    const item = await this.prisma.configList.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();
    return this.prisma.configList.delete({ where: { id } });
  }

  async seed(type: string, values: string[], userRoles: Role[]) {
    this.checkPermission(userRoles);
    const existing = await this.prisma.configList.count({ where: { type } });
    if (existing > 0) return { skipped: true };
    await this.prisma.configList.createMany({
      data: values.map((value, i) => ({ type, value, order: i })),
    });
    return { created: values.length };
  }

  private checkPermission(roles: Role[]) {
    if (!roles.some(r => ALLOWED_ROLES.includes(r))) {
      throw new ForbiddenException('Droits insuffisants pour gérer les listes de configuration');
    }
  }
}
