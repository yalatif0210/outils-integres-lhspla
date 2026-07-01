import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { InputsService, Input, InputStatus } from '../../services/inputs.service';
import { SectionsService } from '../../services/sections.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { htmlToText } from '../../pipes/markdown.pipe';

const TYPE_LABELS: Record<string, string> = {
  activity: 'Activité', indicator: 'Indicateur',
  milestone: 'Jalon', comment: 'Commentaire', risk: 'Risque',
};

@Component({
  selector: 'app-consolidation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatTableModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatExpansionModule, MatTooltipModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px">
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:600">Consolidation PMO</h1>
          <p style="margin:4px 0 0; color:#666; font-size:14px">Revue et qualification des contributions</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          @if (auth.isSuperAdmin()) {
            <a mat-stroked-button routerLink="/trash" style="color:#c62828">
              <mat-icon>delete_sweep</mat-icon> Corbeille (SA)
            </a>
          }
          <a mat-stroked-button [href]="exportDocxUrl" target="_blank">
            <mat-icon>description</mat-icon> Export Word global
          </a>
          <a mat-stroked-button [href]="exportXlsxUrl" target="_blank">
            <mat-icon>table_chart</mat-icon> Export Excel global
          </a>
        </div>
      </div>

      <!-- Filtres -->
      <mat-card style="margin-bottom:16px">
        <mat-card-content style="padding:12px; display:flex; gap:16px; flex-wrap:wrap; align-items:center">
          <mat-form-field appearance="outline" style="min-width:200px">
            <mat-label>Axe</mat-label>
            <mat-select [(ngModel)]="filterSection" (ngModelChange)="applyFilters()">
              <mat-option value="">Tous</mat-option>
              @for (s of sections(); track s.id) {
                <mat-option [value]="s.id">{{ s.titre | slice:0:40 }}...</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:140px">
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()">
              <mat-option value="">Tous</mat-option>
              <mat-option value="draft">Brouillon</mat-option>
              <mat-option value="submitted">Soumis</mat-option>
              <mat-option value="retained">Retenu</mat-option>
              <mat-option value="rejected">Rejeté</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:140px">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="filterType" (ngModelChange)="applyFilters()">
              <mat-option value="">Tous</mat-option>
              <mat-option value="activity">Activité</mat-option>
              <mat-option value="indicator">Indicateur</mat-option>
              <mat-option value="milestone">Jalon</mat-option>
              <mat-option value="comment">Commentaire</mat-option>
              <mat-option value="risk">Risque</mat-option>
            </mat-select>
          </mat-form-field>

          <span style="font-size:13px; color:#555">{{ filtered().length }} résultat(s)</span>
        </mat-card-content>
      </mat-card>

      <!-- Compteurs par entité -->
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px">
        @for (stat of entityStats(); track stat.code) {
          <mat-card style="padding:8px 16px; text-align:center; min-width:80px">
            <div style="font-size:20px; font-weight:700; color:#1565c0">{{ stat.total }}</div>
            <div style="font-size:11px; color:#555">{{ stat.code }}</div>
          </mat-card>
        }
      </div>

      @if (loading()) {
        <div style="text-align:center; padding:60px">
          <mat-spinner diameter="48" style="margin:auto"></mat-spinner>
        </div>
      }

      @if (!loading()) {
        <mat-table [dataSource]="filtered()" style="width:100%; background:white; border-radius:4px">

          <ng-container matColumnDef="section">
            <mat-header-cell *matHeaderCellDef style="font-weight:700">Axe</mat-header-cell>
            <mat-cell *matCellDef="let row" style="font-size:13px; color:#555">
              {{ row.referenceSection?.titre | slice:0:30 }}...
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="entity">
            <mat-header-cell *matHeaderCellDef style="font-weight:700">Entité</mat-header-cell>
            <mat-cell *matCellDef="let row">
              <span class="section-badge">{{ row.entity.code }}</span>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="type">
            <mat-header-cell *matHeaderCellDef style="font-weight:700">Type</mat-header-cell>
            <mat-cell *matCellDef="let row" style="font-size:13px">{{ TYPE_LABELS[row.type] }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="content">
            <mat-header-cell *matHeaderCellDef style="font-weight:700">Contribution</mat-header-cell>
            <mat-cell *matCellDef="let row" style="flex-direction:column; align-items:start; padding:8px 0">
              @if (row.title) {
                <div style="font-weight:500; font-size:13px">{{ row.title }}</div>
              }
              @if (row.content) {
                <div class="rich-content" style="color:#444" [innerHTML]="preview(row.content)"></div>
              }
              @if (row.type === 'milestone' && row.paymentAmountProposed) {
                <div style="font-size:11px; color:#666; margin-top:2px">
                  Proposé : {{ row.paymentAmountProposed }}
                  @if (row.paymentAmountFinal) { → Final : <strong>{{ row.paymentAmountFinal }}</strong> }
                </div>
              }
              <div style="font-size:11px; color:#888; margin-top:4px">
                {{ row.author.email }} · {{ row.updatedAt | date:'dd/MM/yyyy HH:mm' }}
              </div>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="status">
            <mat-header-cell *matHeaderCellDef style="font-weight:700">Statut</mat-header-cell>
            <mat-cell *matCellDef="let row">
              <span [class]="'chip-' + row.status"
                    style="padding:3px 8px; border-radius:4px; font-size:12px; font-weight:600">
                {{ statusLabel(row.status) }}
              </span>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="actions">
            <mat-header-cell *matHeaderCellDef style="font-weight:700">Actions PMO</mat-header-cell>
            <mat-cell *matCellDef="let row">
              <div style="display:flex; flex-direction:column; gap:4px; padding:4px 0">
                @if (row.status === 'submitted' || row.status === 'retained' || row.status === 'rejected') {
                  <div style="display:flex; gap:4px">
                    <button mat-icon-button color="primary" (click)="retain(row)"
                            matTooltip="Retenir" [disabled]="row.status === 'retained'">
                      <mat-icon>check_circle</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="reject(row)"
                            matTooltip="Rejeter" [disabled]="row.status === 'rejected'">
                      <mat-icon>cancel</mat-icon>
                    </button>
                  </div>
                }
                @if (row.type === 'milestone' && (row.status === 'submitted' || row.status === 'retained')) {
                  <div style="display:flex; align-items:center; gap:4px">
                    <input #amtInput style="width:100px; font-size:12px; border:1px solid #ccc; border-radius:4px; padding:2px 6px"
                           [value]="row.paymentAmountFinal ?? ''"
                           placeholder="Montant final" />
                    <button mat-icon-button (click)="setPaymentFinal(row, amtInput.value)"
                            matTooltip="Enregistrer montant final">
                      <mat-icon>save</mat-icon>
                    </button>
                  </div>
                }
                @if (auth.isSuperAdmin() && row.status !== 'draft') {
                  <button mat-stroked-button style="font-size:11px; padding:0 6px; height:24px; line-height:24px"
                          (click)="unlock(row)"
                          matTooltip="Renvoyer en brouillon (Super Admin)">
                    <mat-icon style="font-size:14px">lock_open</mat-icon> Déverrouiller
                  </button>
                }
                <a mat-icon-button [href]="exportDocxForSection(row.referenceSectionId)"
                   target="_blank" matTooltip="Exporter cet axe (Word)">
                  <mat-icon>download</mat-icon>
                </a>
              </div>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
          <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
        </mat-table>

        @if (filtered().length === 0) {
          <div style="text-align:center; padding:40px; color:#999">
            <mat-icon style="font-size:40px; display:block; margin-bottom:8px">inbox</mat-icon>
            Aucun input avec ces filtres
          </div>
        }
      }
    </div>
  `,
  styles: [``],
})
export class ConsolidationComponent implements OnInit {
  private inputsService = inject(InputsService);
  private sectionsService = inject(SectionsService);
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);

  readonly TYPE_LABELS = TYPE_LABELS;

  allInputs = signal<Input[]>([]);
  sections = signal<any[]>([]);
  loading = signal(true);

  filterSection = '';
  filterStatus = '';
  filterType = '';

  displayedColumns = ['section', 'entity', 'type', 'content', 'status', 'actions'];

  exportDocxUrl = this.inputsService.exportDocx();
  exportXlsxUrl = this.inputsService.exportXlsx();

  exportDocxForSection(sectionId: string) {
    return this.inputsService.exportDocx(sectionId);
  }

  filtered = computed(() => {
    return this.allInputs().filter(i => {
      if (this.filterSection && i.referenceSectionId !== this.filterSection) return false;
      if (this.filterStatus && i.status !== this.filterStatus) return false;
      if (this.filterType && i.type !== this.filterType) return false;
      return true;
    });
  });

  entityStats = computed(() => {
    const counts = new Map<string, number>();
    for (const i of this.allInputs()) {
      counts.set(i.entity.code, (counts.get(i.entity.code) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([code, total]) => ({ code, total }));
  });

  ngOnInit() {
    this.sectionsService.getAll().subscribe(s => this.sections.set(s));
    this.loadInputs();
  }

  loadInputs() {
    this.loading.set(true);
    this.inputsService.getAll().subscribe({
      next: (inputs) => { this.allInputs.set(inputs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  applyFilters() { /* computed signal auto-updates */ }

  statusLabel(status: InputStatus): string {
    const labels: Record<InputStatus, string> = {
      draft: 'Brouillon', submitted: 'Soumis', retained: 'Retenu', rejected: 'Rejeté',
    };
    return labels[status];
  }

  preview(html: string): string { return htmlToText(html, 120); }

  retain(input: Input) {
    this.inputsService.updatePmo(input.id, { status: 'retained' }).subscribe({
      next: (u) => { this.updateLocal(u); this.snackBar.open('Retenu', 'OK', { duration: 2000 }); },
      error: (e) => this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }

  reject(input: Input) {
    this.inputsService.updatePmo(input.id, { status: 'rejected' }).subscribe({
      next: (u) => { this.updateLocal(u); this.snackBar.open('Rejeté', 'OK', { duration: 2000 }); },
      error: (e) => this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }

  setPaymentFinal(input: Input, value: string) {
    if (!value.trim()) return;
    this.inputsService.updatePmo(input.id, { paymentAmountFinal: value.trim() }).subscribe({
      next: (u) => { this.updateLocal(u); this.snackBar.open('Montant final enregistré', 'OK', { duration: 2000 }); },
      error: (e) => this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }

  unlock(input: Input) {
    this.inputsService.updateStatus(input.id, 'draft').subscribe({
      next: (u) => { this.updateLocal(u); this.snackBar.open('Input renvoyé en brouillon', 'OK', { duration: 2500 }); },
      error: (e) => this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }

  private updateLocal(updated: Input) {
    this.allInputs.update(list => list.map(i => i.id === updated.id ? updated : i));
  }
}
