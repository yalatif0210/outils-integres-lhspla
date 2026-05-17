import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="login-page">
      <!-- Left panel -->
      <div class="login-side">
        <div class="side-content">
          <div class="triband-vert"></div>
          <div class="side-inner">
            <div class="side-logo">
              <mat-icon class="logo-icon">assignment_turned_in</mat-icon>
            </div>
            <h1 class="side-title">LHSPLA-TA</h1>
            <p class="side-sub">Outil intégré LHSPLA</p>
            <div class="side-divider"></div>
            <p class="side-desc">Plateforme de gestion administrative du projet LHSPLA-TA.</p>
            <div class="side-badges">
              <span class="badge">NPSP-CI</span>
              <span class="badge">FY2026</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right panel -->
      <div class="login-panel">
        <div class="login-container">
          <div class="form-header">
            <h2>Connexion</h2>
            <p>Entrez vos identifiants pour accéder à l'application</p>
          </div>

          <form (ngSubmit)="login()" #f="ngForm" class="login-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Adresse email</mat-label>
              <input matInput type="email" name="email" [(ngModel)]="email"
                     required placeholder="vous@npsp.ci" autocomplete="email">
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput [type]="showPassword() ? 'text' : 'password'"
                     name="password" [(ngModel)]="password"
                     required autocomplete="current-password">
              <button mat-icon-button matSuffix type="button"
                      (click)="showPassword.set(!showPassword())">
                <mat-icon>{{showPassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
            </mat-form-field>

            <div class="error-message" *ngIf="errorMessage()">
              <mat-icon>error_outline</mat-icon>
              {{errorMessage()}}
            </div>

            <button class="login-btn" type="submit"
                    [disabled]="loading() || !email || !password">
              <mat-spinner *ngIf="loading()" diameter="20" class="spinner-white"></mat-spinner>
              <mat-icon *ngIf="!loading()">login</mat-icon>
              <span>{{loading() ? 'Connexion...' : 'Se connecter'}}</span>
            </button>
          </form>

          <p class="login-footer">LHSPLA-TA · NPSP-CI</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
    }

    /* ─── Left decorative panel ─── */
    .login-side {
      width: 42%;
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 50%, #245d8f 100%);
      display: flex; align-items: stretch;
      position: relative;
      overflow: hidden;
    }
    .login-side::after {
      content: '';
      position: absolute;
      top: -40%; right: -60px;
      width: 260px; height: 260px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
    }
    .side-content { display: flex; width: 100%; position: relative; z-index: 1; }
    .triband-vert {
      width: 5px;
      background: linear-gradient(to bottom, #2E75B6 33.33%, white 33.33% 66.66%, #C00000 66.66%);
      flex-shrink: 0;
    }
    .side-inner { padding: 60px 40px; display: flex; flex-direction: column; justify-content: center; flex: 1; }
    .side-logo {
      width: 68px; height: 68px; border-radius: 18px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 24px;
    }
    .logo-icon { font-size: 38px; width: 38px; height: 38px; color: #BDD7EE; }
    .side-title { margin: 0 0 6px; font-size: 34px; font-weight: 800; color: white; letter-spacing: 2px; }
    .side-sub { margin: 0 0 24px; font-size: 14px; color: rgba(255,255,255,0.72); font-weight: 300; letter-spacing: .5px; }
    .side-divider { height: 1px; background: rgba(255,255,255,0.2); width: 60px; margin-bottom: 20px; }
    .side-desc { font-size: 13px; color: rgba(255,255,255,0.65); line-height: 1.6; margin: 0 0 28px; }
    .side-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .badge {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      color: rgba(255,255,255,0.85);
      padding: 4px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 600; letter-spacing: .5px;
    }

    /* ─── Right form panel ─── */
    .login-panel {
      flex: 1;
      background: #EEF2F7;
      display: flex; align-items: center; justify-content: center;
      padding: 40px 24px;
    }
    .login-container { width: 100%; max-width: 400px; }

    .form-header { margin-bottom: 28px; }
    .form-header h2 { margin: 0 0 6px; font-size: 26px; font-weight: 800; color: #1F4E79; }
    .form-header p { margin: 0; font-size: 13.5px; color: #667085; }

    .login-form { display: flex; flex-direction: column; gap: 10px; }
    .full-width { width: 100%; }

    .error-message {
      display: flex; align-items: center; gap: 8px;
      background: #fff5f5; color: #9E0000; padding: 10px 14px;
      border-radius: 8px; font-size: 13px; border: 1px solid #ffcccc;
    }
    .error-message mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    .login-btn {
      width: 100%; height: 50px;
      background: #C00000; color: white;
      border: none; border-radius: 10px;
      font-size: 15px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 6px;
      box-shadow: 0 3px 14px rgba(192,0,0,0.35);
      transition: background .15s, transform .1s, box-shadow .15s;
    }
    .login-btn:hover:not(:disabled) {
      background: #a30000;
      box-shadow: 0 5px 18px rgba(192,0,0,0.45);
      transform: translateY(-1px);
    }
    .login-btn:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }
    .login-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    ::ng-deep .spinner-white circle { stroke: white; }

    .login-footer { text-align: center; color: #999; font-size: 11px; margin-top: 28px; line-height: 1.5; }

    @media (max-width: 700px) {
      .login-side { display: none; }
      .login-panel { background: linear-gradient(150deg, #163d61 0%, #1F4E79 60%, #245d8f 100%); }
      .login-container { background: white; border-radius: 16px; padding: 32px 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.25); }
      .form-header p { color: #888; }
      .login-footer { color: rgba(255,255,255,0.5); position: relative; z-index: 1; }
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  login() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        const user = this.auth.currentUser();
        if (user?.roles?.includes('entity_member') && !user?.roles?.some(r => ['super_admin','admin_system','chief_of_party','admin_tpm','admin_finance','assistant_direction'].includes(r))) {
          this.router.navigate(['/entity', user.entityCode]);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message?.error ?? err.error?.message ?? 'Identifiants incorrects'
        );
      },
      complete: () => this.loading.set(false)
    });
  }
}
