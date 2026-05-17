import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<'super_admin' | 'admin_system' | 'admin_finance' | 'admin_tpm' | 'chief_of_party' | 'entity_member' | 'assistant_direction' | 'chargee_tresorerie'>;
  entityCode: string | null;
  isActive: boolean;
}

const ACCESS_KEY = 'lhspla_access_token';
const REFRESH_KEY = 'lhspla_refresh_token';
const USER_KEY = 'lhspla_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private userSignal = signal<AuthUser | null>(this.loadUser());
  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.userSignal());
  readonly isSuperAdmin = computed(() => this.hasRole('super_admin'));
  readonly isAdmin = computed(() => this.hasAnyRole('super_admin', 'admin_system'));
  readonly isAdminFinance = computed(() => this.hasRole('admin_finance'));
  readonly isAdminTPM = computed(() => this.hasRole('admin_tpm'));
  readonly isCOP = computed(() => this.hasRole('chief_of_party'));
  readonly isEntityMember = computed(() => this.hasRole('entity_member'));
  readonly isAssistantDirection = computed(() => this.hasRole('assistant_direction'));
  readonly isChargeeTresorerie = computed(() => this.hasRole('chargee_tresorerie'));
  readonly canManagePayments = computed(() => this.hasAnyRole('admin_finance', 'chargee_tresorerie', 'super_admin'));
  readonly isAdminOrCOP = computed(() => this.isAdmin() || this.isCOP());
  readonly canTPMReview = computed(() => this.hasAnyRole('super_admin', 'admin_tpm'));
  readonly canCOPReview = computed(() => this.hasAnyRole('super_admin', 'chief_of_party'));
  readonly canReviewBudget = computed(() => this.canTPMReview() || this.canCOPReview() || this.isAdminFinance());
  readonly entityCode = computed(() => this.userSignal()?.entityCode ?? null);

  hasRole(role: string): boolean {
    return this.userSignal()?.roles?.includes(role as any) ?? false;
  }

  hasAnyRole(...roles: string[]): boolean {
    const userRoles = this.userSignal()?.roles ?? [];
    return roles.some(r => userRoles.includes(r as any));
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  login(email: string, password: string) {
    return this.http.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      `${environment.apiUrl}/auth/login`,
      { email, password }
    ).pipe(
      tap(res => {
        localStorage.setItem(ACCESS_KEY, res.accessToken);
        localStorage.setItem(REFRESH_KEY, res.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.userSignal.set(res.user);
      })
    );
  }

  refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));
    return this.http.post<{ accessToken: string }>(
      `${environment.apiUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(res => localStorage.setItem(ACCESS_KEY, res.accessToken)),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  updateLocalUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSignal.set(user);
  }

  fullName(): string {
    const u = this.userSignal();
    if (!u) return '';
    return `${u.firstName} ${u.lastName}`;
  }

  roleLabel(): string {
    const map: Record<string, string> = {
      super_admin: 'Super Admin',
      admin_system: 'Admin Système',
      admin_finance: 'Admin Finance',
      admin_tpm: 'Admin TPM',
      chief_of_party: 'Chief of Party',
      entity_member: 'Membre Entité',
      assistant_direction: 'Assistant(e) Direction',
      chargee_tresorerie: 'Chargée de Trésorerie',
    };
    const roles = this.userSignal()?.roles ?? [];
    return roles.map(r => map[r] ?? r).join(', ');
  }
}
