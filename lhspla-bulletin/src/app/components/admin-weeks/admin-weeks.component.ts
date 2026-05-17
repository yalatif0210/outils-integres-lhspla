import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-weeks',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule,
    MatNativeDateModule, MatSelectModule, MatChipsModule,
    MatSnackBarModule, MatTooltipModule, MatPaginatorModule
  ],
  template: `
    <div class="weeks-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>date_range</mat-icon>
          <h1>Gestion des semaines</h1>
        </div>
      </div>

      <!-- Formulaire nouvelle semaine -->
      <mat-card class="create-card">
        <mat-card-header>
          <mat-card-title><mat-icon>add_circle</mat-icon> Créer une nouvelle semaine</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="weekForm" class="week-form">
            <mat-form-field appearance="outline">
              <mat-label>Date de début</mat-label>
              <input matInput [matDatepicker]="start" formControlName="weekStart" (dateChange)="autoFillRef()">
              <mat-datepicker-toggle matSuffix [for]="start"></mat-datepicker-toggle>
              <mat-datepicker #start></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date de fin</mat-label>
              <input matInput [matDatepicker]="end" formControlName="weekEnd" (dateChange)="autoFillRef()">
              <mat-datepicker-toggle matSuffix [for]="end"></mat-datepicker-toggle>
              <mat-datepicker #end></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="ref-field">
              <mat-label>Libellé de la semaine</mat-label>
              <input matInput formControlName="weekReference" placeholder="Ex: Du 14/04 au 18/04/2026">
            </mat-form-field>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="createWeek()" [disabled]="weekForm.invalid || creating()">
            <mat-icon>add</mat-icon> Créer la semaine
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Semaines actives -->
      <h2>Semaines actives <span class="count">{{activeWeeks().length}}</span></h2>
      <div class="weeks-grid">
        <mat-card *ngFor="let w of activeWeeks()" class="week-card active-week">
          <mat-card-content>
            <div class="week-top">
              <div>
                <h3>{{w.weekReference}}</h3>
                <p class="week-dates">{{w.weekStart | date:'dd/MM/yyyy'}} → {{w.weekEnd | date:'dd/MM/yyyy'}}</p>
              </div>
              <span class="status-chip active">Active</span>
            </div>

            <!-- Détail par entité + bouton réouverture -->
            <div class="entities-detail">
              <div *ngFor="let s of w.submissions" class="entity-row"
                   [class.submitted]="s.status === 'submitted'"
                   [class.draft]="s.status === 'draft'">
                <span class="entity-code">{{s.entityCode}}</span>
                <span class="entity-status-label">
                  {{s.status === 'submitted' ? 'Soumis' : s.status === 'draft' ? 'En cours' : 'En attente'}}
                </span>
                <button mat-icon-button class="action-btn"
                        *ngIf="s.status === 'submitted'"
                        (click)="reopenSubmission(w, s)"
                        matTooltip="Réouvrir cette saisie">
                  <mat-icon>undo</mat-icon>
                </button>
                <a mat-icon-button class="action-btn"
                   [routerLink]="['/entity', s.entityCode]" [queryParams]="{week: w.id}"
                   matTooltip="Consulter">
                  <mat-icon>visibility</mat-icon>
                </a>
              </div>
            </div>
            <p class="progress-label">{{getSubmittedCount(w)}} / {{w.submissions?.length ?? 8}} soumis</p>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button [routerLink]="['/compilation']" [queryParams]="{week: w.id}" color="primary">
              <mat-icon>summarize</mat-icon> Compilation
            </a>
            <button mat-stroked-button color="warn" (click)="closeWeek(w)" matTooltip="Clôturer">
              <mat-icon>lock</mat-icon> Clôturer
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Semaines clôturées — filtre mois + pagination -->
      <div class="closed-header">
        <h2>Semaines clôturées <span class="count">{{filteredClosedWeeks().length}}</span></h2>
        <div class="closed-filters">
          <mat-form-field appearance="outline" class="month-filter" *ngIf="closedMonths().length > 1">
            <mat-label><mat-icon>calendar_month</mat-icon> Mois</mat-label>
            <mat-select [(ngModel)]="selectedMonth" (ngModelChange)="onMonthChange()">
              <mat-option value="">Tous les mois</mat-option>
              <mat-option *ngFor="let m of closedMonths()" [value]="m.key">{{m.label}}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="week-filter" *ngIf="weeksForMonth().length > 1">
            <mat-label><mat-icon>event</mat-icon> Semaine</mat-label>
            <mat-select [(ngModel)]="selectedWeekFilter" (ngModelChange)="pageIndex = 0">
              <mat-option value="">Toutes les semaines</mat-option>
              <mat-option *ngFor="let w of weeksForMonth()" [value]="w.id">{{w.weekReference}}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="weeks-list">
        <mat-card *ngFor="let w of paginatedClosedWeeks()" class="week-card closed-week">
          <mat-card-content>
            <div class="week-top">
              <div>
                <h3>{{w.weekReference}}</h3>
                <p class="week-dates closed-date">Clôturée le {{w.closedAt | date:'dd/MM/yyyy'}}</p>
              </div>
              <span class="status-chip closed">Clôturée</span>
            </div>
            <div class="progress-row">
              <span *ngFor="let s of w.submissions" class="entity-dot"
                    [class.submitted]="s.status === 'submitted'"
                    [class.draft]="s.status === 'draft'"
                    [matTooltip]="s.entityCode + ' — ' + (s.status === 'submitted' ? 'Soumis' : 'En cours')">
                {{s.entityCode}}
              </span>
            </div>
            <p class="progress-label">{{getSubmittedCount(w)}} / {{w.submissions?.length ?? 8}} soumis</p>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button [routerLink]="['/compilation']" [queryParams]="{week: w.id}" color="primary">
              <mat-icon>summarize</mat-icon> Compilation
            </a>
            <button mat-stroked-button color="primary" (click)="reopenWeek(w)" matTooltip="Rouvrir la semaine">
              <mat-icon>lock_open</mat-icon> Rouvrir
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <mat-paginator
        *ngIf="filteredClosedWeeks().length > 2"
        [length]="filteredClosedWeeks().length"
        [pageSize]="pageSize"
        [pageSizeOptions]="[5, 10, 20]"
        [pageIndex]="pageIndex"
        (page)="onPage($event)"
        showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  styles: [`
    .weeks-container { max-width: 1100px; margin: 0 auto; padding: 24px 16px 40px; }

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

    /* ─── Create card ─── */
    .create-card {
      border-radius: 14px !important; margin-bottom: 24px;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }
    .week-form { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; align-items: flex-start; }
    .week-form mat-form-field { min-width: 180px; }
    .ref-field { flex: 1; min-width: 260px; }
    mat-card-title { display: flex; align-items: center; gap: 8px; color: #1F4E79; font-weight: 700; }
    .create-btn-wrap button[mat-raised-button] { color: white !important; }

    h2 { font-size: 15px; color: #1F4E79; margin: 26px 0 12px; display: flex; align-items: center; gap: 8px; font-weight: 700; }
    .count { background: #DEEAF1; color: #1F4E79; padding: 1px 9px; border-radius: 20px; font-size: 12px; font-weight: 700; }

    .closed-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .closed-header h2 { flex: 1; }
    .closed-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
    .month-filter, .week-filter { min-width: 200px; margin-top: 12px; }

    .weeks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
    .weeks-list { display: flex; flex-direction: column; gap: 10px; }

    /* ─── Week cards ─── */
    .week-card {
      border-radius: 14px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }
    .active-week { border-left: 4px solid #276221 !important; }
    .closed-week { border-left: 4px solid #D0D7E2 !important; opacity: 0.9; }
    .closed-week:hover { opacity: 1; }

    .week-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
    .week-top h3 { margin: 0 0 3px; font-size: 14.5px; color: #1F4E79; font-weight: 800; }
    .week-dates { margin: 0; font-size: 12px; color: #667085; }
    .closed-date { color: #aaa; }

    .status-chip { padding: 3px 11px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .status-chip.active { background: #C6EFCE; color: #276221; }
    .status-chip.closed { background: #F0F4F8; color: #aaa; }

    .entities-detail { display: flex; flex-direction: column; gap: 3px; margin: 8px 0; }
    .entity-row {
      display: flex; align-items: center; gap: 6px;
      padding: 3px 8px; border-radius: 6px; background: #F8F9FB;
      border: 1px solid transparent;
    }
    .entity-row.submitted { background: #F0FFF4; border-color: #C6EFCE; }
    .entity-row.draft { background: #FFF8F0; border-color: #FDDCB5; }
    .entity-code { font-size: 11px; font-weight: 800; color: #1F4E79; width: 70px; }
    .entity-status-label { font-size: 11px; color: #667085; flex: 1; }
    .action-btn { width: 26px; height: 26px; line-height: 26px; }
    .action-btn mat-icon { font-size: 15px; }

    .progress-row { display: flex; gap: 4px; flex-wrap: wrap; margin: 6px 0 4px; }
    .entity-dot { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #F0F4F8; color: #aaa; }
    .entity-dot.submitted { background: #C6EFCE; color: #276221; }
    .entity-dot.draft { background: #FFF3E0; color: #C55A11; }
    .progress-label { font-size: 12px; color: #667085; margin: 4px 0 0; }

    /* Button colors */
    button[mat-raised-button][color="primary"], a[mat-raised-button][color="primary"] { color: white !important; }
    button[mat-stroked-button][color="primary"], a[mat-stroked-button][color="primary"] { color: #1F4E79 !important; border-color: #1F4E79 !important; }
    button[mat-stroked-button][color="warn"] { color: #C00000 !important; border-color: #C00000 !important; }
  `]
})
export class AdminWeeksComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  allWeeks = signal<any[]>([]);
  creating = signal(false);
  selectedMonth = '';
  selectedWeekFilter = '';
  pageIndex = 0;
  pageSize = 5;

  readonly activeWeeks = computed(() => this.allWeeks().filter(w => w.status === 'active'));
  readonly closedWeeks = computed(() => this.allWeeks().filter(w => w.status === 'closed'));

  /** Months from closed weeks — a week belongs to a month if weekStart OR weekEnd is in that month */
  readonly closedMonths = computed(() => {
    const seen = new Set<string>();
    const months: { key: string; label: string }[] = [];
    for (const w of this.closedWeeks()) {
      for (const dt of [w.weekStart, w.weekEnd]) {
        if (!dt) continue;
        const d = new Date(dt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!seen.has(key)) {
          seen.add(key);
          months.push({ key, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });
        }
      }
    }
    return months.sort((a, b) => b.key.localeCompare(a.key));
  });

  /** Weeks belonging to the selected month (for cascade week filter) */
  readonly weeksForMonth = computed(() => {
    if (!this.selectedMonth) return this.closedWeeks();
    return this.closedWeeks().filter(w => this.weekBelongsToMonth(w, this.selectedMonth));
  });

  readonly filteredClosedWeeks = computed(() => {
    let weeks = this.closedWeeks();
    if (this.selectedMonth) {
      weeks = weeks.filter(w => this.weekBelongsToMonth(w, this.selectedMonth));
    }
    if (this.selectedWeekFilter) {
      weeks = weeks.filter(w => w.id === this.selectedWeekFilter);
    }
    return weeks;
  });

  readonly paginatedClosedWeeks = computed(() => {
    const start = this.pageIndex * this.pageSize;
    return this.filteredClosedWeeks().slice(start, start + this.pageSize);
  });

  private weekBelongsToMonth(w: any, monthKey: string): boolean {
    for (const dt of [w.weekStart, w.weekEnd]) {
      if (!dt) continue;
      const d = new Date(dt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key === monthKey) return true;
    }
    return false;
  }

  weekForm = this.fb.group({
    weekStart: [null as Date | null, Validators.required],
    weekEnd: [null as Date | null, Validators.required],
    weekReference: ['', Validators.required],
  });

  ngOnInit() { this.loadWeeks(); }

  loadWeeks() { this.api.getWeeks().subscribe(w => this.allWeeks.set(w)); }

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
      weekStart: weekStart ? new Date(weekStart).toISOString().split('T')[0] : '',
      weekEnd: weekEnd ? new Date(weekEnd).toISOString().split('T')[0] : '',
      weekReference,
    }).subscribe({
      next: () => { this.snack.open('Semaine créée', 'OK', { duration: 2000 }); this.weekForm.reset(); this.loadWeeks(); },
      error: e => this.snack.open(e.error?.message?.error ?? 'Erreur', 'OK', { duration: 3000 }),
      complete: () => this.creating.set(false),
    });
  }

  closeWeek(w: any) {
    if (!confirm(`Clôturer "${w.weekReference}" ?`)) return;
    this.api.closeWeek(w.id).subscribe(() => { this.snack.open('Semaine clôturée', 'OK', { duration: 2000 }); this.loadWeeks(); });
  }

  reopenWeek(w: any) {
    if (!confirm(`Rouvrir la semaine "${w.weekReference}" ?`)) return;
    this.api.reopenWeek(w.id).subscribe(() => { this.snack.open('Semaine rouverte', 'OK', { duration: 2000 }); this.loadWeeks(); });
  }

  reopenSubmission(week: any, sub: any) {
    if (!confirm(`Réouvrir la saisie de ${sub.entityCode} ?\nL'entité pourra modifier et resoumettre.`)) return;
    this.api.reopenSubmission(week.id, sub.entityCode).subscribe({
      next: () => { this.snack.open(`Saisie ${sub.entityCode} réouverte`, 'OK', { duration: 3000 }); this.loadWeeks(); },
      error: () => this.snack.open('Erreur lors de la réouverture', 'OK', { duration: 3000 }),
    });
  }

  onMonthChange() { this.selectedWeekFilter = ''; this.pageIndex = 0; }

  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; }

  getSubmittedCount(w: any): number {
    return w.submissions?.filter((s: any) => s.status === 'submitted').length ?? 0;
  }
}
