import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(Role.super_admin, Role.admin_system)
  create(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, req.user.roles);
  }

  @Patch(':id')
  @Roles(Role.super_admin, Role.admin_system)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto, req.user.roles);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.super_admin, Role.admin_system)
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  @Patch(':id/set-responsible')
  @Roles(Role.super_admin, Role.admin_system)
  setResponsible(@Param('id') id: string) {
    return this.usersService.setEntityResponsible(id);
  }

  @Patch('me/password')
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Get(':id')
  @Roles(Role.super_admin, Role.admin_system)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
