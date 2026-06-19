import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { AppConfigService } from '../../services/app-config.service';
import { ENTITIES, CriticalityLevel } from '../../models/bulletin.models';
import { firstValueFrom, forkJoin } from 'rxjs';

@Component({
  selector: 'app-compilation',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule,
    MatTooltipModule, MatTabsModule,
    MatExpansionModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="compilation-container">

      <!-- Header -->
      <div class="comp-header">
        <div class="comp-header-body">
        <div class="header-left">
          <button mat-icon-button routerLink="/home" class="back-btn" matTooltip="Retour">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1>COMPILATION HEBDOMADAIRE</h1>
            <p>BULLETIN LHSPLA-TA · {{selectedWeek()?.weekReference ?? '—'}}</p>
          </div>
        </div>
        <div class="header-right">
          <!-- Filtres mois + semaine en cascade -->
          <div class="filter-row" *ngIf="weeks().length > 0">
            <mat-form-field appearance="outline" class="month-select">
              <mat-label>Mois</mat-label>
              <mat-select [(ngModel)]="selectedMonth" (ngModelChange)="onMonthChange()">
                <mat-option value="">Tous les mois</mat-option>
                <mat-option *ngFor="let m of allMonths()" [value]="m.key">{{m.label}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="week-select">
              <mat-label>Semaine</mat-label>
              <mat-select [(ngModel)]="selectedWeekId" (ngModelChange)="onWeekChange($event)">
                <mat-option *ngFor="let w of filteredWeeks()" [value]="w.id">
                  {{w.weekReference}}
                  <span class="week-status-chip" [class.active]="w.status === 'active'">
                    {{w.status === 'active' ? ' — Active' : ' — Clôturée'}}
                  </span>
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="stats-badges" *ngIf="!loading()">
            <span class="badge submitted">{{submittedCount()}}/8 soumis</span>
            <span class="badge total" *ngIf="totalActivities() > 0">{{totalActivities()}} activités</span>
            <span class="badge risks" *ngIf="totalRisks() > 0">{{totalRisks()}} risques</span>
            <span class="badge critique" *ngIf="critiqueCount() > 0">{{critiqueCount()}} critiques</span>
          </div>
          <div class="export-row" *ngIf="!loading()">
            <button class="btn-pdf" (click)="openBrief()" matTooltip="Générer le Weekly Operations Brief (remplace la compilation PDF)">
              <mat-icon>newspaper</mat-icon> Weekly Brief
            </button>
            <button class="btn-excel" (click)="exportExcel()">
              <mat-icon>table_view</mat-icon> Excel
            </button>
          </div>
        </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-center" *ngIf="loading()">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Chargement des données...</p>
      </div>

      <!-- No weeks -->
      <div class="no-bulletin" *ngIf="!loading() && weeks().length === 0">
        <mat-icon>inbox</mat-icon>
        <p>Aucune semaine disponible. <a routerLink="/home">Retourner à l'accueil</a></p>
      </div>

      <!-- Content -->
      <ng-container *ngIf="!loading() && selectedWeek()">

        <!-- Summary Grid -->
        <div class="summary-grid">
          <div *ngFor="let entity of entities" class="entity-summary-card"
               [class.submitted]="getSubmission(entity.code)?.status === 'submitted'"
               [class.empty]="!hasData(entity.code)">
            <div class="entity-summary-header">
              <span class="ecode">{{entity.code}}</span>
              <mat-icon *ngIf="getSubmission(entity.code)?.status === 'submitted'" class="check-icon">check_circle</mat-icon>
            </div>
            <div class="entity-mini-stats">
              <span>{{getEntityStats(entity.code).activities}} réalisées</span>
              <span>{{getEntityStats(entity.code).planned}} planifiées</span>
              <span [class.red]="getEntityStats(entity.code).risks > 0">{{getEntityStats(entity.code).risks}} risques</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <mat-tab-group class="comp-tabs" animationDuration="200ms">

          <!-- Tab B: Activités Réalisées -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>task_alt</mat-icon>&nbsp;Activités Réalisées
              <span class="tab-count">{{totalActivities()}}</span>
            </ng-template>
            <div class="tab-content">
              <mat-accordion multi>
                <ng-container *ngFor="let entity of entities">
                  <mat-expansion-panel
                    *ngIf="getFilledActivities(entity.code).length > 0"
                    [expanded]="true" class="entity-panel b-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <span class="panel-entity-code">{{entity.code}}</span>
                        <span class="panel-entity-name">{{entity.fullName}}</span>
                        <span class="panel-count">{{getFilledActivities(entity.code).length}} activité(s)</span>
                      </mat-panel-title>
                      <mat-panel-description>
                        <span class="resp">{{getSubmission(entity.code)?.responsible}}</span>
                      </mat-panel-description>
                    </mat-expansion-panel-header>
                    <div class="table-wrapper">
                      <table class="comp-table">
                        <thead>
                          <tr class="b-header">
                            <th class="col-num">N°</th>
                            <th>Titre de l'activité</th>
                            <th>Objectifs</th>
                            <th class="col-loc">Lieu</th>
                            <th class="col-date">Début</th>
                            <th class="col-date">Fin</th>
                            <th>Recommandations / Résultats clés</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let act of getFilledActivities(entity.code); let i = index">
                            <td class="col-num">{{i + 1}}</td>
                            <td>{{act.title}}</td>
                            <td>{{act.objectives}}</td>
                            <td class="col-loc">{{act.location}}</td>
                            <td class="col-date">{{fmtDate(act.startDate)}}</td>
                            <td class="col-date">{{fmtDate(act.endDate)}}</td>
                            <td>{{act.recommendations}}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </mat-expansion-panel>
                </ng-container>
              </mat-accordion>
              <div class="empty-tab" *ngIf="totalActivities() === 0">
                <mat-icon>inbox</mat-icon>
                <p>Aucune activité réalisée enregistrée pour cette semaine.</p>
              </div>
            </div>
          </mat-tab>

          <!-- Tab C: Activités Planifiées -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>event_note</mat-icon>&nbsp;Activités Planifiées
              <span class="tab-count">{{totalPlanned()}}</span>
            </ng-template>
            <div class="tab-content">
              <mat-accordion multi>
                <ng-container *ngFor="let entity of entities">
                  <mat-expansion-panel
                    *ngIf="getFilledPlanned(entity.code).length > 0"
                    [expanded]="true" class="entity-panel c-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <span class="panel-entity-code">{{entity.code}}</span>
                        <span class="panel-entity-name">{{entity.fullName}}</span>
                        <span class="panel-count">{{getFilledPlanned(entity.code).length}} activité(s)</span>
                      </mat-panel-title>
                      <mat-panel-description>
                        <span *ngIf="hasDos(entity.code)" class="dos-warning">
                          <mat-icon>person</mat-icon> DoS impliqué
                        </span>
                      </mat-panel-description>
                    </mat-expansion-panel-header>
                    <div class="table-wrapper">
                      <table class="comp-table">
                        <thead>
                          <tr class="c-header">
                            <th class="col-num">N°</th>
                            <th>Titre de l'activité</th>
                            <th>Objectifs</th>
                            <th class="col-loc">Lieu</th>
                            <th class="col-date">Dates prévues</th>
                            <th class="col-dos">DoS ?</th>
                            <th>Observations</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let act of getFilledPlanned(entity.code); let i = index"
                              [class.dos-row]="act.dosParticipation === '✅ OUI'">
                            <td class="col-num">{{i + 1}}</td>
                            <td>{{act.title}}</td>
                            <td>{{act.objectives}}</td>
                            <td class="col-loc">{{act.location}}</td>
                            <td class="col-date">{{act.plannedDates}}</td>
                            <td class="col-dos">{{act.dosParticipation}}</td>
                            <td>{{act.observations}}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </mat-expansion-panel>
                </ng-container>
              </mat-accordion>
              <div class="empty-tab" *ngIf="totalPlanned() === 0">
                <mat-icon>inbox</mat-icon>
                <p>Aucune activité planifiée enregistrée pour cette semaine.</p>
              </div>
            </div>
          </mat-tab>

          <!-- Tab D: Points de Vigilance -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>warning_amber</mat-icon>&nbsp;Points de Vigilance
              <span class="tab-count risk-count" *ngIf="totalRisks() > 0">{{totalRisks()}}</span>
            </ng-template>
            <div class="tab-content">
              <div class="risk-summary" *ngIf="totalRisks() > 0">
                <div class="risk-level critique" *ngIf="critiqueCount() > 0">
                  <mat-icon>cancel</mat-icon> {{critiqueCount()}} Critique(s)
                </div>
                <div class="risk-level eleve" *ngIf="eleveCount() > 0">
                  <mat-icon>warning</mat-icon> {{eleveCount()}} Élevé(s)
                </div>
                <div class="risk-level modere" *ngIf="modereCount() > 0">
                  <mat-icon>info</mat-icon> {{modereCount()}} Modéré(s)
                </div>
                <div class="risk-level faible" *ngIf="faibleCount() > 0">
                  <mat-icon>check_circle_outline</mat-icon> {{faibleCount()}} Faible(s)
                </div>
              </div>
              <mat-accordion multi>
                <ng-container *ngFor="let entity of entities">
                  <mat-expansion-panel
                    *ngIf="getFilledRisks(entity.code).length > 0"
                    [expanded]="true" class="entity-panel d-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <span class="panel-entity-code">{{entity.code}}</span>
                        <span class="panel-entity-name">{{entity.fullName}}</span>
                        <span class="panel-count">{{getFilledRisks(entity.code).length}} point(s)</span>
                      </mat-panel-title>
                      <mat-panel-description>
                        <span *ngIf="hasCritique(entity.code)" class="crit-badge">🔴 Critique</span>
                      </mat-panel-description>
                    </mat-expansion-panel-header>
                    <div class="table-wrapper">
                      <table class="comp-table">
                        <thead>
                          <tr class="d-header">
                            <th class="col-num">N°</th>
                            <th>Catégorie</th>
                            <th>Description</th>
                            <th class="col-crit">Criticité</th>
                            <th>Action attendue</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let risk of getFilledRisks(entity.code); let i = index"
                              [class]="getCritClass(risk.criticality)">
                            <td class="col-num">{{i + 1}}</td>
                            <td>{{risk.category}}</td>
                            <td>{{risk.description}}</td>
                            <td class="col-crit">
                              <span class="crit-chip" [class]="getCritClass(risk.criticality)">{{risk.criticality}}</span>
                            </td>
                            <td>{{risk.expectedAction}}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </mat-expansion-panel>
                </ng-container>
              </mat-accordion>
              <div class="empty-tab" *ngIf="totalRisks() === 0">
                <mat-icon>check_circle</mat-icon>
                <p>Aucun point de vigilance signalé pour cette semaine.</p>
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>

        <!-- Footer -->
        <div class="comp-footer">
          {{cfg.get('compilation_footer', 'LHSPLA-TA | NPSP-CI | Compilé par Charles Oscar LEBRI, MEL Manager | FY2026')}}
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .compilation-container { max-width: 1400px; margin: 0 auto; padding: 24px 16px 40px; }

    /* ─── Header ─── */
    .comp-header {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 55%, #245d8f 100%);
      color: white; border-radius: 14px; margin-bottom: 20px;
      box-shadow: 0 6px 24px rgba(31,78,121,0.25); overflow: hidden;
    }
    .comp-header-triband { height: 4px; background: linear-gradient(to right, #2E75B6 33.33%, white 33.33% 66.66%, #C00000 66.66%); }
    .comp-header-body {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 28px; flex-wrap: wrap; gap: 14px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .back-btn { color: rgba(255,255,255,0.8) !important; }
    .comp-header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: .8px; }
    .comp-header p { margin: 3px 0 0; opacity: 0.8; font-size: 12.5px; }
    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }

    .filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
    .month-select { min-width: 180px; }
    .week-select { min-width: 240px; }
    ::ng-deep .month-select .mdc-notched-outline__leading,
    ::ng-deep .month-select .mdc-notched-outline__notch,
    ::ng-deep .month-select .mdc-notched-outline__trailing,
    ::ng-deep .week-select .mdc-notched-outline__leading,
    ::ng-deep .week-select .mdc-notched-outline__notch,
    ::ng-deep .week-select .mdc-notched-outline__trailing { border-color: rgba(255,255,255,0.35) !important; }
    ::ng-deep .month-select .mat-mdc-floating-label,
    ::ng-deep .week-select .mat-mdc-floating-label { color: rgba(255,255,255,0.7) !important; }
    ::ng-deep .month-select .mat-mdc-select-value,
    ::ng-deep .week-select .mat-mdc-select-value { color: white !important; }
    ::ng-deep .month-select .mat-mdc-select-arrow,
    ::ng-deep .week-select .mat-mdc-select-arrow { color: rgba(255,255,255,0.6) !important; }
    .week-status-chip { font-size: 11px; opacity: 0.7; }

    .stats-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .badge { padding: 4px 13px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge.submitted { background: rgba(39,98,33,0.4); color: #C6EFCE; border: 1px solid rgba(198,239,206,0.3); }
    .badge.total { background: rgba(255,255,255,0.18); color: white; border: 1px solid rgba(255,255,255,0.25); }
    .badge.risks { background: rgba(197,90,17,0.4); color: #FFD7AA; border: 1px solid rgba(253,220,181,0.3); }
    .badge.critique { background: rgba(192,0,0,0.5); color: #FFCCCC; border: 1px solid rgba(255,204,204,0.3); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.7 } }

    /* Export buttons */
    .export-row { display: flex; gap: 8px; }
    .btn-pdf {
      background: #C00000; color: white;
      border: none; border-radius: 8px;
      height: 36px; padding: 0 16px; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      box-shadow: 0 2px 8px rgba(192,0,0,0.3);
      transition: background .15s;
    }
    .btn-pdf:hover { background: #a30000; }
    .btn-pdf mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .btn-excel {
      background: #1F4E79; color: white;
      border: none; border-radius: 8px;
      height: 36px; padding: 0 16px; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      box-shadow: 0 2px 8px rgba(31,78,121,0.3);
      transition: background .15s;
    }
    .btn-excel:hover { background: #163d61; }
    .btn-excel mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ─── Loading ─── */
    .loading-center { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 40vh; gap: 16px; color: #999; }

    /* ─── Summary grid ─── */
    .summary-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; margin-bottom: 20px; }
    .entity-summary-card {
      background: white; border-radius: 10px; padding: 10px 8px;
      text-align: center; border-top: 3px solid #2E75B6;
      box-shadow: 0 1px 6px rgba(31,78,121,0.08);
      border: 1px solid #E8EDF5;
      transition: transform .12s;
    }
    .entity-summary-card:hover { transform: translateY(-2px); }
    .entity-summary-card.submitted { border-top-color: #276221; background: #F0FFF4; }
    .entity-summary-card.empty { opacity: 0.55; }
    .ecode { font-size: 13.5px; font-weight: 800; color: #1F4E79; }
    .check-icon { color: #276221 !important; font-size: 16px; width: 16px; height: 16px; vertical-align: middle; }
    .entity-summary-header { display: flex; align-items: center; justify-content: center; gap: 4px; }
    .entity-mini-stats { font-size: 10px; color: #888; display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
    .entity-mini-stats .red { color: #C00000; font-weight: 700; }

    /* ─── Tabs ─── */
    .comp-tabs { margin-bottom: 20px; }
    .tab-count { background: #1F4E79; color: white; border-radius: 20px; padding: 1px 8px; font-size: 11px; margin-left: 6px; font-weight: 700; }
    .risk-count { background: #C00000 !important; }
    .tab-content { padding: 16px 0; }

    /* ─── Expansion panels ─── */
    .entity-panel {
      margin-bottom: 10px !important;
      border-radius: 10px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 1px 6px rgba(31,78,121,0.07) !important;
    }
    .b-panel { border-left: 4px solid #C55A11 !important; }
    .c-panel { border-left: 4px solid #276221 !important; }
    .d-panel { border-left: 4px solid #C00000 !important; }

    .panel-entity-code { font-weight: 800; color: #1F4E79; margin-right: 10px; font-size: 15px; }
    .panel-entity-name { font-size: 13px; color: #667085; margin-right: 10px; }
    .panel-count { font-size: 11px; background: #DEEAF1; color: #1F4E79; padding: 2px 9px; border-radius: 20px; font-weight: 700; }
    .resp { font-size: 12px; color: #aaa; }
    .dos-warning { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #C00000; font-weight: 700; }
    .dos-warning mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .crit-badge { background: #C00000; color: white; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }

    /* ─── Tables ─── */
    .table-wrapper { overflow-x: auto; }
    table.comp-table { width: 100%; border-collapse: collapse; min-width: 700px; font-size: 13px; }
    .comp-table th { padding: 9px 11px; text-align: left; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid #E0E8F0; }
    .comp-table td { padding: 8px 11px; vertical-align: top; border: 1px solid #EDF2F7; line-height: 1.45; }
    .b-header th { background: #FDF0E5; color: #6B2E00; }
    .c-header th { background: #EAF7EC; color: #276221; }
    .d-header th { background: #FFF0F0; color: #6B0000; }
    .comp-table tbody tr:nth-child(even) td { background: #FAFBFC; }
    .dos-row td { background: #FFF8F0 !important; }

    .col-num { width: 40px; text-align: center; background: #F8F9FB !important; color: #aaa; font-weight: 700; }
    .col-loc { width: 90px; }
    .col-date { width: 90px; }
    .col-dos { width: 80px; text-align: center; }
    .col-crit { width: 120px; }

    .crit-chip { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    tr.critique td { background: #FFF5F5 !important; }
    tr.eleve td { background: #FFF8F2 !important; }
    tr.modere td { background: #FFFEF0 !important; }
    tr.faible td { background: #F2FFF5 !important; }

    /* ─── Risk summary ─── */
    .risk-summary { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .risk-level { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-weight: 600; font-size: 13px; }
    .risk-level mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .risk-level.critique { background: #FFF0F0; color: #C00000; border: 1px solid #FFCCCC; }
    .risk-level.eleve { background: #FFF5EE; color: #C55A11; border: 1px solid #F4CCAA; }
    .risk-level.modere { background: #FFFDE8; color: #856404; border: 1px solid #FFE69C; }
    .risk-level.faible { background: #F0FFF4; color: #276221; border: 1px solid #C6EFCE; }

    .empty-tab { text-align: center; padding: 60px 20px; color: #aaa; }
    .empty-tab mat-icon { font-size: 56px; width: 56px; height: 56px; display: block; margin: 0 auto 12px; color: #D0D7E2; }

    /* ─── Footer ─── */
    .comp-footer {
      text-align: center; font-size: 11px; color: white;
      padding: 12px; border-radius: 10px; margin-top: 24px;
      background: linear-gradient(90deg, #163d61, #1F4E79, #163d61);
    }

    .no-bulletin { text-align: center; padding: 80px 20px; color: #aaa; }
    .no-bulletin mat-icon { font-size: 64px; width: 64px; height: 64px; display: block; margin: 0 auto 12px; color: #D0D7E2; }

    @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 600px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }

    @media print {
      .comp-header button, .back-btn, .filter-row, .export-row, .stats-badges { display: none !important; }
      .entity-panel { break-inside: avoid; }
      .comp-header { border-radius: 0 !important; box-shadow: none !important; }
    }
  `]
})
export class CompilationComponent implements OnInit {
  private api = inject(ApiService);
  readonly cfg = inject(AppConfigService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly entities = ENTITIES;

  weeks = signal<any[]>([]);
  selectedWeekId = '';
  selectedMonth = '';
  loading = signal(true);

  submissionsMap = signal<Record<string, any>>({});

  selectedWeek = computed(() => this.weeks().find(w => w.id === this.selectedWeekId) ?? null);

  readonly allMonths = computed(() => {
    const seen = new Set<string>();
    const months: { key: string; label: string }[] = [];
    for (const w of this.weeks()) {
      for (const dt of [w.weekStart, w.weekEnd]) {
        if (!dt) continue;
        const d = new Date(dt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!seen.has(key)) {
          seen.add(key);
          months.push({ key, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });
        }
      }
    }
    return months.sort((a, b) => b.key.localeCompare(a.key));
  });

  readonly filteredWeeks = computed(() => {
    if (!this.selectedMonth) return this.weeks();
    return this.weeks().filter(w => {
      for (const dt of [w.weekStart, w.weekEnd]) {
        if (!dt) continue;
        const d = new Date(dt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key === this.selectedMonth) return true;
      }
      return false;
    });
  });
  submittedCount = computed(() =>
    this.entities.filter(e => this.submissionsMap()[e.code]?.status === 'submitted').length
  );

  ngOnInit() {
    this.route.queryParams.subscribe(qp => {
      const preselected = qp['week'] ?? '';
      this.loadWeeks(preselected);
    });
  }

  private async loadWeeks(preselectedId = '') {
    try {
      const allWeeks = await firstValueFrom(this.api.getWeeks());
      // Sort: active first, then by start date descending
      const sorted = allWeeks.sort((a: any, b: any) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime();
      });
      this.weeks.set(sorted);
      if (sorted.length > 0) {
        // Honour pre-selected week from query param; fall back to first
        const target = preselectedId && sorted.find((w: any) => w.id === preselectedId)
          ? preselectedId
          : sorted[0].id;
        this.selectedWeekId = target;
        await this.loadSubmissions(target);
      }
    } catch {
      this.snackBar.open('Erreur de chargement des semaines', 'OK', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  async onWeekChange(weekId: string) {
    this.loading.set(true);
    this.submissionsMap.set({});
    await this.loadSubmissions(weekId);
    this.loading.set(false);
  }

  private async loadSubmissions(weekId: string) {
    try {
      const requests = this.entities.map(e =>
        this.api.getSubmission(weekId, e.code)
      );
      const results = await firstValueFrom(forkJoin(requests));
      const map: Record<string, any> = {};
      this.entities.forEach((e, i) => { map[e.code] = results[i]; });
      this.submissionsMap.set(map);
    } catch {
      // partial load — some submissions may be missing
    }
  }

  getSubmission(code: string): any {
    return this.submissionsMap()[code] ?? null;
  }

  getFilledActivities(code: string): any[] {
    return this.getSubmission(code)?.activities?.filter((a: any) => a.title?.trim()) ?? [];
  }

  getFilledPlanned(code: string): any[] {
    return this.getSubmission(code)?.plannedActivities?.filter((a: any) => a.title?.trim()) ?? [];
  }

  getFilledRisks(code: string): any[] {
    return this.getSubmission(code)?.riskPoints?.filter((r: any) => r.description?.trim()) ?? [];
  }

  hasData(code: string): boolean {
    return this.getFilledActivities(code).length > 0 || this.getFilledPlanned(code).length > 0;
  }

  hasDos(code: string): boolean {
    return this.getFilledPlanned(code).some((a: any) => a.dosParticipation === '✅ OUI');
  }

  hasCritique(code: string): boolean {
    return this.getFilledRisks(code).some((r: any) => r.criticality === '🔴 Critique');
  }

  totalActivities = computed(() =>
    this.entities.reduce((sum, e) => sum + this.getFilledActivities(e.code).length, 0)
  );

  totalPlanned = computed(() =>
    this.entities.reduce((sum, e) => sum + this.getFilledPlanned(e.code).length, 0)
  );

  totalRisks = computed(() =>
    this.entities.reduce((sum, e) => sum + this.getFilledRisks(e.code).length, 0)
  );

  critiqueCount = computed(() => this.countByLevel('🔴 Critique'));
  eleveCount = computed(() => this.countByLevel('🟠 Élevé'));
  modereCount = computed(() => this.countByLevel('🟡 Modéré'));
  faibleCount = computed(() => this.countByLevel('🟢 Faible'));

  private countByLevel(level: CriticalityLevel): number {
    return this.entities.reduce((sum, e) =>
      sum + this.getFilledRisks(e.code).filter((r: any) => r.criticality === level).length, 0
    );
  }

  getEntityStats(code: string) {
    return {
      activities: this.getFilledActivities(code).length,
      planned: this.getFilledPlanned(code).length,
      risks: this.getFilledRisks(code).length
    };
  }

  getCritClass(level: CriticalityLevel): string {
    const map: Record<string, string> = {
      '🔴 Critique': 'critique', '🟠 Élevé': 'eleve', '🟡 Modéré': 'modere', '🟢 Faible': 'faible'
    };
    return map[level] ?? '';
  }

  fmtDate(dt: string | null | undefined): string {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? String(dt) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  onMonthChange() {
    // Select first week of the filtered month (or keep current if still visible)
    const visible = this.filteredWeeks();
    if (visible.length > 0 && !visible.find(w => w.id === this.selectedWeekId)) {
      this.selectedWeekId = visible[0].id;
      this.onWeekChange(this.selectedWeekId);
    }
  }

  async exportExcel() {
    const week = this.selectedWeek();
    if (!week?.weekStart) {
      this.snackBar.open('Aucune semaine sélectionnée', 'Fermer', { duration: 3000 });
      return;
    }
    const semaine = new Date(week.weekStart).toISOString().slice(0, 10);
    this.snackBar.open('Génération du bulletin Excel en cours…', '', { duration: 0 });
    try {
      const blob = await firstValueFrom(this.api.exportBulletinExcel(semaine));
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulletin_Hebdo_LHSPLA_${semaine}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      this.snackBar.dismiss();
    } catch {
      this.snackBar.open('Erreur lors de la génération du bulletin', 'Fermer', { duration: 5000 });
    }
  }

  openBrief() {
    const week = this.selectedWeek();
    const semaine = week?.weekStart
      ? new Date(week.weekStart).toISOString().slice(0, 10)
      : undefined;
    this.router.navigate(['/brief'], semaine ? { queryParams: { semaine } } : {});
  }

  print() {
    const week = this.selectedWeek();
    const footer = this.cfg.get('compilation_footer', 'LHSPLA-TA | NPSP-CI | Compilé par Charles Oscar LEBRI, MEL Manager | FY2026');

    const critClass = (level: string) => {
      const map: Record<string, string> = { '🔴 Critique': '#C00000', '🟠 Élevé': '#C55A11', '🟡 Modéré': '#856404', '🟢 Faible': '#276221' };
      return map[level] ?? '#555';
    };

    const critChip = (level: string) => {
      const cls = level?.includes('Critique') ? 'critique' : level?.includes('Élevé') ? 'eleve' : level?.includes('Modéré') ? 'modere' : 'faible';
      return `<span class="crit-chip crit-${cls}">${level ?? '—'}</span>`;
    };

    const buildTableB = () => {
      let html = '';
      for (const entity of this.entities) {
        const acts = this.getFilledActivities(entity.code);
        if (!acts.length) continue;
        const sub = this.getSubmission(entity.code);
        html += `<div class="entity-block">
          <div class="entity-title b">
            <span><strong>${entity.code}</strong><span class="entity-name">${entity.fullName}</span></span>
            <span class="resp">${sub?.responsible ?? ''}</span>
          </div>
          <table><thead><tr class="thead-b">
            <th class="col-n">N°</th><th>Titre de l'activité</th><th>Objectifs</th>
            <th class="col-sm">Lieu</th><th class="col-sm">Début</th><th class="col-sm">Fin</th><th>Recommandations / Résultats clés</th>
          </tr></thead><tbody>
          ${acts.map((a, i) => `<tr>
            <td class="col-n">${i + 1}</td><td>${a.title ?? ''}</td><td>${a.objectives ?? ''}</td>
            <td>${a.location ?? ''}</td><td>${this.fmtDate(a.startDate)}</td><td>${this.fmtDate(a.endDate)}</td><td>${a.recommendations ?? ''}</td>
          </tr>`).join('')}
          </tbody></table></div>`;
      }
      return html || '<p class="empty-msg">Aucune activité réalisée pour cette semaine.</p>';
    };

    const buildTableC = () => {
      let html = '';
      for (const entity of this.entities) {
        const acts = this.getFilledPlanned(entity.code);
        if (!acts.length) continue;
        html += `<div class="entity-block">
          <div class="entity-title c">
            <span><strong>${entity.code}</strong><span class="entity-name">${entity.fullName}</span></span>
          </div>
          <table><thead><tr class="thead-c">
            <th class="col-n">N°</th><th>Titre de l'activité</th><th>Objectifs</th>
            <th class="col-sm">Lieu</th><th class="col-sm">Dates prévues</th><th class="col-dos">DoS ?</th><th>Observations</th>
          </tr></thead><tbody>
          ${acts.map((a, i) => `<tr${a.dosParticipation === '✅ OUI' ? ' class="dos-yes"' : ''}>
            <td class="col-n">${i + 1}</td><td>${a.title ?? ''}</td><td>${a.objectives ?? ''}</td>
            <td>${a.location ?? ''}</td><td>${a.plannedDates ?? ''}</td>
            <td style="text-align:center">${a.dosParticipation ?? '—'}</td><td>${a.observations ?? ''}</td>
          </tr>`).join('')}
          </tbody></table></div>`;
      }
      return html || '<p class="empty-msg">Aucune activité planifiée pour cette semaine.</p>';
    };

    const buildTableD = () => {
      let html = '';
      for (const entity of this.entities) {
        const risks = this.getFilledRisks(entity.code);
        if (!risks.length) continue;
        html += `<div class="entity-block">
          <div class="entity-title d">
            <span><strong>${entity.code}</strong><span class="entity-name">${entity.fullName}</span></span>
          </div>
          <table><thead><tr class="thead-d">
            <th class="col-n">N°</th><th>Catégorie</th><th>Description</th>
            <th class="col-crit">Criticité</th><th>Action attendue</th>
          </tr></thead><tbody>
          ${risks.map((r, i) => `<tr>
            <td class="col-n">${i + 1}</td><td>${r.category ?? ''}</td><td>${r.description ?? ''}</td>
            <td>${critChip(r.criticality)}</td>
            <td>${r.expectedAction ?? ''}</td>
          </tr>`).join('')}
          </tbody></table></div>`;
      }
      return html || '<p class="empty-msg">Aucun point de vigilance pour cette semaine.</p>';
    };

    const doc = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Compilation ${week?.weekReference ?? ''}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; background: #EEF2F7; padding: 20px; }

      /* ── Header ── */
      .print-header {
        background: linear-gradient(150deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
        color: white; border-radius: 14px; overflow: hidden;
        margin-bottom: 20px;
        box-shadow: 0 6px 24px rgba(31,78,121,0.30);
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .triband {
        height: 5px;
        background: linear-gradient(to right, #2E75B6 33.33%, #ffffff 33.33% 66.66%, #C00000 66.66%);
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .header-inner { padding: 18px 28px 20px; display: flex; align-items: center; justify-content: space-between; }
      .header-inner h1 { font-size: 18px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; }
      .header-inner p { font-size: 11px; opacity: 0.75; margin-top: 4px; }
      .header-badges { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
      .badge {
        padding: 4px 13px; border-radius: 20px; font-size: 11px; font-weight: 700;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .badge.submitted { background: rgba(39,98,33,0.45); color: #C6EFCE; border: 1px solid rgba(198,239,206,0.4); }
      .badge.total    { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); }
      .badge.risks    { background: rgba(197,90,17,0.45); color: #FFD7AA; border: 1px solid rgba(253,220,181,0.3); }
      .badge.critique { background: rgba(192,0,0,0.55); color: #FFCCCC; border: 1px solid rgba(255,204,204,0.35); }

      /* ── Summary grid ── */
      .summary-grid {
        display: grid; grid-template-columns: repeat(8,1fr); gap: 10px; margin-bottom: 20px;
      }
      .entity-card {
        background: white; border-radius: 10px; padding: 10px 8px; text-align: center;
        border: 1px solid #E8EDF5; border-top: 3px solid #2E75B6;
        box-shadow: 0 1px 6px rgba(31,78,121,0.09);
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .entity-card.submitted { border-top-color: #276221; background: #F0FFF4; }
      .entity-card.empty { opacity: 0.5; }
      .ecode { font-size: 13px; font-weight: 800; color: #1F4E79; display: block; margin-bottom: 4px; }
      .mini-stat { font-size: 9.5px; color: #888; display: block; line-height: 1.6; }
      .mini-stat.red { color: #C00000; font-weight: 700; }

      /* ── Section titles ── */
      .section-wrap {
        background: white; border-radius: 14px; padding: 0;
        margin-bottom: 18px; overflow: hidden;
        border: 1px solid #E8EDF5;
        box-shadow: 0 2px 12px rgba(31,78,121,0.09);
        page-break-inside: avoid;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .section-header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 20px;
        font-size: 13px; font-weight: 800; color: white;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .section-header.b { background: linear-gradient(90deg, #7B3F00, #C55A11); }
      .section-header.c { background: linear-gradient(90deg, #1a4d1a, #276221); }
      .section-header.d { background: linear-gradient(90deg, #7B0000, #C00000); }
      .section-icon { font-size: 18px; }
      .section-count {
        background: rgba(255,255,255,0.25); border-radius: 20px;
        padding: 2px 11px; font-size: 12px; font-weight: 700; margin-left: auto;
      }
      .section-body { padding: 14px 20px 18px; }

      /* ── Entity block ── */
      .entity-block { margin-bottom: 16px; page-break-inside: avoid; }
      .entity-block:last-child { margin-bottom: 0; }
      .entity-title {
        display: flex; align-items: baseline; justify-content: space-between;
        padding: 6px 12px; border-radius: 8px 8px 0 0;
        font-size: 12px; font-weight: 800;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .entity-title.b { background: #FDF0E5; color: #6B2E00; border-left: 5px solid #C55A11; }
      .entity-title.c { background: #EAF7EC; color: #1a4d1a; border-left: 5px solid #276221; }
      .entity-title.d { background: #FFF0F0; color: #7B0000; border-left: 5px solid #C00000; }
      .entity-name { font-size: 11px; font-weight: 400; opacity: 0.75; margin-left: 6px; }
      .resp { font-size: 10px; font-weight: 400; color: #888; }

      /* ── Tables ── */
      table { width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #DDE4EF; border-top: none; }
      th { padding: 7px 9px; font-size: 10px; font-weight: 700; text-align: left; border: 1px solid #D0D8E4; white-space: nowrap; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      td { padding: 6px 9px; border: 1px solid #E8EDF5; vertical-align: top; line-height: 1.45; }
      .thead-b th { background: #FDF0E5; color: #6B2E00; }
      .thead-c th { background: #EAF7EC; color: #276221; }
      .thead-d th { background: #FFF0F0; color: #6B0000; }
      tbody tr:nth-child(even) td { background: #F8FAFC; }
      tbody tr:hover td { background: #F0F6FF; }
      .col-n { width: 32px; text-align: center; color: #aaa; font-weight: 700; background: #F8F9FB !important; }
      .col-sm { width: 80px; }
      .col-dos { width: 60px; text-align: center; }
      .col-crit { width: 105px; }
      .crit-chip { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .crit-critique { background: #FFF0F0; color: #C00000; border: 1px solid #FFCCCC; }
      .crit-eleve    { background: #FFF5EE; color: #C55A11; border: 1px solid #F4CCAA; }
      .crit-modere   { background: #FFFDE8; color: #856404; border: 1px solid #FFE69C; }
      .crit-faible   { background: #F0FFF4; color: #276221; border: 1px solid #C6EFCE; }
      .dos-yes td { background: #FFF8F0 !important; }
      .empty-msg { color: #aaa; font-style: italic; padding: 12px 0; font-size: 11px; }

      /* ── Footer ── */
      .comp-footer {
        text-align: center; font-size: 10.5px; color: white; letter-spacing: 0.3px;
        padding: 12px 20px; border-radius: 10px; margin-top: 24px;
        background: linear-gradient(90deg, #163d61, #1F4E79, #163d61);
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }

      @page { margin: 1.2cm; size: A4 landscape; }
      @media print {
        body { background: white; padding: 0; }
        .section-wrap { box-shadow: none; }
      }
    </style></head><body>

    <!-- Header -->
    <div class="print-header">
      <div class="triband"></div>
      <div class="header-inner">
        <div>
          <h1>Compilation Hebdomadaire — ${week?.weekReference ?? ''}</h1>
          <p>Bulletin LHSPLA-TA &nbsp;·&nbsp; Imprimé le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <div class="header-badges">
          <span class="badge submitted">${this.submittedCount()}/8 soumis</span>
          ${this.totalActivities() > 0 ? `<span class="badge total">${this.totalActivities()} activités</span>` : ''}
          ${this.totalRisks() > 0 ? `<span class="badge risks">${this.totalRisks()} risques</span>` : ''}
          ${this.critiqueCount() > 0 ? `<span class="badge critique">${this.critiqueCount()} critiques</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Summary grid -->
    <div class="summary-grid">
      ${this.entities.map(e => {
        const sub = this.getSubmission(e.code);
        const submitted = sub?.status === 'submitted';
        const empty = !this.hasData(e.code);
        const stats = this.getEntityStats(e.code);
        return `<div class="entity-card${submitted ? ' submitted' : ''}${empty ? ' empty' : ''}">
          <span class="ecode">${e.code}</span>
          <span class="mini-stat">${stats.activities} réalisées</span>
          <span class="mini-stat">${stats.planned} planifiées</span>
          <span class="mini-stat${stats.risks > 0 ? ' red' : ''}">${stats.risks} risques</span>
        </div>`;
      }).join('')}
    </div>

    <!-- Section B -->
    <div class="section-wrap">
      <div class="section-header b">
        <span class="section-icon">✅</span>
        <span>B — Activités Réalisées</span>
        <span class="section-count">${this.totalActivities()}</span>
      </div>
      <div class="section-body">${buildTableB()}</div>
    </div>

    <!-- Section C -->
    <div class="section-wrap">
      <div class="section-header c">
        <span class="section-icon">📅</span>
        <span>C — Activités Planifiées</span>
        <span class="section-count">${this.totalPlanned()}</span>
      </div>
      <div class="section-body">${buildTableC()}</div>
    </div>

    <!-- Section D -->
    <div class="section-wrap">
      <div class="section-header d">
        <span class="section-icon">⚠️</span>
        <span>D — Points de Vigilance</span>
        <span class="section-count">${this.totalRisks()}</span>
      </div>
      <div class="section-body">${buildTableD()}</div>
    </div>

    <div class="comp-footer">${footer}</div>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(doc); win.document.close(); }
  }
}
