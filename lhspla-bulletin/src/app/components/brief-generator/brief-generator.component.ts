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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

function formatDate(d: any): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

@Component({
  selector: 'app-brief-generator',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatProgressBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>newspaper</mat-icon>
          <div>
            <h1>Weekly Operations Brief</h1>
            <p>Génération automatique du rapport hebdomadaire LHSPLA</p>
          </div>
        </div>
      </div>

      <div class="page-body">

        <!-- Panneau de contrôle -->
        <mat-card class="control-card">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>tune</mat-icon> Paramètres de génération</h3>
            <div class="controls-row">
              <mat-form-field appearance="outline" class="semaine-field">
                <mat-label>Période de rapportage</mat-label>
                <mat-select [(ngModel)]="selectedWeekId" (ngModelChange)="onWeekChange()">
                  <mat-option *ngFor="let w of weeks()" [value]="w.id">
                    {{w.weekReference}} — du {{w.weekStart | date:'dd/MM/yyyy'}} au {{w.weekEnd | date:'dd/MM/yyyy'}}
                    <span *ngIf="w.status === 'active'" style="font-size:.75rem;color:#2e75b6"> (ouverte)</span>
                  </mat-option>
                </mat-select>
                <mat-hint *ngIf="weeks().length === 0">Aucune période disponible</mat-hint>
              </mat-form-field>

              <!-- Prévisualiser — uniquement si draft validé -->
              <button mat-raised-button color="primary" (click)="loadPreview()"
                      [disabled]="!selectedWeekId || previewing()"
                      *ngIf="draft()?.validated">
                <mat-icon>preview</mat-icon> {{previewing() ? 'Chargement…' : 'Prévisualiser'}}
              </button>

              <!-- Générer PDF — commenté intentionnellement (implémentation en attente)
              <button mat-raised-button class="btn-generate" (click)="generate(false)"
                      [disabled]="!canGenerate() || generating()"
                      *ngIf="canGeneratePdf()">
                <mat-icon>picture_as_pdf</mat-icon> {{generating() ? 'Génération…' : 'Générer PDF'}}
              </button>
              -->

              <!-- Générer Word — uniquement si draft validé -->
              <button mat-raised-button class="btn-word" (click)="generateWord()"
                      [disabled]="generatingWord()"
                      *ngIf="canGeneratePdf() && draft()?.validated">
                <mat-icon>description</mat-icon> {{generatingWord() ? 'Génération…' : 'Générer Word'}}
              </button>

              <!-- Générer B/C/D — toujours disponible pour (re)générer -->
              <button mat-raised-button class="btn-llm" (click)="generateSections()"
                      [disabled]="!selectedWeekId || generatingSections()"
                      *ngIf="canGeneratePdf()">
                <mat-icon>auto_awesome</mat-icon> {{generatingSections() ? 'IA en cours…' : 'Générer B/C/D (IA)'}}
              </button>
            </div>

            <!-- Barre de progression génération Word -->
            <div class="word-progress" *ngIf="generatingWord()">
              <div class="word-progress-labels">
                <span class="progress-step" [class.active]="wordProgress() < 30">
                  <mat-icon>storage</mat-icon> Consolidation des données
                </span>
                <span class="progress-step" [class.active]="wordProgress() >= 30 && wordProgress() < 65">
                  <mat-icon>timeline</mat-icon> Génération de la timeline
                </span>
                <span class="progress-step" [class.active]="wordProgress() >= 65 && wordProgress() < 95">
                  <mat-icon>description</mat-icon> Assemblage du document
                </span>
                <span class="progress-step" [class.active]="wordProgress() >= 95">
                  <mat-icon>check_circle</mat-icon> Finalisation
                </span>
              </div>
              <mat-progress-bar
                mode="determinate"
                [value]="wordProgress()"
                color="primary">
              </mat-progress-bar>
              <div class="progress-pct">{{wordProgress()}}%</div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Indicateurs complétude -->
        <div class="completness-grid" *ngIf="preview()">
          <div class="compl-card" [class.compl-ok]="preview().completness.sectionA.ok" [class.compl-warn]="!preview().completness.sectionA.ok">
            <mat-icon>inventory_2</mat-icon>
            <div class="compl-info">
              <strong>Section A — Stock</strong>
              <span>{{criticalStocks().length}} produit(s) critique(s)</span>
            </div>
            <mat-icon class="compl-check">{{preview().completness.sectionA.ok ? 'check_circle' : 'warning'}}</mat-icon>
          </div>
          <div class="compl-card" [class.compl-ok]="preview().completness.sectionB.ok" [class.compl-warn]="!preview().completness.sectionB.ok">
            <mat-icon>task_alt</mat-icon>
            <div class="compl-info">
              <strong>Section B — Réalisé</strong>
              <span>{{preview().completness.sectionB.count}} activité(s) — {{preview().completness.sectionB.composantes}} composante(s)</span>
            </div>
            <mat-icon class="compl-check">{{preview().completness.sectionB.ok ? 'check_circle' : 'warning'}}</mat-icon>
          </div>
          <div class="compl-card" [class.compl-ok]="preview().completness.sectionC.ok" [class.compl-warn]="!preview().completness.sectionC.ok">
            <mat-icon>calendar_month</mat-icon>
            <div class="compl-info">
              <strong>Section C — Planifié</strong>
              <span>{{preview().completness.sectionC.count}} activité(s) planifiée(s)</span>
            </div>
            <mat-icon class="compl-check">{{preview().completness.sectionC.ok ? 'check_circle' : 'warning'}}</mat-icon>
          </div>
          <div class="compl-card compl-ok">
            <mat-icon>warning_amber</mat-icon>
            <div class="compl-info">
              <strong>Section D — Risques</strong>
              <span>{{preview().completness.sectionD.count}} alerte(s) dont {{preview().completness.sectionD.eleve}} élevée(s)</span>
            </div>
            <mat-icon class="compl-check">check_circle</mat-icon>
          </div>
        </div>

        <!-- Avertissements sections vides -->
        <div class="warn-banner" *ngIf="preview() && hasEmptySections()">
          <mat-icon>warning</mat-icon>
          <div>
            <strong>Données manquantes détectées</strong>
            <p>Une ou plusieurs sections sont vides.</p>
          </div>
        </div>

        <!-- Aperçu du contenu -->
        <mat-card class="preview-card" *ngIf="preview()">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>preview</mat-icon> Aperçu — Semaine du {{preview().semaineLabel}}</h3>

            <!-- Section A résumé -->
            <div class="section-preview">
              <div class="sp-header"><mat-icon>inventory_2</mat-icon> Section A — Produits critiques</div>
              <div class="sp-body" *ngIf="criticalStocks().length > 0">
                <table class="prev-table">
                  <thead><tr><th>Dénomination</th><th>Programme</th><th>Statut</th><th>MSD</th><th>Commentaire</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let e of criticalStocks()">
                      <td>{{e.denomination}}</td>
                      <td><span class="badge-prog badge-{{e.programme.toLowerCase()}}">{{e.programme}}</span></td>
                      <td><span class="chip-statut chip-{{e.statutAffiche.toLowerCase()}}">{{fmtStatut(e.statutAffiche)}}</span></td>
                      <td>{{e.stockCentralMsd ?? '—'}}</td>
                      <td>{{e.commentaire || '—'}}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="sp-empty" *ngIf="criticalStocks().length === 0">Aucun produit critique cette semaine</div>
            </div>

            <!-- Section B résumé -->
            <div class="section-preview">
              <div class="sp-header"><mat-icon>task_alt</mat-icon> Section B — Activités réalisées ({{preview().data.sectionB.composantes.length}} composante(s))</div>
              <div class="sp-body" *ngIf="preview().data.sectionB.composantes.length > 0">
                <div class="composante-block" *ngFor="let comp of preview().data.sectionB.composantes">
                  <div class="comp-label">▸ {{comp.code}} ({{comp.activities.length}} activité(s))</div>
                  <ul class="act-list">
                    <li *ngFor="let a of comp.activities">{{a.title || '(sans titre)'}} — {{a.location || '—'}} — {{fmtPreviewDate(a.startDate, a.endDate)}}</li>
                  </ul>
                </div>
              </div>
              <div class="sp-empty" *ngIf="preview().data.sectionB.composantes.length === 0">Aucune activité réalisée soumise</div>
            </div>

            <!-- Section C résumé -->
            <div class="section-preview">
              <div class="sp-header"><mat-icon>calendar_month</mat-icon> Section C — Activités planifiées (mois glissant)</div>
              <div class="sp-body" *ngIf="preview().data.sectionC.composantes.length > 0">
                <p class="dos-note" *ngIf="!preview().data.sectionC.dosRequired">ℹ️ Aucune activité DoS requise sur la période</p>
                <div class="composante-block" *ngFor="let comp of preview().data.sectionC.composantes">
                  <div class="comp-label">▸ {{comp.code}} ({{comp.activities.length}} activité(s))</div>
                  <ul class="act-list">
                    <li *ngFor="let a of comp.activities">{{a.title || '(sans titre)'}} — {{a.location || '—'}} — {{fmtPreviewDate(a.startDate, a.endDate)}}
                      <span class="dos-badge" *ngIf="a.dosParticipation === 'oui'">DoS</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div class="sp-empty" *ngIf="preview().data.sectionC.composantes.length === 0">Aucune activité planifiée sur la période</div>
            </div>

            <!-- Section D résumé -->
            <div class="section-preview">
              <div class="sp-header"><mat-icon>warning_amber</mat-icon> Section D — Risques ({{preview().data.sectionD.alerts.length}} alerte(s))</div>
              <div class="sp-body" *ngIf="preview().data.sectionD.alerts.length > 0">
                <div class="alert-row" *ngFor="let a of preview().data.sectionD.alerts"
                     [class.alert-critique]="a.criticality === 'critique'"
                     [class.alert-eleve]="a.criticality === 'eleve'">
                  <span class="alert-level">{{a.criticality?.toUpperCase()}}</span>
                  <span class="alert-entity">{{a.entityCode}}</span>
                  <span class="alert-desc">{{a.description}}</span>
                </div>
              </div>
              <div class="sp-empty" *ngIf="preview().data.sectionD.alerts.length === 0">Aucune alerte ouverte ✓</div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Sections B/C/D générées par IA -->
        <mat-card class="draft-card" *ngIf="draft()">
          <mat-card-content>
            <div class="draft-header">
              <h3 class="section-title"><mat-icon>auto_awesome</mat-icon> Sections générées par IA — {{draft().llmModel}}</h3>
              <span class="draft-status" [class.validated]="draft().validated">
                {{draft().validated ? '✓ Validé' : 'En attente de validation'}}
              </span>
            </div>

            <div class="draft-section">
              <div class="draft-label">B — Activités réalisées</div>
              <textarea class="draft-textarea" [(ngModel)]="draftB" rows="10"></textarea>
            </div>
            <div class="draft-section">
              <div class="draft-label">C — Activités planifiées</div>
              <textarea class="draft-textarea" [(ngModel)]="draftC" rows="10"></textarea>
            </div>
            <div class="draft-section">
              <div class="draft-label">D — Points de vigilance</div>
              <textarea class="draft-textarea" [(ngModel)]="draftD" rows="6"></textarea>
            </div>

            <div class="draft-actions" *ngIf="!draft().validated">
              <button mat-raised-button color="primary" (click)="saveDraft()">
                <mat-icon>save</mat-icon> Enregistrer les modifications
              </button>
              <button mat-raised-button class="btn-validate" (click)="validateDraft()">
                <mat-icon>check_circle</mat-icon> Valider pour génération
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Historique -->
        <mat-card class="history-card">
          <mat-card-content>
            <div class="history-header">
              <h3 class="section-title"><mat-icon>history</mat-icon> Historique des briefs générés</h3>
              <button mat-stroked-button (click)="loadHistory()"><mat-icon>refresh</mat-icon></button>
            </div>
            <div *ngIf="historyLoading()" class="loading-sm"><mat-icon>hourglass_empty</mat-icon> Chargement…</div>
            <table class="hist-table" *ngIf="!historyLoading() && history().length > 0">
              <thead><tr><th>Semaine</th><th>Format</th><th>Généré le</th><th>Par</th><th>Hash</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                <tr *ngFor="let h of history()">
                  <td><strong>{{formatDate(h.semaineRapportage)}}</strong></td>
                  <td>
                    <span class="badge-format badge-docx" *ngIf="h.format === 'docx'">
                      <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle">description</mat-icon> DOCX
                    </span>
                    <span class="badge-format badge-pdf" *ngIf="h.format === 'pdf'">
                      <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle">picture_as_pdf</mat-icon> PDF
                    </span>
                  </td>
                  <td>{{formatDate(h.dateGeneration)}}</td>
                  <td>{{h.genereParUser?.firstName}} {{h.genereParUser?.lastName}}</td>
                  <td class="hash-cell">#{{h.hashContenu?.slice(0,8).toUpperCase()}}</td>
                  <td><span class="badge-archived" *ngIf="h.archived">Archivé</span><span class="badge-active" *ngIf="!h.archived">Actif</span></td>
                  <td>
                    <button mat-icon-button (click)="downloadHistory(h.id, h.format)" matTooltip="Télécharger"><mat-icon>download</mat-icon></button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="sp-empty" *ngIf="!historyLoading() && history().length === 0">Aucun brief généré pour le moment</div>
          </mat-card-content>
        </mat-card>

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

    .page-body { padding:16px 20px; display:flex; flex-direction:column; gap:16px; }
    .section-title { display:flex; align-items:center; gap:8px; margin:0 0 14px; font-size:.95rem; font-weight:700; color:#1F4E79; }
    .section-title mat-icon { font-size:20px; width:20px; height:20px; }

    .control-card { border-radius:10px !important; }
    .controls-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .semaine-field { min-width:260px; }
    .btn-generate { background:#1F4E79 !important; color:#fff !important; }
    .btn-word { background:#2E7D32 !important; color:#fff !important; }

    .completness-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px; }
    .compl-card { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; background:#fff; border:2px solid #e0e0e0; }
    .compl-ok { border-color:#388e3c !important; background:#f1f9f1 !important; }
    .compl-warn { border-color:#f57c00 !important; background:#fff8f1 !important; }
    .compl-card mat-icon:first-child { color:#2E75B6; font-size:22px; }
    .compl-info { flex:1; }
    .compl-info strong { display:block; font-size:.82rem; color:#1F4E79; }
    .compl-info span { font-size:.78rem; color:#666; }
    .compl-check { font-size:20px !important; }
    .compl-ok .compl-check { color:#388e3c; }
    .compl-warn .compl-check { color:#f57c00; }

    .warn-banner { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#fff3e0; border-left:4px solid #f57c00; border-radius:6px; }
    .warn-banner mat-icon { color:#f57c00; font-size:24px; }
    .warn-banner div { flex:1; }
    .warn-banner strong { display:block; color:#e65100; font-size:.9rem; }
    .warn-banner p { margin:.4rem 0 0; font-size:.82rem; color:#555; }
    .btn-force { border-color:#f57c00 !important; color:#f57c00 !important; }

    .preview-card { border-radius:10px !important; }
    .section-preview { border:1px solid #e8eef5; border-radius:8px; margin-bottom:12px; overflow:hidden; }
    .sp-header { display:flex; align-items:center; gap:6px; padding:8px 12px; background:#f0f4f8; font-weight:700; font-size:.85rem; color:#1F4E79; }
    .sp-header mat-icon { font-size:18px; width:18px; height:18px; color:#2E75B6; }
    .sp-body { padding:10px 12px; }
    .sp-empty { padding:12px; font-size:.82rem; color:#aaa; font-style:italic; }

    .prev-table { width:100%; border-collapse:collapse; font-size:.8rem; }
    .prev-table th { background:#1F4E79; color:#fff; padding:4px 8px; font-size:.76rem; }
    .prev-table td { padding:4px 8px; border-bottom:1px solid #f0f0f0; }
    .badge-prog { display:inline-block; padding:1px 6px; border-radius:8px; font-weight:700; font-size:.7rem; }
    .badge-pnls { background:#BDD7EE; color:#1F4E79; }
    .badge-pnlp { background:#FFDDC1; color:#7B3F00; }
    .badge-pnsme { background:#C6EFCE; color:#375623; }
    .chip-statut { display:inline-block; padding:1px 6px; border-radius:8px; font-size:.7rem; font-weight:700; white-space:nowrap; }
    .chip-rupture_pays, .chip-rupture_centrale { background:#C00000; color:#fff; }
    .chip-rupture_imminente { background:#FFBABA; color:#C00000; }
    .chip-risque { background:#E97132; color:#fff; }
    .chip-bon_stockage { background:#E2EFDA; color:#375623; }
    .chip-surstock { background:#EDEDED; color:#595959; }
    .chip-risque_peremption { background:#FFFF99; color:#7B5E00; }

    .composante-block { margin-bottom:8px; }
    .comp-label { font-weight:700; font-size:.83rem; color:#1F4E79; margin-bottom:4px; }
    .act-list { margin:0 0 0 16px; padding:0; list-style:disc; font-size:.78rem; color:#444; }
    .act-list li { margin-bottom:2px; }
    .dos-badge { display:inline-block; margin-left:6px; padding:0 5px; background:#e3f2fd; color:#1565c0; font-size:.68rem; border-radius:6px; font-weight:700; }
    .dos-note { font-size:.8rem; color:#1565c0; margin:0 0 6px; font-style:italic; }

    .alert-row { display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:6px; margin-bottom:4px; background:#f5f5f5; font-size:.8rem; }
    .alert-critique { background:#ffeaea !important; }
    .alert-eleve { background:#fff4e0 !important; }
    .alert-level { font-weight:700; font-size:.72rem; min-width:60px; }
    .alert-critique .alert-level { color:#C00000; }
    .alert-eleve .alert-level { color:#E97132; }
    .alert-entity { font-weight:600; color:#1F4E79; min-width:50px; }
    .alert-desc { flex:1; color:#444; }

    .history-card { border-radius:10px !important; }
    .history-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .history-header h3 { margin:0; }
    .hist-table { width:100%; border-collapse:collapse; font-size:.82rem; }
    .hist-table th { background:#1F4E79; color:#fff; padding:5px 10px; font-size:.78rem; }
    .hist-table td { padding:6px 10px; border-bottom:1px solid #f0f0f0; }
    .hash-cell { font-family:monospace; font-size:.75rem; color:#555; }
    .badge-active { background:#e8f5e9; color:#2e7d32; border-radius:8px; padding:2px 8px; font-size:.72rem; font-weight:700; }
    .badge-archived { background:#f3e5f5; color:#7b1fa2; border-radius:8px; padding:2px 8px; font-size:.72rem; font-weight:700; }
    .badge-format { display:inline-flex; align-items:center; gap:3px; border-radius:6px; padding:2px 7px; font-size:.7rem; font-weight:700; }
    .badge-docx { background:#e3f2fd; color:#1565c0; }
    .badge-pdf  { background:#fdecea; color:#c62828; }
    .loading-sm { display:flex; align-items:center; gap:8px; font-size:.85rem; color:#888; padding:12px 0; }

    .btn-llm { background:#6A1B9A !important; color:#fff !important; }

    .word-progress { margin-top:16px; padding-top:12px; border-top:1px solid #e8eef5; }
    .word-progress-labels { display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    .progress-step { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:12px; font-size:.75rem; color:#888; background:#f5f5f5; transition:all .3s; }
    .progress-step mat-icon { font-size:14px; width:14px; height:14px; }
    .progress-step.active { color:#1F4E79; background:#e3f0ff; font-weight:600; }
    .progress-pct { text-align:right; font-size:.75rem; color:#666; margin-top:4px; }

    .draft-card { border-radius:10px !important; border-left:4px solid #6A1B9A !important; }
    .draft-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .draft-status { font-size:.8rem; font-weight:700; padding:3px 10px; border-radius:10px; background:#f3e5f5; color:#6A1B9A; }
    .draft-status.validated { background:#e8f5e9; color:#2e7d32; }
    .draft-section { margin-bottom:14px; }
    .draft-label { font-weight:700; font-size:.85rem; color:#1F4E79; margin-bottom:6px; }
    .draft-textarea { width:100%; font-family:'Courier New',monospace; font-size:.8rem; line-height:1.5; border:1px solid #ccc; border-radius:6px; padding:8px; resize:vertical; box-sizing:border-box; }
    .draft-actions { display:flex; gap:12px; margin-top:16px; }
    .btn-validate { background:#2E7D32 !important; color:#fff !important; }
  `]
})
export class BriefGeneratorComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  weeks = signal<any[]>([]);
  selectedWeekId = '';
  selectedWeek = computed(() => this.weeks().find(w => w.id === this.selectedWeekId) ?? null);

  previewing = signal(false);
  generating = signal(false);
  generatingWord = signal(false);
  generatingSections = signal(false);
  historyLoading = signal(false);
  wordProgress = signal(0);
  preview = signal<any | null>(null);
  draft = signal<any | null>(null);
  history = signal<any[]>([]);

  // Produits critiques filtrés depuis sectionA.stocks
  criticalStocks = computed(() => {
    const stocks: any[] = this.preview()?.data?.sectionA?.stocks ?? [];
    const CRITICAL = ['RUPTURE_PAYS', 'RUPTURE_CENTRALE', 'RUPTURE_IMMINENTE', 'RISQUE_ELEVE', 'PEREMPTION_PROCHE'];
    return stocks.filter(e => CRITICAL.includes(e.statutAffiche));
  });

  formatDate = formatDate;
  fmtStatut(s: string): string { return s ? s.split('_').join(' ') : '—'; }

  fmtPreviewDate(start: string | Date | null, end: string | Date | null): string {
    const toDate = (v: string | Date | null) => v ? new Date(v) : null;
    const s = toDate(start), e = toDate(end);
    if (!s && !e) return '—';
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    if (s && e) return `${fmt(s)} – ${fmt(e)}`;
    return fmt((s ?? e)!);
  }

  // Champs éditables du draft
  draftB = '';
  draftC = '';
  draftD = '';

  canGeneratePdf() {
    const roles: string[] = this.auth.currentUser()?.roles ?? [];
    return roles.some(r => ['super_admin', 'admin_system', 'chief_of_party'].includes(r));
  }

  canGenerate() {
    if (!this.preview()) return false;
    const c = this.preview().completness;
    return c.sectionA.ok && c.sectionB.ok && c.sectionC.ok;
  }

  hasEmptySections() {
    if (!this.preview()) return false;
    const c = this.preview().completness;
    return !c.sectionA.ok || !c.sectionB.ok || !c.sectionC.ok;
  }

  ngOnInit() {
    this.loadWeeks();
    this.loadHistory();
  }

  async loadWeeks() {
    try {
      const weeks = await firstValueFrom(this.api.getWeeks());
      const sorted = [...weeks].sort((a, b) =>
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      );
      this.weeks.set(sorted);
      if (sorted.length > 0) {
        this.selectedWeekId = sorted[0].id;
        // Charger le draft de la semaine par défaut au démarrage
        await this.loadDraft();
      }
    } catch { this.weeks.set([]); }
  }

  // Déclenché à chaque changement de semaine dans le select
  async onWeekChange() {
    this.preview.set(null);
    this.draft.set(null);
    this.draftB = '';
    this.draftC = '';
    this.draftD = '';
    if (this.selectedWeekId) await this.loadDraft();
  }

  async loadPreview() {
    if (!this.selectedWeekId) return;
    this.previewing.set(true);
    this.preview.set(null);
    try {
      const data = await firstValueFrom(this.api.getBriefPreview(this.selectedWeekId));
      this.preview.set(data);
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur lors de la prévisualisation', 'OK', { duration: 5000 });
    } finally { this.previewing.set(false); }
  }

  /* Génération PDF — en attente d'implémentation
  async generate(force: boolean) {
    if (!this.selectedWeekId) return;
    this.generating.set(true);
    const ref = this.selectedWeek()?.weekReference ?? this.selectedWeekId;
    try {
      const blob = await firstValueFrom(this.api.generateBriefPdf(this.selectedWeekId, force));
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LHSPLA_Brief_${ref}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.snack.open('Brief PDF généré et téléchargé', 'OK', { duration: 3000 });
      this.loadHistory();
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.message ?? 'Erreur lors de la génération';
      this.snack.open(Array.isArray(msg) ? msg.join(' · ') : String(msg), 'OK', { duration: 6000 });
    } finally { this.generating.set(false); }
  }
  */

  async generateWord() {
    if (!this.selectedWeekId) return;
    this.generatingWord.set(true);
    this.wordProgress.set(0);
    const ref = this.selectedWeek()?.weekReference ?? this.selectedWeekId;

    // Progression simulée par phases :
    //  0-29%  : consolidation données  (~rapide)
    // 30-64%  : génération timeline Python (~plus long)
    // 65-94%  : assemblage DOCX
    // 95-99%  : finalisation (atteint quand réponse reçue)
    const PHASES = [
      { target: 28, intervalMs: 120 },  // phase 1 : rapide
      { target: 63, intervalMs: 220 },  // phase 2 : timeline Python
      { target: 93, intervalMs: 160 },  // phase 3 : assemblage
    ];

    let timer: any = null;
    const startPhase = (phaseIdx: number) => {
      if (phaseIdx >= PHASES.length) return;
      const { target, intervalMs } = PHASES[phaseIdx];
      timer = setInterval(() => {
        const current = this.wordProgress();
        if (current < target) {
          this.wordProgress.set(current + 1);
        } else {
          clearInterval(timer);
          startPhase(phaseIdx + 1);
        }
      }, intervalMs);
    };
    startPhase(0);

    try {
      const blob = await firstValueFrom(this.api.generateBriefDocx(this.selectedWeekId));
      clearInterval(timer);
      this.wordProgress.set(100);

      await new Promise(r => setTimeout(r, 400)); // bref flash à 100%

      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LHSPLA_Brief_${ref}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      this.snack.open('Brief Word généré et téléchargé', 'OK', { duration: 3000 });
      this.loadHistory();
    } catch (err: any) {
      clearInterval(timer);
      const msg = err?.error?.message ?? err?.message ?? 'Erreur lors de la génération Word';
      this.snack.open(Array.isArray(msg) ? msg.join(' · ') : String(msg), 'OK', { duration: 6000 });
    } finally {
      this.generatingWord.set(false);
      this.wordProgress.set(0);
    }
  }

  async generateSections() {
    if (!this.selectedWeekId) return;
    this.generatingSections.set(true);
    try {
      const data = await firstValueFrom(this.api.generateBriefSections(this.selectedWeekId));
      this.draft.set(data);
      this.draftB = data.sectionB;
      this.draftC = data.sectionC;
      this.draftD = data.sectionD;
      this.snack.open(`Sections générées par ${data.llmModel}`, 'OK', { duration: 4000 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur génération IA', 'OK', { duration: 6000 });
    } finally { this.generatingSections.set(false); }
  }

  async loadDraft() {
    if (!this.selectedWeekId) return;
    try {
      const data = await firstValueFrom(this.api.getBriefDraft(this.selectedWeekId));
      if (data) {
        this.draft.set(data);
        this.draftB = data.sectionB;
        this.draftC = data.sectionC;
        this.draftD = data.sectionD;
      }
    } catch { /* pas de draft existant */ }
  }

  async saveDraft() {
    if (!this.draft()) return;
    try {
      const updated = await firstValueFrom(
        this.api.updateBriefDraft(this.draft().id, { sectionB: this.draftB, sectionC: this.draftC, sectionD: this.draftD })
      );
      this.draft.set(updated);
      this.snack.open('Modifications enregistrées', 'OK', { duration: 2000 });
    } catch { this.snack.open('Erreur enregistrement', 'OK', { duration: 3000 }); }
  }

  async validateDraft() {
    if (!this.draft()) return;
    try {
      const updated = await firstValueFrom(
        this.api.updateBriefDraft(this.draft().id, { sectionB: this.draftB, sectionC: this.draftC, sectionD: this.draftD, validated: true })
      );
      this.draft.set(updated);
      this.snack.open('Draft validé — prêt pour génération Word/PDF', 'OK', { duration: 3000 });
    } catch { this.snack.open('Erreur validation', 'OK', { duration: 3000 }); }
  }

  async loadHistory() {
    this.historyLoading.set(true);
    try {
      const data = await firstValueFrom(this.api.getBriefHistory());
      this.history.set(data);
    } catch { this.history.set([]); } finally { this.historyLoading.set(false); }
  }

  async downloadHistory(id: string, format: string = 'pdf') {
    try {
      const blob = await firstValueFrom(this.api.downloadBriefHistoryFile(id));
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LHSPLA_Brief_${id.slice(0, 8)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { this.snack.open('Erreur téléchargement', 'OK', { duration: 3000 }); }
  }
}
