import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ENTITIES } from '../../../models/bulletin.models';

const STATUS_LABELS: Record<string, string> = {
  draft:       'Brouillon',
  pending_tpm: 'En attente TPM',
  pending_cop: 'En attente COP',
  cop_approved:'Approuvé COP',
  pending_dg:  'En attente DG',
  in_progress: 'En cours',
  completed:   'Terminée',
  cancelled:   'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  draft:       '#78909c',
  pending_tpm: '#8e24aa',
  pending_cop: '#f57c00',
  cop_approved:'#388e3c',
  pending_dg:  '#1976d2',
  in_progress: '#7b1fa2',
  completed:   '#2e7d32',
  cancelled:   '#c62828',
};

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function generateMonths(): { value: string; label: string }[] {
  const today = new Date();
  const months: { value: string; label: string }[] = [];
  for (let i = 18; i >= -6; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
    months.push({ value, label });
  }
  return months;
}

@Component({
  selector: 'app-mission-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatInputModule,
    MatTooltipModule, MatSnackBarModule, MatPaginatorModule,
  ],
  template: `
    <div class="db-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>dashboard</mat-icon>
          <div>
            <h1>Tableau de Bord — Ordres de Mission</h1>
            <p>Vue consolidée de toutes les demandes de mission</p>
          </div>
          <button mat-stroked-button class="btn-back" (click)="router.navigate(['/missions'])">
            <mat-icon>list</mat-icon> Liste
          </button>
        </div>
      </div>

      <!-- Filtres globaux -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Statut</mat-label>
          <mat-select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event); resetPage()">
            <mat-option value="">Tous</mat-option>
            <mat-option *ngFor="let s of statuses" [value]="s.value">{{s.label}}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Service (Entité)</mat-label>
          <mat-select [ngModel]="filterEntity()" (ngModelChange)="filterEntity.set($event); resetPage()">
            <mat-option value="">Tous</mat-option>
            <mat-option *ngFor="let e of entities" [value]="e.code">{{e.code}} — {{e.name}}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field filter-date">
          <mat-label>Mois de départ</mat-label>
          <mat-select [ngModel]="filterMonth()" (ngModelChange)="filterMonth.set($event); resetPage()">
            <mat-option value="">Tous</mat-option>
            <mat-option *ngFor="let m of availableMonths" [value]="m.value">{{m.label}}</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-icon-button matTooltip="Réinitialiser" (click)="clearFilters()"
                *ngIf="filterStatus() || filterEntity() || filterMonth() || hasFilter(fMission)">
          <mat-icon>filter_alt_off</mat-icon>
        </button>
        <span class="result-count">
          {{colFiltered().length}} ligne(s)
          <span *ngIf="hasFilter(fMission)" class="col-filter-badge">filtre colonne actif</span>
        </span>
        <button mat-raised-button class="btn-export" (click)="exportCsv()" [disabled]="!filtered().length">
          <mat-icon>download</mat-icon> Exporter CSV
        </button>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
      </div>

      <div *ngIf="!loading() && filtered().length === 0" class="empty-state">
        <mat-icon>flight_land</mat-icon>
        <p>Aucune donnée.</p>
      </div>

      <!-- Tableau -->
      <div class="table-wrapper" *ngIf="!loading() && filtered().length > 0">
        <table class="dm-table">
          <thead>
            <tr>
              <th class="col-n">
                <div class="ch-lbl">N°</div>
                <input class="col-filter" [(ngModel)]="fMission['missionNo']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-om">
                <div class="ch-lbl">N° OM</div>
                <input class="col-filter" [(ngModel)]="fMission['orderNumber']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-service">
                <div class="ch-lbl">Service</div>
                <input class="col-filter" [(ngModel)]="fMission['initiatorEntityCode']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-name">
                <div class="ch-lbl">Nom &amp; Prénoms</div>
                <input class="col-filter" [(ngModel)]="fMission['fullName']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-func">
                <div class="ch-lbl">Fonction</div>
                <input class="col-filter" [(ngModel)]="fMission['fonction']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-wave">
                <div class="ch-lbl">N° Wave</div>
                <input class="col-filter" [(ngModel)]="fMission['wave']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-dest">
                <div class="ch-lbl">Destination</div>
                <input class="col-filter" [(ngModel)]="fMission['destination']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-date">
                <div class="ch-lbl">Date départ</div>
                <input class="col-filter" [(ngModel)]="fMission['dateDepart']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-date">
                <div class="ch-lbl">Date retour</div>
                <input class="col-filter" [(ngModel)]="fMission['dateRetour']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-dur">
                <div class="ch-lbl">Durée</div>
                <input class="col-filter" [(ngModel)]="fMission['dureeJours']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-date">
                <div class="ch-lbl">Reprise</div>
                <input class="col-filter" [(ngModel)]="fMission['dateReprise']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-objet">
                <div class="ch-lbl">Objet de la mission</div>
                <input class="col-filter" [(ngModel)]="fMission['objet']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-imp">
                <div class="ch-lbl">Imputation</div>
                <input class="col-filter" [(ngModel)]="fMission['imputation']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-status">
                <div class="ch-lbl">Statut OM</div>
                <input class="col-filter" [(ngModel)]="fMission['status']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-obs">
                <div class="ch-lbl">Observations</div>
                <input class="col-filter" [(ngModel)]="fMission['dashboardObservations']" (input)="resetPage()" placeholder="⌕">
              </th>
              <th class="col-alert">⚠️</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of pagedFiltered()"
                class="data-row"
                [class.cancelled-row]="row.status === 'cancelled'"
                (click)="navigateToMission($event, row.id)">
              <td class="col-n">{{row.missionNo}}</td>
              <td class="col-om" (click)="$event.stopPropagation()">
                <ng-container *ngIf="canEditDashboard(); else roOm">
                  <input class="inline-input"
                         [value]="row.orderNumber ?? ''"
                         (blur)="saveField(row, 'orderNumber', $any($event.target).value)"
                         placeholder="—"
                         (click)="$event.stopPropagation()">
                </ng-container>
                <ng-template #roOm>{{row.orderNumber ?? '—'}}</ng-template>
              </td>
              <td class="col-service">{{row.initiatorEntityCode ?? row.service}}</td>
              <td class="col-name">{{row.fullName}}</td>
              <td class="col-func">{{row.fonction}}</td>
              <td class="col-wave">{{row.wave}}</td>
              <td class="col-dest">{{row.destination}}</td>
              <td class="col-date">{{row.dateDepart | date:'dd/MM/yyyy'}}</td>
              <td class="col-date">{{row.dateRetour | date:'dd/MM/yyyy'}}</td>
              <td class="col-dur center">{{row.dureeJours}}</td>
              <td class="col-date">{{row.dateReprise | date:'dd/MM/yyyy'}}</td>
              <td class="col-objet">{{row.objet}}</td>
              <td class="col-imp">{{row.imputation}}</td>
              <td class="col-status">
                <span class="status-pill"
                      [style.background]="statusColor(row.status) + '22'"
                      [style.color]="statusColor(row.status)"
                      [style.border-color]="statusColor(row.status) + '66'">
                  {{statusLabel(row.status)}}
                </span>
              </td>
              <td class="col-obs" (click)="$event.stopPropagation()">
                <ng-container *ngIf="canEditDashboard(); else roObs">
                  <textarea class="inline-textarea"
                            [value]="row.dashboardObservations ?? ''"
                            (blur)="saveField(row, 'dashboardObservations', $any($event.target).value)"
                            placeholder="—"
                            rows="1"
                            (click)="$event.stopPropagation()"></textarea>
                </ng-container>
                <ng-template #roObs>
                  {{row.dashboardObservations ?? row.rejectionReason ?? ''}}
                </ng-template>
              </td>
              <td class="col-alert">
                <span *ngIf="isAlert(row)" class="alert-icon" [matTooltip]="alertMessage(row)">⚠️</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="paginator-bar" *ngIf="!loading() && colFiltered().length > 0">
        <mat-paginator
          [length]="colFiltered().length"
          [pageSize]="pageMissions.size"
          [pageIndex]="pageMissions.index"
          [pageSizeOptions]="[10, 25, 50, 100]"
          (page)="onPageMissions($event)"
          showFirstLastButtons>
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .db-container { padding:0; min-height:100vh; display:flex; flex-direction:column; }
    .page-header { background:linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; }
    .page-header-inner { display:flex; align-items:center; gap:12px; padding:16px 20px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.15rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.8; font-size:.82rem; }
    .btn-back { margin-left:auto; color:#fff; border-color:rgba(255,255,255,.5); }

    .filter-bar { display:flex; align-items:center; gap:10px; padding:10px 20px; background:#f8f9fa; border-bottom:1px solid #e0e0e0; flex-wrap:wrap; }
    .filter-field { min-width:160px; }
    .filter-date { min-width:170px; }
    .result-count { font-size:.82rem; color:#555; font-weight:600; display:flex; align-items:center; gap:8px; }
    .col-filter-badge { background:#fff3cd; color:#856404; border:1px solid #ffc107; padding:1px 8px; border-radius:10px; font-size:.75rem; font-weight:600; }
    .btn-export { margin-left:auto; background:#1F4E79; color:#fff; font-size:.82rem; }
    .btn-export mat-icon { font-size:16px; width:16px; height:16px; }

    .loading-state, .empty-state { text-align:center; padding:60px; color:#888; }
    .loading-state mat-icon, .empty-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; }

    .table-wrapper { overflow-x:auto; padding:0; flex:1; }
    .dm-table { width:100%; border-collapse:collapse; font-size:.8rem; }
    .dm-table thead th {
      background:#1F4E79; color:#fff; padding:6px 8px 6px;
      text-align:left; position:sticky; top:0; z-index:2;
      border-right:1px solid rgba(255,255,255,.15);
      vertical-align:top;
    }
    .dm-table tbody tr.data-row { border-bottom:1px solid #e8eef5; cursor:pointer; transition:background .1s; }
    .dm-table tbody tr.data-row:hover { background:#f0f7ff; }
    .dm-table tbody tr.data-row:nth-child(even) { background:#fafafa; }
    .dm-table tbody tr.data-row:nth-child(even):hover { background:#f0f7ff; }
    .dm-table tbody tr.cancelled-row { opacity:.6; background:#fff3f3 !important; }
    .dm-table td { padding:7px 10px; vertical-align:top; border-right:1px solid #eee; }

    /* Column header label */
    .ch-lbl { white-space:nowrap; font-size:10.5px; font-weight:700; margin-bottom:4px; }

    /* Column filter inputs — white-on-dark style */
    .dm-table .col-filter {
      width:100%; padding:2px 5px;
      border:1px solid rgba(255,255,255,.35); border-radius:3px;
      font-size:10px; background:rgba(255,255,255,.12); color:#fff;
      box-sizing:border-box; outline:none;
    }
    .dm-table .col-filter::placeholder { color:rgba(255,255,255,.55); }
    .dm-table .col-filter:focus { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.7); }

    .col-n      { width:36px; text-align:center; font-weight:700; color:#1F4E79; }
    .col-om     { width:80px; }
    .col-service{ width:65px; }
    .col-name   { min-width:130px; font-weight:600; }
    .col-func   { min-width:110px; }
    .col-wave   { width:90px; }
    .col-dest   { min-width:110px; }
    .col-date   { width:88px; }
    .col-dur    { width:52px; text-align:center; font-weight:700; }
    .col-objet  { min-width:180px; max-width:260px; }
    .col-imp    { min-width:110px; }
    .col-status { width:125px; }
    .col-obs    { min-width:120px; }
    .col-alert  { width:36px; text-align:center; }
    .center     { text-align:center; }

    .status-pill { display:inline-block; padding:2px 8px; border-radius:10px; font-size:.75rem; font-weight:700; border:1px solid transparent; white-space:nowrap; }
    .alert-icon  { font-size:14px; cursor:default; }

    .inline-input {
      width:100%; border:1px solid #ccc; border-radius:4px; padding:3px 6px;
      font-size:.8rem; font-family:inherit; background:#fff;
      box-sizing:border-box; outline:none;
    }
    .inline-input:focus { border-color:#1976d2; box-shadow:0 0 0 2px rgba(25,118,210,.15); }
    .inline-textarea {
      width:100%; border:1px solid #ccc; border-radius:4px; padding:3px 6px;
      font-size:.8rem; font-family:inherit; background:#fff; resize:vertical;
      box-sizing:border-box; outline:none; min-height:28px;
    }
    .inline-textarea:focus { border-color:#1976d2; box-shadow:0 0 0 2px rgba(25,118,210,.15); }

    .paginator-bar { background:#f8f9fa; border-top:1px solid #e0e0e0; }
  `]
})
export class MissionDashboardComponent implements OnInit {
  api    = inject(ApiService);
  auth   = inject(AuthService);
  router = inject(Router);
  snack  = inject(MatSnackBar);

