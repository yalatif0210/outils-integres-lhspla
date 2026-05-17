import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'En attente de validation',
  validated: 'Validée',
  paid: 'Payée',
};
const STATUS_COLORS: Record<string, string> = {
  uploaded: '#f57c00',
  validated: '#388e3c',
  paid: '#1976d2',
};

interface PaymentSummary {
  initialTotal: number;
  effectiveTotal: number;
  totalPaid: number;
  memoEnabled: boolean;
  totalBudget: number;
  resteAPayer: number;
}

@Component({
  selector: 'app-payment-request',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <mat-card class="pr-card">
      <mat-card-content>
        <div class="pr-header">
          <mat-icon class="pr-icon">payment</mat-icon>
          <div class="pr-title-block">
            <strong>Demandes de paiement</strong>
            <span class="pr-count">{{requests().length}} demande(s)</span>
          </div>
          <button mat-stroked-button class="btn-template" (click)="downloadTemplate()"
                  *ngIf="canDownloadTemplate()">
            <mat-icon>download</mat-icon> Modèle Excel
          </button>
          <label class="btn-upload-pr" *ngIf="canUpload() && !isFullyPaid()">
            <mat-icon>upload_file</mat-icon>
            {{uploading() ? 'Envoi...' : 'Déposer demande'}}
            <input type="file" accept=".xlsx,.xls" (change)="uploadRequest($event)"
                   [disabled]="uploading()" hidden>
          </label>
          <div id="block_payment" class="block-payment-msg" *ngIf="canUpload() && isFullyPaid()">
            <mat-icon>lock</mat-icon> Budget entièrement payé — dépôt de demande impossible
          </div>
        </div>

        <!-- Résumé financier global -->
        <div class="financial-summary" *ngIf="summary() && canManagePayments()">
          <!-- id="tb_adj" affiché si MEMO activé, id="tb_init" sinon -->
          <div class="fin-row">
            <span class="fin-label">
              <mat-icon>account_balance_wallet</mat-icon> Total budget
              <span class="fin-memo-tag" *ngIf="memoEnabledSig()">ajusté MEMO</span>
            </span>
            <span id="tb_adj" class="fin-value" *ngIf="memoEnabledSig()">{{fmtFcfa(totalBudget())}}</span>
            <span id="tb_init" class="fin-value" *ngIf="!memoEnabledSig()">{{fmtFcfa(totalBudget())}}</span>
          </div>
          <div class="fin-row">
            <span class="fin-label"><mat-icon>check_circle</mat-icon> Total versé</span>
            <span id="tb_paid" class="fin-value fin-paid">{{fmtFcfa(totalPaid())}}</span>
          </div>
          <div class="fin-row" *ngIf="resteAPayer() > 0">
            <span class="fin-label"><mat-icon>pending</mat-icon> Reste à payer (max autorisé)</span>
            <span id="tb_rest" class="fin-value fin-reste">{{fmtFcfa(resteAPayer())}}</span>
          </div>
          <div class="fin-row fin-paid-full" *ngIf="isFullyPaid()">
            <mat-icon>verified</mat-icon> Budget entièrement payé
          </div>
          <div class="fin-alert" *ngIf="isOverpaid()">
            <mat-icon>warning</mat-icon> Montant versé dépasse le budget !
          </div>
        </div>

        <div *ngIf="loading()" class="pr-loading">Chargement...</div>

        <div *ngIf="!loading() && requests().length === 0" class="pr-empty">
          Aucune demande de paiement pour ce budget.
        </div>

        <div class="pr-list" *ngIf="!loading() && requests().length > 0">
          <div class="pr-item" *ngFor="let r of requests()">
            <div class="pr-item-header">
              <span class="pr-status" [style.background]="statusColor(r.status)">
                {{statusLabel(r.status)}}
                <ng-container *ngIf="r.status === 'paid' && paidAmountForRequest(r) > 0">
                  — {{fmtFcfa(paidAmountForRequest(r))}}
                </ng-container>
              </span>
              <span class="pr-date">{{r.uploadedAt | date:'dd/MM/yyyy HH:mm'}}</span>
              <span class="pr-by">par {{r.uploadedBy?.firstName}} {{r.uploadedBy?.lastName}}</span>
            </div>

            <div class="pr-rejection" *ngIf="r.rejectionReason && r.status === 'uploaded'">
              <mat-icon>error_outline</mat-icon> {{r.rejectionReason}}
            </div>

            <div class="pr-actions">
              <button mat-stroked-button (click)="downloadRequest(r)" matTooltip="Télécharger la demande">
                <mat-icon>download</mat-icon> Demande Excel
              </button>

              <!-- Actions admin_finance -->
              <ng-container *ngIf="canValidate() && r.status === 'uploaded'">
                <button mat-raised-button color="primary" (click)="validate(r)" [disabled]="saving()">
                  <mat-icon>check_circle</mat-icon> Valider
                </button>
                <button mat-raised-button color="warn" (click)="openReject(r)" [disabled]="saving()">
                  <mat-icon>cancel</mat-icon> Rejeter
                </button>
              </ng-container>

              <!-- Motif rejet inline -->
              <ng-container *ngIf="rejectingId() === r.id">
                <input class="reject-input" [(ngModel)]="rejectReason" placeholder="Motif du rejet...">
                <button mat-raised-button color="warn" (click)="confirmReject(r)" [disabled]="!rejectReason.trim()">
                  Confirmer rejet
                </button>
                <button mat-button (click)="rejectingId.set(null)">Annuler</button>
              </ng-container>

              <!-- Supprimer demande en attente — initiateur -->
              <button mat-icon-button color="warn"
                      *ngIf="canDeleteRequest(r)"
                      (click)="deleteRequest(r)"
                      matTooltip="Supprimer cette demande"
                      [disabled]="saving()">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>

            <!-- Zone preuve — chargee_tresorerie (uniquement si pas encore entièrement payé) -->
            <div class="proof-upload-zone" *ngIf="canUploadProof() && r.status === 'validated' && !isFullyPaid()">
              <div class="proof-amount-row">
                <input type="number" class="amount-input" [(ngModel)]="proofAmounts[r.id]"
                       placeholder="Montant versé (FCFA)" min="1"
                       [max]="resteAPayer()">
                <span class="amount-hint" *ngIf="resteAPayer() > 0">
                  Max : {{fmtFcfa(resteAPayer())}}
                </span>
              </div>
              <!-- id="tb_block" : avertissement bloquant si montant > reste à payer -->
              <div id="tb_block" class="amount-over"
                   *ngIf="proofAmounts[r.id] > 0 && resteAPayer() > 0 && proofAmounts[r.id] > resteAPayer()">
                <mat-icon>warning</mat-icon>
                Montant saisi ({{fmtFcfa(proofAmounts[r.id])}}) dépasse le reste à payer ({{fmtFcfa(resteAPayer())}})
              </div>
              <label class="btn-proof"
                     [class.disabled]="!proofAmounts[r.id] || proofAmounts[r.id] <= 0 || (resteAPayer() > 0 && proofAmounts[r.id] > resteAPayer())">
                <mat-icon>attach_file</mat-icon>
                {{uploadingProofId() === r.id ? 'Envoi...' : 'Ajouter preuve de paiement'}}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                       (change)="uploadProof(r, $event)"
                       [disabled]="uploadingProofId() === r.id || !proofAmounts[r.id] || proofAmounts[r.id] <= 0 || (resteAPayer() > 0 && proofAmounts[r.id] > resteAPayer())"
                       hidden>
              </label>
            </div>
            <div class="proof-blocked" *ngIf="canUploadProof() && r.status === 'validated' && isFullyPaid()">
              <mat-icon>lock</mat-icon> Budget entièrement payé — aucun dépôt supplémentaire possible
            </div>

            <!-- Preuves de paiement -->
            <div class="pr-proofs" *ngIf="r.proofs?.length > 0">
              <div class="proof-item" *ngFor="let p of r.proofs">
                <mat-icon class="proof-icon">{{proofIcon(p.fileType)}}</mat-icon>
                <span class="proof-name">{{p.fileName}}</span>
                <span class="proof-amount" *ngIf="p.amount > 0">{{fmtFcfa(p.amount)}}</span>
                <span class="proof-date">{{p.uploadedAt | date:'dd/MM/yyyy'}}</span>
                <button mat-icon-button (click)="downloadProof(r, p)" matTooltip="Télécharger">
                  <mat-icon>download</mat-icon>
                </button>
                <!-- Suppression : chargee_tresorerie uniquement -->
                <button mat-icon-button color="warn" (click)="deleteProof(r, p)"
                        *ngIf="canDeleteProof()" matTooltip="Supprimer cette preuve (versée par erreur)"
                        [disabled]="saving()">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .pr-card { border-radius: 10px !important; border: 1px solid #e3f2fd !important; margin-top: 8px; }
    .pr-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .pr-icon { color: #1976d2; font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; }
    .pr-title-block { flex: 1; }
    .pr-title-block strong { display: block; font-size: 13px; color: #1F4E79; }
    .pr-count { font-size: 11px; color: #888; }

    .financial-summary { background: #f5f5f5; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
    .fin-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; padding: 3px 0; }
    .fin-label { display: flex; align-items: center; gap: 4px; color: #555; }
    .fin-label mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .fin-value { font-weight: 700; color: #333; font-family: monospace; }
    .fin-paid { color: #1565c0; }
    .fin-reste { color: #e65100; }
    .fin-paid-full { display: flex; align-items: center; gap: 5px; color: #1b5e20; font-weight: 700; font-size: 12px; padding: 4px 0; }
    .fin-paid-full mat-icon { font-size: 16px; width: 16px; height: 16px; color: #1b5e20; }
    .fin-alert { display: flex; align-items: center; gap: 5px; color: #b71c1c; font-weight: 700; font-size: 12px; padding: 4px 0; }
    .fin-alert mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .btn-template, .btn-upload-pr, .btn-proof {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      border-radius: 6px; padding: 6px 12px;
    }
    .btn-template { border: 1px solid #1976d2; color: #1976d2; background: transparent; }
    .btn-upload-pr { background: #1F4E79; color: #fff; border: none; }
    .btn-upload-pr:hover { background: #163d61; }
    .btn-proof { background: #388e3c; color: #fff; border: none; }
    .btn-proof:hover { background: #276221; }
    .btn-proof.disabled { background: #aaa; cursor: not-allowed; }
    .btn-template mat-icon, .btn-upload-pr mat-icon, .btn-proof mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .pr-loading { color: #888; font-size: 13px; padding: 8px 0; }
    .pr-empty { color: #aaa; font-size: 13px; padding: 8px 0; font-style: italic; }

    .pr-list { display: flex; flex-direction: column; gap: 10px; }
    .pr-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; background: #fafafa; }
    .pr-item-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .pr-status { font-size: 11px; font-weight: 700; color: #fff; padding: 2px 8px; border-radius: 10px; }
    .pr-date { font-size: 11px; color: #666; }
    .pr-by { font-size: 11px; color: #888; }

    .pr-rejection { display: flex; align-items: center; gap: 5px; background: #ffebee; border-radius: 5px; padding: 5px 8px; font-size: 12px; color: #c62828; margin-bottom: 6px; }
    .pr-rejection mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .pr-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .reject-input { border: 1px solid #ddd; border-radius: 5px; padding: 4px 8px; font-size: 12px; flex: 1; min-width: 180px; }

    .proof-upload-zone { border: 1px dashed #c8e6c9; border-radius: 6px; padding: 8px 10px; margin: 8px 0; background: #f9fbe7; }
    .proof-amount-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .amount-input { border: 1px solid #c8e6c9; border-radius: 5px; padding: 4px 8px; font-size: 12px; width: 180px; }
    .amount-hint { font-size: 11px; color: #388e3c; }
    .amount-over { display: flex; align-items: center; gap: 5px; color: #b71c1c; font-size: 12px; font-weight: 600; padding: 4px 0; margin-bottom: 4px; }
    .amount-over mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .fin-memo-tag { font-size: 10px; font-weight: 700; background: #ede9fe; color: #5b21b6; border-radius: 8px; padding: 1px 6px; margin-left: 4px; }
    .proof-blocked { display: flex; align-items: center; gap: 5px; color: #888; font-size: 12px; font-style: italic; padding: 4px 0; }
    .proof-blocked mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .block-payment-msg { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #b71c1c; background: #ffebee; border-radius: 6px; padding: 5px 10px; }
    .block-payment-msg mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .pr-proofs { border-top: 1px solid #eee; padding-top: 6px; display: flex; flex-direction: column; gap: 4px; }
    .proof-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555; }
    .proof-icon { font-size: 16px; width: 16px; height: 16px; color: #1976d2; }
    .proof-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .proof-amount { font-size: 11px; font-weight: 700; color: #1565c0; background: #e3f2fd; padding: 1px 6px; border-radius: 8px; flex-shrink: 0; }
    .proof-date { font-size: 11px; color: #aaa; flex-shrink: 0; }
  `]
})
export class PaymentRequestComponent implements OnInit {
  @Input() budgetId!: string;
  @Input() budgetEntityCode!: string;
  @Input() budgetTotalAmount: number = 0;

  api = inject(ApiService);
  auth = inject(AuthService);
  snack = inject(MatSnackBar);

  requests = signal<any[]>([]);
  summary = signal<PaymentSummary | null>(null);
  loading = signal(true);
  uploading = signal(false);
  saving = signal(false);
  rejectingId = signal<string | null>(null);
  rejectReason = '';
  uploadingProofId = signal<string | null>(null);

  proofAmounts: Record<string, number> = {};

  // Derived from summary (fallback to input for optimistic display before load)
  totalBudget = computed(() => this.summary()?.totalBudget ?? this.budgetTotalAmount);
  totalPaid = computed(() => this.summary()?.totalPaid ?? 0);
  resteAPayer = computed(() => this.summary()?.resteAPayer ?? Math.max(0, this.totalBudget() - this.totalPaid()));
  memoEnabledSig = computed(() => this.summary()?.memoEnabled ?? false);
  isFullyPaid = computed(() => this.totalBudget() > 0 && this.totalPaid() >= this.totalBudget());
  isOverpaid = computed(() => this.totalBudget() > 0 && this.totalPaid() > this.totalBudget());

  canDownloadTemplate() { return true; }
  canUpload() {
    return this.auth.isEntityMember() && this.auth.entityCode() === this.budgetEntityCode;
  }
  canValidate() { return this.auth.isAdminFinance() || this.auth.isSuperAdmin(); }
  canUploadProof() { return this.auth.isChargeeTresorerie() || this.auth.isSuperAdmin(); }
  canManagePayments() { return this.auth.isAdminFinance() || this.auth.isChargeeTresorerie() || this.auth.isSuperAdmin(); }
  canDeleteRequest(r: any) {
    return r.status === 'uploaded'
      && (this.auth.isSuperAdmin()
        || r.uploadedBy?.id === this.auth.currentUser()?.id
        || (this.auth.isEntityMember() && this.auth.entityCode() === this.budgetEntityCode));
  }
  // Suppression preuve : chargee_tresorerie uniquement (spec SECTION 1 §2.1)
  canDeleteProof() { return this.auth.isChargeeTresorerie() || this.auth.isSuperAdmin(); }

  paidAmountForRequest(r: any): number {
    return (r.proofs ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
  }

  statusLabel(s: string) { return STATUS_LABELS[s] ?? s; }
  statusColor(s: string) { return STATUS_COLORS[s] ?? '#999'; }
  proofIcon(fileType: string) {
    return fileType?.includes('pdf') ? 'picture_as_pdf' : 'image';
  }
  fmtFcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
  }

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const [list, s] = await Promise.all([
        firstValueFrom(this.api.getPaymentRequests(this.budgetId)),
        firstValueFrom(this.api.getPaymentSummary(this.budgetId)),
      ]);
      this.requests.set(list);
      this.summary.set(s);
    } catch {
      // loading=false handled in finally
    } finally {
      this.loading.set(false);
    }
  }

  async downloadTemplate() {
    try {
      const blob = await firstValueFrom(this.api.downloadPaymentTemplate());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'modele_demande_paiement.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Aucun modèle disponible. Contactez l\'admin Finance.', 'OK', { duration: 4000 });
    }
  }

  async uploadRequest(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    this.uploading.set(true);
    try {
      const pr = await firstValueFrom(this.api.uploadPaymentRequest(this.budgetId, fd));
      this.requests.update(list => {
        const idx = list.findIndex(r => r.id === pr.id);
        return idx >= 0 ? list.map(r => r.id === pr.id ? pr : r) : [pr, ...list];
      });
      this.snack.open('Demande de paiement déposée', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors du dépôt', 'OK', { duration: 3000 });
    } finally {
      this.uploading.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async validate(r: any) {
    if (!confirm('Valider cette demande de paiement ?')) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.validatePaymentRequest(r.id));
      this.requests.update(list => list.map(x => x.id === r.id ? { ...x, ...updated } : x));
      this.snack.open('Demande validée', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors de la validation', 'OK', { duration: 3000 });
    } finally { this.saving.set(false); }
  }

  openReject(r: any) {
    this.rejectingId.set(r.id);
    this.rejectReason = '';
  }

  async confirmReject(r: any) {
    if (!this.rejectReason.trim()) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.rejectPaymentRequest(r.id, this.rejectReason.trim()));
      this.requests.update(list => list.map(x => x.id === r.id ? { ...x, ...updated } : x));
      this.rejectingId.set(null);
      this.snack.open('Demande rejetée', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors du rejet', 'OK', { duration: 3000 });
    } finally { this.saving.set(false); }
  }

  async downloadRequest(r: any) {
    try {
      const blob = await firstValueFrom(this.api.downloadPaymentRequest(r.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = r.fileName ?? 'demande_paiement.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Erreur lors du téléchargement', 'OK', { duration: 3000 });
    }
  }

  async uploadProof(r: any, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const amount = this.proofAmounts[r.id];
    if (!amount || amount <= 0) {
      this.snack.open('Le montant de la preuve est obligatoire et doit être > 0', 'OK', { duration: 3500 });
      (event.target as HTMLInputElement).value = '';
      return;
    }
    const reste = this.resteAPayer();
    if (reste > 0 && amount > reste) {
      this.snack.open(`Montant (${this.fmtFcfa(amount)}) dépasse le reste à payer (${this.fmtFcfa(reste)})`, 'OK', { duration: 4000 });
      (event.target as HTMLInputElement).value = '';
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('amount', String(amount));
    this.uploadingProofId.set(r.id);
    try {
      await firstValueFrom(this.api.uploadPaymentProof(r.id, fd));
      delete this.proofAmounts[r.id];
      this.load();
      this.snack.open(`Preuve versée (${this.fmtFcfa(amount)}) — statut : Payé`, 'OK', { duration: 3000 });
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors du versement de la preuve';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.uploadingProofId.set(null);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async deleteRequest(r: any) {
    if (!confirm('Supprimer cette demande de paiement ?')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deletePaymentRequest(r.id));
      this.requests.update(list => list.filter(x => x.id !== r.id));
      this.snack.open('Demande supprimée', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally { this.saving.set(false); }
  }

  async deleteProof(r: any, p: any) {
    if (!confirm(`Supprimer la preuve "${p.fileName}" (${this.fmtFcfa(p.amount ?? 0)}) versée par erreur ?`)) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deletePaymentProof(r.id, p.id));
      this.load();
      this.snack.open('Preuve supprimée', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally { this.saving.set(false); }
  }

  async downloadProof(r: any, p: any) {
    try {
      const blob = await firstValueFrom(this.api.downloadPaymentProof(r.id, p.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = p.fileName; a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Erreur lors du téléchargement', 'OK', { duration: 3000 });
    }
  }
}
