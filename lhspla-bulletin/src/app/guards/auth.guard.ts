import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true; // isAdmin() now includes super_admin
  router.navigate(['/home']);
  return false;
};

export const adminOrCOPGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdminOrCOP()) return true;
  router.navigate(['/home']);
  return false;
};

export const budgetReviewGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canReviewBudget()) return true;
  router.navigate(['/home']);
  return false;
};

export const tpmReviewGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canTPMReview()) return true;
  router.navigate(['/home']);
  return false;
};

export const copReviewGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canCOPReview()) return true;
  router.navigate(['/home']);
  return false;
};

export const personnelAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasAnyRole('super_admin', 'admin_system', 'assistant_direction')) return true;
  router.navigate(['/home']);
  return false;
};

export const missionDashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasAnyRole('super_admin', 'admin_tpm', 'chief_of_party', 'assistant_direction')) return true;
  router.navigate(['/home']);
  return false;
};

export const settingsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasAnyRole('super_admin', 'admin_system', 'admin_finance')) return true;
  router.navigate(['/home']);
  return false;
};

export const stockImportGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isQadMember()) return true;
  router.navigate(['/home']);
  return false;
};
