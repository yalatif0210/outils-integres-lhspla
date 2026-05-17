import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  // Vue admin — super_admin, admin_system, COP, admin_tpm, admin_finance
  @Get('admin')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_tpm, Role.admin_finance)
  getAdminDashboard(
    @Query('year') year?: string,
    @Query('weekStatus') weekStatus?: string,
    @Query('weekId') weekId?: string,
  ) {
    return this.dashboardService.getAdminOverview(year, weekStatus, weekId);
  }

  @Get('admin/heatmap')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_tpm, Role.admin_finance)
  getHeatmap(
    @Query('limit') limit?: string,
    @Query('year') year?: string,
    @Query('weekStatus') weekStatus?: string,
    @Query('entityCode') entityCode?: string,
    @Query('weekId') weekId?: string,
  ) {
    return this.dashboardService.getCompletionHeatmap(limit ? parseInt(limit) : 12, year, weekStatus, entityCode, weekId);
  }

  @Get('admin/submission-trend')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_tpm, Role.admin_finance)
  getSubmissionTrend(
    @Query('limit') limit?: string,
    @Query('year') year?: string,
    @Query('weekStatus') weekStatus?: string,
    @Query('entityCode') entityCode?: string,
    @Query('weekId') weekId?: string,
  ) {
    return this.dashboardService.getSubmissionRateTrend(limit ? parseInt(limit) : 12, year, weekStatus, entityCode, weekId);
  }

  @Get('admin/risk-trend')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_tpm, Role.admin_finance)
  getRiskTrend(
    @Query('limit') limit?: string,
    @Query('year') year?: string,
    @Query('weekStatus') weekStatus?: string,
    @Query('entityCode') entityCode?: string,
    @Query('weekId') weekId?: string,
  ) {
    return this.dashboardService.getRiskTrend(limit ? parseInt(limit) : 12, year, weekStatus, entityCode, weekId);
  }

  @Get('admin/critical-risks')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_tpm, Role.admin_finance)
  getCriticalRisks() {
    return this.dashboardService.getCriticalRisksAlert();
  }

  @Get('admin/entity-comparison')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_tpm, Role.admin_finance)
  getEntityComparison(
    @Query('year') year?: string,
    @Query('weekStatus') weekStatus?: string,
    @Query('entityCode') entityCode?: string,
    @Query('weekId') weekId?: string,
  ) {
    return this.dashboardService.getEntityComparison(year, weekStatus, entityCode, weekId);
  }

  @Get('week-periods')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_tpm, Role.admin_finance)
  getWeekPeriods() {
    return this.dashboardService.getWeekPeriods();
  }

  // Vue entité — accessible par les membres et le staff
  @Get('entity/:code')
  getEntityDashboard(
    @Param('code') code: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    if (
      user.roles.includes(Role.entity_member) &&
      !user.roles.some((r: string) => ['super_admin','admin_system','chief_of_party','admin_tpm','admin_finance','assistant_direction'].includes(r)) &&
      user.entityCode !== code
    ) {
      return { error: 'Accès refusé' };
    }
    return this.dashboardService.getEntityDashboard(code, limit ? parseInt(limit) : 12);
  }

  @Get('entity/:code/history')
  getEntityHistory(@Param('code') code: string, @CurrentUser() user: any) {
    if (
      user.roles.includes(Role.entity_member) &&
      !user.roles.some((r: string) => ['super_admin','admin_system','chief_of_party','admin_tpm','admin_finance','assistant_direction'].includes(r)) &&
      user.entityCode !== code
    ) {
      return { error: 'Accès refusé' };
    }
    return this.dashboardService.getEntityHistory(code);
  }

  @Get('my-entity')
  getMyEntityDashboard(@CurrentUser() user: any) {
    if (!user.entityCode) return { error: 'Aucune entité associée' };
    return this.dashboardService.getEntityDashboard(user.entityCode);
  }

  @Get('budget-kpis')
  getBudgetKpis(
    @Request() req: any,
    @Query('entityCode') entityCode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    return this.dashboardService.getBudgetKpis(req.user.roles, req.user.entityCode, entityCode, from, to, fiscalYear);
  }

  @Get('financial')
  @Roles(Role.super_admin, Role.admin_system, Role.chief_of_party, Role.admin_finance)
  getFinancialDashboard(
    @Query('entityCode') entityCode?: string,
    @Query('budgetType') budgetType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getFinancialDashboard(entityCode, budgetType, from, to);
  }

  @Get('available-years')
  getAvailableYears() {
    return this.dashboardService.getAvailableYears();
  }

  @Get('mission-stats')
  getMissionStats(
    @Request() req: any,
    @Query('entityCode') entityCode?: string,
    @Query('personnelId') personnelId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    return this.dashboardService.getMissionStats(req.user.roles, req.user.id, req.user.entityCode, entityCode, personnelId, from, to, fiscalYear);
  }
}
