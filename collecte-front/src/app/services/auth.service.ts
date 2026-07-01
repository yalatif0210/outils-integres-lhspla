import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';

export interface CollecteUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  entityCode: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSignal = signal<CollecteUser | null>(this.loadUser());

  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.userSignal());
  readonly entityCode = computed(() => this.userSignal()?.entityCode ?? null);
  readonly isSuperAdmin = computed(() => this.userSignal()?.roles?.includes('super_admin') ?? false);
  readonly isPmo = computed(() => this.userSignal()?.entityCode === 'PMO');

  private loadUser(): CollecteUser | null {
    try {
      const raw = localStorage.getItem(environment.localStorageUserKey);
      if (!raw) return null;
      const u = JSON.parse(raw);
      // Vérifie que le token d'accès existe encore
      const token = localStorage.getItem(environment.localStorageTokenKey);
      if (!token) return null;
      return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, roles: u.roles ?? [], entityCode: u.entityCode ?? null };
    } catch { return null; }
  }

  getDisplayName(): string {
    const u = this.userSignal();
    if (!u) return '';
    if (u.firstName || u.lastName) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return u.email;
  }

  getEntityLabel(): string {
    return this.entityCode() ?? 'Aucune entité';
  }

  logout(): void {
    window.location.href = environment.mainAppUrl || '/';
  }
}
