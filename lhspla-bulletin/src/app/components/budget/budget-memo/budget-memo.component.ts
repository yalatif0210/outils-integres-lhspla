import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChip } from '@angular/material/chips';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

type MemoCategory = 'rallonge_budgetaire' | 'reduction_budgetaire' | 'sans_incidence';
type MemoStatus = 'pending_cop' | 'approved' | 'rejected';

const CATEGORY_LABELS: Record<MemoCategory, string> = {
  rallonge_budgetaire: 'Rallonge budgétaire',
  reduction_budgetaire: 'Réduction budgétaire',
  sans_incidence: 'Sans incidence budgétaire',
};

const CATEGORY_COLORS: Record<MemoCategory, string> = {
  rallonge_budgetaire: '#1b5e20',
  reduction_budgetaire: '#b71c1c',
  sans_incidence: '#4a148c',
};

const STATUS_LABELS: Record<MemoStatus, string> = {
  pending_cop: 'En attente COP',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

const STATUS_COLORS: Record<MemoStatus, string> = {
  pending_cop: '#e65100',
  approved: '#1b5e20',
  rejected: '#b71c1c',
};

@Component({
  selector: 'app-budget-memo',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCard, MatCardContent,
    MatButton, MatIconButton,
    MatIcon,
    MatSelect, MatOption,
    MatFormField, MatLabel, MatSuffix,
    MatInput,
    MatTooltip,
  ],
  template: `
    <mat-card class="memo-card">
      <mat-card-content>
        <div class="memo-header">
          <mat-icon class="memo-icon">edit_note</mat-icon>
          <div class="memo-title-block">
            <strong>MEMOs budgétaires</strong>
            <span class="memo-count">{{memos().length}} memo(s)</span>
          </div>
          <button mat-stroked-button class="btn-add-memo"
                  (click)="showForm.set(!showForm())"
                  [disabled]="!canCreate()"
                  [matTooltip]="canCreate() ? '' : 'Accès non autorisé pour votre rôle'">
            <mat-icon>{{showForm() ? 'close' : 'add'}}</mat-icon>
            {{showForm() ? 'Annuler' : 'Ajouter un MEMO'}}
          </button>
        </div>

        <!-- Résumé financier (memos approuvés uniquement) -->
        <div class="memo-financial" *ngIf="approvedMemos().length > 0">
          <div class="mf-row" *ngIf="totalRallonge() > 0">
            <span class="mf-label rallonge"><mat-icon>trending_up</mat-icon> Rallonge approuvée</span>
            <span class="mf-value positive">+{{fmtFcfa(totalRallonge())}}</span>
          </div>
          <div class="mf-row" *ngIf="totalReduction() > 0">
            <span class="mf-label reduction"><mat-icon>trending_down</mat-icon> Réduction approuvée</span>
            <span class="mf-value negative">-{{fmtFcfa(totalReduction())}}</span>
          </div>
          <div class="mf-row mf-total">
            <span class="mf-label"><mat-icon>account_balance_wallet</mat-icon> Montant total ajusté</span>
            <span class="mf-value">{{fmtFcfa(effectiveTotal())}}</span>
          </div>
          <div class="pending-note" *ngIf="pendingMemos().length > 0">
            <mat-icon>schedule</mat-icon>
            {{pendingMemos().length}} memo(s) en attente de validation COP — non comptabilisé(s)
          </div>
        </div>

        <!-- Formulaire ajout memo -->
        <div class="memo-form" *ngIf="showForm()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Catégorie *</mat-label>
            <mat-select [(ngModel)]="form.category" (ngModelChange)="onCategoryChange()">
              <mat-option value="rallonge_budgetaire">Rallonge budgétaire</mat-option>
              <mat-option value="reduction_budgetaire">Réduction budgétaire</mat-option>
              <mat-option value="sans_incidence">Sans incidence budgétaire</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width"
                          *ngIf="form.category && form.category !== 'sans_incidence'">
            <mat-label>Montant (FCFA) *</mat-label>
            <input matInput type="number" [(ngModel)]="form.amount" min="1"
                   placeholder="Ex: 500000">
          </mat-form-field>
          <div class="sans-incidence-note" *ngIf="form.category === 'sans_incidence'">
            <mat-icon>info</mat-icon> Aucun impact financier — montant = 0 FCFA
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contenu du MEMO (texte optionnel)</mat-label>
            <textarea matInput [(ngModel)]="form.content" rows="3"
                      placeholder="Décrivez l'objet du memo…"></textarea>
          </mat-form-field>

          <div class="file-upload-row">
            <label class="btn-upload-memo">
              <mat-icon>upload_file</mat-icon>
              {{form.file ? form.file.name : 'Joindre un fichier (PDF/Word — obligatoire) *'}}
              <input type="file" accept=".pdf,.doc,.docx" (change)="onFileChange($event)" hidden>
            </label>
            <button mat-icon-button color="warn" *ngIf="form.file" (click)="form.file = null"
                    matTooltip="Retirer le fichier">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="form-actions">
            <button mat-raised-button color="primary" (click)="submitMemo()"
                    [disabled]="!isFormValid() || submitting()">
              <mat-icon>save</mat-icon> {{submitting() ? 'Enregistrement...' : 'Enregistrer le MEMO'}}
            </button>
          </div>
        </div>

        <!-- Liste memos -->
        <div *ngIf="loading()" class="memo-loading">Chargement...</div>

        <div *ngIf="!loading() && memos().length === 0 && !showForm()" class="memo-empty">
          Aucun MEMO pour ce budget.
        </div>

        <div class="memo-list" *ngIf="!loading() && memos().length > 0">
          <div class="memo-item" *ngFor="let m of memos()"
               [class.memo-pending]="m.status === 'pending_cop'"
               [class.memo-rejected]="m.status === 'rejected'">
            <div class="memo-item-header">
              <span class="memo-category-chip"
                    [style.background]="categoryColor(m.category)"
                    [style.color]="'#fff'">
                {{categoryLabel(m.category)}}
              </span>
              <span class="memo-status-chip"
                    [style.background]="statusBg(m.status)"
                    [style.color]="statusColor(m.status)">
                <mat-icon class="status-icon">{{statusIcon(m.status)}}</mat-icon>
                {{statusLabel(m.status)}}
              </span>
              <span class="memo-amount" *ngIf="m.amount > 0"
                    [class.positive]="m.category === 'rallonge_budgetaire'"
                    [class.negative]="m.category === 'reduction_budgetaire'"
                    [class.dimmed]="m.status !== 'approved'">
                {{m.category === 'rallonge_budgetaire' ? '+' : '-'}}{{fmtFcfa(m.amount)}}
                <span class="not-counted" *ngIf="m.status !== 'approved'"> (non comptabilisé)</span>
              </span>
              <span class="memo-date">{{m.createdAt | date:'dd/MM/yyyy'}}</span>
              <span class="memo-by">par {{m.createdBy?.firstName}} {{m.createdBy?.lastName}}</span>
            </div>

            <p class="memo-content" *ngIf="m.content">{{m.content}}</p>

            <!-- Motif de rejet -->
            <div class="rejection-reason" *ngIf="m.status === 'rejected' && m.rejectionReason">
              <mat-icon>block</mat-icon> Motif : {{m.rejectionReason}}
            </div>

            <!-- Reviewer info -->
            <div class="reviewer-info" *ngIf="m.reviewedBy && m.reviewedAt">
              {{m.status === 'approved' ? 'Approuvé' : 'Rejeté'}} par
              {{m.reviewedBy.firstName}} {{m.reviewedBy.lastName}}
              le {{m.reviewedAt | date:'dd/MM/yyyy'}}
            </div>

            <div class="memo-file" *ngIf="m.filePath">
              <button mat-stroked-button (click)="downloadMemoFile(m)" matTooltip="Télécharger le document">
                <mat-icon>description</mat-icon> {{m.fileName}}
              </button>
            </div>

            <!-- Bannière validation COP -->
            <div class="cop-banner" *ngIf="m.status === 'pending_cop' && canCopReview()">
              <div class="cop-banner-header">
                <mat-icon>gavel</mat-icon>
                <span>Ce MEMO attend votre validation</span>
                <span class="cop-memo-summary" *ngIf="m.amount > 0">
                  — {{categoryLabel(m.category)}} :
                  <strong>{{m.category === 'rallonge_budgetaire' ? '+' : '-'}}{{fmtFcfa(m.amount)}}</strong>
                </span>
              </div>

              <!-- Boutons d'action (état initial) -->
              <div class="cop-banner-actions" *ngIf="reviewingId() !== m.id">
                <button mat-raised-button color="primary"
                        (click)="startApprove(m)" [disabled]="reviewing()">
                  <mat-icon>check_circle</mat-icon>
                  {{reviewing() ? 'Traitement...' : 'Approuver'}}
                </button>
                <button mat-stroked-button color="warn"
                        (click)="startReject(m)" [disabled]="reviewing()">
                  <mat-icon>cancel</mat-icon> Refuser
                </button>
              </div>

              <!-- Zone saisie motif de rejet -->
              <div class="cop-reject-zone" *ngIf="reviewingId() === m.id">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Motif de rejet *</mat-label>
                  <textarea matInput [(ngModel)]="rejectionReason" rows="2"
                            placeholder="Expliquez la raison du rejet…"></textarea>
                </mat-form-field>
                <div class="cop-reject-actions">
                  <button mat-button (click)="cancelReview()" [disabled]="reviewing()">
                    <mat-icon>arrow_back</mat-icon> Annuler
                  </button>
                  <button mat-raised-button color="warn"
                          [disabled]="!rejectionReason.trim() || reviewing()"
                          (click)="confirmReview(m)">
                    <mat-icon>send</mat-icon>
                    {{reviewing() ? 'Envoi...' : 'Confirmer le rejet'}}
                  </button>
                </div>
              </div>
            </div>

            <!-- Action suppression -->
            <div class="memo-actions" *ngIf="canDelete()">
              <button mat-icon-button color="warn" (click)="deleteMemo(m)"
                      matTooltip="Supprimer ce MEMO"
                      [disabled]="deleting()">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .memo-card { border-radius: 10px !important; border: 1px solid #f3e5f5 !important; margin-top: 8px; }
    .memo-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .memo-icon { color: #7b1fa2; font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; }
    .memo-title-block { flex: 1; }
    .memo-title-block strong { display: block; font-size: 13px; color: #4a148c; }
    .memo-count { font-size: 11px; color: #888; }
    .btn-add-memo { border-color: #7b1fa2 !important; color: #7b1fa2 !important; }

    .memo-financial { background: #fce4ec; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
    .mf-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; padding: 3px 0; }
    .mf-label { display: flex; align-items: center; gap: 4px; color: #555; }
    .mf-label mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .mf-label.rallonge { color: #1b5e20; }
    .mf-label.reduction { color: #b71c1c; }
    .mf-value { font-weight: 700; font-family: monospace; }
    .mf-value.positive { color: #1b5e20; }
    .mf-value.negative { color: #b71c1c; }
    .mf-total { border-top: 1px solid #f48fb1; padding-top: 6px; margin-top: 4px; }
    .mf-total .mf-value { color: #4a148c; font-size: 13px; }
    .pending-note { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #e65100; margin-top: 6px; }
    .pending-note mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .memo-form { background: #f3e5f5; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .sans-incidence-note { display: flex; align-items: center; gap: 5px; color: #4a148c; font-size: 12px; padding: 4px 0; }
    .sans-incidence-note mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .file-upload-row { display: flex; align-items: center; gap: 8px; }
    .btn-upload-memo { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px dashed #7b1fa2; color: #7b1fa2; background: transparent; border-radius: 6px; padding: 6px 12px; }
    .btn-upload-memo mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .form-actions { display: flex; justify-content: flex-end; }

    .memo-loading { color: #888; font-size: 13px; padding: 8px 0; }
    .memo-empty { color: #aaa; font-size: 13px; padding: 8px 0; font-style: italic; }

    .memo-list { display: flex; flex-direction: column; gap: 8px; }
    .memo-item { border: 1px solid #e1bee7; border-radius: 8px; padding: 10px 12px; background: #fafafa; }
    .memo-item.memo-pending { border-color: #ffe0b2; background: #fff8f0; }
    .memo-item.memo-rejected { border-color: #ffcdd2; background: #fff5f5; opacity: 0.85; }
    .memo-item-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .memo-category-chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .memo-status-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
    .status-icon { font-size: 11px; width: 11px; height: 11px; }
    .memo-amount { font-size: 12px; font-weight: 700; padding: 2px 6px; border-radius: 8px; }
    .memo-amount.positive { color: #1b5e20; background: #e8f5e9; }
    .memo-amount.negative { color: #b71c1c; background: #ffebee; }
    .memo-amount.dimmed { opacity: 0.6; }
    .not-counted { font-size: 10px; font-weight: 400; }
    .memo-date { font-size: 11px; color: #666; }
    .memo-by { font-size: 11px; color: #888; }
    .memo-content { margin: 4px 0; font-size: 12px; color: #555; white-space: pre-wrap; }
    .rejection-reason { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #b71c1c; background: #ffebee; padding: 4px 8px; border-radius: 6px; margin: 4px 0; }
    .rejection-reason mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .reviewer-info { font-size: 11px; color: #888; font-style: italic; margin: 2px 0 4px; }
    .memo-file { margin-top: 4px; }
    .memo-actions { display: flex; justify-content: flex-end; margin-top: 4px; }

    .cop-banner { margin-top: 10px; border-top: 2px solid #ffb300; padding-top: 10px; background: #fffde7; border-radius: 0 0 6px 6px; padding: 10px; }
    .cop-banner-header { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #e65100; margin-bottom: 10px; flex-wrap: wrap; }
    .cop-banner-header mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    .cop-memo-summary { font-weight: 400; color: #5d4037; }
    .cop-memo-summary strong { font-weight: 700; color: #4a148c; }
    .cop-banner-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .cop-reject-zone { display: flex; flex-direction: column; gap: 8px; }
    .cop-reject-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
  `]
})
export class BudgetMemoComponent implements OnInit {
  @Input() budgetId!: string;
  @Input() budgetTotalAmount: number = 0;

