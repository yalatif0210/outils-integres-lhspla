import { Controller, Get, Post, Patch, Body, Param, UseGuards, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, SectionType } from '@prisma/client';

@Controller('weeks/:weekId/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Get(':entityCode')
  findOne(@Param('weekId') weekId: string, @Param('entityCode') entityCode: string) {
    return this.submissionsService.findByWeekAndEntity(weekId, entityCode);
  }

  @Get(':entityCode/locks')
  getLocks(@Param('weekId') weekId: string, @Param('entityCode') entityCode: string) {
    return this.submissionsService.getLocksStatus(weekId, entityCode);
  }

  @Post(':entityCode/lock/:section')
  acquireLock(
    @Param('weekId') weekId: string,
    @Param('entityCode') entityCode: string,
    @Param('section') section: string,
    @CurrentUser() user: any,
  ) {
    this.assertCanEdit(user, entityCode);
    return this.submissionsService.acquireLock(weekId, entityCode, section as SectionType, user.id);
  }

  @Post(':entityCode/unlock/:section')
  releaseLock(
    @Param('weekId') weekId: string,
    @Param('entityCode') entityCode: string,
    @Param('section') section: string,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.releaseLock(weekId, entityCode, section as SectionType, user.id);
  }

  @Patch(':entityCode/save')
  save(
    @Param('weekId') weekId: string,
    @Param('entityCode') entityCode: string,
    @Body('section') section: string,
    @Body('data') data: any,
    @CurrentUser() user: any,
  ) {
    this.assertCanEdit(user, entityCode);
    return this.submissionsService.saveSection(weekId, entityCode, { section, data }, user.id);
  }

  @Post(':entityCode/submit')
  submit(
    @Param('weekId') weekId: string,
    @Param('entityCode') entityCode: string,
    @CurrentUser() user: any,
  ) {
    this.assertCanEdit(user, entityCode);
    return this.submissionsService.submit(weekId, entityCode, user.id);
  }

  @Post(':entityCode/reopen')
  @HttpCode(HttpStatus.OK)
  reopen(
    @Param('weekId') weekId: string,
    @Param('entityCode') entityCode: string,
    @CurrentUser() user: any,
  ) {
    if (!user.roles?.includes(Role.admin_system)) throw new ForbiddenException('Seul un admin peut réouvrir une saisie');
    return this.submissionsService.reopenSubmission(weekId, entityCode);
  }

  private assertCanEdit(user: any, entityCode: string) {
    if (user.roles?.includes(Role.admin_system)) return;
    if (user.entityCode === entityCode) return;
    if (user.roles?.includes(Role.chief_of_party)) throw new ForbiddenException('Le Chief of Party ne peut pas modifier les saisies');
    throw new ForbiddenException('Vous ne pouvez modifier que les saisies de votre entité');
  }
}
