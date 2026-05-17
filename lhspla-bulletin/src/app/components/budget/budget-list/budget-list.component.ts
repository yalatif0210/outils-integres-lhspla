import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { AppConfigService } from '../../../services/app-config.service';
import { BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS, BUDGET_STATUS_ENUMERATION } from '../budget-templates';
import { ENTITIES } from '../../../models/bulletin.models';

const PAGE_SIZE = 9;

@Component({
  selector: 'app-budget-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatChipsModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="budget-list-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>account_balance_wallet</mat-icon>
          <div>
            <h1>Projets de Budget</h1>
            <p>{{auth.roleLabel()}}</p>
          </div>
          <button mat-raised-button class="btn-new" (click)="router.navigate(['/budgets/new'])"
                  *ngIf="canCreate()">
            <mat-icon>add</mat-icon> Nouveau budget
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Type</mat-label>
          <mat-select [ngModel]="filterType()" (ngModelChange)="filterType.set($event); resetPage()">
            <mat-option value="">Tous les types</mat-option>
            <mat-option *ngFor="let t of budgetTypes" [value]="t.value">{{t.label}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Statut</mat-label>
          <mat-select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event); resetPage()">
            <mat-option value="">Tous les statuts</mat-option>
            <mat-option *ngFor="let s of budgetStatuses" [value]="s.value">{{s.label}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field" *ngIf="canReview()">
          <mat-label>Fonds</mat-label>
          <mat-select [ngModel]="filterFund()" (ngModelChange)="filterFund.set($event); resetPage()">
            <mat-option value="">Tous les fonds</mat-option>
            <mat-option *ngFor="let f of funds()" [value]="f.id">{{f.name}}</mat-option>
          </mat-select>
        </mat-form-field>
        <!-- Filtre entité : visible pour chargee_tresorerie et reviewers -->
        <mat-form-field appearance="outline" class="filter-field" *ngIf="canFilterByEntity()">
          <mat-label>Entité</mat-label>
          <mat-select [ngModel]="filterEntity()" (ngModelChange)="filterEntity.set($event); resetPage()">
            <mat-option value="">Toutes les entités</mat-option>
            <mat-option *ngFor="let e of entities" [value]="e.code">{{e.code}} — {{e.name}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-date">
          <mat-label>Mois de création</mat-label>
          <input matInput type="month" [ngModel]="filterMonth()" (ngModelChange)="filterMonth.set($event); resetPage()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>N° Budget</mat-label>
          <input matInput [ngModel]="filterBudgetNumber()" (ngModelChange)="filterBudgetNumber.set($event); resetPage()"
                 placeholder="A001FY2026…">
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-date">
          <mat-label>Date exacte</mat-label>
          <input matInput type="date" [ngModel]="filterExactDate()" (ngModelChange)="filterExactDate.set($event); resetPage()">
        </mat-form-field>
        <button mat-raised-button class="btn-finance-filter" matTooltip="Afficher uniquement les budgets soumis à contrôler"
                *ngIf="auth.isAdminFinance() && filterStatus() !== 'submitted'"
                (click)="filterStatus.set('submitted'); resetPage()">
          <mat-icon>account_balance</mat-icon> Budgets à contrôler
        </button>
        <button mat-raised-button class="btn-treasury-filter" matTooltip="Budgets approuvés à payer"
                *ngIf="auth.isChargeeTresorerie() && filterStatus() !== 'approved'"
                (click)="filterStatus.set('approved'); resetPage()">
          <mat-icon>payments</mat-icon> Budgets approuvés
        </button>
        <button mat-icon-button matTooltip="Réinitialiser les filtres" (click)="clearFilters()"
                *ngIf="hasActiveFilter()">
          <mat-icon>filter_alt_off</mat-icon>
        </button>
        <span class="result-count" *ngIf="!loading() && hasActiveFilter()">
          {{filteredAll().length}} résultat(s)
        </span>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
      </div>

      <div *ngIf="!loading() && filteredAll().length === 0" class="empty-state">
        <mat-icon>account_balance_wallet</mat-icon>
        <p>Aucun projet de budget trouvé</p>
        <button mat-raised-button color="primary" (click)="router.navigate(['/budgets/new'])" *ngIf="canCreate()">
          Créer mon premier budget
        </button>
      </div>

      <div class="budget-grid" *ngIf="!loading() && filteredAll().length > 0">
        <mat-card class="budget-card" *ngFor="let b of page()" (click)="open(b)">
          <div class="card-accent" [style.background]="statusColor(b.status)"></div>
          <mat-card-content>
            <div class="card-header-row">
              <span class="type-badge">{{typeLabel(b.budgetType)}}</span>
              <span class="status-chip" [style.background]="statusColor(b.status)">{{statusLabel(b.status)}}</span>
              <!-- Badge Payé -->
              <span id="badge_full" class="badge-paid" *ngIf="b.isFullyPaid" matTooltip="Budget entièrement payé">
                <mat-icon>check_circle</mat-icon> Entièrement payé
              </span>
            </div>
            <h3 class="budget-title">{{b.title}}</h3>
            <div class="card-meta">
              <span class="budget-number-badge" *ngIf="b.budgetNumber">
                <mat-icon>tag</mat-icon> {{b.budgetNumber}}
              </span>
              <span class="meta-item" *ngIf="canReview()">
                <mat-icon>apartment</mat-icon> {{b.entityCode}}
              </span>
              <span class="meta-item">
                <mat-icon>account_balance</mat-icon> {{b.fund?.name}}
              </span>
              <span class="meta-item">
                <mat-icon>schedule</mat-icon> {{b.createdAt | date:'dd/MM/yyyy'}}
              </span>
            </div>
            <div class="amount-badge" *ngIf="b.totalAmount > 0">
              <mat-icon>payments</mat-icon>
              {{fmtFcfa(b.effectiveTotal ?? b.totalAmount)}}
              <span class="amount-note" *ngIf="b.memoRallonge > 0 || b.memoReduction > 0">
                (initial: {{fmtFcfa(b.totalAmount)}})
              </span>
            </div>
            <!-- Badges statut paiement (visibles par tous) -->
            <div class="payment-status-row" *ngIf="b.status === 'approved' && (b.totalBudget ?? b.totalAmount) > 0">
              <span id="badge_rest" class="reste-badge" *ngIf="!b.isFullyPaid && (b.resteAPayer ?? (b.totalBudget ?? b.totalAmount)) > 0">
                <mat-icon>pending</mat-icon> Reste à payer : {{fmtFcfa(b.resteAPayer ?? (b.totalBudget ?? b.totalAmount))}}
              </span>
            </div>
            <!-- Badges financiers avancés (trésorerie + finance) -->
            <div class="payment-summary" *ngIf="b.status === 'approved' && canManagePayments()">
              <span class="paid-amount" *ngIf="b.totalPaid > 0">
                <mat-icon>payments</mat-icon> Versé : {{fmtFcfa(b.totalPaid)}}
              </span>
            </div>
            <!-- Badges MEMO -->
            <ng-container *ngIf="memoEnabled() && b.status === 'approved'">
              <!-- Memos approuvés -->
              <div class="memo-badge memo-approved" *ngIf="b.memoApprovedCount > 0">
                <mat-icon>check_circle</mat-icon>
                {{b.memoApprovedCount}} MEMO approuvé{{b.memoApprovedCount > 1 ? 's' : ''}}
                <span *ngIf="(b.memoRallonge - b.memoReduction) !== 0"
                      [class.positive]="b.memoRallonge >= b.memoReduction"
                      [class.negative]="b.memoRallonge < b.memoReduction">
                  ({{b.memoRallonge >= b.memoReduction ? '+' : ''}}{{fmtFcfa(b.memoRallonge - b.memoReduction)}})
                </span>
              </div>
              <!-- Memos en attente COP -->
              <div class="memo-badge memo-pending" *ngIf="b.memoPendingCount > 0">
                <mat-icon>schedule</mat-icon>
                {{b.memoPendingCount}} MEMO en attente COP
              </div>
              <!-- Memos rejetés -->
              <div class="memo-badge memo-rejected" *ngIf="b.memoRejectedCount > 0">
                <mat-icon>cancel</mat-icon>
                {{b.memoRejectedCount}} MEMO rejeté{{b.memoRejectedCount > 1 ? 's' : ''}}
              </div>
            </ng-container>
            <!-- Badge Rappel pièces ouvert -->
            <div class="badge-recall-open" *ngIf="b.status === 'approved' && b._count?.recalls > 0">
              <mat-icon>folder_open</mat-icon> Rappel pièces ouvert ({{b._count.recalls}})
            </div>
            <div class="rejection-reason" *ngIf="b.rejectionReason && (b.status === 'rejected' || b.status === BUDGET_STATUS.DRAFT)">
              <mat-icon>{{b.status === BUDGET_STATUS.DRAFT ? 'replay' : 'error_outline'}}</mat-icon> {{b.rejectionReason}}
            </div>
            <div class="pr-pending-badge" *ngIf="b._count?.paymentRequests > 0">
              <mat-icon>payments</mat-icon>
              {{b._count.paymentRequests}} demande(s) de paiement en attente
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" (click)="open(b); $event.stopPropagation()">
              <mat-icon>{{canEditBudget(b) ? 'edit' : 'visibility'}}</mat-icon>
              {{canEditBudget(b) ? 'Modifier' : 'Consulter'}}
            </button>
            <button mat-button color="accent" (click)="openReview(b); $event.stopPropagation()"
                    *ngIf="auth.isAdminFinance() && b.status === 'submitted'">
              <mat-icon>account_balance_wallet</mat-icon> Contrôler
            </button>
            <button mat-button color="accent" (click)="openReview(b); $event.stopPropagation()"
                    *ngIf="auth.isAdminTPM() && b.status === 'finance_reviewed'">
              <mat-icon>verified_user</mat-icon> Vérifier
            </button>
            <button mat-button color="accent" (click)="openReview(b); $event.stopPropagation()"
                    *ngIf="auth.isCOP() && b.status === 'tpm_approved'">
              <mat-icon>gavel</mat-icon> Valider / Rejeter
            </button>
            <button mat-button (click)="downloadTdr(b, $event)"
                    *ngIf="b.tdrFilePath" matTooltip="Télécharger le TDR">
              <mat-icon>description</mat-icon> TDR
            </button>
            <button mat-button color="warn" (click)="archive(b, $event)"
                    *ngIf="canDeleteBudget(b)">
              <mat-icon>archive</mat-icon> Archiver
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
    .budget-list-container { padding: 0; }
    .page-header { background: linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; position:relative; }
    .page-header-inner { display:flex; align-items:center; gap:12px; padding:20px 24px; }
    .page-header-inner mat-icon { font-size:32px; width:32px; height:32px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.4rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.8; font-size:.85rem; }
    .btn-new { margin-left:auto; background:#fff; color:#1F4E79; font-weight:600; }
    .btn-finance-filter { background:#2d6a4f; color:#fff; font-weight:600; font-size:.8rem; height:36px; }
    .btn-treasury-filter { background:#1565c0; color:#fff; font-weight:600; font-size:.8rem; height:36px; }

    .filters-bar { display:flex; gap:12px; padding:16px 24px; background:#f8f9fa; border-bottom:1px solid #e0e0e0; flex-wrap:wrap; align-items:center; }
    .filter-field { min-width:160px; }
    .filter-date { min-width:160px; }
    .result-count { font-size:.82rem; color:#666; margin-left:auto; }

    .loading-state, .empty-state { text-align:center; padding:60px 24px; color:#888; }
    .loading-state mat-icon, .empty-state mat-icon { font-size:48px; width:48px; height:48px; margin-bottom:12px; display:block; }

    .budget-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; padding:20px 24px; }
    @media (max-width:900px) { .budget-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:600px) { .budget-grid { grid-template-columns:1fr; } }

    .budget-card { border-radius:10px; overflow:hidden; cursor:pointer; transition:transform .15s,box-shadow .15s; position:relative; }
    .budget-card:hover { transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,.12); }
    .card-accent { width:4px; height:100%; position:absolute; left:0; top:0; }
    mat-card-content { padding-left:16px !important; }

    .card-header-row { display:flex; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    .type-badge { background:#e3f0fb; color:#1F4E79; font-size:.75rem; font-weight:600; padding:2px 8px; border-radius:12px; }
    .status-chip { font-size:.75rem; font-weight:600; padding:2px 8px; border-radius:12px; color:#fff; }
    .badge-paid { display:inline-flex; align-items:center; gap:3px; font-size:.72rem; font-weight:700; color:#fff; background:#1b5e20; padding:2px 7px; border-radius:10px; }
    .badge-paid mat-icon { font-size:12px; width:12px; height:12px; }

    .budget-title { margin:0 0 8px; font-size:1rem; font-weight:600; color:#1F4E79; }
    .card-meta { display:flex; flex-wrap:wrap; gap:8px; }
    .meta-item { display:flex; align-items:center; gap:4px; font-size:.8rem; color:#666; }
    .meta-item mat-icon { font-size:14px; width:14px; height:14px; }
    .budget-number-badge { display:inline-flex; align-items:center; gap:3px; font-size:.78rem; font-weight:700; color:#1F4E79; background:#e8f0fe; padding:2px 8px; border-radius:10px; }
    .budget-number-badge mat-icon { font-size:13px; width:13px; height:13px; }

    .amount-badge { margin-top:8px; padding:5px 10px; background:#e8f5e9; border-radius:6px; font-size:.85rem; color:#2e7d32; display:inline-flex; align-items:center; gap:5px; font-weight:700; font-family:monospace; }
    .amount-badge mat-icon { font-size:15px; width:15px; height:15px; }
    .amount-note { font-size:.75rem; color:#555; font-weight:400; }

    .payment-status-row { margin-top:6px; }
    .payment-summary { margin-top:4px; display:flex; gap:8px; flex-wrap:wrap; }
    .paid-amount { display:inline-flex; align-items:center; gap:3px; font-size:.78rem; color:#1565c0; font-weight:600; background:#e3f2fd; padding:2px 7px; border-radius:8px; }
    .paid-amount mat-icon { font-size:13px; width:13px; height:13px; }
    .reste-badge { display:inline-flex; align-items:center; gap:3px; font-size:.78rem; color:#e65100; font-weight:600; background:#fff3e0; padding:2px 7px; border-radius:8px; }
    .reste-badge mat-icon { font-size:13px; width:13px; height:13px; }

    .memo-badge { margin-top:5px; display:inline-flex; align-items:center; gap:4px; font-size:.73rem; font-weight:600; padding:3px 8px; border-radius:8px; }
    .memo-badge mat-icon { font-size:13px; width:13px; height:13px; }
    .memo-badge .positive { color:#1b5e20; }
    .memo-badge .negative { color:#b71c1c; }
    .memo-approved { color:#1b5e20; background:#e8f5e9; border:1px solid #a5d6a7; }
    .memo-pending  { color:#e65100; background:#fff3e0; border:1px solid #ffcc80; }
    .memo-rejected { color:#b71c1c; background:#ffebee; border:1px solid #ef9a9a; }

    .badge-recall-open { margin-top:6px; padding:5px 8px; background:#fff8e1; border-radius:6px; font-size:.78rem; color:#e65100; display:flex; align-items:center; gap:4px; font-weight:600; }
    .badge-recall-open mat-icon { font-size:15px; width:15px; height:15px; }

    .rejection-reason { margin-top:8px; padding:6px 8px; background:#ffebee; border-radius:6px; font-size:.8rem; color:#c62828; display:flex; align-items:center; gap:4px; }
    .rejection-reason mat-icon { font-size:16px; width:16px; height:16px; }
    .pr-pending-badge { margin-top:8px; padding:5px 8px; background:#e3f2fd; border-radius:6px; font-size:.8rem; color:#1565c0; display:flex; align-items:center; gap:4px; font-weight:600; }
    .pr-pending-badge mat-icon { font-size:16px; width:16px; height:16px; }

    .pagination-bar { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px 24px 20px; }
    .page-info { font-size:.9rem; color:#555; font-weight:600; min-width:100px; text-align:center; }
  `]
})
export class BudgetListComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  appConfig = inject(AppConfigService);
  router = inject(Router);
  snack = inject(MatSnackBar);

  budgets = signal<any[]>([]);
  funds = signal<any[]>([]);
  loading = signal(true);
  memoEnabled = signal(false);

  filterType = signal('');
  filterStatus = signal('');
  filterFund = signal('');
  filterEntity = signal('');
  filterMonth = signal('');
  filterBudgetNumber = signal('');
  filterExactDate = signal('');
  pageIndex = signal(0);

  BUDGET_STATUS = BUDGET_STATUS_ENUMERATION as any;
  entities = ENTITIES;

  budgetTypes = Object.entries(BUDGET_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  budgetStatuses = Object.entries(BUDGET_STATUS_LABELS).filter(([v]) => v !== 'archived').map(([value, obj]) => ({ value, label: (obj as any).label ?? obj }));

  canFilterByEntity() { return this.auth.canReviewBudget() || this.auth.isChargeeTresorerie(); }
  canManagePayments() { return this.auth.isAdminFinance() || this.auth.isChargeeTresorerie() || this.auth.isSuperAdmin(); }

  hasActiveFilter = computed(() =>
    !!(this.filterType() || this.filterStatus() || this.filterFund() || this.filterEntity() ||
       this.filterMonth() || this.filterBudgetNumber() || this.filterExactDate())
  );

  filteredAll = computed(() => {
    const ft = this.filterType();
    const fs = this.filterStatus();
    const ff = this.filterFund();
    const fe = this.filterEntity();
    const fm = this.filterMonth();
    const fbn = this.filterBudgetNumber().toLowerCase();
    const fed = this.filterExactDate();
    let list = this.budgets();
    if (ft) list = list.filter(b => b.budgetType === ft);
    if (fs) list = list.filter(b => b.status === fs);
    if (ff) list = list.filter(b => b.fundId === ff);
    if (fe) list = list.filter(b => b.entityCode === fe);
    if (fm) {
      list = list.filter(b => {
        const d = new Date(b.createdAt);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === fm;
      });
    }
    if (fbn) list = list.filter(b => (b.budgetNumber ?? '').toLowerCase().includes(fbn));
    if (fed) {
      list = list.filter(b => {
        const d = new Date(b.createdAt);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return ymd === fed;
      });
    }
    list = list.filter(b => {
      if (b.status === this.BUDGET_STATUS.DRAFT && !this.canEditBudget(b)) return false;
      return true;
    });
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

  clearFilters() {
    this.filterType.set('');
    this.filterStatus.set('');
    this.filterFund.set('');
    this.filterEntity.set('');
    this.filterMonth.set('');
    this.filterBudgetNumber.set('');
    this.filterExactDate.set('');
    this.resetPage();
  }

  canCreate() { return this.auth.isEntityMember(); }
  canReview() { return this.auth.canReviewBudget(); }

  canEditBudget(b: any) {
    return this.auth.isEntityMember()
      && (b.status === this.BUDGET_STATUS.DRAFT || b.status === this.BUDGET_STATUS.REJECTED)
      && b.entityCode === this.auth.entityCode();
  }
  canDeleteBudget(b: any) {
    if (b.status === this.BUDGET_STATUS.APPROVED) return false;
    if (this.auth.isSuperAdmin()) return true;
    return this.auth.isEntityMember() && b.status === this.BUDGET_STATUS.DRAFT && b.entityCode === this.auth.entityCode();
  }

  typeLabel(t: string) { return BUDGET_TYPE_LABELS[t] ?? t; }
  statusLabel(s: string) { return (BUDGET_STATUS_LABELS[s] as any)?.label ?? s; }
  statusColor(s: string) { return (BUDGET_STATUS_LABELS[s] as any)?.color ?? '#999'; }
  fmtFcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
  }

  ngOnInit() {
    // Filtre automatique pour chargee_tresorerie
    if (this.auth.isChargeeTresorerie() && !this.auth.canReviewBudget()) {
      this.filterStatus.set('approved');
    }
    Promise.all([
      this.api.getBudgets().toPromise(),
      this.api.getFinancingFunds().toPromise(),
      this.api.getAppConfig().toPromise(),
    ]).then(([budgets, funds, config]) => {
      this.budgets.set(budgets ?? []);
      this.funds.set(funds ?? []);
      if (config) {
        Object.entries(config).forEach(([k, v]) => this.appConfig.set(k, v as string));
        this.memoEnabled.set(config['memo_enabled'] === 'true');
      }
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  open(b: any) { this.router.navigate(['/budgets', b.id]); }
  openReview(b: any) { this.router.navigate(['/budgets', b.id, 'review']); }

  async downloadTdr(b: any, e: Event) {
    e.stopPropagation();
    if (!b.tdrFilePath) return;
    try {
      const blob = await firstValueFrom(this.api.downloadBudgetTdr(b.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TDR_${b.title?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40) ?? b.id}.${b.tdrFileExt ?? 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Erreur lors du téléchargement du TDR', 'OK', { duration: 3000 });
    }
  }

  archive(b: any, e: Event) {
    e.stopPropagation();
    if (!confirm(`Archiver "${b.title}" ?`)) return;
    this.api.deleteBudget(b.id).subscribe({
      next: () => { this.budgets.update(list => list.filter(x => x.id !== b.id)); this.snack.open('Budget archivé', 'OK', { duration: 2500 }); },
      error: () => this.snack.open('Erreur lors de l\'archivage', 'OK', { duration: 3000 }),
    });
  }
}
