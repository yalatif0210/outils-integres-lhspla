import { Routes } from '@angular/router';
import { authGuard, adminGuard, adminOrCOPGuard, budgetReviewGuard, tpmReviewGuard, copReviewGuard, personnelAdminGuard, missionDashboardGuard, settingsGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'entity/:code',
    canActivate: [authGuard],
    loadComponent: () => import('./components/entity-form/entity-form.component').then(m => m.EntityFormComponent)
  },
  {
    path: 'compilation',
    canActivate: [authGuard],
    loadComponent: () => import('./components/compilation/compilation.component').then(m => m.CompilationComponent)
  },
  {
    path: 'dashboard/admin',
    canActivate: [authGuard, adminOrCOPGuard],
    loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'dashboard/entity/:code',
    canActivate: [authGuard],
    loadComponent: () => import('./components/entity-dashboard/entity-dashboard.component').then(m => m.EntityDashboardComponent)
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./components/admin-users/admin-users.component').then(m => m.AdminUsersComponent)
  },
  {
    path: 'admin/weeks',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./components/admin-weeks/admin-weeks.component').then(m => m.AdminWeeksComponent)
  },
  {
    path: 'admin/settings',
    canActivate: [authGuard, settingsGuard],
    loadComponent: () => import('./components/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'budgets',
    canActivate: [authGuard],
    loadComponent: () => import('./components/budget/budget-list/budget-list.component').then(m => m.BudgetListComponent)
  },
  {
    path: 'budgets/new',
    canActivate: [authGuard],
    loadComponent: () => import('./components/budget/budget-form/budget-form.component').then(m => m.BudgetFormComponent)
  },
  {
    path: 'budgets/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./components/budget/budget-form/budget-form.component').then(m => m.BudgetFormComponent)
  },
  {
    path: 'budgets/:id/review',
    canActivate: [authGuard, budgetReviewGuard],
    loadComponent: () => import('./components/budget/budget-review/budget-review.component').then(m => m.BudgetReviewComponent)
  },
  {
    path: 'admin/cost-items',
    canActivate: [authGuard, budgetReviewGuard],
    loadComponent: () => import('./components/budget/cost-items/cost-items.component').then(m => m.CostItemsComponent)
  },
  {
    path: 'budget-recalls',
    canActivate: [authGuard],
    loadComponent: () => import('./components/budget/budget-recalls-list/budget-recalls-list.component').then(m => m.BudgetRecallsListComponent)
  },
  {
    path: 'admin/personnel',
    canActivate: [authGuard, personnelAdminGuard],
    loadComponent: () => import('./components/admin-personnel/admin-personnel.component').then(m => m.AdminPersonnelComponent)
  },
  {
    path: 'missions',
    canActivate: [authGuard],
    loadComponent: () => import('./components/missions/mission-list/mission-list.component').then(m => m.MissionListComponent)
  },
  {
    path: 'missions/new',
    canActivate: [authGuard],
    loadComponent: () => import('./components/missions/mission-form/mission-form.component').then(m => m.MissionFormComponent)
  },
  {
    path: 'missions/dashboard',
    canActivate: [authGuard, missionDashboardGuard],
    loadComponent: () => import('./components/missions/mission-dashboard/mission-dashboard.component').then(m => m.MissionDashboardComponent)
  },
  {
    path: 'missions/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./components/missions/mission-form/mission-form.component').then(m => m.MissionFormComponent)
  },
  {
    path: 'dashboard/kpi',
    canActivate: [authGuard],
    loadComponent: () => import('./components/kpi-dashboard/kpi-dashboard.component').then(m => m.KpiDashboardComponent)
  },
  {
    path: 'dashboard/financial',
    canActivate: [authGuard, adminOrCOPGuard],
    loadComponent: () => import('./components/financial-dashboard/financial-dashboard.component').then(m => m.FinancialDashboardComponent)
  },
  { path: '**', redirectTo: 'home' }
];