  rows    = signal<any[]>([]);
  loading = signal(true);

  filterStatus  = signal('');
  filterEntity  = signal('');
  filterMonth   = signal('');

  statuses       = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  entities       = ENTITIES;
  availableMonths = generateMonths();

  canEditDashboard = computed(() => this.auth.hasAnyRole('assistant_direction', 'super_admin'));

  // Pagination
  pageMissions = { index: 0, size: 25 };

  // Column filter state
  fMission: Record<string, string> = {};

  // Getter map for column filtering
  readonly gMission: Record<string, (r: any) => any> = {
    missionNo:             r => r.missionNo,
    orderNumber:           r => r.orderNumber ?? '',
    initiatorEntityCode:   r => r.initiatorEntityCode ?? r.service ?? '',
    fullName:              r => r.fullName,
    fonction:              r => r.fonction,
    wave:                  r => r.wave ?? '',
    destination:           r => r.destination,
    dateDepart:            r => r.dateDepart ? new Date(r.dateDepart).toLocaleDateString('fr-FR') : '',
    dateRetour:            r => r.dateRetour ? new Date(r.dateRetour).toLocaleDateString('fr-FR') : '',
    dureeJours:            r => r.dureeJours,
    dateReprise:           r => r.dateReprise ? new Date(r.dateReprise).toLocaleDateString('fr-FR') : '',
    objet:                 r => r.objet ?? '',
    imputation:            r => r.imputation ?? '',
    status:                r => this.statusLabel(r.status),
    dashboardObservations: r => r.dashboardObservations ?? r.rejectionReason ?? '',
  };

