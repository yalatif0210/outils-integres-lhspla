import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AppConfigService } from '../../services/app-config.service';
import { ENTITIES } from '../../models/bulletin.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatTooltipModule, MatProgressBarModule, MatSnackBarModule
  ],
  template: `
    <div class="home-container">
      <!-- Banner -->
      <div class="banner">
        <div class="banner-content">
          <mat-icon class="banner-icon">assignment_turned_in</mat-icon>
          <div class="banner-text">
            <h1>Outil Intégré LHSPLA</h1>
            <p>{{cfg.get('banner_subtitle', 'NPSP-CI · Projet financé par USAID · FY2026')}}</p>
          </div>
          <div class="banner-user">
            <div class="user-avatar">{{initials()}}</div>
            <div>
              <span class="user-name-banner">{{auth.fullName()}}</span>
              <span class="user-role-banner">{{auth.roleLabel()}}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="content-grid">

        <!-- Semaines actives -->
        <div class="weeks-section">
          <div class="section-title">
            <mat-icon>calendar_today</mat-icon>
            <h2>Semaines actives <span class="count">{{activeWeeks().length}}</span></h2>
            <a mat-stroked-button routerLink="/admin/weeks" *ngIf="auth.isAdmin()" class="manage-btn">
              <mat-icon>settings</mat-icon> Gérer
            </a>
          </div>

          <div *ngIf="activeWeeks().length === 0" class="empty-state">
            <mat-icon>inbox</mat-icon>
            <p *ngIf="auth.isAdmin()">Aucune semaine active. <a routerLink="/admin/weeks">Créez-en une.</a></p>
            <p *ngIf="!auth.isAdmin()">Aucune semaine active pour le moment.</p>
          </div>

          <mat-card *ngFor="let w of activeWeeks()" class="week-card">
            <div class="week-card-stripe"></div>
            <mat-card-header>
              <mat-icon mat-card-avatar class="week-icon">event</mat-icon>
              <mat-card-title>{{w.weekReference}}</mat-card-title>
              <mat-card-subtitle>
                {{w.weekStart | date:'dd/MM/yyyy'}} → {{w.weekEnd | date:'dd/MM/yyyy'}}
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="stats-row">
                <div class="stat-box green">
                  <span class="stat-num">{{getSubmitted(w)}}</span>
                  <span class="stat-label">Soumis</span>
                </div>
                <div class="stat-box orange">
                  <span class="stat-num">{{getDraft(w)}}</span>
                  <span class="stat-label">En cours</span>
                </div>
                <div class="stat-box gray">
                  <span class="stat-num">{{8 - getSubmitted(w) - getDraft(w)}}</span>
                  <span class="stat-label">En attente</span>
                </div>
              </div>
              <mat-progress-bar mode="determinate"
                [value]="(getSubmitted(w) / 8) * 100" class="progress-bar">
              </mat-progress-bar>
              <p class="progress-label">{{getSubmitted(w)}}/8 entités soumises</p>
            </mat-card-content>
            <mat-card-actions>
              <a mat-raised-button color="primary"
                 [routerLink]="['/compilation']" [queryParams]="{week: w.id}" style="margin-right: 10px; color: white !important;">
                <mat-icon>summarize</mat-icon> Compilation
              </a>
              <a mat-raised-button color="accent" routerLink="/dashboard/admin"
                 *ngIf="auth.isAdminOrCOP()" style="color: white !important;">
                <mat-icon>analytics</mat-icon> Dashboard
              </a>
            </mat-card-actions>
          </mat-card>
        </div>

        <!-- Carte Finance — admin_finance uniquement -->
        <mat-card class="create-card finance-card" *ngIf="auth.isAdminFinance()">
          <mat-card-header>
            <mat-icon mat-card-avatar class="finance-icon">account_balance</mat-icon>
            <mat-card-title>Espace Finance</mat-card-title>
            <mat-card-subtitle>Révision et suivi des budgets</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="finance-links">
              <a routerLink="/budgets" class="finance-link">
                <mat-icon>account_balance_wallet</mat-icon>
                <div>
                  <span class="fl-title">Budgets à réviser</span>
                  <span class="fl-sub">Approuver ou rejeter les demandes soumises</span>
                </div>
                <mat-icon class="fl-arrow">chevron_right</mat-icon>
              </a>
              <a routerLink="/budget-recalls" class="finance-link">
                <mat-icon>attach_file</mat-icon>
                <div>
                  <span class="fl-title">Rappels & Justificatifs</span>
                  <span class="fl-sub">Clôturer les rappels sur budgets approuvés</span>
                </div>
                <mat-icon class="fl-arrow">chevron_right</mat-icon>
              </a>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Création semaine (admin uniquement) -->
        <mat-card class="create-card" *ngIf="auth.isAdmin()">
          <mat-card-header>
            <mat-icon mat-card-avatar class="create-icon">add_circle</mat-icon>
            <mat-card-title>Nouvelle semaine</mat-card-title>
            <mat-card-subtitle>Créer et ouvrir une semaine de saisie</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="weekForm" class="week-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Date de début</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="weekStart"
                       (dateChange)="autoFillRef()">
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Date de fin</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="weekEnd"
                       (dateChange)="autoFillRef()">
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Libellé</mat-label>
                <input matInput formControlName="weekReference" placeholder="Du JJ/MM au JJ/MM/YYYY">
              </mat-form-field>
            </form>
          </mat-card-content>
          <mat-card-actions>
            <button class="create-btn" (click)="createWeek()"
                    [disabled]="weekForm.invalid || creating()">
              <mat-icon>add</mat-icon> Créer la semaine
            </button>
          </mat-card-actions>
        </mat-card>

      </div>

      <!-- Grille entités — une grille par semaine active -->
      <ng-container *ngFor="let w of activeWeeks()">
        <div class="section-title">
          <mat-icon>groups</mat-icon>
          <h2>Entités</h2>
          <span class="section-sub">{{w.weekReference}}</span>
        </div>
        <div class="entities-grid">
          <mat-card *ngFor="let entity of entities" class="entity-card"
                    [class.submitted]="getEntityStatusForWeek(w, entity.code) === 'submitted'"
                    [class.draft]="getEntityStatusForWeek(w, entity.code) === 'draft'">
            <mat-card-content>
              <div class="entity-header">
                <span class="entity-badge">{{entity.code}}</span>
                <mat-icon class="status-icon check" *ngIf="getEntityStatusForWeek(w, entity.code) === 'submitted'">check_circle</mat-icon>
                <mat-icon class="status-icon edit" *ngIf="getEntityStatusForWeek(w, entity.code) === 'draft'">edit</mat-icon>
                <mat-icon class="status-icon empty" *ngIf="getEntityStatusForWeek(w, entity.code) === 'missing'">radio_button_unchecked</mat-icon>
              </div>
              <p class="entity-full-name">{{entity.fullName}}</p>
              <span class="sub-status" [class]="getEntityStatusForWeek(w, entity.code)">
                {{getStatusLabelForWeek(w, entity.code)}}
              </span>
            </mat-card-content>
            <mat-card-actions *ngIf="canAccessEntity(entity.code) || auth.isAdminOrCOP()">
              <a mat-raised-button [routerLink]="['/entity', entity.code]"
                 [queryParams]="{week: w.id}"
                 [color]="getEntityStatusForWeek(w, entity.code) === 'submitted' ? 'accent' : 'primary'"
                 *ngIf="canAccessEntity(entity.code)">
                <mat-icon>{{getEntityStatusForWeek(w, entity.code) === 'submitted' ? 'visibility' : 'edit'}}</mat-icon>
                {{getEntityStatusForWeek(w, entity.code) === 'submitted' ? 'Consulter' : 'Remplir'}}
              </a>
              <a mat-button [routerLink]="['/dashboard/entity', entity.code]"
                 *ngIf="auth.isAdminOrCOP()" matTooltip="Tableau de bord entité">
                <mat-icon>bar_chart</mat-icon>
              </a>
            </mat-card-actions>
          </mat-card>
        </div>
      </ng-container>

      <!-- Semaines clôturées -->
      <div class="section-title" *ngIf="closedWeeks().length > 0">
        <mat-icon>history</mat-icon>
        <h2>Semaines clôturées</h2>
      </div>
      <div class="closed-weeks" *ngIf="closedWeeks().length > 0">
        <mat-card *ngFor="let w of closedWeeks()" class="closed-card">
          <mat-card-content>
            <div class="closed-row">
              <mat-icon class="lock-icon">lock</mat-icon>
              <div class="closed-info">
                <span class="closed-ref">{{w.weekReference}}</span>
                <span class="closed-date">Clôturée le {{w.closedAt | date:'dd/MM/yyyy'}}</span>
              </div>
              <span class="closed-stat">{{getSubmitted(w)}}/8 soumis</span>
              <div class="closed-actions">
                <a mat-icon-button [routerLink]="['/compilation']" [queryParams]="{week: w.id}"
                   matTooltip="Voir la compilation">
                  <mat-icon>summarize</mat-icon>
                </a>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .home-container { max-width: 1200px; margin: 0 auto; padding: 24px 16px 40px; }

    /* ─── Banner ─── */
    .banner {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 50%, #245d8f 100%);
      color: white; border-radius: 16px; padding: 0;
      margin-bottom: 28px;
      box-shadow: 0 6px 28px rgba(31,78,121,0.28);
      overflow: hidden;
    }
    .triband { height: 4px; background: linear-gradient(to right, #2E75B6 33.33%, white 33.33% 66.66%, #C00000 66.66%); }
    .banner-content { display: flex; align-items: center; gap: 20px; padding: 28px 40px 32px; }
    .banner-icon { font-size: 54px; width: 54px; height: 54px; color: #BDD7EE; flex-shrink: 0; }
    .banner-text { flex: 1; }
    .banner-text h1 { margin: 0 0 4px; font-size: 24px; font-weight: 800; letter-spacing: .3px; }
    .banner-text p { margin: 0; opacity: 0.78; font-size: 13.5px; }
    .banner-user { display: flex; align-items: center; gap: 12px; }
    .user-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      background: rgba(255,255,255,0.18);
      border: 2px solid rgba(255,255,255,0.4);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; flex-shrink: 0;
    }
    .user-name-banner { display: block; font-weight: 700; font-size: 14px; }
    .user-role-banner { display: block; font-size: 11px; opacity: 0.7; }

    /* ─── Layout ─── */
    .content-grid { display: grid; grid-template-columns: 1fr 360px; gap: 20px; margin-bottom: 28px; align-items: start; }

    /* ─── Section titles ─── */
    .section-title { display: flex; align-items: center; gap: 8px; margin: 28px 0 14px; color: #1F4E79; }
    .section-title mat-icon { color: #2E75B6; font-size: 22px; width: 22px; height: 22px; }
    .section-title h2 { margin: 0; font-size: 17px; font-weight: 700; }
    .section-sub { font-size: 13px; color: #888; margin-left: 4px; }
    .count { background: #DEEAF1; color: #1F4E79; padding: 1px 9px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .manage-btn { margin-left: auto; font-size: 12px; color: #1F4E79 !important; border-color: #DEEAF1 !important; }

    /* ─── Empty state ─── */
    .empty-state {
      text-align: center; padding: 48px 24px;
      background: white; border-radius: 14px;
      border: 1px solid #E8EDF5;
      box-shadow: 0 2px 12px rgba(31,78,121,0.07);
      color: #aaa;
    }
    .empty-state mat-icon { font-size: 52px; width: 52px; height: 52px; display: block; margin: 0 auto 12px; color: #BDD7EE; }
    .empty-state p { margin: 0; font-size: 14px; }
    .empty-state a { color: #1F4E79; font-weight: 600; }

    /* ─── Week cards ─── */
    .week-card {
      border-radius: 14px; margin-bottom: 14px;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
      border: 1px solid #E8EDF5 !important;
      overflow: hidden;
    }
    .week-card-stripe { height: 4px; background: linear-gradient(to right, #1F4E79, #2E75B6); }
    .week-card mat-card-header { padding-top: 16px; }

    .week-icon {
      background: #DEEAF1; color: #1F4E79;
      border-radius: 10px; padding: 4px;
      font-size: 24px; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
    }

    .stats-row { display: flex; gap: 10px; margin: 14px 0 12px; }
    .stat-box { text-align: center; flex: 1; border-radius: 10px; padding: 12px 8px; }
    .stat-box.green { background: #F0FFF4; border: 1px solid #C6EFCE; }
    .stat-box.orange { background: #FFF8F0; border: 1px solid #FDDCB5; }
    .stat-box.gray { background: #F8F9FB; border: 1px solid #E8EDF5; }
    .stat-num { display: block; font-size: 30px; font-weight: 800; color: #1F4E79; line-height: 1.1; }
    .stat-box.orange .stat-num { color: #C55A11; }
    .stat-box.green .stat-num { color: #276221; }
    .stat-label { font-size: 10.5px; color: #667085; font-weight: 500; margin-top: 2px; display: block; }
    .progress-label { font-size: 12px; color: #888; text-align: center; margin: 6px 0 0; }

    /* ─── Finance card ─── */
    .finance-card { border-top: 4px solid #1F8A3C !important; }
    .finance-icon { background: #E8F5E9; color: #1F8A3C; border-radius: 10px; padding: 4px; font-size: 24px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
    .finance-links { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .finance-link {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      background: #F8FBF8; border: 1px solid #C6EFCE;
      text-decoration: none; color: #1F4E79;
      transition: background .15s, border-color .15s;
    }
    .finance-link:hover { background: #EAF5EA; border-color: #1F8A3C; }
    .finance-link > mat-icon:first-child { color: #1F8A3C; flex-shrink: 0; }
    .finance-link > div { flex: 1; display: flex; flex-direction: column; }
    .fl-title { font-size: 13px; font-weight: 700; }
    .fl-sub { font-size: 11px; color: #667085; margin-top: 2px; }
    .fl-arrow { color: #999; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    /* ─── Create card ─── */
    .create-card {
      border-radius: 14px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.08) !important;
    }
    .create-icon { background: #E8F5E9; color: #276221; border-radius: 10px; padding: 4px; font-size: 24px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
    .week-form { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    .full-width { width: 100%; }
    .create-btn {
      background: #1F4E79; color: white;
      border: none; border-radius: 8px;
      height: 42px; padding: 0 20px; font-weight: 700;
      font-size: 13px; cursor: pointer;
      display: flex; align-items: center; gap: 6px;
      transition: background .15s;
    }
    .create-btn:hover:not(:disabled) { background: #163d61; }
    .create-btn:disabled { background: #ccc; cursor: not-allowed; }

    /* ─── Entities grid ─── */
    .entities-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
    .entity-card {
      border-radius: 14px !important;
      border: 1px solid #E8EDF5 !important;
      border-top: 4px solid #BDD7EE !important;
      transition: transform .15s, box-shadow .15s;
      box-shadow: 0 2px 10px rgba(31,78,121,0.07) !important;
      cursor: default;
    }
    .entity-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(31,78,121,0.14) !important; }
    .entity-card.submitted { border-top-color: #276221 !important; }
    .entity-card.draft { border-top-color: #C55A11 !important; }

    .entity-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .entity-badge { font-size: 17px; font-weight: 800; color: #1F4E79; letter-spacing: .5px; }
    .status-icon { font-size: 20px; width: 20px; height: 20px; }
    .status-icon.check { color: #276221; }
    .status-icon.edit { color: #C55A11; }
    .status-icon.empty { color: #D0D7E2; }
    .entity-full-name { font-size: 11.5px; color: #667085; margin: 0 0 10px; min-height: 30px; line-height: 1.45; }
    .sub-status { font-size: 10.5px; padding: 2px 9px; border-radius: 20px; font-weight: 700; }
    .sub-status.submitted { background: #C6EFCE; color: #276221; }
    .sub-status.draft { background: #FFF3E0; color: #C55A11; }
    .sub-status.missing { background: #F0F4F8; color: #99a; }

    /* Buttons inside entity cards */
    .entity-card a[mat-raised-button] { color: white !important; }

    /* ─── Closed weeks ─── */
    .closed-weeks { display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px; }
    .closed-card {
      border-radius: 10px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 1px 6px rgba(31,78,121,0.06) !important;
      opacity: 0.85;
    }
    .closed-card:hover { opacity: 1; }
    .closed-row { display: flex; align-items: center; gap: 14px; padding: 4px 0; }
    .lock-icon { color: #BDD7EE; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .closed-info { flex: 1; display: flex; flex-direction: column; }
    .closed-ref { font-weight: 700; font-size: 13.5px; color: #334; }
    .closed-date { font-size: 11px; color: #999; margin-top: 2px; }
    .closed-stat {
      font-size: 11.5px; color: #667085;
      background: #F0F4F8; padding: 3px 12px; border-radius: 20px; font-weight: 600;
    }

    @media (max-width: 1020px) {
      .content-grid { grid-template-columns: 1fr; }
      .entities-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 540px) {
      .entities-grid { grid-template-columns: 1fr 1fr; }
      .banner-content { flex-direction: column; align-items: flex-start; padding: 24px; }
      .banner-user { display: none; }
    }
  `]
})
export class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly cfg = inject(AppConfigService);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  readonly entities = ENTITIES;

  allWeeks = signal<any[]>([]);
  creating = signal(false);

  activeWeeks = computed(() => this.allWeeks().filter(w => w.status === 'active'));
  closedWeeks = computed(() => this.allWeeks().filter(w => w.status === 'closed'));

  weekForm = this.fb.group({
    weekStart: [null as Date | null, Validators.required],
    weekEnd: [null as Date | null, Validators.required],
    weekReference: ['', Validators.required],
  });

  ngOnInit() { this.loadWeeks(); }

  loadWeeks() {
    this.api.getWeeks().subscribe(weeks => this.allWeeks.set(weeks));
  }

  autoFillRef() {
    const { weekStart, weekEnd } = this.weekForm.value;
    if (weekStart && weekEnd) {
      const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const fmtFull = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      this.weekForm.patchValue({ weekReference: `Du ${fmt(weekStart)} au ${fmtFull(weekEnd)}` });
    }
  }

  createWeek() {
    if (this.weekForm.invalid) return;
    this.creating.set(true);
    const { weekStart, weekEnd, weekReference } = this.weekForm.value;
    this.api.createWeek({
      weekStart: weekStart ? (weekStart as Date).toISOString().split('T')[0] : '',
      weekEnd: weekEnd ? (weekEnd as Date).toISOString().split('T')[0] : '',
      weekReference,
    }).subscribe({
      next: () => {
        this.snack.open('Semaine créée avec succès', 'OK', { duration: 2500 });
        this.weekForm.reset();
        this.loadWeeks();
      },
      error: e => this.snack.open(e.error?.message?.error ?? 'Erreur lors de la création', 'OK', { duration: 3000 }),
      complete: () => this.creating.set(false),
    });
  }

  getSubmitted(week: any): number {
    return week.submissions?.filter((s: any) => s.status === 'submitted').length ?? 0;
  }

  getDraft(week: any): number {
    return week.submissions?.filter((s: any) => s.status === 'draft').length ?? 0;
  }

  getEntityStatusForWeek(week: any, entityCode: string): string {
    const sub = week.submissions?.find((s: any) => s.entityCode === entityCode);
    return sub?.status ?? 'missing';
  }

  getStatusLabelForWeek(week: any, entityCode: string): string {
    const status = this.getEntityStatusForWeek(week, entityCode);
    return status === 'submitted' ? 'Soumis' : status === 'draft' ? 'En cours' : 'En attente';
  }

  canAccessEntity(entityCode: string): boolean {
    if (this.auth.isAdminOrCOP() || this.auth.isAdminFinance()) return true;
    return this.auth.entityCode() === entityCode;
  }

  initials(): string {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }
}
