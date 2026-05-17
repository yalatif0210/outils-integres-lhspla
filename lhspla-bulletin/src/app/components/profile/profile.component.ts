import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule
  ],
  template: `
    <div class="profile-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>account_circle</mat-icon>
          <h1>Mon profil</h1>
        </div>
      </div>

      <div class="profile-grid">
        <!-- Infos -->
        <mat-card class="info-card">
          <mat-card-header>
            <div class="avatar">{{initials()}}</div>
            <div class="user-info">
              <mat-card-title>{{auth.fullName()}}</mat-card-title>
              <mat-card-subtitle>{{auth.roleLabel()}}</mat-card-subtitle>
              <span class="entity-badge" *ngIf="auth.entityCode()">{{auth.entityCode()}}</span>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="info-row"><mat-icon>email</mat-icon> {{auth.currentUser()?.email}}</div>
            <div class="info-row"><mat-icon>verified_user</mat-icon> {{auth.roleLabel()}}</div>
            <div class="info-row" *ngIf="auth.entityCode()">
              <mat-icon>business</mat-icon> Entité : {{auth.entityCode()}}
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Changement mdp -->
        <mat-card class="password-card">
          <mat-card-header>
            <mat-card-title><mat-icon>lock</mat-icon> Changer le mot de passe</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="pwd-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Mot de passe actuel</mat-label>
                <input matInput [type]="showCurrent() ? 'text' : 'password'" [(ngModel)]="currentPassword">
                <button mat-icon-button matSuffix type="button" (click)="showCurrent.set(!showCurrent())">
                  <mat-icon>{{showCurrent() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nouveau mot de passe (min. 8 caractères)</mat-label>
                <input matInput [type]="showNew() ? 'text' : 'password'" [(ngModel)]="newPassword">
                <button mat-icon-button matSuffix type="button" (click)="showNew.set(!showNew())">
                  <mat-icon>{{showNew() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmer le nouveau mot de passe</mat-label>
                <input matInput [type]="showConfirm() ? 'text' : 'password'" [(ngModel)]="confirmPassword">
                <button mat-icon-button matSuffix type="button" (click)="showConfirm.set(!showConfirm())">
                  <mat-icon>{{showConfirm() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
              </mat-form-field>

              <div class="error-msg" *ngIf="error()">
                <mat-icon>error</mat-icon> {{error()}}
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="changePassword()"
                    [disabled]="!canSave()">
              <mat-icon>save</mat-icon> Mettre à jour le mot de passe
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .profile-container { max-width: 900px; margin: 0 auto; padding: 24px 16px 40px; }

    /* ─── Page header ─── */
    .page-header {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
      color: white; border-radius: 14px; padding: 0;
      margin-bottom: 24px; overflow: hidden;
      box-shadow: 0 6px 24px rgba(31,78,121,0.22);
    }
    .page-header-triband { height: 4px; background: linear-gradient(to right, #2E75B6 33.33%, white 33.33% 66.66%, #C00000 66.66%); }
    .page-header-inner { display: flex; align-items: center; gap: 12px; padding: 22px 28px; }
    .page-header-inner mat-icon { font-size: 28px; width: 28px; height: 28px; color: #BDD7EE; }
    .page-header-inner h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: .2px; }

    .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    /* ─── Cards ─── */
    .info-card, .password-card {
      border-radius: 14px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }

    /* ─── Avatar ─── */
    .avatar {
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #2E75B6, #1F4E79);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 800; margin-right: 16px; flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(31,78,121,0.3);
    }
    .user-info mat-card-title { font-size: 17px; font-weight: 700; color: #1F4E79; }
    .entity-badge {
      background: #1F4E79; color: white;
      padding: 3px 11px; border-radius: 20px;
      font-size: 11.5px; font-weight: 800;
      display: inline-block; margin-top: 6px;
    }

    .info-row {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 0; border-bottom: 1px solid #F0F4F8;
      font-size: 14px; color: #334;
    }
    .info-row:last-child { border-bottom: none; }
    .info-row mat-icon { color: #2E75B6; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }

    .password-card mat-card-title { color: #1F4E79; font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .password-card mat-card-title mat-icon { color: #C00000; font-size: 20px; width: 20px; height: 20px; }

    .pwd-form { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
    .full-width { width: 100%; }
    .error-msg {
      display: flex; align-items: center; gap: 8px;
      color: #9E0000; font-size: 13px;
      background: #FFF0F0; padding: 10px 14px;
      border-radius: 8px; border: 1px solid #FFCCCC;
    }
    .error-msg mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    button[mat-raised-button][color="primary"] { color: white !important; }

    @media (max-width: 700px) { .profile-grid { grid-template-columns: 1fr; } }
  `]
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  error = signal('');

  initials(): string {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  canSave(): boolean {
    return !!(this.currentPassword && this.newPassword.length >= 8 && this.newPassword === this.confirmPassword);
  }

  changePassword() {
    this.error.set('');
    if (this.newPassword !== this.confirmPassword) { this.error.set('Les mots de passe ne correspondent pas'); return; }
    this.api.changeMyPassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.snack.open('Mot de passe mis à jour avec succès', 'OK', { duration: 3000 });
        this.currentPassword = ''; this.newPassword = ''; this.confirmPassword = '';
      },
      error: e => this.error.set(e.error?.message?.error ?? 'Erreur lors du changement de mot de passe')
    });
  }
}
