import {
  Component, inject, signal, OnInit, computed, effect, untracked,
  ElementRef, ViewChild, NgZone, HostListener,
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
import { InputsService, Input, InputStatus, InputTranslation, TranslationPayload } from '../../services/inputs.service';
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
          @if (auth.isSuperAdmin() || auth.isPmo() || auth.isCop()) {
            <button mat-stroked-button (click)="downloadGlobalDocx('fr')" [disabled]="downloading()">
              <mat-icon>description</mat-icon> Word FR
            </button>
            <button mat-stroked-button (click)="downloadGlobalDocx('en')" [disabled]="downloading()">
              <mat-icon>description</mat-icon> Word EN
            </button>
            <button mat-stroked-button (click)="downloadGlobalXlsx('fr')" [disabled]="downloading()">
              <mat-icon>table_chart</mat-icon> Excel FR
            </button>
            <button mat-stroked-button (click)="downloadGlobalXlsx('en')" [disabled]="downloading()">
              <mat-icon>table_chart</mat-icon> Excel EN
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
        <!-- Layout flex : tableau + panneau latéral -->
        <div class="content-with-panel">

          <!-- Section tableau -->
          <div class="table-section">
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
                      <tr [style.height.px]="rowHeights()[row.id]"
                          [class.row-selected]="selectedRow()?.id === row.id"
                          (click)="selectRow(row)"
                          style="cursor:pointer">

                        <!-- Axe -->
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
                        <td class="td-content">
                          @if (row.title) {
                            <div style="font-weight:700; font-size:13px; margin-bottom:2px">{{ row.title }}</div>
                          }
                          @if (row.content) {
                            <div style="color:#444; font-size:12px">{{ preview(row.content) }}</div>
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

                        <!-- Actions — stopPropagation pour ne pas ouvrir le panneau -->
                        <td (click)="$event.stopPropagation()">
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
          </div>

          <!-- Panneau de détail -->
          @if (selectedRow()) {
            <div class="detail-panel">

              <!-- En-tête panneau -->
              <div class="dp-header">
                <div style="flex:1; min-width:0">
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:6px">
                    <span class="section-badge">{{ TYPE_LABELS[selectedRow()!.type] }}</span>
                    <span [class]="'chip-' + selectedRow()!.status"
                          style="font-size:11px; padding:2px 8px; border-radius:4px; font-weight:600">
                      {{ statusLabel(selectedRow()!.status) }}
                    </span>
                    <span class="section-badge" style="background:#fff3e0; color:#e65100">
                      {{ selectedRow()!.entity.code }}
                    </span>
                  </div>
                  <div style="font-size:12px; color:#444; line-height:1.4; margin-bottom:4px">
                    {{ selectedRow()!.referenceSection?.titre }}
                  </div>
                  <div style="font-size:11px; color:#777">
                    {{ selectedRow()!.author.email }} · {{ selectedRow()!.updatedAt | date:'dd/MM/yyyy HH:mm' }}
                  </div>
                </div>
                <button mat-icon-button (click)="closePanel()" matTooltip="Fermer (Échap)" style="flex-shrink:0">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <!-- Onglets FR / EN -->
              <div style="display:flex; border-bottom:1px solid #e0e0e0; background:#fafafa">
                <button (click)="tabLang.set('fr')"
                        style="flex:1; padding:8px; border:none; cursor:pointer; font-weight:600; font-size:13px"
                        [style.border-bottom]="tabLang()==='fr' ? '3px solid #1565c0' : '3px solid transparent'"
                        [style.color]="tabLang()==='fr' ? '#1565c0' : '#666'">FR</button>
                <button (click)="tabLang.set('en')"
                        style="flex:1; padding:8px; border:none; cursor:pointer; font-weight:600; font-size:13px"
                        [style.border-bottom]="tabLang()==='en' ? '3px solid #1565c0' : '3px solid transparent'"
                        [style.color]="tabLang()==='en' ? '#1565c0' : '#666'">EN</button>
              </div>

              <!-- Corps FR -->
              @if (tabLang() === 'fr') {
              <div class="dp-body">

                @if (selectedRow()!.title) {
                  <h2 class="dp-title">{{ selectedRow()!.title }}</h2>
                }

                @if (selectedRow()!.content) {
                  <div class="dp-block">
                    <div class="dp-label">Contenu</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.content"></div>
                  </div>
                }

                @if (selectedRow()!.means) {
                  <div class="dp-block">
                    <div class="dp-label">Intrant</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.means"></div>
                  </div>
                }

                @if (selectedRow()!.output) {
                  <div class="dp-block">
                    <div class="dp-label">Extrant</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.output"></div>
                  </div>
                }

                @if (selectedRow()!.verificationMethod) {
                  <div class="dp-block">
                    <div class="dp-label">Méthode de vérification</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.verificationMethod"></div>
                  </div>
                }

                @if (selectedRow()!.targetValue) {
                  <div class="dp-block">
                    <div class="dp-label">Valeur cible</div>
                    <div class="dp-text">{{ selectedRow()!.targetValue }}</div>
                  </div>
                }

                @if (selectedRow()!.baseline) {
                  <div class="dp-block">
                    <div class="dp-label">Baseline</div>
                    <div class="dp-text">{{ selectedRow()!.baseline }}</div>
                  </div>
                }

                @if (selectedRow()!.dataSource) {
                  <div class="dp-block">
                    <div class="dp-label">Source de données</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.dataSource"></div>
                  </div>
                }

                @if (selectedRow()!.frequency) {
                  <div class="dp-block">
                    <div class="dp-label">Fréquence</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.frequency"></div>
                  </div>
                }

                @if (selectedRow()!.dueMonth) {
                  <div class="dp-block">
                    <div class="dp-label">Échéance</div>
                    <div class="dp-text">{{ selectedRow()!.dueMonth }}</div>
                  </div>
                }

                @if (selectedRow()!.objective) {
                  <div class="dp-block">
                    <div class="dp-label">Objectif</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.objective"></div>
                  </div>
                }

                @if (selectedRow()!.sourceRef) {
                  <div class="dp-block">
                    <div class="dp-label">Référence source</div>
                    <div class="dp-text">{{ selectedRow()!.sourceRef }}</div>
                  </div>
                }

                @if (selectedRow()!.deliverable) {
                  <div class="dp-block">
                    <div class="dp-label">Livrable</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.deliverable"></div>
                  </div>
                }

                @if (selectedRow()!.likelihood) {
                  <div class="dp-block">
                    <div class="dp-label">Probabilité</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.likelihood"></div>
                  </div>
                }

                @if (selectedRow()!.impact) {
                  <div class="dp-block">
                    <div class="dp-label">Impact</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.impact"></div>
                  </div>
                }

                @if (selectedRow()!.mitigation) {
                  <div class="dp-block">
                    <div class="dp-label">Plan d'atténuation</div>
                    <div class="dp-rich" [innerHTML]="selectedRow()!.mitigation"></div>
                  </div>
                }

                <!-- Jalon : montants -->
                @if (selectedRow()!.type === 'milestone') {
                  <div class="dp-block">
                    <div class="dp-label">Montant proposé</div>
                    <div class="dp-text">{{ selectedRow()!.paymentAmountProposed ?? '—' }}</div>
                  </div>
                  @if (selectedRow()!.paymentAmountFinal) {
                    <div class="dp-block">
                      <div class="dp-label">Montant final validé</div>
                      <div class="dp-text" style="font-weight:700; color:#1565c0; font-size:16px">
                        {{ selectedRow()!.paymentAmountFinal }}
                      </div>
                    </div>
                  }
                  @if ((auth.isSuperAdmin() || auth.isPmo()) &&
                       (selectedRow()!.status === 'submitted' || selectedRow()!.status === 'retained')) {
                    <div class="dp-block">
                      <div class="dp-label">Définir le montant final</div>
                      <div style="display:flex; gap:8px; align-items:center; margin-top:4px">
                        <input #panelAmtInput
                               style="flex:1; font-size:13px; border:1px solid #ccc; border-radius:4px; padding:6px 10px"
                               [value]="selectedRow()!.paymentAmountFinal ?? ''"
                               placeholder="Montant final" />
                        <button mat-stroked-button
                                (click)="setPaymentFinal(selectedRow()!, panelAmtInput.value)">
                          <mat-icon>save</mat-icon>
                        </button>
                      </div>
                    </div>
                  }
                }

              </div>
              } <!-- end tabLang === fr -->

              <!-- Corps EN -->
              @if (tabLang() === 'en') {
              <div class="dp-body">
                <!-- Bouton Traduire -->
                @if (canEditTranslation()) {
                  <div style="display:flex; justify-content:flex-end; margin-bottom:12px">
                    <button mat-stroked-button [disabled]="translating()" (click)="autoTranslate()"
                            matTooltip="Traduit tous les champs via IA (écrase la traduction existante)">
                      @if (translating()) {
                        <mat-spinner diameter="16" style="display:inline-block; margin-right:6px"></mat-spinner> Traduction…
                      } @else {
                        <ng-container><mat-icon>auto_awesome</mat-icon> Traduire</ng-container>
                      }
                    </button>
                  </div>
                }

                @if (!canEditTranslation()) {
                  <p style="color:#888; font-size:13px; text-align:center; padding:16px">
                    <mat-icon style="display:block; margin-bottom:8px">lock</mat-icon>
                    La traduction EN n'est modifiable que par PMO, COP ou Super Admin (ou par l'auteur si l'input est en brouillon).
                  </p>
                }

                @if (selectedRow()!.type !== 'comment') {
                  <div class="dp-block">
                    <div class="dp-label">Title (EN) <span style="color:#888;font-weight:400;text-transform:none">— FR : {{ selectedRow()!.title }}</span></div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().title ?? ''"
                             (input)="setTrans('title', $any($event.target).value)"
                             placeholder="Title in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.title || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.content) {
                  <div class="dp-block">
                    <div class="dp-label">Content (EN) <span style="color:#888;font-weight:400;text-transform:none">— FR (extrait)</span></div>
                    @if (canEditTranslation()) {
                      <textarea rows="4"
                                style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                                [value]="translationDraft().content ?? ''"
                                (input)="setTrans('content', $any($event.target).value)"
                                placeholder="Content in English…"></textarea>
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.content || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.means) {
                  <div class="dp-block">
                    <div class="dp-label">Inputs / means (EN)</div>
                    @if (canEditTranslation()) {
                      <textarea rows="3" style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                                [value]="translationDraft().means ?? ''"
                                (input)="setTrans('means', $any($event.target).value)"
                                placeholder="Inputs / means in English…"></textarea>
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.means || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.output) {
                  <div class="dp-block">
                    <div class="dp-label">Outputs (EN)</div>
                    @if (canEditTranslation()) {
                      <textarea rows="3" style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                                [value]="translationDraft().output ?? ''"
                                (input)="setTrans('output', $any($event.target).value)"
                                placeholder="Outputs in English…"></textarea>
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.output || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.verificationMethod) {
                  <div class="dp-block">
                    <div class="dp-label">Verification method (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().verificationMethod ?? ''"
                             (input)="setTrans('verificationMethod', $any($event.target).value)"
                             placeholder="Verification method in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.verificationMethod || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.targetValue) {
                  <div class="dp-block">
                    <div class="dp-label">Target value (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().targetValue ?? ''"
                             (input)="setTrans('targetValue', $any($event.target).value)"
                             placeholder="Target value in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.targetValue || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.baseline) {
                  <div class="dp-block">
                    <div class="dp-label">Baseline (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().baseline ?? ''"
                             (input)="setTrans('baseline', $any($event.target).value)"
                             placeholder="Baseline in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.baseline || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.dataSource) {
                  <div class="dp-block">
                    <div class="dp-label">Data source (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().dataSource ?? ''"
                             (input)="setTrans('dataSource', $any($event.target).value)"
                             placeholder="Data source in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.dataSource || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.frequency) {
                  <div class="dp-block">
                    <div class="dp-label">Frequency (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().frequency ?? ''"
                             (input)="setTrans('frequency', $any($event.target).value)"
                             placeholder="Frequency in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.frequency || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.deliverable) {
                  <div class="dp-block">
                    <div class="dp-label">Deliverable (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().deliverable ?? ''"
                             (input)="setTrans('deliverable', $any($event.target).value)"
                             placeholder="Deliverable in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.deliverable || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.likelihood) {
                  <div class="dp-block">
                    <div class="dp-label">Likelihood (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().likelihood ?? ''"
                             (input)="setTrans('likelihood', $any($event.target).value)"
                             placeholder="Likelihood in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.likelihood || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.impact) {
                  <div class="dp-block">
                    <div class="dp-label">Impact (EN)</div>
                    @if (canEditTranslation()) {
                      <input style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                             [value]="translationDraft().impact ?? ''"
                             (input)="setTrans('impact', $any($event.target).value)"
                             placeholder="Impact in English…" />
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.impact || '—' }}</div>
                    }
                  </div>
                }

                @if (selectedRow()!.mitigation) {
                  <div class="dp-block">
                    <div class="dp-label">Mitigation measure (EN)</div>
                    @if (canEditTranslation()) {
                      <textarea rows="3" style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                                [value]="translationDraft().mitigation ?? ''"
                                (input)="setTrans('mitigation', $any($event.target).value)"
                                placeholder="Mitigation measure in English…"></textarea>
                    } @else {
                      <div class="dp-text">{{ selectedRow()!.translation?.mitigation || '—' }}</div>
                    }
                  </div>
                }

                @if (canEditTranslation()) {
                  <div style="display:flex; justify-content:flex-end; padding-top:8px">
                    <button mat-raised-button color="primary" [disabled]="savingTranslation()" (click)="saveTranslation()">
                      @if (savingTranslation()) {
                        <mat-spinner diameter="18" style="margin:auto"></mat-spinner>
                      } @else {
                        <ng-container><mat-icon>save</mat-icon> Save EN</ng-container>
                      }
                    </button>
                  </div>
                }
              </div>
              } <!-- end tabLang === en -->

              <!-- Pied : actions PMO -->
              <div class="dp-footer">
                @if ((auth.isSuperAdmin() || auth.isPmo()) &&
                     (selectedRow()!.status === 'submitted' || selectedRow()!.status === 'retained' || selectedRow()!.status === 'rejected')) {
                  <button mat-raised-button color="primary"
                          (click)="retain(selectedRow()!)"
                          [disabled]="selectedRow()!.status === 'retained'">
                    <mat-icon>check_circle</mat-icon> Retenir
                  </button>
                  <button mat-raised-button color="warn"
                          (click)="reject(selectedRow()!)"
                          [disabled]="selectedRow()!.status === 'rejected'">
                    <mat-icon>cancel</mat-icon> Rejeter
                  </button>
                }
                @if (auth.isSuperAdmin() && selectedRow()!.status !== 'draft') {
                  <button mat-stroked-button (click)="unlock(selectedRow()!)">
                    <mat-icon>lock_open</mat-icon> Déverrouiller
                  </button>
                }
                <button mat-stroked-button (click)="downloadSectionDocx(selectedRow()!.referenceSectionId)">
                  <mat-icon>download</mat-icon> Export Word axe
                </button>
              </div>

            </div>
          }

        </div>
      }
    </div>
  `,
  styles: [`
    /* Layout avec panneau */
    .content-with-panel {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .table-section {
      flex: 1;
      min-width: 0;
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
    }

    /* Axe : troncature CSS */
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

    .row-selected td {
      background: #e8f0fe !important;
    }

    .td-content {
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

    /* ── Panneau de détail ── */
    .detail-panel {
      width: 440px;
      min-width: 380px;
      background: white;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 80px);
      position: sticky;
      top: 16px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .dp-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 3px solid #1565c0;
      background: #f0f4ff;
    }

    .dp-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .dp-title {
      font-size: 16px;
      font-weight: 700;
      color: #1a237e;
      margin: 0 0 16px;
      line-height: 1.5;
      padding-bottom: 12px;
      border-bottom: 1px solid #e8eaf6;
    }

    .dp-block {
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f5f5f5;
    }

    .dp-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #1565c0;
      margin-bottom: 5px;
    }

    .dp-rich {
      font-size: 14px;
      line-height: 1.7;
      color: #222;
      word-break: break-word;
    }

    .dp-rich p { margin: 0 0 6px; }
    .dp-rich p:last-child { margin-bottom: 0; }
    .dp-rich ul, .dp-rich ol { margin: 4px 0 6px 18px; }
    .dp-rich li { margin-bottom: 3px; }

    .dp-text {
      font-size: 14px;
      line-height: 1.6;
      color: #222;
      word-break: break-word;
    }

    .dp-footer {
      padding: 12px 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      background: #fafafa;
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

  rowHeights = signal<Record<string, number>>({});

  selectedRow = signal<Input | null>(null);
  tabLang = signal<'fr' | 'en'>('fr');
  translationDraft = signal<Partial<InputTranslation>>({});
  savingTranslation = signal(false);
  translating = signal(false);

  cw = {
    section: signal(140),
    entity: signal(80),
    type: signal(100),
    content: signal(380),
    status: signal(90),
    actions: signal(180),
  };

  canEditTranslation = computed(() => {
    const row = this.selectedRow();
    if (!row) return false;
    if (this.auth.isSuperAdmin() || this.auth.isPmo() || this.auth.isCop()) return true;
    return row.status === 'draft' && row.authorUserId === this.auth.currentUser()?.id;
  });

  constructor() {
    effect(() => {
      this.filterSection(); this.filterStatus(); this.filterType(); this.filterEntity();
      untracked(() => this.pageIndex.set(0));
    });
    effect(() => {
      const row = this.selectedRow();
      untracked(() => {
        this.tabLang.set('fr');
        this.translationDraft.set(row?.translation ? { ...row.translation } : {});
      });
    });
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.selectedRow.set(null); }

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

  selectRow(row: Input) { this.selectedRow.set(row); }

  closePanel() { this.selectedRow.set(null); }

  // ── Resize colonnes ─────────────────────────────────────────────────────────

  startResize(event: MouseEvent, col: ColKey) {
    event.preventDefault();
    event.stopPropagation();

    const colIndex = COL_ORDER.indexOf(col);
    const wrapper = this.tableWrapper.nativeElement;
    const colEl = wrapper.querySelectorAll<HTMLElement>('colgroup col')[colIndex];
    if (!colEl) return;

    const th = wrapper.querySelectorAll<HTMLElement>('thead th')[colIndex];
    const startX = event.pageX;
    const startW = th?.offsetWidth ?? this.cw[col]();

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

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

  // ── Exports ──────────────────────────────────────────────────────────────────

  setTrans(field: string, value: string) {
    this.translationDraft.update(d => ({ ...d, [field]: value }));
  }

  autoTranslate() {
    const row = this.selectedRow();
    if (!row) return;
    this.translating.set(true);
    this.inputsService.autoTranslate(row.id).subscribe({
      next: (t) => {
        this.translating.set(false);
        this.translationDraft.set({ ...t });
        this.updateLocal({ ...row, translation: t } as any);
        this.snackBar.open('Traduction EN générée', 'OK', { duration: 2500 });
      },
      error: (e) => {
        this.translating.set(false);
        this.snackBar.open(e.error?.message ?? 'Erreur LLM', 'Fermer', { duration: 5000 });
      },
    });
  }

  saveTranslation() {
    const row = this.selectedRow();
    if (!row) return;
    this.savingTranslation.set(true);
    const payload: TranslationPayload = { ...this.translationDraft() };
    this.inputsService.upsertTranslation(row.id, payload).subscribe({
      next: (t) => {
        this.savingTranslation.set(false);
        this.updateLocal({ ...row, translation: t } as any);
        this.snackBar.open('Traduction EN enregistrée', 'OK', { duration: 2000 });
      },
      error: (e) => {
        this.savingTranslation.set(false);
        this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  downloadGlobalDocx(lang: 'fr' | 'en' = 'fr') {
    this.downloading.set(true);
    this.inputsService.downloadDocx(undefined, lang).subscribe({
      next: (blob) => { this.triggerDownload(blob, `collecte-global-${lang}-${Date.now()}.docx`); this.downloading.set(false); },
      error: (e) => { this.snackBar.open(e.error?.message ?? 'Erreur export', 'Fermer', { duration: 4000 }); this.downloading.set(false); },
    });
  }

  downloadGlobalXlsx(lang: 'fr' | 'en' = 'fr') {
    this.downloading.set(true);
    this.inputsService.downloadXlsx(undefined, lang).subscribe({
      next: (blob) => { this.triggerDownload(blob, `collecte-global-${lang}-${Date.now()}.xlsx`); this.downloading.set(false); },
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

  // ── Helpers ──────────────────────────────────────────────────────────────────

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
    if (this.selectedRow()?.id === updated.id) {
      this.selectedRow.set(updated);
    }
  }
}