  api = inject(ApiService);
  auth = inject(AuthService);
  snack = inject(MatSnackBar);

  memos = signal<any[]>([]);
  loading = signal(true);
  submitting = signal(false);
  deleting = signal(false);
  showForm = signal(false);

  reviewing = signal(false);
  reviewingId = signal<string | null>(null);
  rejectionReason = '';

  form: { category: MemoCategory | ''; amount: number | null; content: string; file: File | null } = {
    category: '',
    amount: null,
    content: '',
    file: null,
  };

  approvedMemos = computed(() => this.memos().filter(m => m.status === 'approved'));
  pendingMemos = computed(() => this.memos().filter(m => m.status === 'pending_cop'));
  totalRallonge = computed(() => this.approvedMemos().filter(m => m.category === 'rallonge_budgetaire').reduce((s: number, m: any) => s + m.amount, 0));
  totalReduction = computed(() => this.approvedMemos().filter(m => m.category === 'reduction_budgetaire').reduce((s: number, m: any) => s + m.amount, 0));
  effectiveTotal = computed(() => this.budgetTotalAmount + this.totalRallonge() - this.totalReduction());

  canCreate() { return this.auth.isAdminFinance() || this.auth.isCOP() || this.auth.isAdminTPM() || this.auth.isSuperAdmin() || this.auth.isEntityMember(); }
  canDelete() { return this.auth.isAdminFinance() || this.auth.isSuperAdmin(); }
  canCopReview() { return this.auth.isCOP() || this.auth.isSuperAdmin(); }

