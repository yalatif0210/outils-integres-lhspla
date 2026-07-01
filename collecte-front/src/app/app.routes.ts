import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

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
    loadComponent: () => import('./pages/contribute/contribute.component').then(m => m.ContributeComponent),
  },
  {
    path: 'contribute',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/contribute/contribute.component').then(m => m.ContributeComponent),
  },
  {
    path: 'consolidation',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/consolidation/consolidation.component').then(m => m.ConsolidationComponent),
  },
  { path: '**', redirectTo: 'reference' },
];
