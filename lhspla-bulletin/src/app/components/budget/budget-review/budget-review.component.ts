import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { AppConfigService } from '../../../services/app-config.service';
import {
  BUDGET_TEMPLATES, BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS,
  BudgetRow, computeAmounts, BUDGET_STATUS_ENUMERATION,
  CustomBudgetRow, buildRowsWithCustoms, parseCustomRowsFromLines,
} from '../budget-templates';
import { BudgetRecallComponent } from '../budget-recall/budget-recall.component';

@Component({
  selector: 'app-budget-review',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatChipsModule, MatSnackBarModule,
    BudgetRecallComponent,
  ],
  template: `
    <div class="review-container">
      <div class="page-header">
        <div class="page-header-inner">
          <button mat-icon-button (click)="router.navigate(['/budgets'])"><mat-icon>arrow_back</mat-icon></button>
          <mat-icon>rate_review</mat-icon>
          <div>
            <h1>{{reviewTitle()}}</h1>
            <p *ngIf="budget()">{{budget().entityCode}} · {{typeLabel(budget().budgetType)}} · {{fundLabel()}}</p>
          </div>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Chargement...</p></div>

      <div class="review-body" *ngIf="!loading() && budget()">

        <!-- Info card -->
        <mat-card class="info-card">
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item"><mat-icon>title</mat-icon><div><label>Titre</label><span>{{budget().title}}</span></div></div>
              <div class="info-item" *ngIf="budget().activityReference">
                <mat-icon>local_activity</mat-icon>
                <div><label>Activité</label><span>{{budget().activityReference?.title}}</span></div>
              </div>
              <div class="info-item"><mat-icon>apartment</mat-icon><div><label>Entité</label><span>{{budget().entityCode}}</span></div></div>
              <div class="info-item"><mat-icon>account_balance</mat-icon><div><label>Fonds</label><span>{{fundLabel()}}</span></div></div>
              <div class="info-item"><mat-icon>currency_exchange</mat-icon><div><label>Taux FCFA/USD</label><span>{{budget().exchangeRate}} FCFA</span></div></div>
              <div class="info-item"><mat-icon>schedule</mat-icon><div><label>Soumis le</label><span>{{budget().submittedAt | date:'dd/MM/yyyy HH:mm'}}</span></div></div>
              <div class="info-item" *ngIf="budget().tpmReviewedAt">
                <mat-icon>verified</mat-icon>
                <div><label>Vérifié TPM le</label><span>{{budget().tpmReviewedAt | date:'dd/MM/yyyy HH:mm'}}</span></div>
              </div>
            </div>
            <!-- Statut actuel -->
            <div class="status-row">
              <span class="status-chip" [style.background]="statusColor(budget().status)">
                {{statusLabel(budget().status)}}
              </span>
              <span class="workflow-hint" *ngIf="budget().status === 'submitted'">
                <mat-icon>arrow_forward</mat-icon> En attente de contrôle Finance
              </span>
              <span class="workflow-hint" *ngIf="budget().status === 'finance_reviewed'">
                <mat-icon>arrow_forward</mat-icon> En attente de vérification TPM
              </span>
              <span class="workflow-hint" *ngIf="budget().status === 'tpm_approved'">
                <mat-icon>arrow_forward</mat-icon> En attente de validation COP
              </span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Tableau budget (lecture seule) -->
        <div class="table-wrapper">
          <table class="budget-table">
            <thead>
              <tr>
                <th class="col-num">N°</th>
                <th class="col-desig">DÉSIGNATIONS</th>
                <th class="col-num-field">Coût unitaire (FCFA)</th>
                <th class="col-num-field">Quantité</th>
                <th class="col-num-field">Fréquence</th>
                <th class="col-total">Montant FCFA</th>
                <th class="col-total">Montant USD</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let row of rows">
                <tr *ngIf="row.type === 'section_header' && canShow(row, amounts)" class="row-section-header">
                  <td class="num-cell">{{row.num}}</td>
                  <td colspan="6" class="section-label">{{row.label}}</td>
                </tr>
                <tr *ngIf="row.type === 'sub_header' && canShow(row, amounts)" class="row-sub-header">
                  <td></td><td colspan="6" class="sub-label">{{row.label}}</td>
                </tr>
                <tr *ngIf="row.type === 'item' && canShow(row, amounts)" class="row-item">
                  <td></td>
                  <td class="desig-cell">{{lineMap[row.rowKey]?.designation || row.label}}</td>
                  <td class="num-cell">{{fmt(lineMap[row.rowKey]?.unitCost)}}</td>
                  <td class="num-cell">{{fmt(lineMap[row.rowKey]?.quantity)}}</td>
                  <td class="num-cell">{{fmt(lineMap[row.rowKey]?.frequency)}}</td>
                  <td class="amount-cell">{{fmtAmount(amounts[row.rowKey])}}</td>
                  <td class="amount-cell usd">{{fmtUSD(amounts[row.rowKey])}}</td>
                </tr>
                <tr *ngIf="(row.type === 'subtotal' || row.type === 'total_section') && canShow(row, amounts)" class="row-subtotal" [class.row-total]="row.type === 'total_section'">
                  <td></td><td class="desig-cell total-label">{{row.label}}</td>
                  <td colspan="3"></td>
                  <td class="amount-cell">{{fmtAmount(amounts[row.rowKey])}}</td>
                  <td class="amount-cell usd">{{fmtUSD(amounts[row.rowKey])}}</td>
                </tr>
                <tr *ngIf="row.type === 'tax' && canShow(row, amounts)" class="row-tax">
                  <td></td><td class="desig-cell tax-label">{{row.label}}</td>
                  <td colspan="3"></td>
                  <td class="amount-cell">{{fmtAmount(amounts[row.rowKey])}}</td>
                  <td class="amount-cell usd">{{fmtUSD(amounts[row.rowKey])}}</td>
                </tr>
                <tr *ngIf="row.type === 'grand_total'" class="row-grand-total">
                  <td class="num-cell">TOTAL</td>
                  <td class="desig-cell grand-label">{{row.label}}</td>
                  <td colspan="3"></td>
                  <td class="amount-cell grand-amount">{{fmtAmount(amounts[row.rowKey])}}</td>
                  <td class="amount-cell usd grand-amount">{{fmtUSD(amounts[row.rowKey])}}</td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <!-- Section décision Finance -->
        <mat-card class="decision-card finance-card" *ngIf="canActAsFinance()">
          <mat-card-content>
            <div class="decision-header">
              <mat-icon class="finance-icon">account_balance_wallet</mat-icon>
              <h3>Contrôle Admin Finance</h3>
            </div>
            <p class="decision-hint">Vérifiez la conformité financière du budget avant transmission au TPM.</p>
            <div class="decision-btns">
              <button mat-raised-button class="btn-approve" (click)="financeApprove()" [disabled]="saving()">
                <mat-icon>check_circle</mat-icon> Valider — transmettre au TPM
              </button>
              <button mat-raised-button class="btn-reject" (click)="showReject=true" *ngIf="!showReject">
                <mat-icon>cancel</mat-icon> Rejeter
              </button>
            </div>
            <div class="reject-form" *ngIf="showReject">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Motif du rejet (obligatoire)</mat-label>
                <textarea matInput [(ngModel)]="rejectReason" rows="3" placeholder="Expliquez pourquoi ce budget est rejeté..."></textarea>
              </mat-form-field>
              <div class="reject-actions">
                <button mat-stroked-button (click)="showReject=false;rejectReason=''">Annuler</button>
                <button mat-raised-button class="btn-reject" (click)="financeReject()" [disabled]="!rejectReason || saving()">
                  <mat-icon>send</mat-icon> Confirmer le rejet
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Section décision TPM -->
        <mat-card class="decision-card" *ngIf="canActAsTPM()">
          <mat-card-content>
            <div class="decision-header">
              <mat-icon class="tpm-icon">verified_user</mat-icon>
              <h3>Vérification TPM</h3>
            </div>
            <p class="decision-hint">Le contrôle Finance est validé. Vérifiez la conformité avant transmission au Chief of Party.</p>
            <div class="decision-btns">
              <button mat-raised-button class="btn-approve" (click)="tpmApprove()" [disabled]="saving()">
                <mat-icon>check_circle</mat-icon> Valider — transmettre au COP
              </button>
              <button mat-raised-button class="btn-reject" (click)="showReject=true" *ngIf="!showReject">
                <mat-icon>cancel</mat-icon> Rejeter
              </button>
            </div>
            <div class="reject-form" *ngIf="showReject">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Motif du rejet (obligatoire)</mat-label>
                <textarea matInput [(ngModel)]="rejectReason" rows="3" placeholder="Expliquez pourquoi ce budget est rejeté..."></textarea>
              </mat-form-field>
              <div class="tdr-correction-zone">
                <span class="tdr-corr-hint"><mat-icon>description</mat-icon> TDR corrigé (facultatif — remplace l'actuel)</span>
                <div class="tdr-file-selected" *ngIf="pendingTdrFile">
                  <mat-icon>insert_drive_file</mat-icon>
                  <span>{{pendingTdrFile.name}}</span>
                  <button mat-icon-button (click)="clearPendingTdr()"><mat-icon>close</mat-icon></button>
                </div>
                <label class="btn-pick-tdr" *ngIf="!pendingTdrFile">
                  <mat-icon>upload_file</mat-icon> Sélectionner un TDR corrigé
                  <input type="file" accept=".pdf,.doc,.docx" (change)="onTdrFileSelected($event)" hidden>
                </label>
              </div>
              <div class="reject-actions">
                <button mat-stroked-button (click)="showReject=false;rejectReason='';clearPendingTdr()">Annuler</button>
                <button mat-raised-button class="btn-reject" (click)="tpmReject()" [disabled]="!rejectReason || saving() || tdrUploading()">
                  <mat-icon>send</mat-icon> {{tdrUploading() ? 'Envoi TDR...' : 'Confirmer le rejet'}}
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Section décision COP -->
        <mat-card class="decision-card cop-card" *ngIf="canActAsCOP()">
          <mat-card-content>
            <div class="decision-header">
              <mat-icon class="cop-icon">gavel</mat-icon>
              <h3>Validation finale — Chief of Party</h3>
            </div>
            <p class="decision-hint">Ce budget a été vérifié par le TPM. Votre validation est finale.</p>
            <div class="decision-btns">
              <button mat-raised-button class="btn-approve" (click)="copApprove()" [disabled]="saving()">
                <mat-icon>check_circle</mat-icon> Approuver définitivement
              </button>
              <button mat-raised-button class="btn-reject" (click)="showReject=true" *ngIf="!showReject">
                <mat-icon>cancel</mat-icon> Rejeter
              </button>
            </div>
            <div class="reject-form" *ngIf="showReject">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Motif du rejet (obligatoire)</mat-label>
                <textarea matInput [(ngModel)]="rejectReason" rows="3" placeholder="Expliquez pourquoi ce budget est rejeté..."></textarea>
              </mat-form-field>
              <div class="tdr-correction-zone">
                <span class="tdr-corr-hint"><mat-icon>description</mat-icon> TDR corrigé (facultatif — remplace l'actuel)</span>
                <div class="tdr-file-selected" *ngIf="pendingTdrFile">
                  <mat-icon>insert_drive_file</mat-icon>
                  <span>{{pendingTdrFile.name}}</span>
                  <button mat-icon-button (click)="clearPendingTdr()"><mat-icon>close</mat-icon></button>
                </div>
                <label class="btn-pick-tdr" *ngIf="!pendingTdrFile">
                  <mat-icon>upload_file</mat-icon> Sélectionner un TDR corrigé
                  <input type="file" accept=".pdf,.doc,.docx" (change)="onTdrFileSelected($event)" hidden>
                </label>
              </div>
              <div class="reject-actions">
                <button mat-stroked-button (click)="showReject=false;rejectReason='';clearPendingTdr()">Annuler</button>
                <button mat-raised-button class="btn-reject" (click)="copReject()" [disabled]="!rejectReason || saving() || tdrUploading()">
                  <mat-icon>send</mat-icon> {{tdrUploading() ? 'Envoi TDR...' : 'Confirmer le rejet'}}
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- TDR -->
        <div class="tdr-row" *ngIf="budget()?.tdrFilePath">
          <mat-icon>description</mat-icon>
          <span>Termes de Référence (TDR) disponible</span>
          <button mat-stroked-button (click)="downloadTdr()">
            <mat-icon>download</mat-icon> Télécharger TDR
          </button>
        </div>

        <!-- Recalls (visible si approuvé) -->
        <app-budget-recall
          *ngIf="budget()?.status === 'approved'"
          [budgetId]="budget().id"
          [budgetStatus]="budget().status">
        </app-budget-recall>

      </div>
    </div>
  `,
  styles: [`
    .review-container { padding:0; }
    .page-header { background:linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; position:relative; }
    .page-header-triband { height:6px; background:linear-gradient(to right,#F4A623 33.3%,#fff 33.3% 66.6%,#1F8A3C 66.6%); }
    .page-header-inner { display:flex; align-items:center; gap:12px; padding:16px 20px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.25rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.85; font-size:.82rem; }

    .loading-state { text-align:center; padding:60px; color:#888; }
    .loading-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; }

    .review-body { padding:16px 20px; display:flex; flex-direction:column; gap:16px; }
    .tdr-row { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#EEF4FA; border-radius:10px; border:1px solid #DEEAF1; }
    .tdr-row mat-icon { color:#1F4E79; }
    .tdr-row span { flex:1; font-size:13px; font-weight:600; color:#1F4E79; }

    .info-card mat-card-content { padding:16px !important; }
    .info-grid { display:flex; flex-wrap:wrap; gap:16px; margin-bottom:14px; }
    .info-item { display:flex; align-items:flex-start; gap:8px; }
    .info-item mat-icon { color:#2E75B6; margin-top:2px; font-size:18px; width:18px; }
    .info-item label { display:block; font-size:.72rem; color:#888; font-weight:600; text-transform:uppercase; }
    .info-item span { font-size:.9rem; font-weight:500; }

    .status-row { display:flex; align-items:center; gap:10px; padding-top:10px; border-top:1px solid #eee; }
    .status-chip { padding:4px 14px; border-radius:20px; color:#fff; font-size:.78rem; font-weight:700; }
    .workflow-hint { display:flex; align-items:center; gap:4px; font-size:.8rem; color:#667085; }
    .workflow-hint mat-icon { font-size:16px; width:16px; }

    .table-wrapper { overflow-x:auto; border-radius:8px; border:1px solid #e0e0e0; }
    .budget-table { width:100%; border-collapse:collapse; font-size:.82rem; }
    .budget-table thead tr { background:linear-gradient(90deg,#1F4E79,#2E75B6); color:#fff; }
    .budget-table thead th { padding:8px 10px; text-align:center; font-weight:600; white-space:nowrap; }
    .col-desig { text-align:left !important; min-width:240px; }
    .col-num { width:40px; }
    .col-num-field { width:110px; }
    .col-total { width:130px; }

    .row-section-header { background:#1F4E79; color:#fff; }
    .row-section-header .num-cell { font-weight:700; text-align:center; padding:6px 8px; }
    .section-label { font-weight:700; padding:6px 10px; text-transform:uppercase; font-size:.82rem; }
    .row-sub-header { background:#d0e4f7; }
    .sub-label { padding:4px 10px; font-weight:600; color:#1F4E79; font-size:.8rem; font-style:italic; }
    .row-item { background:#fff; }
    .row-item:nth-child(odd) { background:#fafafa; }
    .row-item td { border-bottom:1px solid #f0f0f0; }
    .desig-cell { padding:4px 10px; }
    .num-cell { text-align:center; padding:4px 6px; }
    .amount-cell { text-align:right; padding:4px 10px; font-family:monospace; font-size:.8rem; }
    .amount-cell.usd { color:#666; }
    .row-subtotal { background:#e8f0fb; }
    .row-subtotal td { border-top:1px solid #c5d8f0; }
    .row-total { background:#c5d8f0; }
    .row-total .total-label { font-weight:700; color:#1F4E79; padding:6px 10px; }
    .row-tax { background:#f9f9f9; }
    .tax-label { padding:3px 10px; color:#555; font-style:italic; font-size:.79rem; }
    .row-grand-total { background:linear-gradient(90deg,#1F4E79,#2E75B6); color:#fff; }
    .row-grand-total td { padding:10px; }
    .grand-label { font-weight:700; text-transform:uppercase; }
    .grand-amount { font-size:1rem; font-weight:700; }

    .decision-card { border-top:4px solid #2E75B6 !important; }
    .finance-card { border-top-color:#0277BD !important; }
    .cop-card { border-top-color:#1F8A3C !important; }
    .decision-card mat-card-content { padding:20px !important; }
    .decision-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    .decision-header h3 { margin:0; color:#1F4E79; font-size:1.05rem; }
    .finance-icon { color:#0277BD; }
    .tpm-icon { color:#2E75B6; }
    .cop-icon { color:#1F8A3C; }
    .decision-hint { font-size:.83rem; color:#667085; margin:0 0 16px; }
    .decision-btns { display:flex; gap:12px; margin-bottom:16px; }
    .btn-approve { background:#2e7d32 !important; color:#fff !important; }
    .btn-reject { background:#c62828 !important; color:#fff !important; }
    .reject-form { border-top:1px solid #eee; padding-top:16px; }
    .full-width { width:100%; }
    .reject-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:8px; }

    .tdr-correction-zone { margin:12px 0 8px; padding:10px 12px; background:#f9fbe7; border:1px dashed #c5e1a5; border-radius:6px; display:flex; flex-direction:column; gap:8px; }
    .tdr-corr-hint { display:flex; align-items:center; gap:6px; font-size:.8rem; color:#558b2f; font-weight:600; }
    .tdr-corr-hint mat-icon { font-size:16px; width:16px; height:16px; }
    .tdr-file-selected { display:flex; align-items:center; gap:8px; font-size:.85rem; color:#33691e; background:#dcedc8; border-radius:4px; padding:4px 8px; }
    .tdr-file-selected mat-icon { font-size:18px; width:18px; height:18px; color:#33691e; }
    .tdr-file-selected span { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .btn-pick-tdr { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; background:#558b2f; color:#fff; border-radius:5px; font-size:.8rem; font-weight:600; cursor:pointer; border:none; width:fit-content; }
    .btn-pick-tdr mat-icon { font-size:15px; width:15px; height:15px; }
    .btn-pick-tdr:hover { background:#33691e; }
  `]
})
export class BudgetReviewComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  snack = inject(MatSnackBar);
  appConfig = inject(AppConfigService);

  budget = signal<any>(null);
  loading = signal(true);
  saving = signal(false);
  tdrUploading = signal(false);
  showReject = false;
  rejectReason = '';
  pendingTdrFile: File | null = null;
  rows: BudgetRow[] = [];
  lineMap: Record<string, any> = {};
  amounts: Record<string, number> = {};

  BUDGET_STATUS = BUDGET_STATUS_ENUMERATION as any;

  typeLabel(t: string) { return BUDGET_TYPE_LABELS[t] ?? t; }
  statusLabel(s: string) { return BUDGET_STATUS_LABELS[s]?.label ?? s; }
  statusColor(s: string) { return BUDGET_STATUS_LABELS[s]?.color ?? '#999'; }
  fundLabel() { return this.budget()?.fund?.name ?? ''; }

  reviewTitle() {
    const b = this.budget();
    if (!b) return 'Révision du budget';
    if (b.status === this.BUDGET_STATUS.SUBMITTED) return 'Contrôle Finance';
    if (b.status === this.BUDGET_STATUS.FINANCE_REVIEWED) return 'Vérification TPM';
    if (b.status === this.BUDGET_STATUS.TPM_APPROVED) return 'Validation COP';
    return 'Détail du budget';
  }

  canShow(row: BudgetRow, amounts: Record<string, number>): boolean {
    const b = this.budget();
    if (!b || b.status !== this.BUDGET_STATUS.APPROVED) return true;

    // Custom rows carry sectionKey directly; template rows use naming convention
    const sectionTotalKey = (row as CustomBudgetRow).sectionKey
      ?? `${row.rowKey.split('_')[0]}_total`;
    const sectionTotal = amounts[sectionTotalKey] ?? 0;

    if (sectionTotal <= 0) return false;
    if (row.type === 'section_header') return true;

    return (amounts[row.rowKey] ?? 0) > 0;
  }

  canActAsFinance() {
    const b = this.budget();
    return b && b.status === this.BUDGET_STATUS.SUBMITTED && this.auth.isAdminFinance();
  }

  canActAsTPM() {
    const b = this.budget();
    return b && b.status === this.BUDGET_STATUS.FINANCE_REVIEWED && this.auth.isAdminTPM();
  }

  canActAsCOP() {
    const b = this.budget();
    return b && b.status === this.BUDGET_STATUS.TPM_APPROVED && this.auth.isCOP();
  }

  fmt(v: any) { return v != null && v !== 0 ? v : ''; }
  fmtAmount(v: number) {
    if (!v || v === 0) return '-';
    return new Intl.NumberFormat('fr-FR').format(Math.round(v));
  }
  fmtUSD(v: number) {
    const rate = this.budget()?.exchangeRate ?? 655;
    if (!v || v === 0 || !rate) return '-';
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / rate);
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      const b = await firstValueFrom(this.api.getBudget(id));
      this.budget.set(b);
      const template = BUDGET_TEMPLATES[b.budgetType] ?? [];
      const customRows = parseCustomRowsFromLines(b.lines ?? []);
      this.rows = buildRowsWithCustoms(template, customRows);
      const map: Record<string, any> = {};
      for (const line of b.lines ?? []) map[line.rowKey] = line;
      this.lineMap = map;
      // Appliquer le taux de transfert pour CONTRACTUALISATION + recalculer
      const rows = this.rows.map(r =>
        r.rowKey === 'transfert_frais' && b.transferFeeRate
          ? { ...r, taxRate: b.transferFeeRate }
          : r
      );
      this.amounts = computeAmounts(rows, this.lineMap);
    } finally {
      this.loading.set(false);
    }
  }

  async financeApprove() {
    if (!confirm('Valider le contrôle financier et transmettre au TPM ?')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.financeReviewBudget(this.budget()!.id, { decision: 'finance_reviewed' }));
      this.snack.open('Budget transmis au TPM pour vérification', 'OK', { duration: 4000 });
      this.router.navigate(['/budgets']);
    } catch {
      this.snack.open('Erreur lors de la validation Finance', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async financeReject() {
    if (!this.rejectReason) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.financeReviewBudget(this.budget()!.id, { decision: 'rejected', rejectionReason: this.rejectReason }));
      this.snack.open('Budget rejeté par Finance', 'OK', { duration: 3000 });
      this.router.navigate(['/budgets']);
    } catch {
      this.snack.open('Erreur lors du rejet', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async tpmApprove() {
    if (!confirm('Valider ce budget et le transmettre au Chief of Party ?')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.tpmReviewBudget(this.budget()!.id, { decision: 'tpm_approved' }));
      this.snack.open('Budget transmis au COP pour validation finale', 'OK', { duration: 4000 });
      this.router.navigate(['/budgets']);
    } catch {
      this.snack.open('Erreur lors de la validation TPM', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  onTdrFileSelected(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    this.pendingTdrFile = f ?? null;
  }

  clearPendingTdr() {
    this.pendingTdrFile = null;
  }

  private async uploadPendingTdr(): Promise<void> {
    if (!this.pendingTdrFile || !this.budget()) return;
    const fd = new FormData();
    fd.append('file', this.pendingTdrFile);
    this.tdrUploading.set(true);
    try {
      await firstValueFrom(this.api.uploadBudgetTdr(this.budget().id, fd));
      this.pendingTdrFile = null;
    } finally {
      this.tdrUploading.set(false);
    }
  }

  async tpmReject() {
    if (!this.rejectReason) return;
    this.saving.set(true);
    try {
      if (this.pendingTdrFile) await this.uploadPendingTdr();
      await firstValueFrom(this.api.tpmReviewBudget(this.budget()!.id, { decision: 'rejected', rejectionReason: this.rejectReason }));
      this.snack.open('Budget rejeté' + (this.budget()?.tdrFilePath ? ' — TDR corrigé enregistré' : ''), 'OK', { duration: 3000 });
      this.router.navigate(['/budgets']);
    } catch {
      this.snack.open('Erreur lors du rejet', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async copApprove() {
    if (!confirm('Approuver définitivement ce budget ?')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.copReviewBudget(this.budget()!.id, { decision: 'approved' }));
      this.snack.open('Budget approuvé', 'OK', { duration: 3000 });
      this.router.navigate(['/budgets']);
    } catch {
      this.snack.open('Erreur lors de l\'approbation', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async copReject() {
    if (!this.rejectReason) return;
    this.saving.set(true);
    try {
      if (this.pendingTdrFile) await this.uploadPendingTdr();
      await firstValueFrom(this.api.copReviewBudget(this.budget()!.id, { decision: 'rejected', rejectionReason: this.rejectReason }));
      this.snack.open('Budget rejeté' + (this.pendingTdrFile ? ' — TDR corrigé enregistré' : ''), 'OK', { duration: 3000 });
      this.router.navigate(['/budgets']);
    } catch {
      this.snack.open('Erreur lors du rejet', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async downloadTdr() {
    const b = this.budget();
    if (!b?.tdrFilePath) return;
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
}
