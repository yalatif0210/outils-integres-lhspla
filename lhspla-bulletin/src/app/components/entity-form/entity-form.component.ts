import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import {
  ENTITIES, CRITICALITY_OPTIONS, DOS_OPTIONS,
  createEmptyActivity, createEmptyPlannedActivity, createEmptyRiskPoint
} from '../../models/bulletin.models';
import { firstValueFrom, Subscription } from 'rxjs';

interface Presence { section: string; name: string; isMe: boolean; }

@Component({
  selector: 'app-entity-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatSnackBarModule,
    MatDividerModule, MatProgressSpinnerModule, MatChipsModule
  ],
  template: `
    <!-- Loading -->
    <div class="loading-center" *ngIf="loading()">
      <div class="loading-spinner-wrap">
        <mat-spinner diameter="44"></mat-spinner>
      </div>
      <p class="loading-text">Chargement en cours...</p>
    </div>

    <!-- No week -->
    <div class="empty-state" *ngIf="!loading() && !weekId">
      <mat-icon class="empty-icon">event_busy</mat-icon>
      <h3>Aucune semaine active</h3>
      <p>Il n'y a pas de semaine de saisie active pour le moment.</p>
      <a mat-raised-button routerLink="/home" class="btn-primary">
        <mat-icon>arrow_back</mat-icon> Retour à l'accueil
      </a>
    </div>

    <!-- Main form -->
    <div class="form-container" *ngIf="!loading() && weekId && submission()">

      <!-- ═══════════════════════ HEADER ═══════════════════════ -->
      <header class="form-header">

        <div class="header-body">
          <!-- Left -->
          <div class="header-left">
            <a routerLink="/home" mat-icon-button class="btn-back" matTooltip="Retour à l'accueil">
              <mat-icon>arrow_back</mat-icon>
            </a>
            <div class="entity-identity">
              <div class="entity-code-row">
                <span class="entity-badge">{{entityCode}}</span>
                <span class="entity-sep"></span>
                <div class="entity-names">
                  <span class="entity-fullname">{{entityInfo()?.fullName}}</span>
                  <span class="entity-sub">Bulletin Hebdomadaire · LHSPLA-TA · NPSP-CI</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right -->
          <div class="header-right">
            <!-- Week selector (multiple active weeks) -->
            <div class="week-control" *ngIf="activeWeeks().length > 1">
              <label class="week-label"><mat-icon>event</mat-icon> Semaine</label>
              <select class="week-select" [ngModel]="weekId" (ngModelChange)="onWeekChange($event)">
                <option *ngFor="let w of activeWeeks()" [value]="w.id">
                  {{w.weekReference}}
                </option>
              </select>
            </div>
            <!-- Week static (single week) -->
            <div class="week-static" *ngIf="activeWeeks().length <= 1">
              <mat-icon class="week-icon-sm">event</mat-icon>
              <span class="week-ref-text">{{week()?.weekReference ?? '—'}}</span>
            </div>

            <!-- Status chip -->
            <div class="status-chip-new" [class.submitted]="submissionStatus() === 'submitted'">
              <span class="status-dot" [class.dot-submitted]="submissionStatus() === 'submitted'"></span>
              {{submissionStatus() === 'submitted' ? 'Soumis' : 'En cours de saisie'}}
            </div>

            <!-- Read-only indicator -->
            <div class="readonly-chip" *ngIf="isReadOnly() && submissionStatus() !== 'submitted'">
              <mat-icon>visibility</mat-icon> Lecture seule
            </div>

            <!-- Presence -->
            <div class="presence-bar" *ngIf="otherPresence().length > 0">
              <mat-icon class="presence-icon">group</mat-icon>
              <span *ngFor="let p of otherPresence()" class="presence-tag">
                {{p.name}} · §{{p.section}}
              </span>
            </div>
          </div>
        </div>
      </header>

      <!-- Reopen bar (admin) -->
      <div class="reopen-bar" *ngIf="auth.isAdmin() && submissionStatus() === 'submitted'">
        <div class="reopen-info">
          <mat-icon>lock</mat-icon>
          <span>Cette saisie est soumise et verrouillée en lecture seule.</span>
        </div>
        <button class="btn-reopen" (click)="reopenSubmission()" [disabled]="reopening()">
          <mat-icon>lock_open</mat-icon>
          {{reopening() ? 'Réouverture...' : 'Réouvrir pour modification'}}
        </button>
      </div>

      <!-- ═══════════════════════ SECTIONS (inchangées) ════════ -->

      <!-- Section A -->
      <mat-card class="section-card section-a">
        <mat-card-header>
          <div class="section-label section-a-label">
            <mat-icon>info</mat-icon>
            SECTION A — INFORMATIONS DE SOUMISSION
          </div>
          <div class="save-indicator" *ngIf="savingSection() === 'A'">
            <mat-spinner diameter="14"></mat-spinner> Enregistrement...
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="form-grid-3">
            <mat-form-field appearance="outline">
              <mat-label>Responsable (Nom & Prénom)</mat-label>
              <input matInput [(ngModel)]="responsible"
                     [readonly]="isReadOnly()"
                     placeholder="Nom complet du responsable"
                     (ngModelChange)="onFieldChange('A')">
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Semaine de référence</mat-label>
              <input matInput [value]="week()?.weekReference ?? '—'" readonly>
              <mat-icon matSuffix>date_range</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date de soumission</mat-label>
              <input matInput [(ngModel)]="submissionDate"
                     [readonly]="isReadOnly()"
                     (ngModelChange)="onFieldChange('A')">
              <mat-icon matSuffix>today</mat-icon>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Section B -->
      <mat-card class="section-card section-b">
        <mat-card-header>
          <div class="section-label section-b-label">
            <mat-icon>task_alt</mat-icon>
            SECTION B — ACTIVITÉS RÉALISÉES — Semaine précédente
          </div>
          <div class="section-note">
            Décrire les activités conduites au cours de la semaine écoulée avec résultats et recommandations clés.
          </div>
          <div class="save-indicator" *ngIf="savingSection() === 'B'">
            <mat-spinner diameter="14"></mat-spinner> Enregistrement...
          </div>
          <div class="presence-section" *ngIf="presenceFor('B').length > 0">
            <mat-icon>edit</mat-icon> En cours : {{presenceFor('B').join(', ')}}
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr class="table-header b-header">
                  <th class="col-num">N°</th>
                  <th class="col-title">Titre de l'activité</th>
                  <th class="col-objectives">Objectifs</th>
                  <th class="col-location">Lieu</th>
                  <th class="col-date">Début</th>
                  <th class="col-date">Fin</th>
                  <th class="col-reco">Recommandations / Résultats clés</th>
                  <ng-container *ngIf="!isReadOnly()"><th class="col-actions"></th></ng-container>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let act of activities; let i = index" class="data-row">
                  <td class="col-num">{{i + 1}}</td>
                  <td>
                    <textarea class="cell-input cell-title" [(ngModel)]="act.title"
                      placeholder="Saisir ou choisir..." [readonly]="isReadOnly()"
                      (focus)="openSuggest('B', i, act, $event)"
                      (ngModelChange)="onTitleChange('B', i, act, $event)"
                      (blur)="closeSuggest()" rows="3"></textarea>
                  </td>
                  <td><textarea class="cell-input" [(ngModel)]="act.objectives" placeholder="Objectifs..." rows="2"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('B')"></textarea></td>
                  <td><input class="cell-input" [(ngModel)]="act.location" placeholder="Lieu..."
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('B')"></td>
                  <td><input class="cell-input date-input" type="date" [(ngModel)]="act.startDate"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('B')"></td>
                  <td><input class="cell-input date-input" type="date" [(ngModel)]="act.endDate"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('B')"></td>
                  <td><textarea class="cell-input" [(ngModel)]="act.recommendations" placeholder="Résultats..." rows="2"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('B')"></textarea></td>
                  <td class="col-actions" *ngIf="!isReadOnly()">
                    <button mat-icon-button color="warn" (click)="removeActivity(i)"
                            [disabled]="activities.length === 1" matTooltip="Supprimer">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button mat-stroked-button color="primary" class="add-row-btn"
                  *ngIf="!isReadOnly()" (click)="addActivity()">
            <mat-icon>add</mat-icon> Ajouter une activité réalisée
          </button>
        </mat-card-content>
      </mat-card>

      <!-- Section C -->
      <mat-card class="section-card section-c">
        <mat-card-header>
          <div class="section-label section-c-label">
            <mat-icon>event_note</mat-icon>
            SECTION C — ACTIVITÉS PLANIFIÉES — Mois glissant
          </div>
          <div class="section-note">
            Lister les activités prévues sur les 4 prochaines semaines.
          </div>
          <div class="save-indicator" *ngIf="savingSection() === 'C'">
            <mat-spinner diameter="14"></mat-spinner> Enregistrement...
          </div>
          <div class="presence-section" *ngIf="presenceFor('C').length > 0">
            <mat-icon>edit</mat-icon> En cours : {{presenceFor('C').join(', ')}}
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr class="table-header c-header">
                  <th class="col-num">N°</th>
                  <th class="col-title">Titre de l'activité</th>
                  <th class="col-objectives">Objectifs</th>
                  <th class="col-location">Lieu</th>
                  <th class="col-date">Début</th>
                  <th class="col-date">Fin</th>
                  <th class="col-dos">DoS ?</th>
                  <th class="col-reco">Observations</th>
                  <ng-container *ngIf="!isReadOnly()"><th class="col-actions"></th></ng-container>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let act of plannedActivities; let i = index" class="data-row">
                  <td class="col-num">{{i + 1}}</td>
                  <td>
                    <textarea class="cell-input cell-title" [(ngModel)]="act.title"
                      placeholder="Saisir ou choisir..." [readonly]="isReadOnly()"
                      (focus)="openSuggest('C', i, act, $event)"
                      (ngModelChange)="onTitleChange('C', i, act, $event)"
                      (blur)="closeSuggest()" rows="3"></textarea>
                  </td>
                  <td><textarea class="cell-input" [(ngModel)]="act.objectives" placeholder="Objectifs..." rows="2"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('C')"></textarea></td>
                  <td><input class="cell-input" [(ngModel)]="act.location" placeholder="Lieu..."
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('C')"></td>
                  <td><input class="cell-input date-input" type="date" [(ngModel)]="act.startDate"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('C')"></td>
                  <td><input class="cell-input date-input" type="date" [(ngModel)]="act.endDate"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('C')"></td>
                  <td class="col-dos">
                    <select class="dos-select" [(ngModel)]="act.dosParticipation"
                            [disabled]="isReadOnly()" (ngModelChange)="onFieldChange('C')">
                      <option value="">—</option>
                      <option *ngFor="let opt of dosOptions" [value]="opt">{{opt}}</option>
                    </select>
                  </td>
                  <td><textarea class="cell-input" [(ngModel)]="act.observations" placeholder="Observations..." rows="2"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('C')"></textarea></td>
                  <td class="col-actions" *ngIf="!isReadOnly()">
                    <button mat-icon-button color="warn" (click)="removePlanned(i)"
                            [disabled]="plannedActivities.length === 1" matTooltip="Supprimer">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="dos-warning" *ngIf="hasDosActivities()">
            <mat-icon>warning</mat-icon>
            Rappel : Toute activité impliquant le DoS doit être transmise au moins 2 semaines avant.
          </div>
          <button mat-stroked-button color="primary" class="add-row-btn"
                  *ngIf="!isReadOnly()" (click)="addPlanned()">
            <mat-icon>add</mat-icon> Ajouter une activité planifiée
          </button>
        </mat-card-content>
      </mat-card>

      <!-- Section D -->
      <mat-card class="section-card section-d">
        <mat-card-header>
          <div class="section-label section-d-label">
            <mat-icon>warning_amber</mat-icon>
            SECTION D — POINTS DE VIGILANCE / RISQUES / BESOINS DE DÉCISION
          </div>
          <div class="section-note">
            Signaler tout blocage, risque ou besoin d'arbitrage nécessitant l'attention de la direction.
          </div>
          <div class="save-indicator" *ngIf="savingSection() === 'D'">
            <mat-spinner diameter="14"></mat-spinner> Enregistrement...
          </div>
          <div class="presence-section" *ngIf="presenceFor('D').length > 0">
            <mat-icon>edit</mat-icon> En cours : {{presenceFor('D').join(', ')}}
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr class="table-header d-header">
                  <th class="col-num">N°</th>
                  <th class="col-theme">Thème</th>
                  <th class="col-category">Catégorie</th>
                  <th class="col-desc">Description du point</th>
                  <th class="col-criticality">Criticité</th>
                  <th class="col-action">Action attendue / Décision souhaitée</th>
                  <ng-container *ngIf="!isReadOnly()"><th class="col-actions"></th></ng-container>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let risk of riskPoints; let i = index" class="data-row"
                    [class.critique]="risk.criticality === '🔴 Critique'"
                    [class.eleve]="risk.criticality === '🟠 Élevé'"
                    [class.modere]="risk.criticality === '🟡 Modéré'"
                    [class.faible]="risk.criticality === '🟢 Faible'">
                  <td class="col-num">{{i + 1}}</td>
                  <td class="col-theme">
                    <select class="criticality-select" [(ngModel)]="risk.theme"
                            [disabled]="isReadOnly()" (ngModelChange)="onThemeChange(risk)">
                      <option value="">— Thème —</option>
                      <option *ngFor="let t of riskThemes()" [value]="t.name">{{t.name}}</option>
                    </select>
                  </td>
                  <td class="col-category">
                    <select class="criticality-select" [(ngModel)]="risk.category"
                            [disabled]="isReadOnly()" (ngModelChange)="onFieldChange('D')">
                      <option value="">— Catégorie —</option>
                      <option *ngFor="let c of getCatsForTheme(risk.theme)" [value]="c.name">{{c.name}}</option>
                    </select>
                  </td>
                  <td><textarea class="cell-input" [(ngModel)]="risk.description" placeholder="Description..." rows="2"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('D')"></textarea></td>
                  <td class="col-criticality">
                    <select class="criticality-select" [(ngModel)]="risk.criticality"
                            [disabled]="isReadOnly()" (ngModelChange)="onFieldChange('D')">
                      <option value="">— Niveau —</option>
                      <option *ngFor="let opt of criticalityOptions" [value]="opt">{{opt}}</option>
                    </select>
                  </td>
                  <td><textarea class="cell-input" [(ngModel)]="risk.expectedAction" placeholder="Action souhaitée..." rows="2"
                    [readonly]="isReadOnly()" (ngModelChange)="onFieldChange('D')"></textarea></td>
                  <td class="col-actions" *ngIf="!isReadOnly()">
                    <button mat-icon-button color="warn" (click)="removeRisk(i)"
                            [disabled]="riskPoints.length === 1" matTooltip="Supprimer">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button mat-stroked-button color="warn" class="add-row-btn"
                  *ngIf="!isReadOnly()" (click)="addRisk()">
            <mat-icon>add</mat-icon> Ajouter un point de vigilance
          </button>
        </mat-card-content>
      </mat-card>

      <!-- Dropdown global autocomplete titre (position:fixed pour sortir des overflow) -->
      <div class="global-suggest"
        *ngIf="activeSuggest()"
        [style.top.px]="suggestRect()!.top"
        [style.left.px]="suggestRect()!.left"
        [style.width.px]="suggestRect()!.width">
        <div class="suggest-item" *ngFor="let s of activeSuggest()!.items"
          (mousedown)="selectTitle(activeSuggest()!.act, s, activeSuggest()!.section)">
          <span class="suggest-code" *ngIf="s.taskId">{{s.taskId}}</span>{{s.title}}
        </div>
      </div>

      <!-- ═══════════════════════ ACTION BAR ══════════════════ -->
      <div class="action-bar">
        <div class="action-left">
          <ng-container *ngIf="!isReadOnly()">
            <button class="btn-submit" (click)="submitForm()"
                    [disabled]="!canSubmit() || submitting()">
              <mat-spinner *ngIf="submitting()" diameter="18" class="spin-white"></mat-spinner>
              <mat-icon *ngIf="!submitting()">send</mat-icon>
              <span>{{submitting() ? 'Soumission en cours...' : 'Soumettre le bulletin'}}</span>
            </button>

            <div class="autosave-status">
              <ng-container *ngIf="pendingSections().length > 0">
                <mat-spinner diameter="13"></mat-spinner>
                <span class="autosave-pending">Enregistrement auto...</span>
              </ng-container>
              <ng-container *ngIf="lastSavedAt && pendingSections().length === 0">
                <mat-icon class="autosave-ok-icon">cloud_done</mat-icon>
                <span class="autosave-ok">Enregistré à {{formatTime(lastSavedAt)}}</span>
              </ng-container>
            </div>
          </ng-container>

          <div class="submitted-notice" *ngIf="isReadOnly() && submissionStatus() === 'submitted'">
            <mat-icon>check_circle</mat-icon>
            <span>Soumis le {{submission()?.submittedAt | date:'dd/MM/yyyy à HH:mm'}}</span>
          </div>
        </div>

        <div class="action-right">
          <button class="btn-print" (click)="print()">
            <mat-icon>print</mat-icon>
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>



      <!-- ═══════════════════════ FOOTER ═══════════════════════ -->
      <footer class="form-footer">
        <div class="footer-flag">
          <span class="flag-blue"></span>
          <span class="flag-white"></span>
          <span class="flag-red"></span>
        </div>
        <div class="footer-content">
          <span class="footer-brand">LHSPLA-TA</span>
          <span class="footer-dot">·</span>
          <span>NPSP-CI</span>
          <span class="footer-dot">·</span>
          <span>FY2026</span>
          <span class="footer-dot">·</span>
          <span>Charles Oscar LEBRI — MEL Manager</span>
        </div>
      </footer>
    </div>

    <!-- Submission not found -->
    <div class="empty-state" *ngIf="!loading() && weekId && !submission()">
      <mat-icon class="empty-icon">search_off</mat-icon>
      <h3>Soumission introuvable</h3>
      <p>La saisie demandée n'existe pas ou n'est pas accessible.</p>
      <a mat-raised-button routerLink="/home" class="btn-primary">
        <mat-icon>arrow_back</mat-icon> Retour à l'accueil
      </a>
    </div>
  `,
  styles: [`
    /* ═══════════════ PAGE ═══════════════ */
    :host { display: block; background: #EEF2F7; min-height: 100vh; }

    .loading-center {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 60vh; gap: 20px;
    }
    .loading-spinner-wrap {
      background: white; border-radius: 50%; padding: 20px;
      box-shadow: 0 4px 20px rgba(31,78,121,0.12);
    }
    .loading-text { color: #1F4E79; font-size: 14px; font-weight: 500; }

    .empty-state {
      text-align: center; padding: 80px 20px; color: #1F4E79;
    }
    .empty-icon { font-size: 72px; width: 72px; height: 72px; color: #BDD7EE; display: block; margin: 0 auto 16px; }
    .empty-state h3 { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
    .empty-state p { margin: 0 0 24px; color: #666; }

    .btn-primary {
      background: #C00000 !important; color: white !important;
      border-radius: 8px !important; font-weight: 600 !important;
    }

    .form-container { max-width: 1400px; margin: 0 auto; padding: 0 16px 32px; }

    /* ═══════════════ HEADER ═══════════════ */
    .form-header {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 45%, #245d8f 100%);
      border-radius: 0 0 20px 20px;
      margin: 0 0 24px;
      overflow: hidden;
      box-shadow: 0 6px 24px rgba(22, 61, 97, 0.3);
    }

    .header-triband {
      display: flex; height: 5px;
    }
    .band-blue  { flex: 1; background: #2E75B6; }
    .band-white { flex: 1; background: #FFFFFF; }
    .band-red   { flex: 1; background: #C00000; }

    .header-body {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 28px 24px; flex-wrap: wrap; gap: 16px;
    }

    .header-left { display: flex; align-items: center; gap: 16px; }

    .btn-back {
      color: rgba(255,255,255,0.75) !important;
      background: rgba(255,255,255,0.08) !important;
      border-radius: 10px !important;
      transition: background 0.2s !important;
    }
    .btn-back:hover { background: rgba(255,255,255,0.16) !important; color: white !important; }

    .entity-badge {
      font-size: 38px; font-weight: 900; letter-spacing: 4px;
      color: white; line-height: 1;
      text-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .entity-sep {
      width: 2px; height: 36px;
      background: rgba(255,255,255,0.25); border-radius: 2px; flex-shrink: 0;
    }
    .entity-code-row { display: flex; align-items: center; gap: 14px; }
    .entity-names { display: flex; flex-direction: column; gap: 3px; }
    .entity-fullname { font-size: 15px; color: rgba(255,255,255,0.95); font-weight: 600; }
    .entity-sub { font-size: 10px; color: rgba(255,255,255,0.45); letter-spacing: 0.8px; text-transform: uppercase; }

    .header-right {
      display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
    }

    /* Week selector */
    .week-control {
      display: flex; align-items: center; gap: 8px;
    }
    .week-label {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: rgba(255,255,255,0.6);
      text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;
    }
    .week-label mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .week-select {
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1.5px solid rgba(255,255,255,0.3);
      border-radius: 10px;
      padding: 7px 36px 7px 14px;
      font-size: 13px; font-weight: 700;
      cursor: pointer; outline: none;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.7)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      min-width: 140px;
      transition: border-color 0.2s, background 0.2s;
    }
    .week-select:hover { border-color: rgba(255,255,255,0.6); background-color: rgba(255,255,255,0.15); }
    .week-select:focus { border-color: rgba(255,255,255,0.8); background-color: rgba(255,255,255,0.18); }
    .week-select option { background: #1F4E79; color: white; }

    .week-static {
      display: flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px; padding: 6px 14px;
    }
    .week-icon-sm { font-size: 15px; width: 15px; height: 15px; color: rgba(255,255,255,0.6); }
    .week-ref-text { font-size: 13px; font-weight: 700; color: white; }

    /* Status chip */
    .status-chip-new {
      display: flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      padding: 5px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9);
    }
    .status-chip-new.submitted {
      background: rgba(192,0,0,0.25);
      border-color: rgba(255,120,120,0.35);
    }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #52C41A;
      animation: blink 2.2s ease-in-out infinite;
    }
    .status-dot.dot-submitted { background: #FF6B6B; animation: none; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

    .readonly-chip {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: rgba(255,220,80,0.9);
      background: rgba(255,200,0,0.12);
      border: 1px solid rgba(255,200,0,0.25);
      padding: 3px 10px; border-radius: 12px;
    }
    .readonly-chip mat-icon { font-size: 13px; width: 13px; height: 13px; }

    /* Presence */
    .presence-bar {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: rgba(255,255,255,0.75);
      background: rgba(255,255,255,0.08);
      padding: 4px 12px; border-radius: 10px; flex-wrap: wrap;
    }
    .presence-icon { font-size: 14px; width: 14px; height: 14px; }
    .presence-tag {
      background: rgba(255,255,255,0.12);
      padding: 1px 8px; border-radius: 8px; font-size: 11px;
    }

    /* ═══════════════ REOPEN BAR ═══════════════ */
    .reopen-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: #FFF8F2;
      border: 1px solid #F4CCAA;
      border-left: 4px solid #C55A11;
      border-radius: 0 12px 12px 0;
      padding: 14px 20px; margin-bottom: 20px;
      flex-wrap: wrap; gap: 12px;
    }
    .reopen-info {
      display: flex; align-items: center; gap: 10px;
      color: #7A3A0A; font-size: 13px; font-weight: 500;
    }
    .reopen-info mat-icon { color: #C55A11; }

    .btn-reopen {
      display: flex; align-items: center; gap: 7px;
      background: #C55A11; color: white;
      border: none; border-radius: 8px;
      padding: 8px 18px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: background 0.2s, transform 0.15s;
      box-shadow: 0 2px 8px rgba(197,90,17,0.3);
    }
    .btn-reopen:hover:not([disabled]) { background: #A04610; transform: translateY(-1px); }
    .btn-reopen:disabled { background: #CCC; cursor: not-allowed; box-shadow: none; }
    .btn-reopen mat-icon { font-size: 17px; width: 17px; height: 17px; }

    /* ═══════════════ SECTIONS (inchangées) ═══════════════ */
    .section-card { border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 12px rgba(31,78,121,0.08); }
    .section-label {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: 14px; letter-spacing: 0.5px;
      color: white; padding: 10px 16px; margin: -16px -16px 0; border-radius: 8px 8px 0 0;
    }
    .section-a-label { background: #2E75B6; }
    .section-b-label { background: #C55A11; }
    .section-c-label { background: #548235; }
    .section-d-label { background: #9E0000; }
    .section-note { font-size: 12px; color: #666; font-style: italic; margin-top: 8px; margin-left: 30px; }

    .save-indicator { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #2E75B6; margin-top: 6px; }
    .presence-section { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #C55A11; margin-top: 4px; background: #FFF3E0; padding: 3px 10px; border-radius: 6px; }
    .presence-section mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .form-grid-3 { display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 16px; margin-top: 16px; }

    .table-wrapper { overflow-x: auto; margin-bottom: 12px; }
    table.data-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .table-header th { padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 600; white-space: nowrap; border: 1px solid #d0e4f0; }
    .b-header th { background: #F4CCAA; color: #6B2E00; border-color: #e8b888; }
    .c-header th { background: #C6EFCE; color: #276221; border-color: #a8d5ab; }
    .d-header th { background: #FFCCCC; color: #6B0000; border-color: #ffaaaa; }

    .data-row td { padding: 6px 8px; vertical-align: top; border: 1px solid #e8edf2; background: #FFFDF0; }
    .data-row:hover td { background: #FFFBE5; }
    .data-row.critique td { background: #FFF0F0; border-left: 3px solid #ff0000; }
    .data-row.eleve td { background: #FFF5EE; border-left: 3px solid #FF6600; }
    .data-row.modere td { background: #FFFDE8; border-left: 3px solid #FFD700; }
    .data-row.faible td { background: #F0FFF0; border-left: 3px solid #00AA00; }

    .col-num { width: 40px; text-align: center; font-weight: 600; color: #666; background: #f8f9fa !important; }
    .col-actions { width: 40px; text-align: center; }
    .col-dos { width: 90px; }
    .col-criticality { width: 130px; }
    .col-theme { width: 150px; }
    .col-category { width: 160px; }
    .col-date { width: 120px; }
    .col-location { width: 100px; }

    .cell-input { width: 100%; border: none; background: transparent; font-family: inherit; font-size: 13px; color: #333; resize: vertical; outline: none; padding: 2px; }
    .cell-input:focus { background: rgba(46,117,182,0.05); border-radius: 4px; }
    .cell-input[readonly] { color: #555; cursor: default; }
    .date-input { cursor: pointer; font-size: 12px; }
    .date-input[readonly] { cursor: default; }
    .cell-title { min-height: 40px; white-space: pre-wrap; word-break: break-word; line-height: 1.45; resize: none; }
    .col-title { min-width: 180px; }
    .global-suggest {
      position: fixed; z-index: 99999;
      background: white; border: 1px solid #BDD7EE; border-top: none;
      border-radius: 0 0 6px 6px;
      box-shadow: 0 8px 24px rgba(31,78,121,0.18);
      max-height: 240px; overflow-y: auto;
    }
    .suggest-item {
      padding: 7px 10px; font-size: 12px; color: #222; cursor: pointer;
      border-bottom: 1px solid #EEF4FB; line-height: 1.45;
    }
    .suggest-item:last-child { border-bottom: none; }
    .suggest-item:hover { background: #EEF5FF; color: #1F4E79; }
    .suggest-code { font-size: 10px; font-weight: 700; color: #2E75B6; margin-right: 6px;
      background: #EEF4FB; padding: 1px 5px; border-radius: 3px; }

    .dos-select, .criticality-select { width: 100%; border: 1px solid #ccc; border-radius: 4px; padding: 4px 6px; font-size: 12px; background: white; cursor: pointer; }
    .dos-select:disabled, .criticality-select:disabled { background: #f5f5f5; cursor: default; }

    .add-row-btn { margin-top: 4px; font-size: 13px; }
    .dos-warning { display: flex; align-items: center; gap: 8px; background: #FFF3E0; color: #C55A11; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; }

    /* ═══════════════ ACTION BAR ═══════════════ */
    .action-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: white;
      border-radius: 14px;
      border: 1px solid #DDE5EF;
      padding: 16px 24px;
      box-shadow: 0 4px 20px rgba(31,78,121,0.07);
      margin-bottom: 20px;
      flex-wrap: wrap; gap: 14px;
    }
    .action-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .action-right { display: flex; align-items: center; gap: 10px; }

    .btn-submit {
      display: inline-flex; align-items: center; gap: 8px;
      background: #C00000; color: white;
      border: none; border-radius: 10px;
      padding: 0 26px; height: 46px; font-size: 14px; font-weight: 700;
      cursor: pointer; letter-spacing: 0.3px;
      box-shadow: 0 3px 12px rgba(192,0,0,0.35);
      transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    }
    .btn-submit:hover:not([disabled]) {
      background: #A30000;
      box-shadow: 0 5px 16px rgba(192,0,0,0.45);
      transform: translateY(-1px);
    }
    .btn-submit:disabled { background: #CCC; color: #999; cursor: not-allowed; box-shadow: none; }
    .btn-submit mat-icon { font-size: 19px; width: 19px; height: 19px; }
    .spin-white { --mdc-circular-progress-active-indicator-color: white; }

    .autosave-status {
      display: flex; align-items: center; gap: 7px; font-size: 12px;
    }
    .autosave-pending { color: #888; }
    .autosave-ok { color: #276221; font-weight: 500; }
    .autosave-ok-icon { font-size: 16px; width: 16px; height: 16px; color: #276221; }

    .submitted-notice {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: #276221;
    }
    .submitted-notice mat-icon { color: #276221; font-size: 18px; width: 18px; height: 18px; }

    .btn-print {
      display: inline-flex; align-items: center; gap: 7px;
      background: transparent; color: #1F4E79;
      border: 1.5px solid #1F4E79; border-radius: 10px;
      padding: 0 18px; height: 40px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: background 0.2s, color 0.2s;
    }
    .btn-print:hover {
      background: #1F4E79; color: white;
    }
    .btn-print mat-icon { font-size: 17px; width: 17px; height: 17px; }

    /* ═══════════════ FOOTER ═══════════════ */
    .form-footer {
      border-radius: 12px; overflow: hidden;
      background: linear-gradient(135deg, #163d61, #1F4E79);
      box-shadow: 0 4px 16px rgba(22,61,97,0.2);
    }
    .footer-flag { display: flex; height: 3px; }
    .flag-blue  { flex: 1; background: #2E75B6; }
    .flag-white { flex: 1; background: #FFFFFF; }
    .flag-red   { flex: 1; background: #C00000; }
    .footer-content {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 13px 20px; flex-wrap: wrap;
      font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 0.5px;
    }
    .footer-brand { font-weight: 800; color: white; letter-spacing: 2px; font-size: 12px; }
    .footer-dot { color: rgba(255,255,255,0.25); }

    /* ═══════════════ PRINT ═══════════════ */
    @media (max-width: 768px) {
      .form-grid-3 { grid-template-columns: 1fr; }
      .header-body { flex-direction: column; align-items: flex-start; }
      .header-right { align-items: flex-start; }
      .entity-badge { font-size: 28px; }
    }
    @media print {
      .action-bar, .btn-back, .reopen-bar, .presence-bar,
      .presence-section, .save-indicator, .form-footer,
      button, .btn-reopen { display: none !important; }
      .section-card { break-inside: avoid; box-shadow: none !important; }
      .form-header { box-shadow: none !important; border-radius: 0 !important; }
      :host { background: white !important; }
    }
  `]
})
export class EntityFormComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  readonly auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  entityCode = '';
  weekId = '';

  loading = signal(true);
  submitting = signal(false);
  reopening = signal(false);
  savingSection = signal<string | null>(null);
  submission = signal<any>(null);
  week = signal<any>(null);
  presence = signal<Presence[]>([]);
  activeWeeks = signal<any[]>([]);

  responsible = '';
  submissionDate = '';
  activities: any[] = [];
  plannedActivities: any[] = [];
  riskPoints: any[] = [];

  lastSavedAt: Date | null = null;

  readonly criticalityOptions = CRITICALITY_OPTIONS;
  readonly dosOptions = DOS_OPTIONS;

  activityRefs = signal<any[]>([]);
  riskCategories = signal<any[]>([]);
  riskThemes = signal<any[]>([]);
  activeSuggest = signal<{ section: string; rowIdx: number; items: any[]; act: any } | null>(null);
  suggestRect = signal<{ top: number; left: number; width: number } | null>(null);

  readonly entityInfo = computed(() => ENTITIES.find(e => e.code === this.entityCode));
  readonly submissionStatus = computed(() => this.submission()?.status ?? 'draft');
  readonly otherPresence = computed(() => this.presence().filter(p => !p.isMe));

  private pendingSectionSet = signal<Set<string>>(new Set());
  readonly pendingSections = computed(() => Array.from(this.pendingSectionSet()));

  isReadOnly(): boolean {
    return !this.auth.isEntityMember() || this.submissionStatus() === 'submitted';
  }

  canSubmit(): boolean {
    return (
      !this.isReadOnly() &&
      this.responsible.trim().length > 0 &&
      this.activities.some(a => a.title?.trim())
    );
  }

  presenceFor(section: string): string[] {
    return this.presence()
      .filter(p => p.section === section && !p.isMe)
      .map(p => p.name);
  }

  private saveTimers: Record<string, any> = {};
  private presencePollInterval: any;
  private routeSub?: Subscription;

  ngOnInit() {
    this.routeSub = this.route.params.subscribe(params => {
      const newCode = params['code'];
      if (newCode !== this.entityCode) {
        this.entityCode = newCode;
        if (this.weekId) {
          // Entity changed while weekId is already known — reload without waiting for queryParams
          Object.values(this.saveTimers).forEach(t => clearTimeout(t));
          this.saveTimers = {};
          this.pendingSectionSet.set(new Set());
          clearInterval(this.presencePollInterval);
          this.loadData();
        }
      }
    });
    this.route.queryParams.subscribe(async qp => {
      const paramWeekId = qp['week'] ?? '';
      try {
        const active = await firstValueFrom(this.api.getActiveWeeks());
        this.activeWeeks.set(active ?? []);
        if (paramWeekId) {
          this.weekId = paramWeekId;
        } else if (active?.length) {
          this.weekId = active[0].id;
        }
      } catch {
        this.weekId = paramWeekId;
      }
      if (this.weekId) this.loadData();
      else this.loading.set(false);
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    clearInterval(this.presencePollInterval);
    Object.values(this.saveTimers).forEach(t => clearTimeout(t));
    if (this.weekId) {
      for (const s of ['A', 'B', 'C', 'D']) {
        this.api.releaseLock(this.weekId, this.entityCode, s).subscribe({ error: () => { } });
      }
    }
  }

  async onWeekChange(weekId: string) {
    this.weekId = weekId;
    Object.values(this.saveTimers).forEach(t => clearTimeout(t));
    this.saveTimers = {};
    this.pendingSectionSet.set(new Set());
    clearInterval(this.presencePollInterval);
    await this.loadData();
  }

  private async loadData() {
    this.loading.set(true);
    try {
      const [sub, wk, refs, cats, themes] = await Promise.all([
        firstValueFrom(this.api.getSubmission(this.weekId, this.entityCode)),
        firstValueFrom(this.api.getWeek(this.weekId)),
        firstValueFrom(this.api.getActivityRefs(this.entityCode)),
        firstValueFrom(this.api.getRiskCategories()),
        firstValueFrom(this.api.getRiskThemes()),
      ]);
      this.activityRefs.set(refs ?? []);
      this.riskCategories.set(cats ?? []);
      this.riskThemes.set(themes ?? []);
      this.submission.set(sub);
      this.week.set(wk);
      const chiefName = (sub.entityChiefName as string | null)?.trim() ?? '';
      const savedResponsible = (sub.responsible as string | null)?.trim() ?? '';
      this.responsible = chiefName || savedResponsible;
      this.submissionDate = sub.submissionDate ?? '';
      this.activities = sub.activities?.length ? [...sub.activities] : [createEmptyActivity()];
      this.plannedActivities = sub.plannedActivities?.length ? [...sub.plannedActivities] : [createEmptyPlannedActivity()];
      this.riskPoints = sub.riskPoints?.length ? [...sub.riskPoints] : [createEmptyRiskPoint()];

      if (!this.isReadOnly()) {
        this.pollPresence();
        this.presencePollInterval = setInterval(() => this.pollPresence(), 15000);
        if (chiefName && chiefName !== savedResponsible) this.onFieldChange('A');
      }
    } catch (err: any) {
      console.error('Error loading data: - entity-form.component.ts:973', err);
      this.snackBar.open('Erreur de chargement', 'OK', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async pollPresence() {
    try {
      const locks = await firstValueFrom(this.api.getLocks(this.weekId, this.entityCode)) ?? [];
      const myId = this.auth.currentUser()?.id;
      const p: Presence[] = locks.map((l: any) => ({
        section: l.section,
        name: l.lockedBy ? `${l.lockedBy.firstName} ${l.lockedBy.lastName}` : '—',
        isMe: l.lockedById === myId,
      }));
      this.presence.set(p);
    } catch { /* ignore */ }
  }

  onFieldChange(section: string) {
    if (this.isReadOnly()) return;
    this.pendingSectionSet.update(s => new Set([...s, section]));
    clearTimeout(this.saveTimers[section]);
    this.saveTimers[section] = setTimeout(() => this.saveSection(section), 3000);
  }

  private async saveSection(section: string) {
    if (!this.weekId) return;
    let data: any;
    if (section === 'A') data = { responsible: this.responsible, submissionDate: this.submissionDate };
    if (section === 'B') data = { activities: this.activities };
    if (section === 'C') data = { plannedActivities: this.plannedActivities };
    if (section === 'D') data = { riskPoints: this.riskPoints };
    if (!data) return;

    this.savingSection.set(section);
    try {
      await firstValueFrom(this.api.saveSection(this.weekId, this.entityCode, section, data));
      this.lastSavedAt = new Date();
      this.pendingSectionSet.update(s => { const n = new Set(s); n.delete(section); return n; });
      await this.pollPresence();
    } catch (err: any) {
      this.snackBar.open(err.error?.message ?? 'Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    } finally {
      this.savingSection.set(null);
    }
  }

  async submitForm() {
    if (!this.canSubmit()) return;
    for (const s of ['A', 'B', 'C', 'D']) {
      clearTimeout(this.saveTimers[s]);
      if (this.pendingSectionSet().has(s)) await this.saveSection(s);
    }
    this.submitting.set(true);
    try {
      await firstValueFrom(this.api.submitEntity(this.weekId, this.entityCode));
      this.submission.update(s => ({ ...s, status: 'submitted', submittedAt: new Date().toISOString() }));
      this.snackBar.open('Bulletin soumis avec succès !', 'OK', { duration: 4000 });
    } catch (err: any) {
      this.snackBar.open(err.error?.message ?? 'Erreur lors de la soumission', 'OK', { duration: 3000 });
    } finally {
      this.submitting.set(false);
    }
  }

  async reopenSubmission() {
    this.reopening.set(true);
    try {
      await firstValueFrom(this.api.reopenSubmission(this.weekId, this.entityCode));
      this.submission.update(s => ({ ...s, status: 'draft', submittedAt: null }));
      this.snackBar.open('Saisie réouverte', 'OK', { duration: 3000 });
      this.presencePollInterval = setInterval(() => this.pollPresence(), 15000);
    } catch {
      this.snackBar.open('Erreur lors de la réouverture', 'OK', { duration: 3000 });
    } finally {
      this.reopening.set(false);
    }
  }

  private setSuggestFromEvent(section: string, rowIdx: number, act: any, event: Event, val: string) {
    const el = event.target as HTMLElement;
    const rect = el.getBoundingClientRect();
    const all = this.activityRefs();
    const items = val.trim()
      ? all.filter(r => r.title.toLowerCase().includes(val.trim().toLowerCase()))
      : all;
    if (items.length) {
      this.activeSuggest.set({ section, rowIdx, items, act });
      this.suggestRect.set({ top: rect.bottom, left: rect.left, width: rect.width });
    } else {
      this.activeSuggest.set(null);
    }
  }

  openSuggest(section: string, rowIdx: number, act: any, event: Event) {
    if (this.isReadOnly()) return;
    this.setSuggestFromEvent(section, rowIdx, act, event, act.title ?? '');
  }

  onTitleChange(section: string, rowIdx: number, act: any, event: Event) {
    this.onFieldChange(section);
    this.setSuggestFromEvent(section, rowIdx, act, event, act.title ?? '');
  }

  selectTitle(act: any, item: any, section: string) {
    act.title = item.title;
    this.activeSuggest.set(null);
    this.suggestRect.set(null);
    this.onFieldChange(section);
  }

  closeSuggest() {
    setTimeout(() => { this.activeSuggest.set(null); this.suggestRect.set(null); }, 160);
  }

  addActivity() { this.activities.push(createEmptyActivity()); this.onFieldChange('B'); }
  removeActivity(i: number) { if (this.activities.length > 1) { this.activities.splice(i, 1); this.onFieldChange('B'); } }
  addPlanned() { this.plannedActivities.push(createEmptyPlannedActivity()); this.onFieldChange('C'); }
  removePlanned(i: number) { if (this.plannedActivities.length > 1) { this.plannedActivities.splice(i, 1); this.onFieldChange('C'); } }
  addRisk() { this.riskPoints.push(createEmptyRiskPoint()); this.onFieldChange('D'); }
  removeRisk(i: number) { if (this.riskPoints.length > 1) { this.riskPoints.splice(i, 1); this.onFieldChange('D'); } }

  getCatsForTheme(themeName: string): any[] {
    if (!themeName) return this.riskCategories();
    const theme = this.riskThemes().find(t => t.name === themeName);
    if (!theme) return this.riskCategories();
    return this.riskCategories().filter(c => c.themeId === theme.id);
  }

  onThemeChange(risk: any) {
    risk.category = '';
    this.onFieldChange('D');
  }

  hasDosActivities(): boolean {
    return this.plannedActivities.some(a => a.dosParticipation === '✅ OUI');
  }

  formatTime(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  print() { window.print(); }
}
