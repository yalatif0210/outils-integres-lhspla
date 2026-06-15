import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom, of } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter, NativeDateAdapter } from '@angular/material/core';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending_tpm: 'En attente TPM',
  pending_cop: 'En attente COP',
  cop_approved: 'Approuvé COP',
  pending_dg: 'En attente DG',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#78909c',
  pending_tpm: '#8e24aa',
  pending_cop: '#f57c00',
  cop_approved: '#388e3c',
  pending_dg: '#964909',
  in_progress: '#7b1fa2',
  completed: '#2e7d32',
  cancelled: '#c62828',
};

@Component({
  selector: 'app-mission-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule,
    MatChipsModule, MatCheckboxModule, MatSnackBarModule, MatTooltipModule,
    MatDividerModule, MatDatepickerModule, MatNativeDateModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: DateAdapter, useClass: NativeDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: {
      parse:   { dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' } },
      display: {
        dateInput:             { day: '2-digit', month: '2-digit', year: 'numeric' },
        monthYearLabel:        { month: 'long',  year: 'numeric' },
        dateA11yLabel:         { day: 'numeric', month: 'long', year: 'numeric' },
        monthYearA11yLabel:    { month: 'long',  year: 'numeric' },
      },
    }},
  ],
  template: `
    <div class="form-container">
      <div class="page-header">
        <div class="page-header-inner">
          <button mat-icon-button (click)="router.navigate(['/missions'])">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <mat-icon>flight_takeoff</mat-icon>
          <div>
            <h1>{{isNew() ? 'Nouvelle Demande de Mission' : 'Demande de Mission'}}</h1>
            <p *ngIf="!isNew() && mission()">
              Créée le {{mission().requestDate | date:'dd/MM/yyyy'}}
              par {{mission().initiator?.firstName}} {{mission().initiator?.lastName}}
            </p>
          </div>
          <div class="header-status" *ngIf="!isNew() && mission()">
            <span class="status-badge"
                  [style.background]="statusColor(mission().status)"
                  [style.color]="STATUS_TEXT_COLOR"
                  [style.border-color]="statusColor(mission().status) + '55'">
              {{statusLabel(mission().status)}}
            </span>
          </div>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
      </div>

      <div *ngIf="!loading()" class="form-body">

        <!-- Rejection reason banner -->
        <div class="rejection-banner" *ngIf="mission()?.rejectionReason">
          <mat-icon>info</mat-icon>
          <strong>Motif du rejet :</strong> {{mission().rejectionReason}}
        </div>

        <!-- Section 1 : Informations générales -->
        <mat-card class="form-section">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>description</mat-icon> Informations générales</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Référence / Objet de la mission *</mat-label>
                <input matInput
                       [(ngModel)]="form.object"
                       (ngModelChange)="onActivityInput($event)"
                       [matAutocomplete]="activityAuto"
                       [readonly]="!canEdit()"
                       placeholder="Sélectionnez une activité ou saisissez librement l'objet...">
                <mat-autocomplete #activityAuto (optionSelected)="selectActivity($event.option.value)">
                  <mat-option *ngFor="let a of filteredActivities()" [value]="a.activityCode + ' — ' + a.title">
                    <div class="activity-option">
                      <span class="act-code">{{a.activityCode}}</span>
                      <span class="act-title">{{a.title}}</span>
                    </div>
                  </mat-option>
                </mat-autocomplete>
              </mat-form-field>
              <!-- City chips + autocomplete (when list loaded, editable) -->
              <mat-form-field appearance="outline" class="full-width" *ngIf="cities().length > 0 && canEdit()">
                <mat-label>Lieu(x) de mission *</mat-label>
                <mat-chip-grid #chipGrid>
                  <mat-chip-row *ngFor="let city of selectedCities()" (removed)="removeCity(city)">
                    {{city}}
                    <button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                </mat-chip-grid>
                <input placeholder="Rechercher une ville..."
                       [(ngModel)]="citySearch"
                       [matChipInputFor]="chipGrid"
                       [matChipInputAddOnBlur]="false"
                       [matAutocomplete]="cityAuto">
                <mat-autocomplete #cityAuto (optionSelected)="selectCity($event.option.value)">
                  <mat-option *ngFor="let c of filteredCityList()" [value]="c">{{c}}</mat-option>
                </mat-autocomplete>
              </mat-form-field>
              <!-- City read-only display (when list loaded, not editable) -->
              <mat-form-field appearance="outline" class="full-width" *ngIf="cities().length > 0 && !canEdit()">
                <mat-label>Lieu(x) de mission</mat-label>
                <input matInput [value]="selectedCitiesText()" readonly>
              </mat-form-field>
              <!-- "Autre" free text (when Autre is selected) -->
              <mat-form-field appearance="outline" class="full-width" *ngIf="cities().length > 0 && selectedCities().includes('Autre')">
                <mat-label>Autre lieu (préciser)</mat-label>
                <input matInput [(ngModel)]="otherLocation" [readonly]="!canEdit()" placeholder="Saisir les lieux supplémentaires...">
              </mat-form-field>
              <!-- Fallback text input (no cities configured) -->
              <mat-form-field appearance="outline" class="full-width" *ngIf="cities().length === 0">
                <mat-label>Lieu(x) de mission *</mat-label>
                <input matInput [(ngModel)]="form.location" placeholder="Ville(s), région(s)..." [readonly]="!canEdit()">
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Section 2 : Dates -->
        <mat-card class="form-section">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>calendar_today</mat-icon> Dates</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Date de départ *</mat-label>
                <input matInput [matDatepicker]="pickerDep"
                       [ngModel]="departureDateObj"
                       (dateChange)="form.departureDate = dateToStr($event.value); departureDateObj = $event.value"
                       [disabled]="!canEdit()">
                <mat-datepicker-toggle matIconSuffix [for]="pickerDep" [disabled]="!canEdit()"></mat-datepicker-toggle>
                <mat-datepicker #pickerDep></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Date de retour *</mat-label>
                <input matInput [matDatepicker]="pickerRet"
                       [ngModel]="returnDateObj"
                       (dateChange)="onReturnDateChange($event.value)"
                       [disabled]="!canEdit()">
                <mat-datepicker-toggle matIconSuffix [for]="pickerRet" [disabled]="!canEdit()"></mat-datepicker-toggle>
                <mat-datepicker #pickerRet></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Date de reprise (auto)</mat-label>
                <input matInput [matDatepicker]="pickerRes"
                       [ngModel]="resumeDateObj"
                       disabled>
                <mat-datepicker-toggle matIconSuffix [for]="pickerRes" disabled></mat-datepicker-toggle>
                <mat-datepicker #pickerRes></mat-datepicker>
                <mat-hint>1er jour ouvrable après le retour</mat-hint>
              </mat-form-field>
              <!-- Moyen de transport : select si liste configurée, sinon input libre -->
              <mat-form-field appearance="outline" *ngIf="transportModes().length > 0">
                <mat-label>Moyen de transport</mat-label>
                <mat-select [(ngModel)]="form.transportMode" [disabled]="!canEdit()">
                  <mat-option value="">— Sélectionner —</mat-option>
                  <mat-option *ngFor="let t of transportModes()" [value]="t">{{t}}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" *ngIf="transportModes().length === 0">
                <mat-label>Moyen de transport</mat-label>
                <input matInput [(ngModel)]="form.transportMode" [readonly]="!canEdit()" placeholder="Ex: Véhicule NPSP, Avion...">
                <mat-hint>Configurer la liste dans Admin → Listes configurables</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Section 3 : Financement -->
        <mat-card class="form-section">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>account_balance_wallet</mat-icon> Financement</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Fonds *</mat-label>
                <input matInput
                       [value]="fundInputValue()"
                       (input)="onFundInput($any($event.target).value)"
                       [matAutocomplete]="fundAuto"
                       [readonly]="!canEdit()"
                       placeholder="Rechercher ou créer un fonds...">
                <mat-autocomplete #fundAuto (optionSelected)="onFundSelected($event.option.value)">
                  <mat-option *ngFor="let f of filteredFunds()" [value]="f.id">
                    {{f.code}} — {{f.name}}
                  </mat-option>
                  <mat-option *ngIf="canCreateFund()" value="__CREATE_FUND__">
                    <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">add_circle_outline</mat-icon>
                    Créer « {{_fundSearch()}} »
                  </mat-option>
                </mat-autocomplete>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Budget *</mat-label>
                <mat-select [(ngModel)]="form.budgetId" [disabled]="!canEdit()">
                  <mat-option value="">— Sélectionner un budget —</mat-option>
                  <mat-option value="__INVITATION__">
                    <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">card_giftcard</mat-icon>
                    Invitation
                  </mat-option>
                  <mat-option *ngFor="let b of budgets()" [value]="b.id">
                    {{b.title}} — {{b.createdAt | date:'dd/MM/yyyy'}}
                  </mat-option>
                  <mat-option value="__MANUAL__">
                    <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">edit_note</mat-icon>
                    Référence manuelle (budget non listé)
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width" *ngIf="form.budgetId === '__MANUAL__' && canEdit()">
                <mat-label>Référence budgétaire *</mat-label>
                <input matInput [(ngModel)]="form.manualBudgetRef" placeholder="Ex: PEPFAR-2026-Q3, A005-FY26...">
              </mat-form-field>
              <div class="manual-budget-display" *ngIf="form.budgetId === '__MANUAL__' && !canEdit() && form.manualBudgetRef">
                <mat-icon>edit_note</mat-icon>
                <span>Réf. manuelle : <strong>{{form.manualBudgetRef}}</strong></span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Section 4 : Participants -->
        <mat-card class="form-section">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>people</mat-icon> Participants</h3>

            <!-- Mode édition -->
            <ng-container *ngIf="canEdit()">
              <mat-form-field appearance="outline" class="full-width participants-field">
                <mat-label>Sélectionner les participants</mat-label>
                <mat-select [ngModel]="participantIds()" (ngModelChange)="participantIds.set($event)" multiple panelClass="participants-panel">
                  <mat-select-trigger>
                    <span *ngIf="participantIds().length === 0" class="select-placeholder">Aucun participant sélectionné</span>
                    <span *ngIf="participantIds().length > 0">
                      {{participantIds().length}} participant{{participantIds().length > 1 ? 's' : ''}} sélectionné{{participantIds().length > 1 ? 's' : ''}}
                    </span>
                  </mat-select-trigger>
                  <mat-option *ngFor="let p of personnel()" [value]="p.id">
                    <div class="personnel-option">
                      <span class="pers-name">{{p.fullName}}</span>
                      <span class="pers-detail">{{p.function}} · {{p.service}}</span>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <div class="participants-list" *ngIf="selectedParticipants().length > 0">
                <div class="participant-row" *ngFor="let p of selectedParticipants()">
                  <mat-icon>person</mat-icon>
                  <div class="participant-info">
                    <strong>{{p.fullName}}</strong>
                    <span>{{p.function}} · {{p.service}}</span>
                  </div>
                  <span class="wave-badge" *ngIf="p.waveNumber">
                    <mat-icon>phone</mat-icon> {{p.waveNumber}}
                  </span>
                </div>
              </div>
              <div class="empty-participants" *ngIf="selectedParticipants().length === 0">
                <mat-icon>people_outline</mat-icon>
                <span>Aucun participant sélectionné</span>
              </div>
            </ng-container>

            <!-- Mode lecture -->
            <ng-container *ngIf="!canEdit()">
              <ng-container *ngIf="mission()?.participants?.length > 0; else noParticipants">
                <div class="participants-list">
                  <div class="participant-row" *ngFor="let mp of mission().participants">
                    <mat-icon>person</mat-icon>
                    <div class="participant-info">
                      <strong>{{mp.personnel?.fullName}}</strong>
                      <span>{{mp.personnel?.function}} · {{mp.personnel?.service}}</span>
                    </div>
                    <span class="wave-badge" *ngIf="mp.personnel?.waveNumber">
                      <mat-icon>phone</mat-icon> {{mp.personnel?.waveNumber}}
                    </span>
                  </div>
                </div>
              </ng-container>
              <ng-template #noParticipants>
                <div class="empty-participants">
                  <mat-icon>people_outline</mat-icon>
                  <span>Aucun participant</span>
                </div>
              </ng-template>
            </ng-container>
          </mat-card-content>
        </mat-card>

        <!-- Section COP Review (COP / super_admin only, status = pending_cop) -->
        <mat-card class="form-section review-section" *ngIf="showCopReview()">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>how_to_reg</mat-icon> Avis du Chef de Parti</h3>
            <div class="review-actions">
              <mat-form-field appearance="outline" class="full-width" *ngIf="copDecision === 'cancelled'">
                <mat-label>Motif du rejet</mat-label>
                <textarea matInput [(ngModel)]="copRejectionReason" rows="2" placeholder="Expliquer pourquoi..."></textarea>
              </mat-form-field>
              <div class="review-btns">
                <button mat-raised-button class="btn-approve"
                        (click)="copDecision='cop_approved'; copReview()" [disabled]="saving()">
                  <mat-icon>check_circle</mat-icon> Approuver
                </button>
                <button mat-raised-button color="warn"
                        (click)="onCopRejectClick()" [disabled]="saving()">
                  <mat-icon>{{copDecision==='cancelled' ? 'send' : 'cancel'}}</mat-icon>
                  {{copDecision === 'cancelled' ? 'Confirmer le rejet' : 'Rejeter'}}
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Section Document signé (visible dès génération docs) -->
        <mat-card class="form-section signed-doc-section" *ngIf="hasDocuments()">
          <mat-card-content>
            <h3 class="section-title"><mat-icon>upload_file</mat-icon> Document signé</h3>
            <div class="signed-doc-body">
              <div class="signed-doc-existing" *ngIf="mission()?.signedDocPath">
                <mat-icon class="signed-doc-icon">check_circle</mat-icon>
                <span>Document importé ({{mission()?.signedDocExt?.toUpperCase()}})</span>
                <button mat-stroked-button class="btn-dl-signed" (click)="downloadSignedDoc()">
                  <mat-icon>download</mat-icon> Télécharger / Voir
                </button>
              </div>
              <div class="signed-doc-hint" *ngIf="!mission()?.signedDocPath">
                <mat-icon>info_outline</mat-icon>
                <span>Aucun document signé importé.</span>
              </div>
              <div class="signed-doc-upload" *ngIf="canUploadSignedDoc()">
                <label class="upload-label">
                  <input type="file" accept=".pdf,.jpeg,.jpg,.png"
                         (change)="uploadSignedDoc($event)" [disabled]="signedDocUploading()"
                         style="display:none" #signedDocInput>
                  <button mat-raised-button class="btn-upload-signed"
                          [disabled]="signedDocUploading()"
                          (click)="signedDocInput.click()">
                    <mat-icon>{{signedDocUploading() ? 'hourglass_empty' : 'upload'}}</mat-icon>
                    {{signedDocUploading() ? 'Import en cours...' : (mission()?.signedDocPath ? 'Remplacer le document' : 'Importer le document signé')}}
                  </button>
                </label>
                <span class="upload-hint">PDF, JPEG, PNG ou JPG — max 20 Mo</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

      </div>

      <!-- Footer actions -->
      <div class="form-footer" *ngIf="!loading()">
        <div class="footer-left">
          <button mat-stroked-button color="warn" (click)="cancel()"
                  *ngIf="canCancel()" [disabled]="saving()">
            <mat-icon>cancel</mat-icon> Annuler la mission
          </button>
        </div>
        <div class="footer-right">
          <button mat-stroked-button (click)="router.navigate(['/missions'])" [disabled]="saving()">
            Retour
          </button>

          <button mat-raised-button (click)="save()" [disabled]="saving() || !formValid()"
                  *ngIf="canEdit()">
            <mat-icon>save</mat-icon> {{saving() ? 'Enregistrement...' : 'Enregistrer brouillon'}}
          </button>

          <button mat-raised-button color="primary" (click)="submit()" [disabled]="saving() || !formValid()"
                  *ngIf="canSubmit()">
            <mat-icon>send</mat-icon> {{saving() ? 'Envoi...' : 'Soumettre'}}
          </button>

          <button mat-raised-button class="btn-gen-docs" (click)="generateDocs()" [disabled]="saving()"
                  *ngIf="canGenerateDocs()">
            <mat-icon>picture_as_pdf</mat-icon> Générer documents
          </button>

          <button mat-raised-button class="btn-validate-dg" (click)="validateDg()" [disabled]="saving()"
                  *ngIf="canValidateDg()">
            <mat-icon>verified</mat-icon> Validé par DG
          </button>

          <button mat-stroked-button class="btn-dl-dm" (click)="downloadDoc('dm')"
                  *ngIf="hasDocuments()">
            <mat-icon>description</mat-icon> Télécharger DM
          </button>
          <button mat-stroked-button class="btn-dl-odm" (click)="downloadDoc('odm')"
                  *ngIf="hasDocuments()">
            <mat-icon>article</mat-icon> Télécharger ODM
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-container { padding:0; display:flex; flex-direction:column; min-height:100vh; }
    .page-header { background:linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; }
    .page-header-triband { height:6px; background:linear-gradient(to right,#F4A623 33.3%,#fff 33.3% 66.6%,#1F8A3C 66.6%); }
    .page-header-inner { display:flex; align-items:center; gap:10px; padding:14px 20px; }
    .page-header-inner mat-icon { font-size:26px; width:26px; height:26px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.1rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.75; font-size:.8rem; }
    .header-status { margin-left:auto; }

    .status-badge { display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border-radius:12px; font-size:.82rem; font-weight:700; border:1px solid transparent; }

    .loading-state { text-align:center; padding:60px; color:#888; }
    .loading-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; }

    .form-body { flex:1; padding:16px 20px; display:flex; flex-direction:column; gap:14px; }

    .rejection-banner { display:flex; align-items:center; gap:8px; padding:12px 16px; background:#ffebee; border-left:4px solid #c62828; border-radius:4px; color:#c62828; font-size:.88rem; }
    .rejection-banner mat-icon { color:#c62828; }
    .tpm-review-section { border-color:#8e24aa !important; background:#f9f0ff !important; }

    .form-section { border-radius:10px !important; border:1px solid #e0e0e0 !important; }
    .section-title { display:flex; align-items:center; gap:8px; margin:0 0 16px; font-size:.97rem; font-weight:700; color:#1F4E79; }
    .section-title mat-icon { font-size:20px; width:20px; height:20px; }

    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .full-width { grid-column:1/-1; }

    .participants-list { display:flex; flex-direction:column; gap:8px; margin-top:10px; }
    .participant-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:8px; border:1px solid #e8eef5; }
    .participant-row mat-icon { color:#2E75B6; }
    .participant-info { flex:1; }
    .participant-info strong { display:block; font-size:.9rem; color:#1F4E79; }
    .participant-info span { font-size:.8rem; color:#666; }
    .wave-badge { display:flex; align-items:center; gap:3px; font-size:.78rem; color:#555; background:#fff3e0; padding:2px 8px; border-radius:10px; }
    .wave-badge mat-icon { font-size:13px; width:13px; height:13px; }
    .empty-participants { display:flex; align-items:center; gap:8px; color:#aaa; font-size:.85rem; padding:8px 0; }
    .empty-participants mat-icon { font-size:18px; width:18px; height:18px; }
    .select-placeholder { color:#aaa; font-style:italic; font-size:.88rem; }
    .participants-field ::ng-deep .mat-mdc-select-value { min-height:24px; }
    .personnel-option { display:flex; flex-direction:column; line-height:1.35; padding:2px 0; }
    .pers-name { font-weight:600; font-size:.92rem; color:#1F4E79; }
    .pers-detail { font-size:.78rem; color:#777; }
    .activity-option { display:flex; flex-direction:column; line-height:1.35; padding:2px 0; }
    .act-code { font-weight:700; font-size:.82rem; color:#1F4E79; }
    .act-title { font-size:.8rem; color:#555; }

    .review-section { border-left:4px solid #1976d2 !important; }
    .review-actions { display:flex; flex-direction:column; gap:12px; }
    .review-btns { display:flex; gap:10px; }
    .btn-approve { background:#388e3c !important; color:#fff !important; }

    .form-footer { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; background:#fff; border-top:1px solid #e0e0e0; position:sticky; bottom:0; z-index:10; box-shadow:0 -2px 8px rgba(0,0,0,.06); }
    .footer-right { display:flex; gap:8px; flex-wrap:wrap; }
    .btn-gen-docs { background:#1976d2 !important; color:#fff !important; }
    .btn-validate-dg { background:#2e7d32 !important; color:#fff !important; }
    .btn-dl-dm { border-color:#1976d2 !important; color:#1976d2 !important; }
    .btn-dl-odm { border-color:#2e7d32 !important; color:#2e7d32 !important; }

    .signed-doc-section { border-left:4px solid #7b1fa2 !important; }
    .signed-doc-body { display:flex; flex-direction:column; gap:12px; }
    .signed-doc-existing { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#f3e5f5; border-radius:8px; }
    .signed-doc-icon { color:#7b1fa2; }
    .signed-doc-hint { display:flex; align-items:center; gap:8px; color:#aaa; font-size:.85rem; }
    .signed-doc-upload { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .upload-label { display:contents; }
    .btn-upload-signed { background:#7b1fa2 !important; color:#fff !important; }
    .btn-dl-signed { border-color:#7b1fa2 !important; color:#7b1fa2 !important; margin-left:auto; }
    .upload-hint { font-size:.78rem; color:#888; }
    .manual-budget-display { display:flex; align-items:center; gap:8px; font-size:.85rem; color:#555; grid-column:1/-1; padding:4px 0; }
    .manual-budget-display mat-icon { font-size:18px; width:18px; height:18px; color:#1F4E79; }

    @media (max-width:640px) {
      .form-grid { grid-template-columns:1fr; }
      .full-width { grid-column:1; }
    }
  `]
})
export class MissionFormComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  snack = inject(MatSnackBar);

  mission = signal<any | null>(null);
  loading = signal(true);
  saving = signal(false);

  personnel = signal<any[]>([]);
  funds = signal<any[]>([]);
  budgets = signal<any[]>([]);
  activityRefs = signal<any[]>([]);
  cities = signal<string[]>([]);
  transportModes = signal<string[]>([]);
  selectedCities = signal<string[]>([]);
  otherLocation = '';
  citySearch = '';

  STATUS_TEXT_COLOR = 'white';

  private _activitySearch = signal('');
  _fundSearch = signal('');

  filteredActivities = computed(() => {
    const q = this._activitySearch().toLowerCase();
    const list = this.activityRefs();
    if (!q) return list;
    return list.filter((a: any) =>
      (a.activityCode ?? '').toLowerCase().includes(q) ||
      (a.title ?? '').toLowerCase().includes(q)
    );
  });

  filteredFunds = computed(() => {
    const q = this._fundSearch().toLowerCase();
    if (!q) return this.funds();
    return this.funds().filter((f: any) =>
      (f.name ?? '').toLowerCase().includes(q) ||
      (f.code ?? '').toLowerCase().includes(q)
    );
  });

  fundInputValue = computed(() => {
    if (this.form.fundId) {
      const f = this.funds().find((f: any) => f.id === this.form.fundId);
      if (f) return `${f.code} — ${f.name}`;
    }
    return this._fundSearch();
  });

  canCreateFund = computed(() => {
    const q = this._fundSearch().trim();
    if (!q || !this.canEdit()) return false;
    return !this.funds().some((f: any) =>
      f.name.toLowerCase() === q.toLowerCase() || f.code.toLowerCase() === q.toLowerCase()
    );
  });

  form: {
    object: string; location: string;
    departureDate: string; returnDate: string; resumeDate: string;
    fundId: string; budgetId: string; activityRefId: string;
    transportMode: string; manualBudgetRef: string;
  } = { object: '', location: '', departureDate: '', returnDate: '', resumeDate: '', fundId: '', budgetId: '', activityRefId: '', transportMode: '', manualBudgetRef: '' };

  selectedCitiesText = computed(() => {
    const selected = this.selectedCities().filter(c => c !== 'Autre');
    const parts = [...selected];
    if (this.selectedCities().includes('Autre') && this.otherLocation) parts.push(this.otherLocation);
    return parts.join(', ');
  });

  filteredCityList = computed(() => {
    const q = this.citySearch.toLowerCase().trim();
    const selected = this.selectedCities();
    return this.cities()
      .filter(c => !selected.includes(c))
      .filter(c => !q || c.toLowerCase().includes(q));
  });

  participantIds = signal<string[]>([]);

  copDecision: '' | 'cop_approved' | 'cancelled' = '';
  copRejectionReason = '';
  signedDocUploading = signal(false);

  departureDateObj: Date | null = null;
  returnDateObj: Date | null = null;
  resumeDateObj: Date | null = null;

  strToDate(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  dateToStr(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private nextWorkingDay(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
  }

  onReturnDateChange(value: Date | null) {
    this.returnDateObj = value;
    this.form.returnDate = this.dateToStr(value);
    if (value) {
      const resume = this.nextWorkingDay(value);
      this.resumeDateObj = resume;
      this.form.resumeDate = this.dateToStr(resume);
    }
  }

  isNew = computed(() => !this.route.snapshot.params['id']);

  selectedParticipants = computed(() =>
    this.personnel().filter(p => this.participantIds().includes(p.id))
  );

  canEdit = computed(() => {
    const m = this.mission();
    if (this.isNew()) return true;
    if (!m) return false;
    return m.status === 'draft' && m.initiatorId === this.auth.currentUser()?.id;
  });

  canSubmit = computed(() => this.canEdit() && !!this.mission());

  showCopReview = computed(() => {
    const m = this.mission();
    if (!m) return false;
    return m.status === 'pending_cop' && this.auth.hasAnyRole('chief_of_party', 'super_admin');
  });

  canGenerateDocs = computed(() => {
    const m = this.mission();
    if (!m) return false;
    return m.status === 'cop_approved' && this.auth.hasAnyRole('assistant_direction', 'super_admin');
  });

  canValidateDg = computed(() => {
    const m = this.mission();
    if (!m) return false;
    return m.status === 'pending_dg' && this.auth.hasAnyRole('assistant_direction', 'super_admin');
  });

  hasDocuments = computed(() => {
    const m = this.mission();
    if (!m) return false;
    return ['pending_dg', 'in_progress', 'completed'].includes(m.status);
  });

  canUploadSignedDoc = computed(() => {
    const m = this.mission();
    if (!m) return false;
    return this.auth.hasAnyRole('assistant_direction', 'super_admin');
  });

  canCancel = computed(() => {
    const m = this.mission();
    if (!m || this.isNew()) return false;
    const userId = this.auth.currentUser()?.id;
    if (['cancelled', 'completed'].includes(m.status)) return false;
    if (m.status === 'draft') return m.initiatorId === userId;
    return this.auth.hasAnyRole('super_admin', 'admin_system', 'assistant_direction', 'chief_of_party');
  });

  selectCity(city: string) {
    if (!this.selectedCities().includes(city)) {
      this.selectedCities.update(l => [...l, city]);
    }
    this.citySearch = '';
  }

  removeCity(city: string) {
    this.selectedCities.update(l => l.filter(c => c !== city));
    if (city === 'Autre') this.otherLocation = '';
  }

  formValid() {
    const hasBudget = this.form.budgetId === '__INVITATION__'
      || (this.form.budgetId === '__MANUAL__' && !!this.form.manualBudgetRef.trim())
      || (!!this.form.budgetId && this.form.budgetId !== '__MANUAL__');
    const hasLocation = this.cities().length > 0
      ? (this.selectedCities().some(c => c !== 'Autre') || (this.selectedCities().includes('Autre') && !!this.otherLocation.trim()))
      : !!this.form.location.trim();
    return this.form.object.trim() && hasLocation
      && this.form.departureDate && this.form.returnDate
      && this.form.fundId && hasBudget;
  }

  statusLabel(s: string) { return STATUS_LABELS[s] ?? s; }
  statusColor(s: string) { return STATUS_COLORS[s] ?? '#78909c'; }

  private showError(context: string, err: any) {
    // err.error.message = string | string[] après correction du GlobalExceptionFilter
    // Fallbacks pour robustesse
    const raw = err?.error?.message
      ?? (err?.error?.message as any)?.message  // ancien format doublement imbriqué
      ?? err?.message
      ?? err?.statusText;
    let detail: string;
    if (raw == null || raw === '') {
      detail = err?.status ? `Erreur HTTP ${err.status}` : 'Erreur inattendue';
    } else if (Array.isArray(raw)) {
      detail = raw.join(' · ');
    } else {
      detail = String(raw);
    }
    this.snack.open(`${context} : ${detail}`, 'OK', { duration: 5000 });
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    const entityCode = this.auth.entityCode();
    let activitiesReq;
    if (entityCode) {
      activitiesReq = this.api.getActivityRefs(entityCode);
    } else if (this.auth.hasAnyRole('chief_of_party', 'admin_tpm')) {
      activitiesReq = of<any[]>([]);
    } else {
      activitiesReq = this.api.getAllActivityRefs();
    }

    Promise.all([
      firstValueFrom(this.api.getPersonnel()),
      firstValueFrom(this.api.getFinancingFunds()),
      firstValueFrom(this.api.getBudgets()),
      firstValueFrom(activitiesReq),
      firstValueFrom(this.api.getConfigListByType('cities')).catch(() => []),
      firstValueFrom(this.api.getConfigListByType('transport_modes')).catch(() => []),
    ]).then(([personnel, funds, budgets, activityRefs, citiesData, transportData]) => {
      this.personnel.set(personnel);
      this.funds.set(funds);
      this.budgets.set(budgets.filter((b: any) => ['approved', 'mission_cop'].includes(b.status)));
      this.activityRefs.set(activityRefs);
      this.cities.set((citiesData as any[]).map((i: any) => i.value));
      this.transportModes.set((transportData as any[]).map((i: any) => i.value));
    }).catch(() => {});

    if (id) {
      this.api.getMission(id).subscribe({
        next: m => {
          this.mission.set(m);
          const depStr = m.departureDate?.substring(0, 10) ?? '';
          const retStr = m.returnDate?.substring(0, 10) ?? '';
          const resStr = m.resumeDate?.substring(0, 10) ?? '';
          const isManualBudget = !m.isInvitation && !m.budgetId && !!m.manualBudgetRef;
          this.form = {
            object: m.object,
            location: m.location ?? '',
            departureDate: depStr,
            returnDate: retStr,
            resumeDate: resStr,
            fundId: m.fundId ?? '',
            budgetId: m.isInvitation ? '__INVITATION__' : (isManualBudget ? '__MANUAL__' : (m.budgetId ?? '')),
            activityRefId: m.activityRefId ?? '',
            transportMode: m.transportMode ?? '',
            manualBudgetRef: m.manualBudgetRef ?? '',
          };
          // Populate city multi-select from stored location string
          if (m.location) {
            const parts = m.location.split(',').map((s: string) => s.trim()).filter(Boolean);
            const knownCities = this.cities();
            if (knownCities.length > 0) {
              const recognized = parts.filter((p: string) => knownCities.includes(p));
              const others = parts.filter((p: string) => !knownCities.includes(p));
              if (others.length > 0) { recognized.push('Autre'); this.otherLocation = others.join(', '); }
              this.selectedCities.set(recognized);
            } else {
              this.selectedCities.set(parts);
            }
          }
          this.participantIds.set(m.participants?.map((mp: any) => mp.personnelId) ?? []);
          this.departureDateObj = this.strToDate(depStr);
          this.returnDateObj = this.strToDate(retStr);
          this.resumeDateObj = this.strToDate(resStr);
          this._activitySearch.set(m.object ?? '');
          this.loading.set(false);
        },
        error: () => {
          this.snack.open('Mission introuvable', 'OK', { duration: 3000 });
          this.router.navigate(['/missions']);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  private buildPayload() {
    const isInvitation = this.form.budgetId === '__INVITATION__';
    const isManualBudget = this.form.budgetId === '__MANUAL__';
    const locationParts = this.cities().length > 0
      ? this.selectedCities().filter(c => c !== 'Autre')
      : [this.form.location.trim()];
    if (this.cities().length > 0 && this.selectedCities().includes('Autre') && this.otherLocation.trim())
      locationParts.push(this.otherLocation.trim());
    const location = locationParts.join(', ') || this.form.location.trim();
    return {
      object:          this.form.object.trim(),
      location,
      departureDate:   this.form.departureDate,
      returnDate:      this.form.returnDate,
      resumeDate:      this.form.resumeDate,
      fundId:          this.form.fundId,
      budgetId:        (isInvitation || isManualBudget) ? undefined : (this.form.budgetId || undefined),
      activityRefId:   this.form.activityRefId || undefined,
      participantIds:  this.participantIds(),
      isInvitation,
      transportMode:   this.form.transportMode || undefined,
      manualBudgetRef: isManualBudget ? (this.form.manualBudgetRef.trim() || undefined) : undefined,
    };
  }

  async save() {
    this.saving.set(true);
    const payload = this.buildPayload();
    try {
      const id = this.route.snapshot.params['id'];
      if (id) {
        const updated = await firstValueFrom(this.api.updateMission(id, payload));
        this.mission.set(updated);
        this.snack.open('Mission sauvegardée', 'OK', { duration: 2500 });
      } else {
        const created = await firstValueFrom(this.api.createMission(payload));
        this.snack.open('Mission créée', 'OK', { duration: 2500 });
        this.router.navigate(['/missions', created.id]);
      }
    } catch (err: any) {
      this.showError('Impossible de sauvegarder la demande', err);
    } finally {
      this.saving.set(false);
    }
  }

  async submit() {
    if (!this.formValid()) return;
    const id = this.route.snapshot.params['id'];
    if (!id) { await this.save(); return; }
    this.saving.set(true);
    try {
      // Persiste le formulaire (participants inclus) avant de changer le statut
      await firstValueFrom(this.api.updateMission(id, this.buildPayload()));
      const updated = await firstValueFrom(this.api.submitMission(id));
      this.mission.set(updated);
      this.snack.open('Mission soumise', 'OK', { duration: 2500 });
    } catch (err: any) {
      this.showError('Soumission impossible', err);
    } finally {
      this.saving.set(false);
    }
  }

  onCopRejectClick() {
    if (this.copDecision === 'cancelled') {
      this.copReview();
    } else {
      this.copDecision = 'cancelled';
    }
  }

  async copReview() {
    const id = this.route.snapshot.params['id'];
    if (!id || !this.copDecision) return;
    const decision = this.copDecision;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.copReviewMission(id, {
        decision,
        rejectionReason: this.copRejectionReason || undefined,
      }));
      this.mission.set(updated);
      this.copDecision = '';
      this.copRejectionReason = '';
      this.snack.open(decision === 'cop_approved' ? 'Mission approuvée par le COP' : 'Mission rejetée', 'OK', { duration: 2500 });
    } catch (err: any) {
      this.showError('Erreur avis COP', err);
    } finally {
      this.saving.set(false);
    }
  }

  async generateDocs() {
    const id = this.route.snapshot.params['id'];
    if (!id) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.generateMissionDocs(id));
      this.mission.set(updated);
      this.snack.open('Documents générés — mission en attente DG', 'OK', { duration: 3000 });
    } catch (err: any) {
      this.showError('Génération des documents impossible', err);
    } finally {
      this.saving.set(false);
    }
  }

  async validateDg() {
    const id = this.route.snapshot.params['id'];
    if (!id) return;
    if (!confirm('Confirmer la validation par le Directeur Général ?')) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.validateMissionDg(id));
      this.mission.set(updated);
      this.snack.open('Mission validée — en cours', 'OK', { duration: 2500 });
    } catch (err: any) {
      this.showError('Validation DG impossible', err);
    } finally {
      this.saving.set(false);
    }
  }

  async cancel() {
    const id = this.route.snapshot.params['id'];
    if (!id || !confirm('Annuler cette demande de mission ?')) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.cancelMission(id));
      this.mission.set(updated);
      this.snack.open('Mission annulée', 'OK', { duration: 2500 });
    } catch (err: any) {
      this.showError('Annulation impossible', err);
    } finally {
      this.saving.set(false);
    }
  }

  onActivityInput(value: string) {
    this.form.object = value;
    this.form.activityRefId = '';
    this._activitySearch.set(value);
  }

  selectActivity(label: string) {
    this.form.object = label;
    const found = this.activityRefs().find(
      (a: any) => `${a.activityCode} — ${a.title}` === label
    );
    this.form.activityRefId = found?.id ?? '';
    this._activitySearch.set(label);
  }

  // ── Gestion fonds ───────────────────────────────────────────────────────────

  onFundInput(value: string) {
    this.form.fundId = '';
    this._fundSearch.set(value);
  }

  async onFundSelected(value: string) {
    if (value === '__CREATE_FUND__') {
      await this.createNewFund();
    } else {
      this.form.fundId = value;
      const f = this.funds().find((f: any) => f.id === value);
      this._fundSearch.set(f ? `${f.code} — ${f.name}` : value);
    }
  }

  async createNewFund() {
    const name = this._fundSearch().trim();
    if (!name) return;
    const code = window.prompt(`Code du fonds pour « ${name} » (ex: USAID, PEPFAR, IDA) :`)?.trim().toUpperCase();
    if (!code) return;
    try {
      const newFund = await firstValueFrom(this.api.createFinancingFund({ name, code, isActive: true }));
      this.funds.update(list => [...list, newFund]);
      this.form.fundId = newFund.id;
      this._fundSearch.set(`${newFund.code} — ${newFund.name}`);
      this.snack.open(`Fonds « ${newFund.code} — ${newFund.name} » créé`, 'OK', { duration: 2500 });
    } catch (err: any) {
      this.showError('Impossible de créer le fonds', err);
    }
  }

  async uploadSignedDoc(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const id = this.route.snapshot.params['id'];
    if (!id) return;
    const formData = new FormData();
    formData.append('file', file);
    this.signedDocUploading.set(true);
    try {
      const updated = await firstValueFrom(this.api.uploadMissionSignedDoc(id, formData));
      this.mission.update(m => m ? { ...m, signedDocPath: updated.signedDocPath, signedDocExt: updated.signedDocExt } : m);
      this.snack.open('Document signé importé avec succès', 'OK', { duration: 3000 });
    } catch (err: any) {
      this.showError('Import document signé', err);
    } finally {
      this.signedDocUploading.set(false);
      input.value = '';
    }
  }

  async downloadSignedDoc() {
    const id = this.route.snapshot.params['id'];
    if (!id) return;
    const ext = this.mission()?.signedDocExt ?? 'pdf';
    try {
      const blob = await firstValueFrom(this.api.downloadMissionSignedDoc(id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_${this.mission()?.object?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) ?? id}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Erreur lors du téléchargement du document signé', 'OK', { duration: 3000 });
    }
  }

  async downloadDoc(docType: 'dm' | 'odm') {
    const id = this.route.snapshot.params['id'];
    if (!id) return;
    try {
      const blob = await firstValueFrom(this.api.downloadMissionDoc(id, docType));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType.toUpperCase()}_${this.mission()?.object?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) ?? id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Erreur lors du téléchargement', 'OK', { duration: 3000 });
    }
  }
}