  filtered = computed(() => {
    const fs  = this.filterStatus();
    const fe  = this.filterEntity();
    const fm  = this.filterMonth();
    let list  = this.rows();
    if (fs) list = list.filter(r => r.status === fs);
    if (fe) list = list.filter(r => r.initiatorEntityCode === fe);
    if (fm) {
      list = list.filter(r => {
        const d = new Date(r.dateDepart);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === fm;
      });
    }
    return list;
  });

  colFilter(data: any[], f: Record<string, string>, g: Record<string, (r: any) => any>): any[] {
    const active = Object.entries(f).filter(([, v]) => v?.trim());
    if (!active.length) return data;
    return data.filter(row => active.every(([k, v]) => {
      const fn = g[k];
      return fn ? String(fn(row) ?? '').toLowerCase().includes(v.trim().toLowerCase()) : true;
    }));
  }

  hasFilter(f: Record<string, string>): boolean {
    return Object.values(f).some(v => v?.trim());
  }

  colFiltered(): any[] {
    return this.colFilter(this.filtered(), this.fMission, this.gMission);
  }

  pagedFiltered(): any[] {
    const data = this.colFiltered();
    const start = this.pageMissions.index * this.pageMissions.size;
    return data.slice(start, start + this.pageMissions.size);
  }