  categoryLabel(cat: string): string { return CATEGORY_LABELS[cat as MemoCategory] ?? cat; }
  categoryColor(cat: string): string { return CATEGORY_COLORS[cat as MemoCategory] ?? '#888'; }
  statusLabel(s: string): string { return STATUS_LABELS[s as MemoStatus] ?? s; }
  statusColor(s: string): string { return STATUS_COLORS[s as MemoStatus] ?? '#555'; }
  statusBg(s: string): string {
    const map: Record<string, string> = { pending_cop: '#fff3e0', approved: '#e8f5e9', rejected: '#ffebee' };
    return map[s] ?? '#f5f5f5';
  }
  statusIcon(s: string): string {
    const map: Record<string, string> = { pending_cop: 'schedule', approved: 'check_circle', rejected: 'cancel' };
    return map[s] ?? 'help';
  }

  fmtFcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getBudgetMemos(this.budgetId).subscribe({
      next: (res: any) => {
        this.memos.set(res.memos ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onCategoryChange() {
    if (this.form.category === 'sans_incidence') this.form.amount = null;
  }

  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.form.file = file;
  }

  isFormValid(): boolean {
    if (!this.form.category) return false;
    if (this.form.category !== 'sans_incidence' && (!this.form.amount || this.form.amount <= 0)) return false;
    if (!this.form.file) return false;
    return true;
  }

  async submitMemo() {
    if (!this.isFormValid()) return;
    this.submitting.set(true);
    const fd = new FormData();
    fd.append('budgetId', this.budgetId);
    fd.append('category', this.form.category);
    if (this.form.category !== 'sans_incidence' && this.form.amount) {
      fd.append('amount', String(this.form.amount));
    }
    if (this.form.content) fd.append('content', this.form.content);
    if (this.form.file) fd.append('file', this.form.file);

    try {
      const memo = await firstValueFrom(this.api.createBudgetMemo(fd));
      this.memos.update(list => [...list, memo]);
      this.showForm.set(false);
      this.form = { category: '', amount: null, content: '', file: null };
      this.snack.open('MEMO enregistré — en attente de validation COP', 'OK', { duration: 3000 });
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors de l\'enregistrement du MEMO';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally { this.submitting.set(false); }
  }

  async startApprove(m: any) {
    const label = this.categoryLabel(m.category);
    const detail = m.amount > 0
      ? ` (${m.category === 'rallonge_budgetaire' ? '+' : '-'}${this.fmtFcfa(m.amount)})`
      : '';
    if (!confirm(`Approuver ce MEMO ?\n\n${label}${detail}\n\nCette action est définitive.`)) return;

    this.reviewing.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.copReviewBudgetMemo(m.id, { decision: 'approved' })
      );
      this.memos.update(list => list.map(x => x.id === m.id ? { ...x, ...updated } : x));
      this.snack.open('MEMO approuvé — pris en compte dans les calculs', 'OK', { duration: 3000 });
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors de la validation';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally { this.reviewing.set(false); }
  }

  startReject(m: any) {
    this.reviewingId.set(m.id);
    this.rejectionReason = '';
  }

  cancelReview() {
    this.reviewingId.set(null);
    this.rejectionReason = '';
  }

  async confirmReview(m: any) {
    if (!this.rejectionReason.trim()) return;
    this.reviewing.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.copReviewBudgetMemo(m.id, {
          decision: 'rejected',
          rejectionReason: this.rejectionReason,
        })
      );
      this.memos.update(list => list.map(x => x.id === m.id ? { ...x, ...updated } : x));
      this.snack.open('MEMO rejeté', 'OK', { duration: 3000 });
      this.cancelReview();
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors du rejet';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally { this.reviewing.set(false); }
  }

  async deleteMemo(m: any) {
    if (!confirm(`Supprimer ce MEMO (${this.categoryLabel(m.category)}) ?`)) return;
    this.deleting.set(true);
    try {
      await firstValueFrom(this.api.deleteBudgetMemo(m.id));
      this.memos.update(list => list.filter(x => x.id !== m.id));
      this.snack.open('MEMO supprimé', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally { this.deleting.set(false); }
  }

  async downloadMemoFile(m: any) {
    try {
      const blob = await firstValueFrom(this.api.downloadBudgetMemoFile(m.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = m.fileName; a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Erreur lors du téléchargement', 'OK', { duration: 3000 });
    }
  }
}
