import {
  Component, inject, signal, OnInit, computed, effect, untracked,
  ElementRef, ViewChild, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { InputsService, Input, InputStatus } from '../../services/inputs.service';
import { SectionsService } from '../../services/sections.service';
import { AuthService } from '../../services/auth.service';
import { htmlToText } from '../../pipes/markdown.pipe';

const TYPE_LABELS: Record<string, string> = {
  activity: 'Activité', indicator: 'Indicateur',
  milestone: 'Jalon', comment: 'Commentaire', risk: 'Risque',
};

type ColKey = 'section' | 'entity' | 'type' | 'content' | 'status' | 'actions';
const COL_ORDER: ColKey[] = ['section', 'entity', 'type', 'content', 'status', 'actions'];

@Component({
  selector: 'app-consolidation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="page-container">

      <!-- En-tête -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px">
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:600">Consolidation PMO</h1>
          <p style="margin:4px 0 0; color:#666; font-size:14px">Revue et qualification des contributions</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
          @if (auth.isSuperAdmin()) {
            <a mat-stroked-button routerLink="/trash" style="color:#c62828">
              <mat-icon>delete_sweep</mat-icon> Corbeille (SA)
            </a>
          }
          @if (auth.isSuperAdmin() || auth.isPmo()) {
            <button mat-stroked-button (click)="downloadGlobalDocx()" [disabled]="downloading()">
              <mat-icon>description</mat-icon> Export Word global
            </button>
            <button mat-stroked-button (click)="downloadGlobalXlsx()" [disabled]="downloading()">
              <mat-icon>table_chart</mat-icon> Export Excel global
            </button>
          }
        </div>
      </div>

      <!-- Filtres -->
      <mat-card style="margin-bottom:16px">
        <mat-card-content style="padding:12px; display:flex; gap:16px; flex-wrap:wrap; align-items:center">

          <mat-form-field appearance="outline" style="min-width:200px">
            <mat-label>Axe</mat-label>
            <mat-select [ngModel]="filterSection()" (ngModelChange)="filterSection.set($event)">
              <mat-option value="">Tous</mat-option>
              @for (s of sections(); track s.id) {
                <mat-option [value]="s.id">{{ s.titre | slice:0:40 }}...</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:140px">
            <mat-label>Entité</mat-label>
            <mat-select [ngModel]="filterEntity()" (ngModelChange)="filterEntity.set($event)">
              <mat-option value="">Toutes</mat-option>
              @for (code of entityCodes(); track code) {
                <mat-option [value]="code">{{ code }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:140px">
            <mat-label>Statut</mat-label>
            <mat-select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
              <mat-option value="">Tous</mat-option>
              <mat-option value="draft">Brouillon</mat-option>
              <mat-option value="submitted">Soumis</mat-option>
              <mat-option value="retained">Retenu</mat-option>
              <mat-option value="rejected">Rejeté</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:140px">
            <mat-label>Type</mat-label>
            <mat-select [ngModel]="filterType()" (ngModelChange)="filterType.set($event)">
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
        <div style="border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,.12); background:white">

          <!-- Tableau natif avec colgroup pour resize -->
          <div #tableWrapper style="overflow-x:auto">
            <table class="cons-table">
              <colgroup>
                <col [style.width.px]="cw.section()">
                <col [style.width.px]="cw.entity()">
                <col [style.width.px]="cw.type()">
                <col [style.width.px]="cw.content()">
                <col [style.width.px]="cw.status()">
                <col [style.width.px]="cw.actions()">
              </colgroup>
              <thead>
                <tr>
                  <th><span>Axe</span><div class="rh" (mousedown)="startResize($event,'section')"></div></th>
                  <th><span>Entité</span><div class="rh" (mousedown)="startResize($event,'entity')"></div></th>
                  <th><span>Type</span><div class="rh" (mousedown)="startResize($event,'type')"></div></th>
                  <th><span>Contribution</span><div class="rh" (mousedown)="startResize($event,'content')"></div></th>
                  <th><span>Statut</span><div class="rh" (mousedown)="startResize($event,'status')"></div></th>
                  <th><span>Actions PMO</span></th>
                </tr>
              </thead>
              <tbody>
                @if (paginated().length === 0) {
                  <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:#999">
                      <mat-icon style="font-size:36px; display:block; margin-bottom:8px">inbox</mat-icon>
                      Aucun input avec ces filtres
                    </td>
                  </tr>
                }
                @for (row of paginated(); track row.id) {
                  <tr [style.height.px]="rowHeights()[row.id]">
                    <!-- Axe — texte complet, CSS gère la troncature selon la largeur -->
                    <td class="td-axe"
                        [matTooltip]="row.referenceSection?.titre ?? ''"
                        matTooltipShowDelay="400">
                      {{ row.referenceSection?.titre }}
                      <div class="row-rh" (mousedown)="startRowResize($event, row.id)"></div>
                    </td>

                    <!-- Entité -->
                    <td>
                      <span class="section-badge">{{ row.entity.code }}</span>
                    </td>

                    <!-- Type -->
                    <td style="font-size:13px">{{ TYPE_LABELS[row.type] }}</td>

                    <!-- Contribution -->
                    <td class="td-content"
                        [matTooltip]="tooltipText(row)"
                        matTooltipClass="multiline-tooltip"
                        matTooltipShowDelay="300"
                        matTooltipPosition="left">
                      @if (row.title) {
                        <div style="font-weight:700; font-size:13px; margin-bottom:2px">{{ row.title }}</div>
                      }
                      @if (row.content) {
                        <div class="rich-content" style="color:#444; font-size:12px" [innerHTML]="preview(row.content)"></div>
                      }
                      @if (row.type === 'milestone' && row.paymentAmountProposed) {
                        <div style="font-size:11px; color:#666; margin-top:2px">
                          Proposé : {{ row.paymentAmountProposed }}
                          @if (row.paymentAmountFinal) {
                            <span> → Final : <strong>{{ row.paymentAmountFinal }}</strong></span>
                          }
                        </div>
                      }
                      <div style="font-size:11px; color:#888; margin-top:4px">
                        {{ row.author.email }} · {{ row.updatedAt | date:'dd/MM/yyyy HH:mm' }}
                      </div>
                    </td>

                    <!-- Statut -->
                    <td>
                      <span [class]="'chip-' + row.status"
                            style="padding:3px 8px; border-radius:4px; font-size:12px; font-weight:600; white-space:nowrap; display:inline-block">
                        {{ statusLabel(row.status) }}
                      </span>
                    </td>

                    <!-- Actions -->
                    <td>
                      <div style="display:flex; flex-direction:column; gap:4px">
                        @if (row.status === 'submitted' || row.status === 'retained' || row.status === 'rejected') {
                          <div style="display:flex; gap:2px">
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
                            <input #amtInput
                                   style="width:90px; font-size:12px; border:1px solid #ccc; border-radius:4px; padding:2px 6px"
                                   [value]="row.paymentAmountFinal ?? ''"
                                   placeholder="Montant final" />
                            <button mat-icon-button (click)="setPaymentFinal(row, amtInput.value)"
                                    matTooltip="Enregistrer montant final">
                              <mat-icon>save</mat-icon>
                            </button>
                          </div>
                        }
                        @if (auth.isSuperAdmin() && row.status !== 'draft') {
                          <button mat-stroked-button
                                  style="font-size:11px; padding:0 6px; height:24px; line-height:24px; min-width:0"
                                  (click)="unlock(row)"
                                  matTooltip="Renvoyer en brouillon (SA)">
                            <mat-icon style="font-size:14px; height:14px; width:14px">lock_open</mat-icon>
                            Déverrouiller
                          </button>
                        }
                        <button mat-icon-button (click)="downloadSectionDocx(row.referenceSectionId)"
                                matTooltip="Exporter cet axe (Word)">
                          <mat-icon>download</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <mat-paginator
            [length]="filtered().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPage($event)"
            showFirstLastButtons
            style="border-top:1px solid #e0e0e0">
          </mat-paginator>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Tooltip multiline */
    ::ng-deep .multiline-tooltip {
      white-space: pre-line !important;
      max-width: 500px !important;
      min-width: 260px !important;
      font-size: 13px !important;
      line-height: 1.7 !important;
    }

    /* Tableau natif */
    .cons-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-family: Roboto, sans-serif;
    }

    .cons-table thead tr {
      background: #fafafa;
      border-bottom: 2px solid #e0e0e0;
    }

    .cons-table th {
      font-weight: 700;
      font-size: 12px;
      color: #333;
      padding: 0 16px;
      height: 52px;
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      user-select: none;
      text-align: left;
    }

    .cons-table td {
      border-bottom: 1px solid #eeeeee;
      padding: 8px 12px;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: break-word;
      /* pas d'overflow:hidden — le contenu doit s'afficher quand la hauteur de ligne augmente */
    }

    /* Axe : troncature CSS — ellipsis si étroit, texte complet si large */
    .td-axe {
      position: relative;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #555;
      font-size: 12px;
    }

    .cons-table tbody tr:hover td {
      background: #f5f5f5;
    }

    .td-content {
      cursor: help;
      white-space: normal;
    }

    /* Poignée resize colonne */
    .rh {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 1;
    }
    .rh:hover {
      background: rgba(21, 101, 192, 0.2);
      border-right: 2px solid #1565c0;
    }

    /* Poignée resize ligne */
    .row-rh {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 5px;
      cursor: row-resize;
      z-index: 1;
    }
    .row-rh:hover {
      background: rgba(21, 101, 192, 0.18);
      border-bottom: 2px solid #1565c0;
    }
  `],
})
export class ConsolidationComponent implements OnInit {
  private inputsService = inject(InputsService);
  private sectionsService = inject(SectionsService);
  private snackBar = inject(MatSnackBar);
  private zone = inject(NgZone);
  auth = inject(AuthService);

  @ViewChild('tableWrapper') tableWrapper!: ElementRef<HTMLElement>;

  readonly TYPE_LABELS = TYPE_LABELS;

  allInputs = signal<Input[]>([]);
  sections = signal<any[]>([]);
  loading = signal(true);
  downloading = signal(false);

  filterSection = signal('');
  filterStatus = signal('');
  filterType = signal('');
  filterEntity = signal('');

  pageIndex = signal(0);
  pageSize = signal(25);

  /** Hauteurs des lignes par id de contribution (undefined = auto) */
  rowHeights = signal<Record<string, number>>({});

  /** Largeurs initiales des colonnes — utilisées pour l'init et après resize */
  cw = {
    section: signal(140),
    entity: signal(80),
    type: signal(100),
    content: signal(380),
    status: signal(90),
    actions: signal(180),
  };

  constructor() {
    // Reset page sur changement de filtre
    effect(() => {
      this.filterSection(); this.filterStatus(); this.filterType(); this.filterEntity();
      untracked(() => this.pageIndex.set(0));
    });
  }

  entityCodes = computed(() => {
    const codes = new Set(this.allInputs().map(i => i.entity.code));
    return Array.from(codes).sort();
  });

  filtered = computed(() => {
    const sec = this.filterSection();
    const sta = this.filterStatus();
    const typ = this.filterType();
    const ent = this.filterEntity();
    return this.allInputs().filter(i => {
      if (sec && i.referenceSectionId !== sec) return false;
      if (sta && i.status !== sta) return false;
      if (typ && i.type !== typ) return false;
      if (ent && i.entity.code !== ent) return false;
      return true;
    });
  });

  paginated = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
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

  onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  // ── Resize colonnes — manipulation directe du DOM hors zone Angular ─────────

  startResize(event: MouseEvent, col: ColKey) {
    event.preventDefault();
    event.stopPropagation();

    const colIndex = COL_ORDER.indexOf(col);
    const wrapper = this.tableWrapper.nativeElement;
    const colEl = wrapper.querySelectorAll<HTMLElement>('colgroup col')[colIndex];
    if (!colEl) return;

    // Lire la largeur depuis le <th> (offsetWidth fiable) — les <col> n'ont pas de layout box
    const th = wrapper.querySelectorAll<HTMLElement>('thead th')[colIndex];
    const startX = event.pageX;
    const startW = th?.offsetWidth ?? this.cw[col]();

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    // Tout hors zone Angular : DOM pur, 60fps, aucun re-render pendant le drag
    this.zone.runOutsideAngular(() => {
      const onMove = (e: MouseEvent) => {
        colEl.style.width = `${Math.max(60, startW + e.pageX - startX)}px`;
      };

      const onUp = (e: MouseEvent) => {
        const newW = Math.max(60, startW + e.pageX - startX);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        // Réintégrer la zone Angular pour synchroniser le signal (déclenche CD)
        this.zone.run(() => this.cw[col].set(newW));
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ── Resize lignes ────────────────────────────────────────────────────────────

  startRowResize(event: MouseEvent, rowId: string) {
    event.preventDefault();
    event.stopPropagation();

    const tr = (event.currentTarget as HTMLElement).closest('tr') as HTMLElement;
    if (!tr) return;

    const startY = event.pageY;
    const startH = tr.offsetHeight;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    this.zone.runOutsideAngular(() => {
      const onMove = (e: MouseEvent) => {
        tr.style.height = `${Math.max(30, startH + e.pageY - startY)}px`;
      };

      const onUp = (e: MouseEvent) => {
        const newH = Math.max(30, startH + e.pageY - startY);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this.zone.run(() => this.rowHeights.update(h => ({ ...h, [rowId]: newH })));
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ── Exports via HttpClient (interceptor → Authorization header) ─────────────

  downloadGlobalDocx() {
    this.downloading.set(true);
    this.inputsService.downloadDocx().subscribe({
      next: (blob) => { this.triggerDownload(blob, `collecte-global-${Date.now()}.docx`); this.downloading.set(false); },
      error: (e) => { this.snackBar.open(e.error?.message ?? 'Erreur export', 'Fermer', { duration: 4000 }); this.downloading.set(false); },
    });
  }

  downloadGlobalXlsx() {
    this.downloading.set(true);
    this.inputsService.downloadXlsx().subscribe({
      next: (blob) => { this.triggerDownload(blob, `collecte-global-${Date.now()}.xlsx`); this.downloading.set(false); },
      error: (e) => { this.snackBar.open(e.error?.message ?? 'Erreur export', 'Fermer', { duration: 4000 }); this.downloading.set(false); },
    });
  }

  downloadSectionDocx(sectionId: string) {
    this.inputsService.downloadDocx(sectionId).subscribe({
      next: (blob) => this.triggerDownload(blob, `collecte-${sectionId}-${Date.now()}.docx`),
      error: (e) => this.snackBar.open(e.error?.message ?? 'Erreur export', 'Fermer', { duration: 4000 }),
    });
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  statusLabel(status: InputStatus): string {
    const labels: Record<InputStatus, string> = {
      draft: 'Brouillon', submitted: 'Soumis', retained: 'Retenu', rejected: 'Rejeté',
    };
    return labels[status];
  }

  preview(html: string): string { return htmlToText(html, 120); }

  tooltipText(row: any): string {
    const parts: string[] = [];
    if (row.title) parts.push(`[Titre] ${row.title}`);
    if (row.content) parts.push(htmlToText(row.content, 99999));
    if (row.means) parts.push(`Intrant : ${row.means}`);
    if (row.output) parts.push(`Extrant : ${row.output}`);
    if (row.verificationMethod) parts.push(`Vérification : ${row.verificationMethod}`);
    if (row.targetValue) parts.push(`Valeur cible : ${row.targetValue}`);
    if (row.dueMonth) parts.push(`Échéance : ${row.dueMonth}`);
    if (row.likelihood) parts.push(`Probabilité : ${row.likelihood}`);
    if (row.impact) parts.push(`Impact : ${row.impact}`);
    if (row.mitigation) parts.push(`Atténuation : ${row.mitigation}`);
    if (row.objective) parts.push(`Objectif : ${row.objective}`);
    if (row.dataSource) parts.push(`Source : ${row.dataSource}`);
    if (row.frequency) parts.push(`Fréquence : ${row.frequency}`);
    return parts.join('\n');
  }

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
