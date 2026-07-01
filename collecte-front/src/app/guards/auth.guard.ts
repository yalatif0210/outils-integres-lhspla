import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;

  // Redirige vers l'app principale pour se connecter, puis revient ici
  window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.href)}`;
  return false;
};
