import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.href)}`;
  return false;
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) {
    window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.href)}`;
    return false;
  }
  if (!auth.isSuperAdmin()) {
    return inject(Router).parseUrl('/reference');
  }
  return true;
};
