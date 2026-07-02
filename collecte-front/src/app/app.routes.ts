import { Routes } from '@angular/router';
import { authGuard, superAdminGuard } from './guards/auth.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'reference', pathMatch: 'full' },
  {
    path: 'reference',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/reference/reference.component').then(m => m.ReferenceComponent),
  },
  {
    path: 'contribute/:sectionId',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/contribute/contribute.component').then(m => m.ContributeComponent),
  },
  {
    path: 'contribute',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/contribute/contribute.component').then(m => m.ContributeComponent),
  },
  {
    path: 'consolidation',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/consolidation/consolidation.component').then(m => m.ConsolidationComponent),
  },
  {
    path: 'mes-contributions',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/mes-contributions/mes-contributions.component').then(m => m.MesContributionsComponent),
  },
  {
    path: 'trash',
    canActivate: [superAdminGuard],
    loadComponent: () => import('./pages/trash/trash.component').then(m => m.TrashComponent),
  },
  {
    path: 'aide',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/aide/aide.component').then(m => m.AideComponent),
  },
  { path: '**', redirectTo: 'reference' },
];
