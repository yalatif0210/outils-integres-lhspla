import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-stock-import',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>upload_file</mat-icon>
          <div>
            <h1>Importer l'état de stock</h1>
            <p>Import du fichier PowerPoint PPTX fourni par QAD</p>
          </div>
        </div>
      </div>

      <div class="content">

        <!-- ── Contexte ─────────────────────────────────────────────────────── -->
        <div class="card ctx-card">
          <div class="card-title"><mat-icon>event_note</mat-icon> Contexte de l'état de stock</div>
          <div class="ctx-fields">
            <mat-form-field appearance="outline" class="ctx-field">
              <mat-label>Date de l'état de stock</mat-label>
              <input matInput type="date" [(ngModel)]="dateEtatStock">
            </mat-form-field>
            <mat-form-field appearance="outline" class="ctx-field ctx-wide">
              <mat-label>Période de rapportage *</mat-label>
              <mat-select [(ngModel)]="selectedWeekId">
                <mat-option *ngFor="let w of openWeeks()" [value]="w.id">
                  {{w.weekReference}} — du {{w.weekStart | date:'dd/MM'}} au {{w.weekEnd | date:'dd/MM/yyyy'}}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="openWeeks().length === 0">Aucune semaine ouverte disponible</mat-hint>
            </mat-form-field>
          </div>
          <div class="ctx-status ctx-ok" *ngIf="selectedWeek()">
            <mat-icon>check_circle</mat-icon>
            Contexte défini : {{selectedWeek().weekReference}}
            — état du {{dateEtatStock | date:'dd/MM/yyyy'}}
          </div>
          <div class="ctx-status ctx-warn" *ngIf="!selectedWeek()">
            <mat-icon>warning</mat-icon>
            Sélectionnez une période de rapportage avant d'importer
          </div>
        </div>

        <!-- ── Import PPTX ──────────────────────────────────────────────────── -->
        <div class="card import-card">
          <div class="card-title"><mat-icon>slideshow</mat-icon> Fichier PowerPoint</div>
          <p class="import-hint">
            Sélectionnez le fichier <strong>.pptx</strong> de l'état de stock hebdomadaire.
            Toutes les entrées existantes pour la période sélectionnée seront ignorées (doublons).
          </p>
          <input type="file" accept=".pptx" style="display:none" #pptxInput (change)="onImportPptx($event)">
          <button mat-raised-button color="primary" class="import-btn"
            (click)="pptxInput.click()"
            [disabled]="importingPptx() || !selectedWeek()">
            <mat-icon>{{importingPptx() ? 'hourglass_empty' : 'cloud_upload'}}</mat-icon>
            {{importingPptx() ? 'Import en cours…' : 'Sélectionner et importer le PPTX'}}
          </button>
        </div>

        <!-- ── Résultat ─────────────────────────────────────────────────────── -->
        <div class="card result-card" *ngIf="importResult()">
          <div class="card-title result-ok"><mat-icon>check_circle</mat-icon> Import terminé</div>
          <div class="result-grid">
            <div class="result-item result-imported">
              <span class="result-value">{{importResult().imported}}</span>
              <span class="result-label">Entrées importées</span>
            </div>
            <div class="result-item result-dup" *ngIf="importResult().duplicates > 0">
              <span class="result-value">{{importResult().duplicates}}</span>
              <span class="result-label">Doublons ignorés</span>
            </div>
            <div class="result-item result-skip" *ngIf="importResult().skipped > 0">
              <span class="result-value">{{importResult().skipped}}</span>
              <span class="result-label">Lignes ignorées</span>
            </div>
          </div>
          <p class="result-semaine">
            <mat-icon>calendar_today</mat-icon>
            Semaine de référence : <strong>{{importResult().semaine | date:'dd/MM/yyyy'}}</strong>
          </p>
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

    .content { padding:20px; display:flex; flex-direction:column; gap:16px; max-width:700px; }

    .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:20px; }
    .card-title { display:flex; align-items:center; gap:8px; font-weight:700; font-size:.95rem; color:#1F4E79; margin-bottom:14px; }
    .card-title mat-icon { font-size:20px; width:20px; height:20px; }

    .ctx-fields { display:flex; gap:12px; flex-wrap:wrap; }
    .ctx-field { min-width:180px; }
    .ctx-wide { min-width:280px; }
    .ctx-status { display:flex; align-items:center; gap:6px; padding:8px 12px; border-radius:6px; font-size:.82rem; font-weight:600; margin-top:8px; }
    .ctx-status mat-icon { font-size:16px; width:16px; height:16px; }
    .ctx-ok { background:#E2EFDA; color:#375623; }
    .ctx-warn { background:#FFF3CD; color:#856404; }

    .import-hint { font-size:.85rem; color:#555; margin:0 0 16px; line-height:1.5; }
    .import-btn { height:48px; font-size:.95rem; }
    .import-btn mat-icon { margin-right:6px; }

    .result-ok { color:#375623; }
    .result-grid { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:12px; }
    .result-item { display:flex; flex-direction:column; align-items:center; padding:12px 20px; border-radius:8px; min-width:100px; }
    .result-value { font-size:2rem; font-weight:800; }
    .result-label { font-size:.75rem; font-weight:600; text-transform:uppercase; opacity:.75; }
    .result-imported { background:#E2EFDA; color:#375623; }
    .result-dup { background:#FFF3CD; color:#856404; }
    .result-skip { background:#f5f5f5; color:#555; }
    .result-semaine { display:flex; align-items:center; gap:6px; font-size:.85rem; color:#555; margin:0; }
    .result-semaine mat-icon { font-size:16px; width:16px; height:16px; color:#1F4E79; }
  `]
})
export class StockImportComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  openWeeks = signal<any[]>([]);
  selectedWeekId = '';
  dateEtatStock = new Date().toISOString().slice(0, 10);
  importingPptx = signal(false);
  importResult = signal<any | null>(null);

  selectedWeek = computed(() => this.openWeeks().find(w => w.id === this.selectedWeekId) ?? null);

  ngOnInit() { this.loadOpenWeeks(); }

  async loadOpenWeeks() {
    try {
      const weeks = await firstValueFrom(this.api.getActiveWeeks());
      const sorted = [...weeks].sort((a, b) =>
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      );
      this.openWeeks.set(sorted);
      if (sorted.length > 0) this.selectedWeekId = sorted[0].id;
    } catch { this.openWeeks.set([]); }
  }

  async onImportPptx(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importingPptx.set(true);
    this.importResult.set(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const w = this.selectedWeek();
      if (w) fd.append('semaineOverride', new Date(w.weekStart).toISOString().slice(0, 10));
      if (this.dateEtatStock) fd.append('dateEtatStock', this.dateEtatStock);
      const result = await firstValueFrom(this.api.importStockPptx(fd));
      this.importResult.set(result);
      this.snack.open(
        `Import terminé : ${result.imported} entrées · ${result.duplicates} doublons`,
        'OK', { duration: 5000 }
      );
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors de l\'import PowerPoint';
      this.snack.open(Array.isArray(msg) ? msg.join(' · ') : String(msg), 'OK', { duration: 6000 });
    } finally {
      this.importingPptx.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }
}
