import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { BUDGET_TYPE_LABELS } from '../budget-templates';

@Component({
  selector: 'app-budget-recalls-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="recalls-container">
      <div class="page-header">
        <div class="page-header-inner">
          <button mat-icon-button (click)="router.navigate(['/budgets'])"><mat-icon>arrow_back</mat-icon></button>
          <mat-icon>attach_file</mat-icon>
          <div>
            <h1>Rappels & Pièces Justificatives</h1>
            <p>Budgets approuvés avec pièces justificatives en attente</p>
          </div>
          <button mat-raised-button class="btn-new-recall" (click)="openNewRecallForm()"
                  *ngIf="canCreate() && !showNewRecallForm()">
            <mat-icon>add</mat-icon> Nouveau rappel
          </button>
        </div>
      </div>

      <!-- Formulaire de création de rappel -->
      <div class="new-recall-panel" *ngIf="showNewRecallForm()">
        <div class="nrp-header">
          <mat-icon>add_circle</mat-icon>
          <span>Nouveau rappel</span>
          <button mat-icon-button (click)="cancelNewRecall()" class="nrp-close">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="nrp-body" *ngIf="approvedBudgets().length > 0; else noBudgets">
          <mat-form-field appearance="outline" class="nrp-field">
            <mat-label>Budget approuvé</mat-label>
            <mat-select [ngModel]="newRecallBudgetId()" (ngModelChange)="newRecallBudgetId.set($event)">
              <mat-option *ngFor="let b of approvedBudgets()" [value]="b.id">
                {{b.budgetNumber ? '[' + b.budgetNumber + '] ' : ''}}{{b.title}}
              </mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="nrp-field">
            <mat-label>Motif du rappel</mat-label>
            <textarea matInput rows="3" [ngModel]="newRecallReason()"
                      (ngModelChange)="newRecallReason.set($event)"
                      placeholder="Décrivez le motif du rappel…"></textarea>
          </mat-form-field>
          <div class="nrp-actions">
            <button mat-raised-button color="primary" (click)="submitNewRecall()"
                    [disabled]="!newRecallBudgetId() || !newRecallReason().trim() || creating()">
              <mat-icon>save</mat-icon> Créer le rappel
            </button>
            <button mat-stroked-button (click)="cancelNewRecall()">Annuler</button>
          </div>
        </div>
        <ng-template #noBudgets>
          <div class="nrp-empty">
            <mat-icon>info</mat-icon>
            <p>Aucun budget approuvé disponible. Un budget doit être approuvé avant de créer un rappel.</p>
          </div>
        </ng-template>
      </div>

      <!-- Filtres -->
      <div class="filters-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Statut</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="filterStatus=$event">
            <mat-option value="">Tous</mat-option>
            <mat-option value="open">Ouverts</mat-option>
            <mat-option value="closed">Clôturés</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="summary-chips">
          <span class="chip open">{{openCount()}} ouvert(s)</span>
          <span class="chip closed">{{closedCount()}} clôturé(s)</span>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
      </div>

      <div *ngIf="!loading() && filtered().length === 0" class="empty-state">
        <mat-icon>inbox</mat-icon><p>Aucun rappel trouvé.</p>
      </div>

      <div class="recalls-list" *ngIf="!loading()">
        <mat-card class="recall-card" *ngFor="let r of filtered()" [class.closed]="r.status === 'closed'">
          <mat-card-content>
            <div class="recall-top">
              <div class="recall-info">
                <span class="entity-badge">{{r.budget?.entityCode}}</span>
                <span class="type-badge">{{typeLabel(r.budget?.budgetType)}}</span>
                <span class="status-chip" [class.open]="r.status==='open'" [class.closed]="r.status==='closed'">
                  <mat-icon>{{r.status === 'open' ? 'lock_open' : 'lock'}}</mat-icon>
                  {{r.status === 'open' ? 'Ouvert' : 'Clôturé'}}
                </span>
              </div>
              <span class="recall-date">{{r.createdAt | date:'dd/MM/yyyy'}}</span>
            </div>

            <h3 class="budget-title">{{r.budget?.title}}</h3>
            <p class="recall-reason"><strong>Motif :</strong> {{r.reason}}</p>

            <div class="docs-summary">
              <mat-icon>folder_open</mat-icon>
              <span class="doc-stat">
                <strong>{{r.budget?._count?.lines || 0}}</strong> pièce(s) attendue(s)
              </span>
              <span class="doc-sep">·</span>
              <span class="doc-stat">
                <strong>{{r.documents?.length || 0}}</strong> fournie(s)
              </span>
              <span class="doc-sep">·</span>
              <span class="doc-stat">
                <strong>{{docLineCoverage(r)}}</strong> poste(s) couvert(s)
              </span>
            </div>

            <div class="closed-meta" *ngIf="r.closedBy">
              <mat-icon>check_circle</mat-icon>
              Clôturé par {{r.closedBy.firstName}} {{r.closedBy.lastName}} le {{r.closedAt | date:'dd/MM/yyyy'}}
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button color="primary" (click)="router.navigate(['/budgets', r.budget?.id])">
              <mat-icon>visibility</mat-icon> Voir le budget
            </button>
            <button mat-raised-button class="btn-close" (click)="closeRecall(r)"
                    *ngIf="r.status === 'open' && canClose()" [disabled]="saving()">
              <mat-icon>check_circle</mat-icon> Clôturer
            </button>
            <button mat-stroked-button (click)="reopenRecall(r)"
                    *ngIf="r.status === 'closed' && canClose()" [disabled]="saving()">
              <mat-icon>refresh</mat-icon> Réouvrir
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .recalls-container { padding: 0; }
    .page-header { background: linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; position:relative; }
    .page-header-triband { height:6px; background:linear-gradient(to right,#F4A623 33.3%,#fff 33.3% 66.6%,#1F8A3C 66.6%); }
    .page-header-inner { display:flex; align-items:center; gap:12px; padding:16px 20px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.25rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.8; font-size:.82rem; }

    .filters-bar { display:flex; align-items:center; gap:16px; padding:14px 20px; background:#f8f9fa; border-bottom:1px solid #e0e0e0; }
    .filter-field { min-width:160px; }
    .summary-chips { display:flex; gap:8px; margin-left:auto; }
    .chip { padding:4px 14px; border-radius:14px; font-size:.8rem; font-weight:700; }
    .chip.open { background:#fff3e0; color:#e65100; }
    .chip.closed { background:#e8f5e9; color:#2e7d32; }

    .loading-state, .empty-state { text-align:center; padding:60px; color:#888; }
    .loading-state mat-icon, .empty-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; }

    .recalls-list { display:flex; flex-direction:column; gap:12px; padding:16px 20px; }
    .recall-card { border-radius:10px !important; border:1px solid #e0e0e0 !important; }
    .recall-card.closed { opacity:.85; background:#fafafa !important; }

    .recall-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .recall-info { display:flex; align-items:center; gap:8px; }
    .entity-badge { background:#1F4E79; color:#fff; padding:2px 10px; border-radius:12px; font-size:.78rem; font-weight:800; }
    .type-badge { background:#e3f0fb; color:#1F4E79; padding:2px 8px; border-radius:12px; font-size:.75rem; font-weight:600; }
    .status-chip { display:flex; align-items:center; gap:3px; padding:2px 8px; border-radius:12px; font-size:.75rem; font-weight:700; }
    .status-chip mat-icon { font-size:13px; width:13px; height:13px; }
    .status-chip.open { background:#fff3e0; color:#e65100; }
    .status-chip.closed { background:#e8f5e9; color:#2e7d32; }
    .recall-date { font-size:.8rem; color:#888; }

    .budget-title { margin:0 0 4px; font-size:.95rem; font-weight:700; color:#1F4E79; }
    .recall-reason { margin:0 0 8px; font-size:.85rem; color:#555; }

    .docs-summary { display:flex; align-items:center; gap:6px; font-size:.82rem; color:#666; flex-wrap:wrap; }
    .docs-summary mat-icon { font-size:16px; width:16px; height:16px; color:#2E75B6; flex-shrink:0; }
    .doc-stat strong { color:#1F4E79; }
    .doc-sep { color:#B0C4DE; font-weight:300; }
    .doc-names { color:#888; font-style:italic; }

    .closed-meta { display:flex; align-items:center; gap:6px; font-size:.8rem; color:#2e7d32; margin-top:6px; }
    .closed-meta mat-icon { font-size:16px; width:16px; height:16px; }

    .btn-close { background:#2e7d32; color:#fff; }

    .btn-new-recall { margin-left:auto; background:#fff; color:#1F4E79; font-weight:700; }

    .new-recall-panel {
      background:#fff; border-bottom:1px solid #e0e0e0;
      border-left:4px solid #1F4E79;
    }
    .nrp-header {
      display:flex; align-items:center; gap:8px;
      padding:12px 20px; background:#EEF4FA;
      font-size:.95rem; font-weight:700; color:#1F4E79;
    }
    .nrp-header mat-icon { color:#2E75B6; }
    .nrp-header span { flex:1; }
    .nrp-close { margin-left:auto; }
    .nrp-body { padding:20px; display:flex; flex-direction:column; gap:12px; }
    .nrp-field { width:100%; }
    .nrp-actions { display:flex; gap:10px; }
    .nrp-empty {
      display:flex; align-items:center; gap:10px;
      padding:20px; color:#888; font-size:.88rem;
    }
    .nrp-empty mat-icon { color:#B0BEC5; }
  `]
})
export class BudgetRecallsListComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);
  snack = inject(MatSnackBar);

  recalls = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  creating = signal(false);
  filterStatus = 'open';

  showNewRecallForm = signal(false);
  newRecallBudgetId = signal('');
  newRecallReason = signal('');
  approvedBudgets = signal<any[]>([]);

  openCount = () => this.recalls().filter(r => r.status === 'open').length;
  closedCount = () => this.recalls().filter(r => r.status === 'closed').length;

  canClose() { return this.auth.isAdminFinance() || this.auth.isSuperAdmin(); }
  canCreate() { return this.auth.isEntityMember(); }

  filtered() {
    const list = this.recalls();
    return this.filterStatus ? list.filter(r => r.status === this.filterStatus) : list;
  }

  typeLabel(t: string) { return BUDGET_TYPE_LABELS[t] ?? t; }

  docLineCoverage(r: any): number {
    const lineIds = new Set((r.documents ?? []).map((d: any) => d.budgetLineId));
    return lineIds.size;
  }

  ngOnInit() {
    this.api.getAllRecalls().subscribe({
      next: list => { this.recalls.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    if (this.auth.isEntityMember()) {
      const myEntity = this.auth.entityCode();
      this.api.getBudgets().subscribe(list => {
        this.approvedBudgets.set(
          list.filter((b: any) => b.status === 'approved' && b.entityCode === myEntity)
        );
      });
    }
  }

  openNewRecallForm() {
    this.showNewRecallForm.set(true);
    this.newRecallBudgetId.set('');
    this.newRecallReason.set('');
  }

  cancelNewRecall() {
    this.showNewRecallForm.set(false);
    this.newRecallBudgetId.set('');
    this.newRecallReason.set('');
  }

  async submitNewRecall() {
    if (!this.newRecallBudgetId() || !this.newRecallReason().trim()) return;
    this.creating.set(true);
    try {
      await firstValueFrom(this.api.createRecall({
        budgetId: this.newRecallBudgetId(),
        reason: this.newRecallReason().trim(),
      }));
      this.snack.open('Rappel créé avec succès', 'OK', { duration: 2500 });
      this.cancelNewRecall();
      this.api.getAllRecalls().subscribe({
        next: list => this.recalls.set(list),
      });
    } catch (e: any) {
      this.snack.open(e.error?.message ?? 'Erreur lors de la création', 'OK', { duration: 3000 });
    } finally {
      this.creating.set(false);
    }
  }

  async closeRecall(r: any) {
    if (!confirm('Clôturer ce rappel ? Vous pourrez consulter le détail dans le budget.')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.closeRecall(r.id));
      this.snack.open('Rappel clôturé', 'OK', { duration: 2500 });
      this.recalls.update(list => list.map(x => x.id === r.id ? { ...x, status: 'closed', closedAt: new Date() } : x));
    } catch {
      this.snack.open('Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async reopenRecall(r: any) {
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.reopenRecall(r.id));
      this.snack.open('Rappel réouvert', 'OK', { duration: 2500 });
      this.recalls.update(list => list.map(x => x.id === r.id ? { ...x, status: 'open', closedAt: null } : x));
    } catch {
      this.snack.open('Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