  onPageMissions(evt: PageEvent) {
    this.pageMissions.index = evt.pageIndex;
    this.pageMissions.size = evt.pageSize;
  }

  resetPage() { this.pageMissions.index = 0; }

  clearFilters() {
    this.filterStatus.set('');
    this.filterEntity.set('');
    this.filterMonth.set('');
    this.fMission = {};
    this.resetPage();
  }

  statusLabel(s: string) { return STATUS_LABELS[s] ?? s; }
  statusColor(s: string) { return STATUS_COLORS[s] ?? '#78909c'; }

  navigateToMission(event: MouseEvent, id: string) {
    this.router.navigate(['/missions', id]);
  }

  isAlert(row: any): boolean {
    if (['draft','pending_tpm','pending_cop'].includes(row.status)) {
      const created = new Date(row.dateDepart);
      const ageMs = Date.now() - created.getTime();
      return ageMs > 14 * 24 * 60 * 60 * 1000;
    }
    return false;
  }

  alertMessage(row: any): string {
    if (this.isAlert(row)) return 'Demande en attente depuis plus de 14 jours';
    return '';
  }

  saveField(row: any, field: 'orderNumber' | 'dashboardObservations', value: string) {
    const trimmed = value.trim();
    if ((row[field] ?? '') === trimmed) return;
    this.api.updateMissionDashboard(row.id, { [field]: trimmed }).subscribe({
      next: updated => {
        this.rows.update(list => list.map(r =>
          r.id === row.id ? { ...r, [field]: updated[field] ?? null } : r
        ));
      },
      error: () => this.snack.open('Erreur de sauvegarde', 'OK', { duration: 3000 }),
    });
  }

  ngOnInit() {
    this.api.getMissionDashboard().subscribe({
      next: data => { this.rows.set(data); this.loading.set(false); },
      error: () => { this.snack.open('Erreur de chargement', 'OK', { duration: 3000 }); this.loading.set(false); },
    });
  }

  exportCsv() {
    const headers = ['N°','N° OM','Service','Nom & Prénoms','Fonction','N° Wave','Destination',
      'Date départ','Date retour','Durée (j)','Date reprise','Objet','Imputation','Statut','Observations'];
    const rows = this.filtered().map(r => [
      r.missionNo,
      r.orderNumber ?? '',
      r.initiatorEntityCode ?? r.service,
      r.fullName, r.fonction, r.wave, r.destination,
      new Date(r.dateDepart).toLocaleDateString('fr-FR'),
      new Date(r.dateRetour).toLocaleDateString('fr-FR'),
      r.dureeJours,
      new Date(r.dateReprise).toLocaleDateString('fr-FR'),
      `"${(r.objet ?? '').replace(/"/g,'""')}"`,
      r.imputation,
      this.statusLabel(r.status),
      `"${(r.dashboardObservations ?? r.rejectionReason ?? '').replace(/"/g,'""')}"`,
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tableau_bord_missions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
