import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

const STATUTS: { val: string; label: string }[] = [
  { val: 'RUPTURE_PAYS',      label: 'Rupture Pays' },
  { val: 'RUPTURE_CENTRALE',  label: 'Rupture Centrale' },
  { val: 'RUPTURE_IMMINENTE', label: 'Rupture Imminente' },
  { val: 'RISQUE',            label: 'Risque de rupture' },
  { val: 'BON_STOCKAGE',      label: 'Bien stocké' },
  { val: 'SURSTOCK',          label: 'Surstock' },
  { val: 'RISQUE_PEREMPTION', label: 'Risque Péremption' },
];

function statutClass(statut: string): string {
  switch (statut) {
    case 'RUPTURE_PAYS': case 'RUPTURE_CENTRALE': return 'chip-rupture';
    case 'RUPTURE_IMMINENTE': return 'chip-rupture-im';
    case 'RISQUE':            return 'chip-risque';
    case 'BON_STOCKAGE':      return 'chip-bon';
    case 'SURSTOCK':          return 'chip-surstock';
    case 'RISQUE_PEREMPTION': return 'chip-peremption';
    default: return '';
  }
}

@Component({
  selector: 'app-stock-consult',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>inventory_2</mat-icon>
          <div>
            <h1>État du stock hebdomadaire</h1>
            <p>Consultation de l'état du stock par période de rapportage</p>
          </div>
        </div>
      </div>

      <!-- ── Sélecteur de semaine ────────────────────────────────────────── -->
      <div class="selector-bar">
        <mat-form-field appearance="outline" class="week-field">
          <mat-label>Période de rapportage</mat-label>
          <mat-select [(ngModel)]="selectedWeekId" (ngModelChange)="onWeekChange()">
            <mat-option *ngFor="let w of weeks()" [value]="w.id">
              {{w.weekReference}} — du {{w.weekStart | date:'dd/MM/yyyy'}} au {{w.weekEnd | date:'dd/MM/yyyy'}}
              <span class="week-status" *ngIf="w.status === 'active'"> (ouverte)</span>
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="weeks().length === 0">Aucune période disponible</mat-hint>
        </mat-form-field>
        <div class="week-badge" *ngIf="selectedWeek()">
          <mat-icon>date_range</mat-icon>
          Semaine du <strong>{{selectedWeek().weekStart | date:'dd/MM/yyyy'}}</strong>
          au <strong>{{selectedWeek().weekEnd | date:'dd/MM/yyyy'}}</strong>
          <span class="badge-active" *ngIf="selectedWeek().status === 'active'">Ouverte</span>
          <span class="badge-closed" *ngIf="selectedWeek().status !== 'active'">Clôturée</span>
        </div>
      </div>

      <!-- ── Chargement ──────────────────────────────────────────────────── -->
      <div class="loading-state" *ngIf="loading()">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement…</p>
      </div>

      <!-- ── Aucune donnée ───────────────────────────────────────────────── -->
      <div class="empty-state" *ngIf="!loading() && annexeData() && annexeData().entries.length === 0">
        <mat-icon>inventory_2</mat-icon>
        <p>Aucun état de stock disponible pour cette période</p>
        <span>L'entité QAD n'a pas encore importé l'état de stock pour cette semaine.</span>
      </div>

      <!-- ── Données par programme ───────────────────────────────────────── -->
      <div class="data-container" *ngIf="!loading() && annexeData() && annexeData().entries.length > 0">

        <!-- Résumé rapide -->
        <div class="summary-bar">
          <div class="summary-item">
            <span class="summary-val">{{annexeData().entries.length}}</span>
            <span class="summary-lbl">produits</span>
          </div>
          <div class="summary-item summary-rupture">
            <span class="summary-val">{{countStatut('RUPTURE_PAYS') + countStatut('RUPTURE_CENTRALE')}}</span>
            <span class="summary-lbl">ruptures</span>
          </div>
          <div class="summary-item summary-risque">
            <span class="summary-val">{{countStatut('RUPTURE_IMMINENTE') + countStatut('RISQUE') + countStatut('RISQUE_PEREMPTION')}}</span>
            <span class="summary-lbl">à risque</span>
          </div>
          <div class="summary-item summary-ok">
            <span class="summary-val">{{countStatut('BON_STOCKAGE')}}</span>
            <span class="summary-lbl">bien stocké</span>
          </div>
          <div class="summary-item summary-surstock">
            <span class="summary-val">{{countStatut('SURSTOCK')}}</span>
            <span class="summary-lbl">surstock</span>
          </div>
        </div>

        <!-- Tables par programme > sous-catégorie -->
        <ng-container *ngFor="let prog of programmeKeys()">
          <div class="prog-header" [ngClass]="'prog-' + prog.toLowerCase()">
            <mat-icon>medication</mat-icon> Programme {{prog}}
          </div>
          <ng-container *ngFor="let sousCat of sousCatKeys(prog)">
            <div class="sous-cat-header">{{sousCat}}</div>
            <div class="table-wrap">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Dénomination</th>
                    <th>Statut</th>
                    <th>Stk Centrale</th>
                    <th>Stk Péri.</th>
                    <th>Stk National</th>
                    <th>CMM</th>
                    <th>MSD</th>
                    <th>Dt. Pér. Ctr.</th>
                    <th>Dt. Pér. Péri.</th>
                    <th>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let e of getEntries(prog, sousCat); let i=index" [class.row-alt]="i%2===1">
                    <td class="td-denom">{{e.denomination}}</td>
                    <td><span class="chip-statut" [ngClass]="getStatutClass(e.statutStock)">{{getStatutLabel(e.statutStock)}}</span></td>
                    <td class="td-num">{{e.stockCentrale != null ? (e.stockCentrale | number) : '—'}}</td>
                    <td class="td-num">{{e.stockPeripherique != null ? (e.stockPeripherique | number) : '—'}}</td>
                    <td class="td-num">{{e.stockNational != null ? (e.stockNational | number) : '—'}}</td>
                    <td class="td-num">{{e.cmm != null ? e.cmm : '—'}}</td>
                    <td class="td-num">{{e.stockCentralMsd ?? '—'}}</td>
                    <td class="td-date">{{e.datePeremptionCentrale || '—'}}</td>
                    <td class="td-date">{{e.datePeremptionPeripherie || '—'}}</td>
                    <td class="td-comment"
                        [matTooltip]="e.commentaire || ''"
                        [matTooltipDisabled]="!e.commentaire"
                        matTooltipPosition="left"
                        matTooltipClass="comment-tooltip">{{e.commentaire || '—'}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ng-container>
        </ng-container>

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

    .selector-bar { display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:14px 20px; background:#fff; border-bottom:1px solid #e8eef5; }
    .week-field { min-width:320px; }
    .week-status { font-size:.75rem; color:#2e75b6; }
    .week-badge { display:flex; align-items:center; gap:6px; font-size:.85rem; color:#444; }
    .week-badge mat-icon { font-size:18px; width:18px; height:18px; color:#1F4E79; }
    .badge-active { background:#E2EFDA; color:#375623; padding:2px 8px; border-radius:10px; font-size:.72rem; font-weight:700; margin-left:6px; }
    .badge-closed { background:#f5f5f5; color:#888; padding:2px 8px; border-radius:10px; font-size:.72rem; font-weight:700; margin-left:6px; }

    .data-container { padding:16px 20px; display:flex; flex-direction:column; gap:4px; }

    .summary-bar { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
    .summary-item { display:flex; flex-direction:column; align-items:center; padding:8px 16px; border-radius:8px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.08); min-width:80px; }
    .summary-val { font-size:1.6rem; font-weight:800; line-height:1; }
    .summary-lbl { font-size:.68rem; text-transform:uppercase; font-weight:700; opacity:.7; margin-top:2px; }
    .summary-rupture { background:#FFBABA; color:#C00000; }
    .summary-risque { background:#FFE5CC; color:#7B3F00; }
    .summary-ok { background:#E2EFDA; color:#375623; }
    .summary-surstock { background:#EDEDED; color:#595959; }

    .prog-header { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:6px; font-weight:700; font-size:.9rem; margin:12px 0 4px; }
    .prog-header mat-icon { font-size:18px; width:18px; height:18px; }
    .prog-pnls  { background:#BDD7EE; color:#1F4E79; }
    .prog-pnlp  { background:#FFDDC1; color:#7B3F00; }
    .prog-pnsme { background:#C6EFCE; color:#375623; }
    .sous-cat-header { padding:4px 12px; font-style:italic; font-size:.82rem; color:#444; background:#f5f5f5; border-left:3px solid #2E75B6; margin:6px 0 2px; }

    .table-wrap { overflow-x:auto; margin-bottom:8px; }
    .stock-table { width:100%; border-collapse:collapse; font-size:.82rem; }
    .stock-table th { background:#1F4E79; color:#fff; padding:6px 8px; text-align:left; font-weight:700; font-size:.78rem; white-space:nowrap; }
    .stock-table td { padding:5px 8px; border-bottom:1px solid #e8eef5; vertical-align:middle; white-space:nowrap; }
    .row-alt td { background:#f5f9ff; }
    .td-denom { font-weight:600; color:#1F4E79; min-width:140px; white-space:normal; }
    .td-num { text-align:right; }
    .td-date { font-size:.78rem; color:#555; min-width:80px; }
    .td-comment { font-size:.78rem; color:#666; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:help; }

    .chip-statut { display:inline-block; padding:2px 8px; border-radius:10px; font-size:.72rem; font-weight:700; white-space:nowrap; }
    .chip-rupture    { background:#C00000; color:#fff; }
    .chip-rupture-im { background:#FFBABA; color:#C00000; }
    .chip-risque     { background:#E97132; color:#fff; }
    .chip-bon        { background:#E2EFDA; color:#375623; }
    .chip-surstock   { background:#EDEDED; color:#595959; }
    .chip-peremption { background:#FFFF99; color:#7B5E00; }

    .loading-state { text-align:center; padding:40px; color:#888; }
    .loading-state mat-icon { font-size:40px; display:block; margin:0 auto 8px; }
    .empty-state { text-align:center; padding:60px 20px; color:#aaa; }
    .empty-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; color:#bbb; }
    .empty-state p { font-size:1rem; font-weight:600; color:#666; margin:0 0 6px; }
    .empty-state span { font-size:.85rem; }
  `]
})
export class StockConsultComponent implements OnInit {
  private api = inject(ApiService);

  weeks = signal<any[]>([]);
  selectedWeekId = '';
  annexeData = signal<any | null>(null);
  loading = signal(false);

  selectedWeek = computed(() => this.weeks().find(w => w.id === this.selectedWeekId) ?? null);

  ngOnInit() { this.loadWeeks(); }

  async loadWeeks() {
    try {
      const weeks = await firstValueFrom(this.api.getWeeks());
      const sorted = [...weeks].sort((a, b) =>
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      );
      this.weeks.set(sorted);
      if (sorted.length > 0) {
        this.selectedWeekId = sorted[0].id;
        await this.loadStock();
      }
    } catch { this.weeks.set([]); }
  }

  async onWeekChange() { await this.loadStock(); }

  async loadStock() {
    const w = this.selectedWeek();
    if (!w) return;
    this.loading.set(true);
    try {
      const semaine = new Date(w.weekStart).toISOString().slice(0, 10);
      const data = await firstValueFrom(this.api.getStockAnnexeA(semaine, false));
      this.annexeData.set(data);
    } catch { this.annexeData.set({ entries: [], grouped: {} }); }
    finally { this.loading.set(false); }
  }

  programmeKeys(): string[] {
    return Object.keys(this.annexeData()?.grouped ?? {}).sort();
  }

  sousCatKeys(prog: string): string[] {
    return Object.keys(this.annexeData()?.grouped?.[prog] ?? {}).sort();
  }

  getEntries(prog: string, sousCat: string): any[] {
    return this.annexeData()?.grouped?.[prog]?.[sousCat] ?? [];
  }

  countStatut(statut: string): number {
    return (this.annexeData()?.entries ?? []).filter((e: any) => e.statutStock === statut).length;
  }

  getStatutLabel(val: string): string {
    return STATUTS.find(s => s.val === val)?.label ?? val?.replace(/_/g, ' ') ?? '?';
  }

  getStatutClass = statutClass;
}
