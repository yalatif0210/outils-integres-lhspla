import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsString, IsEnum, IsArray, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsArray()
  @IsEnum(Role, { each: true })
  roles: Role[];

  @IsOptional()
  @IsString()
  entityCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsArray() @IsEnum(Role, { each: true }) roles?: Role[];
  @IsOptional() @IsString() entityCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, roles: true, entityCode: true, phone: true, isActive: true, isEntityResponsible: true, createdAt: true },
      orderBy: [{ lastName: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto, requestorRoles: Role[]) {
    if (dto.roles.includes(Role.super_admin) && !requestorRoles.includes(Role.super_admin)) {
      throw new ForbiddenException('Seul un super admin peut créer un autre super admin');
    }
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Un utilisateur avec cet email existe déjà');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, firstName: dto.firstName, lastName: dto.lastName, roles: dto.roles, entityCode: dto.entityCode ?? null, phone: dto.phone ?? null, passwordHash },
    });
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async update(id: string, dto: UpdateUserDto, requestorRoles: Role[]) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (dto.roles?.includes(Role.super_admin) && !requestorRoles.includes(Role.super_admin)) {
      throw new ForbiddenException('Seul un super admin peut attribuer le rôle super admin');
    }
    if (user.roles.includes(Role.super_admin) && !requestorRoles.includes(Role.super_admin)) {
      throw new ForbiddenException('Seul un super admin peut modifier un autre super admin');
    }
    const data: any = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.roles !== undefined) data.roles = dto.roles;
    if (dto.entityCode !== undefined) data.entityCode = dto.entityCode || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    const updated = await this.prisma.user.update({ where: { id }, data });
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException();
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new ConflictException('Mot de passe actuel incorrect');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Mot de passe mis à jour' };
  }

  async toggleActive(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException();
    const updated = await this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  async setEntityResponsible(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!user.roles.includes(Role.entity_member) || !user.entityCode) {
      throw new ConflictException('Seul un membre d\'entité peut être désigné responsable');
    }
    // Clear previous responsible for this entity, then set the new one
    await this.prisma.user.updateMany({
      where: { entityCode: user.entityCode, isEntityResponsible: true },
      data: { isEntityResponsible: false },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: { isEntityResponsible: true } });
    const { passwordHash, ...safe } = updated;
    return safe;
  }
}
