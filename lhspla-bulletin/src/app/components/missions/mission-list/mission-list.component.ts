import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

const PAGE_SIZE = 6;

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending_tpm: 'En attente TPM',
  pending_cop: 'En attente COP',
  cop_approved: 'Approuvé COP',
  pending_dg: 'En attente DG',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#78909c',
  pending_tpm: '#8e24aa',
  pending_cop: '#f57c00',
  cop_approved: '#388e3c',
  pending_dg: '#1976d2',
  in_progress: '#7b1fa2',
  completed: '#2e7d32',
  cancelled: '#c62828',
};

@Component({
  selector: 'app-mission-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatInputModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="missions-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>flight_takeoff</mat-icon>
          <div>
            <h1>Demandes de Mission</h1>
            <p>Gestion des déplacements et ordres de mission</p>
          </div>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="router.navigate(['/missions/new'])">
              <mat-icon>add</mat-icon> Nouvelle demande
            </button>
          </div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Statut</mat-label>
          <mat-select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event); resetPage()">
            <mat-option value="">Tous</mat-option>
            <mat-option *ngFor="let s of statuses" [value]="s.value">{{s.label}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-date">
          <mat-label>Mois de création</mat-label>
          <input matInput type="month" [ngModel]="filterMonth()" (ngModelChange)="filterMonth.set($event); resetPage()">
        </mat-form-field>
        <button mat-icon-button matTooltip="Réinitialiser les filtres" (click)="clearFilters()"
                *ngIf="filterStatus() || filterMonth()">
          <mat-icon>filter_alt_off</mat-icon>
        </button>
        <div class="summary-chips">
          <span class="chip draft">{{countByStatus('draft')}} brouillon(s)</span>
          <span class="chip pending">
            {{countByStatus('pending_tpm') + countByStatus('pending_cop') + countByStatus('cop_approved') + countByStatus('pending_dg')}} en attente
          </span>
          <span class="chip active">{{countByStatus('in_progress')}} en cours</span>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
      </div>

      <div *ngIf="!loading() && filteredAll().length === 0" class="empty-state">
        <mat-icon>flight_land</mat-icon>
        <p>Aucune demande de mission.</p>
        <button mat-raised-button color="primary" (click)="router.navigate(['/missions/new'])">
          <mat-icon>add</mat-icon> Créer une demande
        </button>
      </div>

      <div class="missions-grid" *ngIf="!loading() && filteredAll().length > 0">
        <mat-card class="mission-card" *ngFor="let m of page()" (click)="router.navigate(['/missions', m.id])">
          <mat-card-content>
            <div class="mission-top">
              <div class="mission-meta">
                <span class="status-badge" [style.background]="statusColor(m.status) + '22'" [style.color]="statusColor(m.status)" [style.border-color]="statusColor(m.status) + '55'">
                  <mat-icon class="status-icon">{{statusIcon(m.status)}}</mat-icon>
                  {{statusLabel(m.status)}}
                </span>
                <span class="fund-badge" *ngIf="m.fund">{{m.fund.code}}</span>
              </div>
              <span class="mission-date">{{m.requestDate | date:'dd/MM/yyyy'}}</span>
            </div>

            <h3 class="mission-object">{{m.object}}</h3>

            <div class="mission-details">
              <span class="detail-item">
                <mat-icon>place</mat-icon> {{m.location}}
              </span>
              <span class="detail-item">
                <mat-icon>calendar_today</mat-icon>
                {{m.departureDate | date:'dd/MM/yy'}} → {{m.returnDate | date:'dd/MM/yy'}}
              </span>
              <span class="detail-item" *ngIf="m.participants?.length">
                <mat-icon>people</mat-icon>
                {{m.participants.length}} participant(s)
              </span>
            </div>

            <div class="mission-footer">
              <span class="initiator" *ngIf="isStaff()">
                <mat-icon>person</mat-icon>
                {{m.initiator?.firstName}} {{m.initiator?.lastName}}
                <span class="entity-tag" *ngIf="m.initiator?.entityCode">{{m.initiator.entityCode}}</span>
              </span>
              <span class="rejection-reason" *ngIf="m.rejectionReason">
                <mat-icon>info</mat-icon> {{m.rejectionReason}}
              </span>
            </div>
          </mat-card-content>

          <mat-card-actions (click)="$event.stopPropagation()">
            <button mat-button color="primary" (click)="router.navigate(['/missions', m.id])">
              <mat-icon>{{canEdit(m) ? 'edit' : 'visibility'}}</mat-icon>
              {{canEdit(m) ? 'Modifier' : 'Voir'}}
            </button>
            <button mat-button (click)="submit(m)" [disabled]="saving()"
                    *ngIf="m.status === 'draft' && isOwner(m)">
              <mat-icon>send</mat-icon> Soumettre
            </button>
            <button mat-button color="warn" (click)="cancel(m)" [disabled]="saving()"
                    *ngIf="canCancel(m)">
              <mat-icon>cancel</mat-icon> Annuler
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar" *ngIf="!loading() && totalPages() > 1">
        <button mat-icon-button (click)="prevPage()" [disabled]="pageIndex() === 0">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="page-info">Page {{pageIndex() + 1}} / {{totalPages()}}</span>
        <button mat-icon-button (click)="nextPage()" [disabled]="pageIndex() >= totalPages() - 1">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .missions-container { padding:0; }
    .page-header { background:linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; }
    .page-header-triband { height:6px; background:linear-gradient(to right,#F4A623 33.3%,#fff 33.3% 66.6%,#1F8A3C 66.6%); }
    .page-header-inner { display:flex; align-items:center; gap:12px; padding:16px 20px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.2rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.8; font-size:.82rem; }
    .header-actions { margin-left:auto; }

    .filter-bar { display:flex; align-items:center; gap:12px; padding:12px 20px; background:#f8f9fa; border-bottom:1px solid #e0e0e0; flex-wrap:wrap; }
    .filter-field { min-width:160px; }
    .filter-date { min-width:160px; }
    .summary-chips { display:flex; gap:8px; margin-left:auto; flex-wrap:wrap; }
    .chip { padding:3px 12px; border-radius:14px; font-size:.78rem; font-weight:700; }
    .chip.draft { background:#eceff1; color:#546e7a; }
    .chip.pending { background:#fff3e0; color:#e65100; }
    .chip.active { background:#e8eaf6; color:#3949ab; }

    .loading-state, .empty-state { text-align:center; padding:60px; color:#888; }
    .loading-state mat-icon, .empty-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; }

    .missions-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; padding:16px 20px; }
    @media (max-width:700px) { .missions-grid { grid-template-columns:1fr; } }

    .mission-card { border-radius:10px !important; border:1px solid #e0e0e0 !important; cursor:pointer; transition:box-shadow .15s; }
    .mission-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1) !important; }

    .mission-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .mission-meta { display:flex; align-items:center; gap:8px; }
    .status-badge { display:flex; align-items:center; gap:4px; padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:700; border:1px solid transparent; }
    .status-icon { font-size:14px; width:14px; height:14px; }
    .fund-badge { background:#e3f0fb; color:#1F4E79; padding:2px 8px; border-radius:10px; font-size:.75rem; font-weight:700; }
    .mission-date { font-size:.8rem; color:#aaa; }

    .mission-object { margin:0 0 8px; font-size:.98rem; font-weight:700; color:#1F4E79; }

    .mission-details { display:flex; flex-wrap:wrap; gap:12px; font-size:.83rem; color:#555; margin-bottom:8px; }
    .detail-item { display:flex; align-items:center; gap:4px; }
    .detail-item mat-icon { font-size:15px; width:15px; height:15px; color:#2E75B6; }

    .mission-footer { display:flex; align-items:center; gap:12px; font-size:.8rem; color:#888; }
    .initiator { display:flex; align-items:center; gap:4px; }
    .initiator mat-icon { font-size:14px; width:14px; height:14px; }
    .entity-tag { background:#1F4E79; color:#fff; padding:1px 7px; border-radius:8px; font-size:.72rem; font-weight:700; }
    .rejection-reason { display:flex; align-items:center; gap:4px; color:#c62828; font-style:italic; }
    .rejection-reason mat-icon { font-size:14px; width:14px; height:14px; }

    .pagination-bar { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px 20px 20px; }
    .page-info { font-size:.9rem; color:#555; font-weight:600; min-width:100px; text-align:center; }
  `]
})
export class MissionListComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);
  snack = inject(MatSnackBar);

  missions = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);

  filterStatus = signal('');
  filterMonth = signal('');
  pageIndex = signal(0);

  statuses = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  isStaff = computed(() =>
    this.auth.hasAnyRole('super_admin', 'admin_system', 'assistant_direction', 'chief_of_party')
  );

  filteredAll = computed(() => {
    const fs = this.filterStatus();
    const fm = this.filterMonth();
    let list = this.missions();
    if (fs) list = list.filter(m => m.status === fs);
    if (fm) {
      list = list.filter(m => {
        const d = new Date(m.createdAt ?? m.requestDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === fm;
      });
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAll().length / PAGE_SIZE)));

  page = computed(() => {
    const start = this.pageIndex() * PAGE_SIZE;
    return this.filteredAll().slice(start, start + PAGE_SIZE);
  });

  resetPage() { this.pageIndex.set(0); }
  prevPage() { this.pageIndex.update(i => Math.max(0, i - 1)); }
  nextPage() { this.pageIndex.update(i => Math.min(this.totalPages() - 1, i + 1)); }
  clearFilters() { this.filterStatus.set(''); this.filterMonth.set(''); this.resetPage(); }

  countByStatus(s: string) { return this.missions().filter(m => m.status === s).length; }
  statusLabel(s: string) { return STATUS_LABELS[s] ?? s; }
  statusColor(s: string) { return STATUS_COLORS[s] ?? '#78909c'; }
  statusIcon(s: string): string {
    const icons: Record<string, string> = {
      draft: 'edit', pending_tpm: 'verified_user', pending_cop: 'hourglass_top',
      cop_approved: 'check_circle', pending_dg: 'pending',
      in_progress: 'directions_run', completed: 'task_alt', cancelled: 'cancel',
    };
    return icons[s] ?? 'help';
  }

  isOwner(m: any) { return m.initiatorId === this.auth.currentUser()?.id; }
  canEdit(m: any) { return m.status === 'draft' && this.isOwner(m); }
  canCancel(m: any) {
    if (m.status === 'draft') return this.isOwner(m);
    return ['cancelled', 'completed'].indexOf(m.status) === -1
      && this.auth.hasAnyRole('super_admin', 'admin_system', 'assistant_direction', 'chief_of_party');
  }

  ngOnInit() {
    this.api.getMissions().subscribe({
      next: data => { this.missions.set(data); this.loading.set(false); },
      error: () => { this.snack.open('Erreur de chargement', 'OK', { duration: 3000 }); this.loading.set(false); },
    });
  }

  async submit(m: any) {
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.submitMission(m.id));
      this.missions.update(list => list.map(x => x.id === m.id ? { ...x, ...updated } : x));
      this.snack.open('Mission soumise', 'OK', { duration: 2500 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur lors de la soumission', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(m: any) {
    if (!confirm('Annuler cette demande de mission ?')) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.cancelMission(m.id));
      this.missions.update(list => list.map(x => x.id === m.id ? { ...x, ...updated } : x));
      this.snack.open('Mission annulée', 'OK', { duration: 2500 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur lors de l\'annulation', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
