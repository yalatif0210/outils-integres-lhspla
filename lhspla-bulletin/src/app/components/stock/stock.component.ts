import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter, NativeDateAdapter } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

const PROGRAMMES = ['PNLS', 'PNLP', 'PNSME'];
const STATUTS = [
  { val: 'RUPTURE_PAYS', label: 'Rupture Pays' },
  { val: 'RUPTURE_CENTRALE', label: 'Rupture Centrale' },
  { val: 'RUPTURE_IMMINENTE', label: 'Rupture Imminente' },
  { val: 'RISQUE', label: 'Risque' },
  { val: 'BON_STOCKAGE', label: 'Bon Stockage' },
  { val: 'SURSTOCK', label: 'Surstock' },
  { val: 'RISQUE_PEREMPTION', label: 'Risque Péremption' },
];
const SOURCES = ['GOVCI', 'FM', 'PEPFAR', 'UNFPA', 'USG', 'MOU_USG', 'AUTRE'];

function getMondayStr(d = new Date()): string {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function computeStatut(msd: number | null): string {
  if (msd == null || msd === 0) return 'RUPTURE_CENTRALE';
  if (msd < 3) return 'RUPTURE_IMMINENTE';
  if (msd < 5) return 'RISQUE';
  if (msd <= 12) return 'BON_STOCKAGE';
  return 'SURSTOCK';
}

function statutClass(statut: string): string {
  switch (statut) {
    case 'RUPTURE_PAYS': case 'RUPTURE_CENTRALE': return 'chip-rupture';
    case 'RUPTURE_IMMINENTE': return 'chip-rupture-im';
    case 'RISQUE': return 'chip-risque';
    case 'BON_STOCKAGE': return 'chip-bon';
    case 'SURSTOCK': return 'chip-surstock';
    case 'RISQUE_PEREMPTION': return 'chip-peremption';
    default: return '';
  }
}

const EMPTY_FORM = () => ({
  semaine: getMondayStr(),
  dateEtatStock: new Date().toISOString().slice(0, 10),
  programme: '', sousCategorie: '', denomination: '', denominationId: '',
  stockCentrale: null as number | null,
  stockCentralMsd: null as number | null,
  stockPeripherique: 0,
  stockNational: null as number | null,
  cmm: null as number | null,
  datePeremptionCentrale: '',
  datePeremptionPeripherie: '',
  statutStock: '', statutOverride: false,
  sourceReapprovisionnement: '', quantiteAttendue: 0,
  dateLivraisonPrevue: '', commentaire: '',
});

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatTabsModule,
    MatDialogModule, MatTooltipModule, MatDatepickerModule, MatNativeDateModule, MatSlideToggleModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: DateAdapter, useClass: NativeDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: {
      parse: { dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' } },
      display: { dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' }, monthYearLabel: { month: 'long', year: 'numeric' }, dateA11yLabel: { day: 'numeric', month: 'long', year: 'numeric' }, monthYearA11yLabel: { month: 'long', year: 'numeric' } },
    }},
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>inventory_2</mat-icon>
          <div>
            <h1>Stock Hebdomadaire</h1>
            <p>Saisie et consultation de l'état du stock</p>
          </div>
        </div>
      </div>

      <!-- ── Contexte de rapportage (write only) ────────────────────────── -->
      <div class="contexte-bar" *ngIf="canEdit()">
        <div class="ctx-label"><mat-icon>event_note</mat-icon> Contexte de l'état de stock</div>
        <mat-form-field appearance="outline" class="ctx-field">
          <mat-label>Date de l'état de stock</mat-label>
          <input matInput type="date" [(ngModel)]="dateEtatStock">
        </mat-form-field>
        <mat-form-field appearance="outline" class="ctx-field ctx-week">
          <mat-label>Période de rapportage *</mat-label>
          <mat-select [(ngModel)]="selectedWeekId">
            <mat-option *ngFor="let w of openWeeks()" [value]="w.id">
              {{w.weekReference}} — {{w.weekStart | date:'dd/MM'}} au {{w.weekEnd | date:'dd/MM/yyyy'}}
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="openWeeks().length === 0">Aucune semaine ouverte</mat-hint>
        </mat-form-field>
        <div class="ctx-badge ctx-ok" *ngIf="selectedWeek()">
          <mat-icon>check_circle</mat-icon> {{selectedWeek().weekReference}}
        </div>
        <div class="ctx-badge ctx-warn" *ngIf="!selectedWeek()">
          <mat-icon>warning</mat-icon> Sélectionnez une période avant de saisir
        </div>
      </div>

      <mat-tab-group class="tabs" animationDuration="150ms">

        <!-- ── Tab 1 : Liste ──────────────────────────────────────────────── -->
        <mat-tab label="Liste & Filtres">
          <div class="tab-content">
            <div class="filters-bar">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Semaine (lundi)</mat-label>
                <input matInput type="date" [(ngModel)]="filterSemaine" (ngModelChange)="loadEntries()">
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Programme</mat-label>
                <mat-select [(ngModel)]="filterProgramme" (ngModelChange)="loadEntries()">
                  <mat-option value="">Tous</mat-option>
                  <mat-option *ngFor="let p of PROGRAMMES" [value]="p">{{p}}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Statut</mat-label>
                <mat-select [(ngModel)]="filterStatut" (ngModelChange)="loadEntries()">
                  <mat-option value="">Tous</mat-option>
                  <mat-option *ngFor="let s of STATUTS" [value]="s.val">{{s.label}}</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="openForm()" *ngIf="canEdit()"
                [disabled]="!selectedWeek()" [matTooltip]="!selectedWeek() ? 'Sélectionnez une période de rapportage' : ''">
                <mat-icon>add</mat-icon> Ajouter
              </button>
              <button mat-stroked-button (click)="downloadTemplate()">
                <mat-icon>download</mat-icon> Modèle Excel
              </button>
              <label class="import-btn-wrap" *ngIf="canEdit()">
                <input type="file" accept=".xlsx" style="display:none" #importInput (change)="onImport($event)">
                <button mat-stroked-button color="accent" (click)="importInput.click()"
                  [disabled]="importing() || !selectedWeek()" [matTooltip]="!selectedWeek() ? 'Sélectionnez une période de rapportage' : ''">
                  <mat-icon>upload_file</mat-icon> {{importing() ? 'Import…' : 'Importer Excel'}}
                </button>
              </label>
              <label class="import-btn-wrap" *ngIf="canEdit()">
                <input type="file" accept=".pptx" style="display:none" #importPptxInput (change)="onImportPptx($event)">
                <button mat-stroked-button color="primary" (click)="importPptxInput.click()"
                  [disabled]="importingPptx() || !selectedWeek()" [matTooltip]="!selectedWeek() ? 'Sélectionnez une période de rapportage' : ''">
                  <mat-icon>slideshow</mat-icon> {{importingPptx() ? 'Import…' : 'Importer PowerPoint'}}
                </button>
              </label>
            </div>

            <!-- Tableau -->
            <div class="table-wrap" *ngIf="!loading()">
              <table class="stock-table" *ngIf="entries().length > 0; else emptyState">
                <thead>
                  <tr>
                    <th>Dénomination</th><th>Programme</th><th>Sous-catégorie</th>
                    <th>Statut</th><th>Stk Centrale</th><th>Stk Péri.</th><th>Stk National</th>
                    <th>CMM</th><th>MSD</th>
                    <th>Dt.Pér.Ctr.</th><th>Dt.Pér.Péri.</th>
                    <th>Source</th><th>Qté att.</th><th>Date livr.</th><th>Commentaire</th>
                    <th *ngIf="canEdit()">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let e of entries(); let i=index" [class.row-alt]="i%2===1">
                    <td class="td-denom">{{e.denomination}}</td>
                    <td><span class="badge-prog badge-{{e.programme.toLowerCase()}}">{{e.programme}}</span></td>
                    <td>{{e.sousCategorie}}</td>
                    <td><span class="chip-statut" [ngClass]="statutClass(e.statutStock)">{{statutLabel(e.statutStock)}}</span></td>
                    <td class="td-num">{{e.stockCentrale != null ? (e.stockCentrale | number) : '—'}}</td>
                    <td class="td-num">{{e.stockPeripherique != null ? (e.stockPeripherique | number) : '—'}}</td>
                    <td class="td-num">{{e.stockNational != null ? (e.stockNational | number) : '—'}}</td>
                    <td class="td-num">{{e.cmm != null ? e.cmm : '—'}}</td>
                    <td class="td-num">{{e.stockCentralMsd ?? '—'}}</td>
                    <td class="td-date">{{e.datePeremptionCentrale || '—'}}</td>
                    <td class="td-date">{{e.datePeremptionPeripherie || '—'}}</td>
                    <td>{{e.sourceReapprovisionnement || '—'}}</td>
                    <td class="td-num">{{e.quantiteAttendue}}</td>
                    <td>{{e.dateLivraisonPrevue ? (e.dateLivraisonPrevue | date:'dd/MM/yyyy') : '—'}}</td>
                    <td class="td-comment">{{e.commentaire || '—'}}</td>
                    <td *ngIf="canEdit()">
                      <button mat-icon-button (click)="openForm(e)" matTooltip="Modifier"><mat-icon>edit</mat-icon></button>
                      <button mat-icon-button color="warn" (click)="deleteEntry(e.id)" matTooltip="Supprimer"><mat-icon>delete</mat-icon></button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <ng-template #emptyState>
                <div class="empty-state"><mat-icon>inventory_2</mat-icon><p>Aucune entrée pour les filtres sélectionnés</p></div>
              </ng-template>
            </div>
            <div class="loading-state" *ngIf="loading()"><mat-icon>hourglass_empty</mat-icon><p>Chargement…</p></div>
          </div>
        </mat-tab>

        <!-- ── Tab 2 : Annexe A ───────────────────────────────────────────── -->
        <mat-tab label="Annexe A (vue colorée)">
          <div class="tab-content">
            <div class="annexe-header">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Semaine</mat-label>
                <input matInput type="date" [(ngModel)]="annexeSemaine" (ngModelChange)="loadAnnexeA()">
              </mat-form-field>
              <mat-slide-toggle [(ngModel)]="annexeCritiquesOnly" (ngModelChange)="loadAnnexeA()" color="warn">
                Critiques uniquement
              </mat-slide-toggle>
            </div>

            <div *ngIf="annexeLoading()" class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Chargement…</p></div>

            <ng-container *ngIf="!annexeLoading() && annexeData()">
              <ng-container *ngFor="let prog of programmeKeys(annexeData()!.grouped)">
                <div class="prog-header" [ngClass]="'prog-' + prog.toLowerCase()">
                  <mat-icon>medication</mat-icon> Programme {{prog}}
                </div>
                <ng-container *ngFor="let sousCat of sousCatKeys(annexeData()!.grouped[prog])">
                  <div class="sous-cat-header">{{sousCat}}</div>
                  <table class="stock-table annexe-table">
                    <thead>
                      <tr>
                        <th>Dénomination</th><th>Statut</th>
                        <th>Stk Centrale</th><th>Stk Péri.</th><th>Stk National</th>
                        <th>CMM</th><th>MSD</th>
                        <th>Dt.Pér.Ctr.</th><th>Dt.Pér.Péri.</th>
                        <th>Source</th><th>Qté att.</th><th>Date livr.</th><th>Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let e of annexeData()!.grouped[prog][sousCat]; let i=index" [class.row-alt]="i%2===1">
                        <td class="td-denom">{{e.denomination}}</td>
                        <td><span class="chip-statut" [ngClass]="statutClass(e.statutStock)">{{statutLabel(e.statutStock)}}</span></td>
                        <td class="td-num">{{e.stockCentrale != null ? (e.stockCentrale | number) : '—'}}</td>
                        <td class="td-num">{{e.stockPeripherique != null ? (e.stockPeripherique | number) : '—'}}</td>
                        <td class="td-num">{{e.stockNational != null ? (e.stockNational | number) : '—'}}</td>
                        <td class="td-num">{{e.cmm != null ? e.cmm : '—'}}</td>
                        <td class="td-num">{{e.stockCentralMsd ?? '—'}}</td>
                        <td class="td-date">{{e.datePeremptionCentrale || '—'}}</td>
                        <td class="td-date">{{e.datePeremptionPeripherie || '—'}}</td>
                        <td>{{e.sourceReapprovisionnement || '—'}}</td>
                        <td class="td-num">{{e.quantiteAttendue}}</td>
                        <td>{{e.dateLivraisonPrevue ? (e.dateLivraisonPrevue | date:'dd/MM/yyyy') : '—'}}</td>
                        <td class="td-comment">{{e.commentaire || '—'}}</td>
                      </tr>
                    </tbody>
                  </table>
                </ng-container>
              </ng-container>
              <div class="empty-state" *ngIf="annexeData()!.entries.length === 0">
                <mat-icon>inventory_2</mat-icon><p>Aucune entrée stock pour cette semaine</p>
              </div>
            </ng-container>
          </div>
        </mat-tab>

        <!-- ── Tab 3 : Référentiel dénominations ──────────────────────────── -->
        <mat-tab label="Référentiel" *ngIf="canEdit()">
          <div class="tab-content">
            <div class="filters-bar">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Programme</mat-label>
                <mat-select [(ngModel)]="refProgramme" (ngModelChange)="loadDenominations()">
                  <mat-option value="">Tous</mat-option>
                  <mat-option *ngFor="let p of PROGRAMMES" [value]="p">{{p}}</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="openRefForm()"><mat-icon>add</mat-icon> Nouvelle dénomination</button>
            </div>
            <table class="stock-table" *ngIf="denominations().length > 0">
              <thead><tr><th>Programme</th><th>Sous-catégorie</th><th>Dénomination</th><th>Version</th><th>Actif</th></tr></thead>
              <tbody>
                <tr *ngFor="let d of denominations(); let i=index" [class.row-alt]="i%2===1">
                  <td><span class="badge-prog badge-{{d.programme.toLowerCase()}}">{{d.programme}}</span></td>
                  <td>{{d.sousCategorie}}</td>
                  <td>{{d.denomination}}</td>
                  <td>v{{d.version}}</td>
                  <td><mat-icon [style.color]="d.isActive ? '#388e3c' : '#aaa'">{{d.isActive ? 'check_circle' : 'cancel'}}</mat-icon></td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="denominations().length === 0">
              <mat-icon>list_alt</mat-icon><p>Aucune dénomination configurée</p>
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>

    <!-- ── Dialog saisie ─────────────────────────────────────────────────── -->
    <div class="dialog-overlay" *ngIf="showForm()" (click)="closeForm()">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <mat-icon>inventory_2</mat-icon>
          <h2>{{editingId() ? "Modifier l'entrée" : 'Nouvelle entrée stock'}}</h2>
          <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
        </div>
        <div class="dialog-body">
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Période de rapportage (semaine)</mat-label>
              <input matInput type="date" [(ngModel)]="form.semaine" [disabled]="true">
              <mat-hint>Définie par la période sélectionnée en haut</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date de l'état de stock</mat-label>
              <input matInput type="date" [(ngModel)]="form.dateEtatStock">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Programme *</mat-label>
              <mat-select [(ngModel)]="form.programme" (ngModelChange)="onFormProgrammeChange()">
                <mat-option *ngFor="let p of PROGRAMMES" [value]="p">{{p}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Sous-catégorie *</mat-label>
              <mat-select [(ngModel)]="form.sousCategorie" (ngModelChange)="onFormSousCategorieChange()" [disabled]="!form.programme">
                <mat-option *ngIf="sousCategorieProgramme.length === 0" disabled value="">— Aucune option configurée —</mat-option>
                <mat-option *ngFor="let sc of sousCategorieProgramme" [value]="sc">{{sc}}</mat-option>
              </mat-select>
              <mat-hint *ngIf="!form.programme">Sélectionner un programme d'abord</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Dénomination *</mat-label>
              <mat-select [(ngModel)]="form.denomination" (ngModelChange)="onDenominationSelect($event)" [disabled]="!form.sousCategorie">
                <mat-option *ngIf="denominationsProgrammeSousCat.length === 0" disabled value="">— Aucune option configurée —</mat-option>
                <mat-option *ngFor="let d of denominationsProgrammeSousCat" [value]="d.denomination">{{d.denomination}}</mat-option>
              </mat-select>
              <mat-hint *ngIf="!form.sousCategorie">Sélectionner une sous-catégorie d'abord</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Stock à la centrale (unités)</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="form.stockCentrale">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Stock périphérique (unités)</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="form.stockPeripherique">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Stock national (unités)</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="form.stockNational">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>CMM (Consommation Mensuelle Moyenne)</mat-label>
              <input matInput type="number" step="0.01" min="0" [(ngModel)]="form.cmm">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>MSD (Mois de Stock)</mat-label>
              <input matInput type="number" step="0.1" min="0" [(ngModel)]="form.stockCentralMsd" (ngModelChange)="onMsdChange()">
              <mat-hint>Statut auto-calculé si non overridé</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date péremption — Centrale</mat-label>
              <input matInput [(ngModel)]="form.datePeremptionCentrale" placeholder="ex: 06/2027">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date péremption — Périphérie</mat-label>
              <input matInput [(ngModel)]="form.datePeremptionPeripherie" placeholder="ex: 12/2026">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Statut *</mat-label>
              <mat-select [(ngModel)]="form.statutStock">
                <mat-option *ngFor="let s of STATUTS" [value]="s.val">{{s.label}}</mat-option>
              </mat-select>
              <mat-hint>{{form.statutOverride ? 'Override manuel actif' : 'Calculé depuis MSD'}}</mat-hint>
            </mat-form-field>
            <div class="override-toggle">
              <label>
                <input type="checkbox" [(ngModel)]="form.statutOverride"> Override statut manuellement
              </label>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Source réapprovisionnement</mat-label>
              <mat-select [(ngModel)]="form.sourceReapprovisionnement">
                <mat-option value="">—</mat-option>
                <mat-option *ngFor="let s of SOURCES" [value]="s">{{s}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Quantité attendue</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="form.quantiteAttendue">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date livraison prévue</mat-label>
              <input matInput type="date" [(ngModel)]="form.dateLivraisonPrevue">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-col">
              <mat-label>Commentaire</mat-label>
              <textarea matInput [(ngModel)]="form.commentaire" rows="2"></textarea>
            </mat-form-field>
          </div>
        </div>
        <div class="dialog-footer">
          <button mat-stroked-button (click)="closeForm()">Annuler</button>
          <button mat-raised-button color="primary" (click)="saveEntry()" [disabled]="saving() || !formValid()">
            <mat-icon>save</mat-icon> {{saving() ? 'Enregistrement…' : 'Enregistrer'}}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Dialog référentiel ────────────────────────────────────────────── -->
    <div class="dialog-overlay" *ngIf="showRefForm()" (click)="showRefForm.set(false)">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <mat-icon>list_alt</mat-icon><h2>Nouvelle dénomination</h2>
          <button mat-icon-button (click)="showRefForm.set(false)"><mat-icon>close</mat-icon></button>
        </div>
        <div class="dialog-body">
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Programme *</mat-label>
              <mat-select [(ngModel)]="refForm.programme">
                <mat-option *ngFor="let p of PROGRAMMES" [value]="p">{{p}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Sous-catégorie *</mat-label>
              <input matInput [(ngModel)]="refForm.sousCategorie">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-col">
              <mat-label>Dénomination *</mat-label>
              <input matInput [(ngModel)]="refForm.denomination">
            </mat-form-field>
          </div>
        </div>
        <div class="dialog-footer">
          <button mat-stroked-button (click)="showRefForm.set(false)">Annuler</button>
          <button mat-raised-button color="primary" (click)="saveRef()" [disabled]="saving()">Enregistrer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { min-height:100vh; background:#f5f7fa; }
    .page-header { background:linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; padding:16px 20px; }
    .page-header-inner { display:flex; align-items:center; gap:12px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; }
    .page-header-inner h1 { margin:0; font-size:1.2rem; font-weight:700; }
    .page-header-inner p { margin:0; font-size:.8rem; opacity:.8; }

    .contexte-bar { display:flex; align-items:center; gap:14px; flex-wrap:wrap; background:#fff; border-bottom:2px solid #BDD7EE; padding:10px 20px; }
    .ctx-label { display:flex; align-items:center; gap:6px; font-weight:700; font-size:.82rem; color:#1F4E79; white-space:nowrap; }
    .ctx-label mat-icon { font-size:18px; width:18px; height:18px; }
    .ctx-field { min-width:180px; }
    .ctx-week { min-width:260px; }
    .ctx-badge { display:flex; align-items:center; gap:4px; padding:4px 12px; border-radius:20px; font-size:.78rem; font-weight:700; white-space:nowrap; }
    .ctx-badge mat-icon { font-size:15px; width:15px; height:15px; }
    .ctx-ok { background:#E2EFDA; color:#375623; }
    .ctx-warn { background:#FFF3CD; color:#856404; }

    .tabs { margin:16px 20px; }
    .tab-content { padding:16px 0; display:flex; flex-direction:column; gap:12px; }
    .filters-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .filter-field { min-width:160px; }
    .import-btn-wrap { display:contents; }
    .annexe-header { display:flex; align-items:center; gap:10px; }

    .table-wrap { overflow-x:auto; }
    .stock-table { width:100%; border-collapse:collapse; font-size:.82rem; }
    .stock-table th { background:#1F4E79; color:#fff; padding:6px 8px; text-align:left; font-weight:700; font-size:.78rem; white-space:nowrap; }
    .stock-table td { padding:5px 8px; border-bottom:1px solid #e8eef5; vertical-align:middle; white-space:nowrap; }
    .row-alt td { background:#f5f9ff; }
    .td-denom { font-weight:600; color:#1F4E79; min-width:140px; white-space:normal; }
    .td-num { text-align:right; }
    .td-date { font-size:.78rem; color:#555; min-width:80px; }
    .td-comment { font-size:.78rem; color:#666; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    .badge-prog { display:inline-block; padding:2px 8px; border-radius:10px; font-weight:700; font-size:.72rem; }
    .badge-pnls { background:#BDD7EE; color:#1F4E79; }
    .badge-pnlp { background:#FFDDC1; color:#7B3F00; }
    .badge-pnsme { background:#C6EFCE; color:#375623; }

    .chip-statut { display:inline-block; padding:2px 8px; border-radius:10px; font-size:.72rem; font-weight:700; white-space:nowrap; }
    .chip-rupture { background:#C00000; color:#fff; }
    .chip-rupture-im { background:#FFBABA; color:#C00000; }
    .chip-risque { background:#E97132; color:#fff; }
    .chip-bon { background:#E2EFDA; color:#375623; }
    .chip-surstock { background:#EDEDED; color:#595959; }
    .chip-peremption { background:#FFFF99; color:#7B5E00; }

    .prog-header { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:6px; font-weight:700; font-size:.9rem; margin:12px 0 4px; }
    .prog-header mat-icon { font-size:18px; width:18px; height:18px; }
    .prog-pnls { background:#BDD7EE; color:#1F4E79; }
    .prog-pnlp { background:#FFDDC1; color:#7B3F00; }
    .prog-pnsme { background:#C6EFCE; color:#375623; }
    .sous-cat-header { padding:4px 12px; font-style:italic; font-size:.82rem; color:#444; background:#f5f5f5; border-left:3px solid #2E75B6; margin:6px 0 2px; }
    .annexe-table { margin-bottom:8px; }

    .loading-state { text-align:center; padding:40px; color:#888; }
    .loading-state mat-icon { font-size:40px; display:block; margin:0 auto 8px; }
    .empty-state { text-align:center; padding:40px; color:#aaa; }
    .empty-state mat-icon { font-size:40px; display:block; margin:0 auto 8px; color:#bbb; }

    /* Dialog */
    .dialog-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .dialog-box { background:#fff; border-radius:12px; min-width:520px; max-width:720px; width:90vw; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,.18); }
    .dialog-header { display:flex; align-items:center; gap:10px; padding:16px 20px; border-bottom:1px solid #e0e0e0; }
    .dialog-header mat-icon { color:#1F4E79; }
    .dialog-header h2 { margin:0; font-size:1rem; font-weight:700; flex:1; color:#1F4E79; }
    .dialog-body { padding:20px; overflow-y:auto; flex:1; }
    .dialog-footer { display:flex; justify-content:flex-end; gap:8px; padding:12px 20px; border-top:1px solid #e0e0e0; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .full-col { grid-column:1/-1; }
    .override-toggle { grid-column:1/-1; display:flex; align-items:center; gap:6px; font-size:.85rem; }
    .override-toggle input { cursor:pointer; }
  `]
})
export class StockComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  PROGRAMMES = PROGRAMMES;
  STATUTS = STATUTS;
  SOURCES = SOURCES;

  loading = signal(false);
  saving = signal(false);
  importing = signal(false);
  importingPptx = signal(false);
  entries = signal<any[]>([]);
  annexeData = signal<any | null>(null);
  annexeLoading = signal(false);
  denominations = signal<any[]>([]);
  allDenominations = signal<any[]>([]);
  openWeeks = signal<any[]>([]);

  // Contexte de rapportage
  selectedWeekId = '';
  dateEtatStock = new Date().toISOString().slice(0, 10);

  selectedWeek = computed(() => this.openWeeks().find(w => w.id === this.selectedWeekId) ?? null);

  filterSemaine = getMondayStr();
  filterProgramme = '';
  filterStatut = '';
  annexeSemaine = getMondayStr();
  annexeCritiquesOnly = false;
  refProgramme = '';

  showForm = signal(false);
  editingId = signal<string | null>(null);
  form = EMPTY_FORM();

  showRefForm = signal(false);
  refForm = { programme: '', sousCategorie: '', denomination: '' };

  canEdit = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return false;
    const adminRoles = ['super_admin', 'admin_system', 'admin_finance'];
    const roles: string[] = user.roles ?? [];
    return roles.some(r => adminRoles.includes(r)) || (roles.includes('entity_member') && user.entityCode === 'QAD');
  });

  statutLabel(val: string): string {
    return STATUTS.find(s => s.val === val)?.label ?? val?.replace(/_/g, ' ') ?? '?';
  }
  statutClass = statutClass;
  programmeKeys(grouped: Record<string, any>) { return Object.keys(grouped ?? {}); }
  sousCatKeys(obj: Record<string, any>) { return Object.keys(obj ?? {}); }

  ngOnInit() {
    this.loadOpenWeeks();
    this.loadEntries();
    this.loadAnnexeA();
    this.loadDenominations();
    this.loadAllDenominations();
  }

  async loadOpenWeeks() {
    try {
      const weeks = await firstValueFrom(this.api.getActiveWeeks());
      const sorted = [...weeks].sort((a, b) =>
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      );
      this.openWeeks.set(sorted);
      if (sorted.length > 0 && !this.selectedWeekId) {
        this.selectedWeekId = sorted[0].id;
      }
    } catch { this.openWeeks.set([]); }
  }

  async loadEntries() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.api.getStockEntries(
        this.filterSemaine || undefined,
        this.filterProgramme || undefined,
        this.filterStatut || undefined,
      ));
      this.entries.set(data);
    } catch { this.entries.set([]); } finally { this.loading.set(false); }
  }

  async loadAnnexeA() {
    if (!this.annexeSemaine) return;
    this.annexeLoading.set(true);
    try {
      const data = await firstValueFrom(this.api.getStockAnnexeA(this.annexeSemaine, this.annexeCritiquesOnly));
      this.annexeData.set(data);
    } catch { this.annexeData.set(null); } finally { this.annexeLoading.set(false); }
  }

  async loadDenominations() {
    try {
      const data = await firstValueFrom(this.api.getRefDenominations(this.refProgramme || undefined));
      this.denominations.set(data);
    } catch { this.denominations.set([]); }
  }

  async loadAllDenominations() {
    try {
      const data = await firstValueFrom(this.api.getRefDenominations());
      this.allDenominations.set(data);
    } catch { this.allDenominations.set([]); }
  }

  get sousCategorieProgramme(): string[] {
    if (!this.form.programme) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const d of this.allDenominations()) {
      if (d.programme === this.form.programme && !seen.has(d.sousCategorie)) {
        seen.add(d.sousCategorie);
        result.push(d.sousCategorie);
      }
    }
    return result.sort();
  }

  get denominationsProgrammeSousCat(): any[] {
    if (!this.form.programme || !this.form.sousCategorie) return [];
    return this.allDenominations()
      .filter(d => d.programme === this.form.programme && d.sousCategorie === this.form.sousCategorie)
      .sort((a, b) => a.denomination.localeCompare(b.denomination));
  }

  onFormProgrammeChange() {
    this.form.sousCategorie = '';
    this.form.denomination = '';
    this.form.denominationId = '';
  }

  onFormSousCategorieChange() {
    this.form.denomination = '';
    this.form.denominationId = '';
  }

  onDenominationSelect(denomName: string) {
    const d = this.allDenominations().find(
      d => d.programme === this.form.programme &&
           d.sousCategorie === this.form.sousCategorie &&
           d.denomination === denomName
    );
    this.form.denominationId = d?.id ?? '';
  }

  openForm(entry?: any) {
    if (entry) {
      this.editingId.set(entry.id);
      this.form = {
        semaine: new Date(entry.semaine).toISOString().slice(0, 10),
        dateEtatStock: entry.dateEtatStock ? new Date(entry.dateEtatStock).toISOString().slice(0, 10) : this.dateEtatStock,
        programme: entry.programme, sousCategorie: entry.sousCategorie,
        denomination: entry.denomination, denominationId: entry.denominationId ?? '',
        stockCentrale: entry.stockCentrale !== null ? Number(entry.stockCentrale) : null,
        stockCentralMsd: entry.stockCentralMsd !== null ? Number(entry.stockCentralMsd) : null,
        stockPeripherique: Number(entry.stockPeripherique ?? 0),
        stockNational: entry.stockNational !== null ? Number(entry.stockNational) : null,
        cmm: entry.cmm !== null ? Number(entry.cmm) : null,
        datePeremptionCentrale: entry.datePeremptionCentrale ?? '',
        datePeremptionPeripherie: entry.datePeremptionPeripherie ?? '',
        statutStock: entry.statutStock, statutOverride: entry.statutOverride ?? false,
        sourceReapprovisionnement: entry.sourceReapprovisionnement ?? '',
        quantiteAttendue: Number(entry.quantiteAttendue ?? 0),
        dateLivraisonPrevue: entry.dateLivraisonPrevue ? new Date(entry.dateLivraisonPrevue).toISOString().slice(0, 10) : '',
        commentaire: entry.commentaire ?? '',
      };
    } else {
      this.editingId.set(null);
      const w = this.selectedWeek();
      this.form = {
        ...EMPTY_FORM(),
        semaine: w ? new Date(w.weekStart).toISOString().slice(0, 10) : getMondayStr(),
        dateEtatStock: this.dateEtatStock,
      };
    }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingId.set(null); }

  formValid() {
    return this.form.semaine && this.form.programme && this.form.sousCategorie && this.form.denomination && this.form.statutStock;
  }

  onMsdChange() {
    if (!this.form.statutOverride) {
      this.form.statutStock = computeStatut(this.form.stockCentralMsd);
    }
  }

  async saveEntry() {
    if (!this.formValid()) return;
    this.saving.set(true);
    try {
      const payload = {
        semaine: this.form.semaine,
        dateEtatStock: this.form.dateEtatStock || undefined,
        programme: this.form.programme,
        sousCategorie: this.form.sousCategorie,
        denomination: this.form.denomination,
        denominationId: this.form.denominationId || undefined,
        stockCentrale: this.form.stockCentrale,
        stockCentralMsd: this.form.stockCentralMsd,
        stockPeripherique: this.form.stockPeripherique,
        stockNational: this.form.stockNational,
        cmm: this.form.cmm,
        datePeremptionCentrale: this.form.datePeremptionCentrale || undefined,
        datePeremptionPeripherie: this.form.datePeremptionPeripherie || undefined,
        statutStock: this.form.statutStock,
        statutOverride: this.form.statutOverride,
        sourceReapprovisionnement: this.form.sourceReapprovisionnement || undefined,
        quantiteAttendue: this.form.quantiteAttendue,
        dateLivraisonPrevue: this.form.dateLivraisonPrevue || undefined,
        commentaire: this.form.commentaire,
      };
      const id = this.editingId();
      if (id) {
        await firstValueFrom(this.api.updateStockEntry(id, payload));
        this.snack.open('Entrée modifiée', 'OK', { duration: 2500 });
      } else {
        await firstValueFrom(this.api.createStockEntry(payload));
        this.snack.open('Entrée ajoutée', 'OK', { duration: 2500 });
      }
      this.closeForm();
      this.loadEntries();
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur lors de l\'enregistrement', 'OK', { duration: 4000 });
    } finally { this.saving.set(false); }
  }

  async deleteEntry(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
      await firstValueFrom(this.api.deleteStockEntry(id));
      this.snack.open('Supprimé', 'OK', { duration: 2000 });
      this.loadEntries();
    } catch {
      this.snack.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    }
  }

  async downloadTemplate() {
    try {
      const blob = await firstValueFrom(this.api.downloadStockTemplate());
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'modele_stock_lhspla.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { this.snack.open('Erreur téléchargement modèle', 'OK', { duration: 3000 }); }
  }

  async onImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importing.set(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const w = this.selectedWeek();
      if (w) fd.append('semaineOverride', new Date(w.weekStart).toISOString().slice(0, 10));
      if (this.dateEtatStock) fd.append('dateEtatStock', this.dateEtatStock);
      const result = await firstValueFrom(this.api.importStockExcel(fd));
      this.snack.open(`${result.imported} lignes importées, ${result.duplicates} doublons ignorés`, 'OK', { duration: 5000 });
      this.loadEntries();
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors de l\'import';
      this.snack.open(Array.isArray(msg) ? msg.join(' · ') : String(msg), 'OK', { duration: 6000 });
    } finally { this.importing.set(false); (event.target as HTMLInputElement).value = ''; }
  }

  async onImportPptx(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importingPptx.set(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const w = this.selectedWeek();
      if (w) fd.append('semaineOverride', new Date(w.weekStart).toISOString().slice(0, 10));
      if (this.dateEtatStock) fd.append('dateEtatStock', this.dateEtatStock);
      const result = await firstValueFrom(this.api.importStockPptx(fd));
      this.snack.open(
        `PowerPoint : ${result.imported} entrées importées · ${result.duplicates} doublons · semaine ${result.semaine}`,
        'OK', { duration: 6000 }
      );
      this.loadEntries();
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors de l\'import PowerPoint';
      this.snack.open(Array.isArray(msg) ? msg.join(' · ') : String(msg), 'OK', { duration: 6000 });
    } finally { this.importingPptx.set(false); (event.target as HTMLInputElement).value = ''; }
  }

  openRefForm() { this.refForm = { programme: '', sousCategorie: '', denomination: '' }; this.showRefForm.set(true); }

  async saveRef() {
    if (!this.refForm.programme || !this.refForm.sousCategorie || !this.refForm.denomination) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createRefDenomination(this.refForm));
      this.snack.open('Dénomination ajoutée', 'OK', { duration: 2000 });
      this.showRefForm.set(false);
      this.loadDenominations();
      this.loadAllDenominations();
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur', 'OK', { duration: 3000 });
    } finally { this.saving.set(false); }
  }
}
