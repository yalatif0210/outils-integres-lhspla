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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { AppConfigService } from '../../../services/app-config.service';
import {
  BUDGET_TEMPLATES, BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS,
  BudgetRow, computeAmounts, SECTION_NATURE_MAP,
  BUDGET_STATUS_ENUMERATION,
  CustomBudgetRow, buildRowsWithCustoms, parseCustomRowsFromLines,
} from '../budget-templates';
import { BudgetRecallComponent } from '../budget-recall/budget-recall.component';
import { PaymentRequestComponent } from '../payment-request/payment-request.component';
import { BudgetMemoComponent } from '../budget-memo/budget-memo.component';

interface LineData {
  designation: string;
  unitCost: number | null;
  quantity: number | null;
  frequency: number | null;
  costItemId: string | null;
}


type DisplayRow = BudgetRow | { rowKey: string; type: 'hidden_placeholder'; label: string };

@Component({
  selector: 'app-budget-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule,
    BudgetRecallComponent,
    PaymentRequestComponent,
    BudgetMemoComponent,
  ],
  template: `
    <div class="form-container">
      <div class="page-header">
        <div class="page-header-inner">
          <button mat-icon-button (click)="router.navigate(['/budgets'])"><mat-icon>arrow_back</mat-icon></button>
          <mat-icon>account_balance_wallet</mat-icon>
          <div>
            <h1>{{isNew() ? 'Nouveau budget' : budget()?.title}}</h1>
            <p *ngIf="!isNew()">
              {{typeLabel(budget()?.budgetType)}} ·
              <span class="status-badge" [style.background]="statusColor(budget()?.status)">{{statusLabel(budget()?.status)}}</span>
            </p>
          </div>
          <div class="header-actions" *ngIf="!isNew()">
            <!-- Actions budget approuvé -->
            <ng-container *ngIf="budget()?.status === 'approved'">
              <button mat-raised-button class="btn-pdf" (click)="exportPDF()">
                <mat-icon>picture_as_pdf</mat-icon> Exporter PDF
              </button>
              <button mat-raised-button class="btn-cloture" (click)="cloturerBudget()"
                      *ngIf="canCloturer()" [disabled]="saving()">
                <mat-icon>lock</mat-icon> Clôturer
              </button>
            </ng-container>
            <!-- Actions budget clôturé -->
            <ng-container *ngIf="budget()?.status === 'cloture'">
              <button mat-raised-button class="btn-archive-zip" (click)="downloadArchiveZip()" [disabled]="saving()">
                <mat-icon>folder_zip</mat-icon> Télécharger archive ZIP
              </button>
              <button mat-raised-button class="btn-declassifier" (click)="declassifierBudget()"
                      *ngIf="canDeclassifier()" [disabled]="saving()">
                <mat-icon>lock_open</mat-icon> Déclassifier
              </button>
            </ng-container>
          </div>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
      </div>

      <div class="form-body" *ngIf="!loading()">

        <!-- Méta éditable -->
        <mat-card class="meta-card" *ngIf="isNew() || canEdit()">
          <mat-card-content>
            <div class="meta-grid">

              <mat-form-field appearance="outline" *ngIf="isNew()">
                <mat-label>Type de budget</mat-label>
                <mat-select [(ngModel)]="newType" (ngModelChange)="onTypeChange($event)">
                  <mat-option *ngFor="let t of budgetTypes" [value]="t.value">{{t.label}}</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Référence activité : combobox datalist (identique bulletin B/C/D) -->
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Référence activité</mat-label>
                <input matInput list="actref-datalist"
                       [ngModel]="editTitle"
                       (ngModelChange)="onActivityInput($event)"
                       placeholder="Sélectionner ou saisir...">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Fonds de financement</mat-label>
                <mat-select [(ngModel)]="editFundId">
                  <mat-option *ngFor="let f of funds()" [value]="f.id">{{f.name}} ({{f.code}})</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Date probable d'exécution</mat-label>
                <input matInput type="date" [(ngModel)]="editProbableExecutionDate">
              </mat-form-field>

              <!-- Taux de change : éditable uniquement par admin_finance/super_admin -->
              <mat-form-field appearance="outline" class="narrow" *ngIf="canEditRates()">
                <mat-label>Taux de change (FCFA/USD)</mat-label>
                <input matInput type="number" [(ngModel)]="editExchangeRate" min="1" placeholder="655">
                <mat-icon matSuffix>currency_exchange</mat-icon>
              </mat-form-field>
              <div class="rate-readonly" *ngIf="!canEditRates()">
                <mat-icon>currency_exchange</mat-icon>
                <span>1 USD = <strong>{{editExchangeRate}}</strong> FCFA</span>
              </div>

              <!-- Taux frais transfert : CONTRACTUALISATION uniquement -->
              <mat-form-field appearance="outline" class="narrow"
                              *ngIf="isContractualisation() && canEditRates()">
                <mat-label>Frais de transfert (%)</mat-label>
                <input matInput type="number" [(ngModel)]="editTransferFeeRate"
                       min="0" max="100" step="0.5" placeholder="5">
                <span matSuffix>%</span>
              </mat-form-field>
              <div class="rate-readonly" *ngIf="isContractualisation() && !canEditRates()">
                <mat-icon>percent</mat-icon>
                <span>Frais transfert : <strong>{{editTransferFeeRate}}%</strong></span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Méta lecture seule -->
        <mat-card class="meta-card" *ngIf="!isNew() && !canEdit()">
          <mat-card-content>
            <div class="meta-readonly">
              <div class="meta-item"><mat-icon>title</mat-icon><span>{{budget()?.title}}</span></div>
              <div class="meta-item"><mat-icon>category</mat-icon><span>{{typeLabel(budget()?.budgetType)}}</span></div>
              <div class="meta-item"><mat-icon>account_balance</mat-icon><span>{{budget()?.fund?.name}}</span></div>
              <div class="meta-item" *ngIf="auth.canReviewBudget()">
                <mat-icon>apartment</mat-icon><span>{{budget()?.entityCode}}</span>
              </div>
              <div class="meta-item"><mat-icon>currency_exchange</mat-icon><span>1 USD = {{editExchangeRate}} FCFA</span></div>
              <div class="meta-item" *ngIf="isContractualisation()">
                <mat-icon>percent</mat-icon><span>Frais transfert : {{editTransferFeeRate}}%</span>
              </div>
              <div class="meta-item" *ngIf="budget()?.probableExecutionDate">
                <mat-icon>event</mat-icon><span>Exécution prévue : {{budget()?.probableExecutionDate | date:'dd/MM/yyyy'}}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Tableau budget -->
        <div class="table-wrapper" *ngIf="displayRows().length > 0">
          <table class="budget-table">
            <thead>
              <tr>
                <th class="col-num">N°</th>
                <th class="col-desig">DÉSIGNATIONS</th>
                <th class="col-num-field">Coût unit. (FCFA)</th>
                <th class="col-num-field">Quantité</th>
                <th class="col-num-field">Fréquence</th>
                <th class="col-total">Montant FCFA</th>
                <th class="col-total">Montant USD</th>
                <th class="col-del" *ngIf="canEdit()"></th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let row of displayRows()">

                  <!-- Placeholder ligne masquée -->
                <tr *ngIf="row.type === 'hidden_placeholder'" class="row-hidden-item">
                  <td></td>
                  <td colspan="5" class="hidden-cell">
                    <mat-icon class="hidden-icon">visibility_off</mat-icon>
                    <span class="hidden-label">{{row.label}}</span>
                  </td>
                  <td></td>
                  <td class="del-cell">
                    <button class="btn-restore" (click)="showRow(row.rowKey)" title="Afficher cette ligne">
                      <mat-icon>visibility</mat-icon>
                    </button>
                  </td>
                </tr>

                <!-- En-tête de section -->
                <tr *ngIf="row.type === 'section_header' && canShow(row, amounts())" class="row-section-header">
                  <td class="num-cell">{{asBudgetRow(row).num}}</td>
                  <td [attr.colspan]="canEdit() ? 7 : 6" class="section-label">
                    <span class="section-label-text">{{row.label}}</span>
                    <button *ngIf="canEdit()" class="btn-section-toggle"
                            (click)="toggleSection(row.rowKey)"
                            [title]="collapsedSections().has(row.rowKey) ? 'Déplier la section' : 'Replier la section'">
                      <mat-icon>{{collapsedSections().has(row.rowKey) ? 'chevron_right' : 'expand_more'}}</mat-icon>
                    </button>
                  </td>
                </tr>

                <!-- Sous-en-tête -->
                <tr *ngIf="row.type === 'sub_header' && canShow(row, amounts())" class="row-sub-header">
                  <td></td>
                  <td [attr.colspan]="canEdit() ? 7 : 6" class="sub-label">{{row.label}}</td>
                </tr>

                <!-- Ligne poste -->
                <tr *ngIf="row.type === 'item' && canShow(row, amounts())" class="row-item">
                  <td></td>
                  <td class="desig-cell">
                    <ng-container *ngIf="canEdit()">
                      <input class="cell-input desig-input"
                             [attr.list]="rowNatureMap().get(row.rowKey) ? 'ci-datalist-' + natureId(rowNatureMap().get(row.rowKey)!) : 'ci-datalist'"
                             [ngModel]="lineMap()[row.rowKey]?.designation ?? asBudgetRow(row).label"
                             (change)="onDesignationChange(row.rowKey, $any($event.target).value, $any($event.target))"
                             placeholder="Sélectionner dans la liste...">
                    </ng-container>
                    <span *ngIf="!canEdit()">{{lineMap()[row.rowKey]?.designation || row.label}}</span>
                  </td>
                  <td class="num-cell">
                    <input *ngIf="canEdit()" type="number" class="cell-input num-input"
                           [class.locked-cost]="!!lineMap()[row.rowKey]?.costItemId"
                           [readonly]="!!lineMap()[row.rowKey]?.costItemId"
                           [title]="lineMap()[row.rowKey]?.costItemId ? 'Coût verrouillé (issu de la grille)' : ''"
                           [ngModel]="lineMap()[row.rowKey]?.unitCost"
                           (ngModelChange)="updateLine(row.rowKey, 'unitCost', +$event || null)"
                           min="0" placeholder="0">
                    <span *ngIf="!canEdit()">{{fmt(lineMap()[row.rowKey]?.unitCost)}}</span>
                  </td>
                  <td class="num-cell">
                    <input *ngIf="canEdit()" type="number" class="cell-input num-input"
                           [ngModel]="lineMap()[row.rowKey]?.quantity"
                           (ngModelChange)="updateLine(row.rowKey, 'quantity', +$event || null)"
                           min="0" placeholder="0">
                    <span *ngIf="!canEdit()">{{fmt(lineMap()[row.rowKey]?.quantity)}}</span>
                  </td>
                  <td class="num-cell">
                    <input *ngIf="canEdit()" type="number" class="cell-input num-input"
                           [ngModel]="lineMap()[row.rowKey]?.frequency"
                           (ngModelChange)="updateLine(row.rowKey, 'frequency', +$event || null)"
                           min="0" placeholder="0">
                    <span *ngIf="!canEdit()">{{fmt(lineMap()[row.rowKey]?.frequency)}}</span>
                  </td>
                  <td class="amount-cell">{{fmtAmount(amounts()[row.rowKey])}}</td>
                  <td class="amount-cell usd">{{fmtUSD(amounts()[row.rowKey])}}</td>
                  <td class="del-cell" *ngIf="canEdit()">
                    <div class="row-actions">
                      <button class="btn-action-sm btn-hide"
                              (click)="hideRow(row.rowKey)"
                              title="Masquer cette ligne">
                        <mat-icon>visibility_off</mat-icon>
                      </button>
                      <button class="btn-action-sm btn-add-below"
                              (click)="addCustomRow(row.rowKey, rowSectionMap().get(row.rowKey) || '')"
                              title="Insérer un poste en dessous"
                              [disabled]="!rowSectionMap().has(row.rowKey)">
                        <mat-icon>add</mat-icon>
                      </button>
                      <button *ngIf="isCustomRow(row.rowKey)" class="del-btn"
                              (click)="removeCustomRow(row.rowKey)" title="Supprimer">×</button>
                    </div>
                  </td>
                </tr>

                <!-- Sous-total / total de section -->
                <tr *ngIf="(row.type === 'subtotal' || row.type === 'total_section') && canShow(row, amounts())"
                    class="row-subtotal" [class.row-total]="row.type === 'total_section'">
                  <td></td>
                  <td class="desig-cell total-label">{{row.label}}</td>
                  <td colspan="3"></td>
                  <td class="amount-cell">{{fmtAmount(amounts()[row.rowKey])}}</td>
                  <td class="amount-cell usd">{{fmtUSD(amounts()[row.rowKey])}}</td>
                  <td *ngIf="canEdit()"></td>
                </tr>

                <!-- Taxe -->
                <tr *ngIf="row.type === 'tax' && canShow(row, amounts())" class="row-tax">
                  <td></td>
                  <td class="desig-cell tax-label">{{row.label}}</td>
                  <td colspan="3"></td>
                  <td class="amount-cell">{{fmtAmount(amounts()[row.rowKey])}}</td>
                  <td class="amount-cell usd">{{fmtUSD(amounts()[row.rowKey])}}</td>
                  <td *ngIf="canEdit()"></td>
                </tr>

                <!-- Grand total -->
                <tr *ngIf="row.type === 'grand_total'" class="row-grand-total">
                  <td class="num-cell">TOTAL</td>
                  <td class="desig-cell grand-label">{{row.label}}</td>
                  <td colspan="3"></td>
                  <td class="amount-cell grand-amount">{{fmtAmount(amounts()[row.rowKey])}}</td>
                  <td class="amount-cell usd grand-amount">{{fmtUSD(amounts()[row.rowKey])}}</td>
                  <td *ngIf="canEdit()"></td>
                </tr>

              </ng-container>
            </tbody>
          </table>
        </div>

        <!-- Datalists (natif HTML — même pattern que bulletin B/C/D) -->
        <datalist id="actref-datalist">
          <option *ngFor="let r of activityRefs()"
                  [value]="r.title"
                  [label]="r.taskId ? r.taskId + ' — ' + r.title : r.title">
          </option>
        </datalist>
        <!-- Datalist global (fallback pour CONTRACTUALISATION) -->
        <datalist id="ci-datalist">
          <option *ngFor="let ci of costItems()" [value]="ci.designation"
                  [label]="ci.nature + ' · ' + ci.designation">
          </option>
        </datalist>
        <!-- Datalists filtrées par nature de section -->
        <ng-container *ngFor="let nature of uniqueNatures()">
          <datalist [id]="'ci-datalist-' + natureId(nature)">
            <option *ngFor="let ci of costItemsForNature(nature)" [value]="ci.designation"
                    [label]="ci.designation">
            </option>
          </datalist>
        </ng-container>

        <!-- Rappels / Pièces justificatives -->
        <app-budget-recall
          *ngIf="!isNew() && budget()?.status === 'approved'"
          [budgetId]="budget()!.id"
          [budgetStatus]="budget()!.status"
          [budgetEntityCode]="budget()!.entityCode"
          [budgetLines]="budget()!.lines ?? []"
          [lineAmounts]="lineAmountsById()">
        </app-budget-recall>

        <!-- TDR (Termes de Référence) -->
        <mat-card class="tdr-card" *ngIf="!isNew()">
          <mat-card-content>
            <div class="tdr-row">
              <mat-icon class="tdr-icon">description</mat-icon>
              <div class="tdr-info">
                <strong>Termes de Référence (TDR) <span class="tdr-required">*</span></strong>
                <span *ngIf="budget()?.tdrFilePath" class="tdr-ok">
                  <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle">check_circle</mat-icon> Fichier joint
                </span>
                <span *ngIf="!budget()?.tdrFilePath" class="tdr-missing">
                  Requis pour soumettre le budget
                </span>
              </div>
              <button mat-stroked-button *ngIf="budget()?.tdrFilePath" (click)="downloadTdr()" class="btn-tdr-dl">
                <mat-icon>download</mat-icon> Télécharger TDR
              </button>
              <label class="btn-tdr-upload" *ngIf="canUploadTdr()">
                <mat-icon>upload_file</mat-icon>
                {{tdrUploading() ? 'Envoi...' : (budget()?.tdrFilePath ? 'Remplacer' : 'Joindre TDR')}}
                <input type="file" accept=".pdf,.docx" (change)="uploadTdr($event)" [disabled]="tdrUploading()" hidden>
              </label>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- MEMOs budgétaires — conditionné par le flag super_admin -->
        <app-budget-memo
          *ngIf="!isNew() && budget()?.status === 'approved' && memoEnabled()"
          [budgetId]="budget()!.id"
          [budgetTotalAmount]="budget()!.totalAmount">
        </app-budget-memo>

        <!-- Demandes de paiement -->
        <app-payment-request
          *ngIf="!isNew() && budget()?.status === 'approved'"
          [budgetId]="budget()!.id"
          [budgetEntityCode]="budget()!.entityCode"
          [budgetTotalAmount]="budget()!.totalAmount">
        </app-payment-request>

        <!-- Actions : édition -->
        <div class="actions-bar" *ngIf="canEdit() || isNew()">
          <button mat-stroked-button (click)="router.navigate(['/budgets'])">Annuler</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
            <mat-icon>save</mat-icon> {{saving() ? 'Enregistrement...' : 'Enregistrer'}}
          </button>
          <button mat-raised-button class="btn-submit" (click)="submitBudget()"
                  [disabled]="saving() || isNew() || !budget()?.tdrFilePath" *ngIf="!isNew()"
                  [matTooltip]="!budget()?.tdrFilePath ? 'Veuillez joindre le TDR avant de soumettre' : 'Soumettre pour approbation'">
            <mat-icon>send</mat-icon> Soumettre
          </button>
        </div>

        <!-- Actions : soumission depuis vue lecture seule -->
        <div class="actions-bar"
             *ngIf="!isNew() && budget()?.status === 'draft' && !canEdit() && auth.isEntityMember() && budget()?.entityCode === auth.entityCode()">
          <button mat-raised-button class="btn-submit"
                  (click)="submitBudget()" [disabled]="saving() || !budget()?.tdrFilePath"
                  [matTooltip]="!budget()?.tdrFilePath ? 'Veuillez joindre le TDR avant de soumettre' : ''">
            <mat-icon>send</mat-icon> {{saving() ? 'En cours...' : 'Soumettre pour approbation'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-container { padding: 0; }

    .page-header { background: linear-gradient(135deg, #1F4E79 0%, #2E75B6 100%); color: #fff; position: relative; }
    .page-header-triband { height: 6px; background: linear-gradient(to right, #F4A623 33.3%, #fff 33.3% 66.6%, #1F8A3C 66.6%); }
    .page-header-inner { display: flex; align-items: center; gap: 12px; padding: 16px 20px; }
    .page-header-inner mat-icon { font-size: 28px; width: 28px; height: 28px; opacity: .9; }
    .page-header-inner h1 { margin: 0; font-size: 1.25rem; font-weight: 700; }
    .page-header-inner p { margin: 0; opacity: .85; font-size: .82rem; }
    .header-actions { margin-left: auto; display: flex; gap: 8px; }
    .btn-pdf          { background: #C00000 !important; color: #fff !important; }
    .btn-cloture      { background: #4A1942 !important; color: #fff !important; }
    .btn-archive-zip  { background: #1B5E20 !important; color: #fff !important; }
    .btn-declassifier { background: #E65100 !important; color: #fff !important; }
    .status-badge { padding: 1px 8px; border-radius: 10px; font-size: .75rem; font-weight: 600; color: #fff; }

    .loading-state { text-align: center; padding: 60px; color: #888; }
    .loading-state mat-icon { font-size: 48px; display: block; margin: 0 auto 12px; }

    .form-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }

    .meta-card mat-card-content { padding: 16px !important; }
    .meta-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
    .meta-grid mat-form-field { flex: 1; min-width: 200px; }
    .meta-grid .wide { flex: 2; min-width: 260px; }
    .meta-grid .narrow { flex: 0 0 210px; min-width: 160px; }
    .rate-readonly {
      display: flex; align-items: center; gap: 6px;
      color: #555; font-size: .9rem; padding: 0 4px; height: 56px;
    }
    .rate-readonly mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2E75B6; }

    .meta-readonly { display: flex; flex-wrap: wrap; gap: 16px; }
    .meta-item { display: flex; align-items: center; gap: 6px; font-size: .9rem; }
    .meta-item mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2E75B6; }

    /* ─── Tableau ─── */
    .table-wrapper { border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden; }
    .budget-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .budget-table thead tr { background: linear-gradient(90deg, #1F4E79, #2E75B6); color: #fff; }
    .budget-table thead th { padding: 8px 10px; text-align: center; font-weight: 600; white-space: nowrap; }
    .col-desig { text-align: left !important; min-width: 240px; }
    .col-num { width: 40px; }
    .col-num-field { width: 110px; }
    .col-total { width: 130px; }
    .col-del { width: 30px; }

    .row-section-header { background: #1F4E79; color: #fff; }
    .row-section-header .num-cell { font-weight: 700; text-align: center; padding: 6px 8px; }
    .row-section-header td.section-label { padding: 0; }

    .row-sub-header { background: #d0e4f7; }
    .sub-label { padding: 4px 10px; font-weight: 600; color: #1F4E79; font-size: .8rem; font-style: italic; }

    .row-item { background: #fff; }
    .row-item:hover { background: #f5f9ff; }
    .row-item td { border-bottom: 1px solid #f0f0f0; }
    .desig-cell { padding: 4px 8px; }
    .num-cell { text-align: center; padding: 4px 6px; }
    .amount-cell { text-align: right; padding: 4px 10px; font-family: monospace; font-size: .8rem; }
    .amount-cell.usd { color: #666; }
    .del-cell { padding: 0 4px; text-align: center; }

    /* Input inline — même style que bulletin B/C/D */
    .cell-input {
      border: none; background: transparent; width: 100%;
      font-size: .82rem; font-family: inherit; outline: none; padding: 2px 0;
    }
    .cell-input:focus { border-bottom: 2px solid #2E75B6; }
    .desig-input { width: 100%; }
    .num-input { text-align: right; width: 100%; }
    .num-input[readonly] { color: #666; cursor: default; }
    .num-input.locked-cost { background:#eef4fb; color:#1F4E79; font-weight:600; cursor:not-allowed; border-bottom:1px solid #aab8c9 !important; }
    .del-btn {
      border: none; background: none; color: #C00000; font-size: 16px; font-weight: 700;
      cursor: pointer; padding: 0 3px; line-height: 1; border-radius: 3px;
    }
    .del-btn:hover { background: #fff0f0; }

    /* Actions groupées par ligne */
    .row-actions { display: flex; align-items: center; gap: 1px; }
    .btn-action-sm {
      border: none; background: none; cursor: pointer; padding: 1px;
      border-radius: 3px; display: flex; align-items: center; justify-content: center;
      opacity: 0.35; transition: opacity .12s;
    }
    .btn-action-sm mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .btn-hide mat-icon { color: #888; }
    .btn-add-below mat-icon { color: #2E75B6; }
    .btn-hide:hover { background: #f0f0f0; }
    .btn-add-below:hover { background: #e3eef9; }
    /* Bouton restaurer ligne masquée — toujours visible */
    .btn-restore {
      border: none; background: none; cursor: pointer; padding: 1px;
      border-radius: 3px; display: flex; align-items: center; justify-content: center;
    }
    .btn-restore mat-icon { color: #2E75B6; font-size: 15px; width: 15px; height: 15px; }
    .btn-restore:hover { background: #e3eef9; }
    /* Afficher les boutons à pleine opacité au survol de la ligne */
    .row-item:hover .btn-action-sm { opacity: 1; }

    /* Ligne masquée */
    .row-hidden-item td { border-bottom: 1px solid #f0f0f0; background: #fafafa; }
    .hidden-cell {
      display: flex; align-items: center; gap: 6px; padding: 3px 8px;
      color: #aaa; font-size: .75rem; font-style: italic;
    }
    .hidden-icon { font-size: 14px; width: 14px; height: 14px; color: #ccc; }
    .hidden-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }

    /* En-tête section avec toggle collapse */
    .section-label { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; }
    .section-label-text { font-weight: 700; letter-spacing: .5px; text-transform: uppercase; font-size: .82rem; flex: 1; }
    .btn-section-toggle {
      border: none; background: rgba(255,255,255,.15); color: #fff; cursor: pointer;
      padding: 1px 4px; border-radius: 4px; display: flex; align-items: center;
      transition: background .12s; flex-shrink: 0;
    }
    .btn-section-toggle:hover { background: rgba(255,255,255,.3); }
    .btn-section-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .row-subtotal { background: #e8f0fb; }
    .row-subtotal td { border-top: 1px solid #c5d8f0; }
    .row-total { background: #c5d8f0; }
    .row-total .total-label { font-weight: 700; color: #1F4E79; padding: 6px 10px; }

    .row-tax { background: #f9f9f9; }
    .tax-label { padding: 3px 10px; color: #555; font-style: italic; font-size: .79rem; }

    .row-grand-total { background: linear-gradient(90deg, #1F4E79, #2E75B6); color: #fff; }
    .row-grand-total td { padding: 10px; }
    .row-grand-total .grand-label { font-weight: 700; text-transform: uppercase; letter-spacing: .5px; font-size: .85rem; }
    .row-grand-total .grand-amount { font-size: 1rem; font-weight: 700; }

    .tdr-card { border-radius: 10px !important; border: 1px solid #DEEAF1 !important; }
    .tdr-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .tdr-icon { color: #1F4E79; font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; }
    .tdr-info { flex: 1; display: flex; flex-direction: column; }
    .tdr-info strong { font-size: 13px; color: #1F4E79; }
    .tdr-required { color: #c62828; font-size: 14px; }
    .tdr-ok { font-size: 11px; color: #276221; display: flex; align-items: center; gap: 3px; }
    .tdr-missing { font-size: 11px; color: #c62828; font-weight: 600; }
    .btn-tdr-dl { font-size: 12px; }
    .btn-tdr-upload {
      display: inline-flex; align-items: center; gap: 6px;
      background: #1F4E79; color: #fff; border: none; border-radius: 6px;
      padding: 6px 14px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .btn-tdr-upload:hover { background: #163d61; }
    .btn-tdr-upload mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .actions-bar { display: flex; gap: 10px; justify-content: flex-end; padding: 8px 0; }
    .btn-submit { background: #1F8A3C !important; color: #fff !important; }
    .btn-submit:disabled { opacity: .6; }
  `]
})
export class BudgetFormComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  snack = inject(MatSnackBar);
  appConfig = inject(AppConfigService);

  budget = signal<any>(null);
  funds = signal<any[]>([]);
  costItems = signal<any[]>([]);
  activityRefs = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  tdrUploading = signal(false);
  memoEnabled = signal(false);

  canUploadTdr = computed(() => {
    const b = this.budget();
    if (!b || this.isNew()) return false;
    return this.auth.isSuperAdmin() || this.auth.entityCode() === b.entityCode;
  });

  isNew = signal(false);
  newType = 'ATELIER';
  editTitle = '';
  editFundId = '';
  editActivityRefId = '';
  editExchangeRate = 655;
  editTransferFeeRate = 5;
  editProbableExecutionDate = '';
  tvaRate = 0.18;
  tdtRate = 0.025;

  lineMap = signal<Record<string, LineData>>({});
  customRows = signal<CustomBudgetRow[]>([]);
  hiddenRows = signal<Set<string>>(new Set());
  collapsedSections = signal<Set<string>>(new Set());
  private customLineCount = 0;

  BUDGET_STATUS = BUDGET_STATUS_ENUMERATION as any;

  // Lignes template + postes personnalisés insérés à leur position exacte
  rows = computed<BudgetRow[]>(() => {
    const type = this.isNew() ? this.newType : this.budget()?.budgetType;
    return buildRowsWithCustoms(BUDGET_TEMPLATES[type] ?? [], this.customRows());
  });

  // Taux TVA/TDT et frais transfert appliqués dynamiquement
  effectiveRows = computed<BudgetRow[]>(() => {
    const type = this.isNew() ? this.newType : this.budget()?.budgetType;
    return this.rows().map(r => {
      if (r.rowKey.endsWith('_tva')) return { ...r, taxRate: this.tvaRate };
      if (r.rowKey.endsWith('_tdt')) return { ...r, taxRate: this.tdtRate };
      if (type === 'CONTRACTUALISATION' && r.rowKey === 'transfert_frais')
        return { ...r, taxRate: this.editTransferFeeRate / 100 };
      return r;
    });
  });

  // Span de chaque section (section_header.rowKey → rowKeys des lignes de la section)
  sectionSpans = computed<Map<string, string[]>>(() => {
    const spans = new Map<string, string[]>();
    const rs = this.rows();
    let currentKey: string | null = null;
    let acc: string[] = [];
    for (const row of rs) {
      if (row.type === 'section_header') {
        if (currentKey) spans.set(currentKey, acc);
        currentKey = row.rowKey;
        acc = [];
      } else if (currentKey) {
        acc.push(row.rowKey);
      }
    }
    if (currentKey) spans.set(currentKey, acc);
    return spans;
  });

  // rowKey (toute ligne) → clé du total_section de sa section
  rowToSectionTotalMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const [headerKey, rowKeys] of this.sectionSpans()) {
      const totalKey = headerKey.replace(/_header$/, '_total');
      map.set(headerKey, totalKey);
      for (const rowKey of rowKeys) map.set(rowKey, totalKey);
    }
    return map;
  });

  // Carte rowKey → sectionKey (premier agrégat englobant : subtotal > total_section > grand_total)
  rowSectionMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    const rs = this.rows();
    for (let i = 0; i < rs.length; i++) {
      if (rs[i].type === 'item') {
        for (let j = i + 1; j < rs.length; j++) {
          if (rs[j].type === 'subtotal' || rs[j].type === 'total_section' || rs[j].type === 'grand_total') {
            map.set(rs[i].rowKey, rs[j].rowKey);
            break;
          }
        }
      }
    }
    return map;
  });

  // Maps item rowKey → grille nature (for per-section cost-item datalist filtering)
  rowNatureMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    let currentSectionKey: string | null = null;
    for (const row of this.rows()) {
      if (row.type === 'section_header') {
        currentSectionKey = row.rowKey;
      } else if (row.type === 'item' && currentSectionKey) {
        const nature = SECTION_NATURE_MAP[currentSectionKey];
        if (nature) map.set(row.rowKey, nature);
      }
    }
    // Custom rows: inherit nature from their sectionKey (total_section rowKey)
    // sectionKey for a custom row is the total_section rowKey of the enclosing section
    // We resolve nature by finding which section_header leads to that total_section
    for (const cr of this.customRows()) {
      if (!map.has(cr.rowKey)) {
        // Try finding nature via sectionKey as a section_header key first
        const directNature = SECTION_NATURE_MAP[cr.sectionKey];
        if (directNature) {
          map.set(cr.rowKey, directNature);
        } else {
          // sectionKey is a total_section key — find the section_header that precedes it
          const rows = this.rows();
          const totalIdx = rows.findIndex(r => r.rowKey === cr.sectionKey);
          if (totalIdx > 0) {
            for (let i = totalIdx - 1; i >= 0; i--) {
              if (rows[i].type === 'section_header') {
                const nature = SECTION_NATURE_MAP[rows[i].rowKey];
                if (nature) { map.set(cr.rowKey, nature); break; }
                break;
              }
            }
          }
        }
      }
    }
    return map;
  });

  uniqueNatures = computed<string[]>(() => {
    const s = new Set<string>();
    for (const n of this.rowNatureMap().values()) s.add(n);
    return [...s];
  });

  natureId(nature: string): string {
    return nature.replace(/[^a-zA-Z0-9]/g, '_');
  }

  costItemsForNature(nature: string) {
    return this.costItems().filter(ci => ci.nature === nature);
  }

  // Affichage : respecte masquage individuel et collapse de section
  displayRows = computed<DisplayRow[]>(() => {
    const rs = this.rows();
    const hidden = this.hiddenRows();
    const collapsed = this.collapsedSections();
    const spans = this.sectionSpans();

    // Ensemble de toutes les lignes masquées par un collapse de section
    const hiddenBySection = new Set<string>();
    for (const sk of collapsed) {
      for (const k of (spans.get(sk) ?? [])) hiddenBySection.add(k);
    }

    if (!this.canEdit()) {
      // Mode lecture : masquer les lignes sans données chiffrées (montant nul)
      const amts = this.amounts();
      return rs.filter(r => {
        if (hiddenBySection.has(r.rowKey) || hidden.has(r.rowKey)) return false;
        if (r.type === 'item') return (amts[r.rowKey] ?? 0) > 0;
        return true;
      });
    }

    // Mode édition : lignes masquées → placeholder
    return rs
      .filter(r => !hiddenBySection.has(r.rowKey))
      .map(r => {
        if (r.type === 'item' && hidden.has(r.rowKey)) {
          const label = this.lineMap()[r.rowKey]?.designation || r.label || '(poste personnalisé)';
          return { rowKey: r.rowKey, type: 'hidden_placeholder' as const, label };
        }
        return r;
      });
  });

  amounts = computed(() => computeAmounts(this.effectiveRows(), this.lineMap()));

  lineAmountsById = computed(() => {
    const result: Record<string, number> = {};
    for (const line of this.budget()?.lines ?? []) {
      result[line.id] = this.amounts()[line.rowKey] ?? 0;
    }
    return result;
  });

  budgetTypes = Object.entries(BUDGET_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  isContractualisation = computed(() =>
    (this.isNew() ? this.newType : this.budget()?.budgetType) === 'CONTRACTUALISATION'
  );

  canEdit() {
    if (this.isNew()) return true;
    const b = this.budget();
    return this.auth.isEntityMember()
      && b
      && (b.status === this.BUDGET_STATUS.DRAFT || b.status === this.BUDGET_STATUS.REJECTED)
      && b.entityCode === this.auth.entityCode();
  }
  canView() { return !!this.budget(); }
  canEditRates() { return this.auth.isAdminFinance() || this.auth.isSuperAdmin(); }
  isCustomRow(rowKey: string) { return rowKey.startsWith('custom_'); }

  canShow(row: DisplayRow, amounts: Record<string, number>): boolean {
    const b = this.budget();
    if (!b || b.status !== this.BUDGET_STATUS.APPROVED) return true;

    const sectionKey = this.rowToSectionTotalMap().get(row.rowKey) ?? '';
    const sectionTotal = amounts[sectionKey] ?? 0;

    if (sectionTotal <= 0) return false;
    if (row.type === 'section_header') return true;

    return (amounts[row.rowKey] ?? 0) > 0;
  }

  // Cast helpers pour le template
  asBudgetRow(row: DisplayRow) { return row as BudgetRow; }

  typeLabel(t: string) { return BUDGET_TYPE_LABELS[t] ?? t; }
  statusLabel(s: string) { return (BUDGET_STATUS_LABELS[s] as any)?.label ?? s; }
  statusColor(s: string) { return (BUDGET_STATUS_LABELS[s] as any)?.color ?? '#999'; }

  fmt(v: number | null | undefined) { return v != null && v !== 0 ? v : ''; }
  fmtAmount(v: number) {
    if (!v || v === 0) return '-';
    return new Intl.NumberFormat('fr-FR').format(Math.round(v));
  }
  fmtUSD(v: number) {
    const rate = this.editExchangeRate;
    if (!v || v === 0 || !rate) return '-';
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / rate);
  }

  onTypeChange(type: string) {
    this.newType = type;
    this.customRows.set([]);
    this.customLineCount = 0;
    this.hiddenRows.set(new Set());
    this.collapsedSections.set(new Set());
    this.initLineMap(BUDGET_TEMPLATES[type] ?? [], []);
  }

  // Combobox Référence activité : met à jour le titre et essaie de matcher une ref
  onActivityInput(value: string) {
    this.editTitle = value;
    const match = this.activityRefs().find(r => r.title === value);
    this.editActivityRefId = match?.id ?? '';
  }

  updateLine(rowKey: string, field: keyof LineData, value: any) {
    this.lineMap.update(m => ({
      ...m,
      [rowKey]: {
        ...(m[rowKey] ?? { designation: '', unitCost: null, quantity: null, frequency: null, costItemId: null }),
        [field]: value,
      },
    }));
  }

  onDesignationChange(rowKey: string, value: string, inputEl: HTMLInputElement) {
    const nature = this.rowNatureMap().get(rowKey);
    const candidates = nature
      ? this.costItems().filter(ci => ci.nature === nature)
      : this.costItems();
    const ci = candidates.find(c =>
      c.designation.toLowerCase().trim() === value.toLowerCase().trim()
    );
    if (ci) {
      this.lineMap.update(m => ({
        ...m,
        [rowKey]: {
          ...(m[rowKey] ?? { designation: '', unitCost: null, quantity: null, frequency: null, costItemId: null }),
          designation: ci.designation,
          unitCost: ci.unitCost,
          costItemId: ci.id,
        },
      }));
    } else {
      // Saisie libre non reconnue — accepter le texte et effacer costItemId pour débloquer le coût unitaire
      this.lineMap.update(m => ({
        ...m,
        [rowKey]: {
          ...(m[rowKey] ?? { designation: '', unitCost: null, quantity: null, frequency: null, costItemId: null }),
          designation: value,
          costItemId: null,
        },
      }));
    }
  }

  // Insère un poste personnalisé immédiatement avant beforeRowKey
  addCustomRow(beforeRowKey: string, sectionKey: string) {
    if (!sectionKey) return;
    const rowKey = `custom_${sectionKey}_${this.customLineCount++}`;
    this.customRows.update(rs => [
      ...rs,
      { rowKey, label: '', type: 'item', editDesignation: true, sectionKey, insertBeforeKey: beforeRowKey } as CustomBudgetRow,
    ]);
    this.lineMap.update(m => ({
      ...m,
      [rowKey]: { designation: '', unitCost: null, quantity: null, frequency: null, costItemId: null },
    }));
  }

  removeCustomRow(rowKey: string) {
    this.customRows.update(rs => rs.filter(r => r.rowKey !== rowKey));
    this.lineMap.update(m => { const u = { ...m }; delete u[rowKey]; return u; });
  }

  hideRow(rowKey: string) {
    this.hiddenRows.update(s => new Set([...s, rowKey]));
  }

  showRow(rowKey: string) {
    this.hiddenRows.update(s => { const n = new Set(s); n.delete(rowKey); return n; });
  }

  toggleSection(sectionHeaderKey: string) {
    this.collapsedSections.update(s => {
      const n = new Set(s);
      if (n.has(sectionHeaderKey)) n.delete(sectionHeaderKey); else n.add(sectionHeaderKey);
      return n;
    });
  }

  initLineMap(templateRows: BudgetRow[], existingLines: any[]) {
    console.log('Initializing line map with template rows and existing lines - budget-form.component.ts:901', templateRows, existingLines);
    const saved: Record<string, any> = {};
    for (const line of existingLines) saved[line.rowKey] = line;

    const parsed = parseCustomRowsFromLines(existingLines);
    console.log('Parsed custom rows - budget-form.component.ts', parsed);
    this.customRows.set(parsed);
    this.customLineCount = parsed.reduce((m, r) => {
      const n = parseInt(r.rowKey.split('_').pop() ?? '0', 10);
      return isNaN(n) ? m : Math.max(m, n + 1);
    }, 0);

    const newMap: Record<string, LineData> = {};
    for (const row of templateRows) {
      if (row.type === 'item') {
        const e = saved[row.rowKey];
        newMap[row.rowKey] = {
          designation: e?.designation ?? row.label,
          unitCost: e?.unitCost ?? null,
          quantity: e?.quantity ?? null,
          frequency: e?.frequency ?? null,
          costItemId: e?.costItemId ?? null,
        };
      }
    }
    for (const r of parsed) {
      const e = saved[r.rowKey];
      newMap[r.rowKey] = {
        designation: e?.designation ?? '',
        unitCost: e?.unitCost ?? null,
        quantity: e?.quantity ?? null,
        frequency: e?.frequency ?? null,
        costItemId: e?.costItemId ?? null,
      };
    }
    this.lineMap.set(newMap);
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isNew.set(!id);

    try {
      const entityCode = this.auth.entityCode();
      const [funds, config, costItems, actRefs] = await Promise.all([
        firstValueFrom(this.api.getFinancingFunds()),
        firstValueFrom(this.api.getAppConfig()),
        firstValueFrom(this.api.getCostItems(false)),
        firstValueFrom(entityCode
          ? this.api.getActivityRefs(entityCode)
          : this.api.getAllActivityRefs()),
      ]);
      this.funds.set(funds);
      this.costItems.set(costItems);
      this.activityRefs.set(actRefs);

      this.editExchangeRate = parseInt(config['exchange_rate'] ?? '655', 10) || 655;
      this.editTransferFeeRate = Math.round(parseFloat(config['transfer_fee_rate'] ?? '0.05') * 1000) / 10 || 5;
      this.tvaRate = parseFloat(config['tva_rate'] ?? '0.18') || 0.18;
      this.tdtRate = parseFloat(config['tdt_rate'] ?? '0.025') || 0.025;
      // Synchronise AppConfigService et le flag local avec la valeur fraîche du backend
      Object.entries(config).forEach(([k, v]) => this.appConfig.set(k, v));
      this.memoEnabled.set(config['memo_enabled'] === 'true');

      if (id) {
        const b = await firstValueFrom(this.api.getBudget(id));
        this.budget.set(b);
        this.editTitle = b.title;
        this.editFundId = b.fundId;
        this.editActivityRefId = b.activityReferenceId ?? '';
        this.editExchangeRate = b.exchangeRate ?? this.editExchangeRate;
        this.editTransferFeeRate = Math.round((b.transferFeeRate ?? 0.05) * 1000) / 10;
        this.editProbableExecutionDate = b.probableExecutionDate ? b.probableExecutionDate.substring(0, 10) : '';
        this.newType = b.budgetType;
        this.initLineMap(BUDGET_TEMPLATES[b.budgetType] ?? [], b.lines ?? []);
      } else {
        this.initLineMap(BUDGET_TEMPLATES[this.newType] ?? [], []);
        if (funds.length > 0) this.editFundId = funds[0].id;
      }
    } finally {
      this.loading.set(false);
    }
  }

  buildLines() {
    return Object.entries(this.lineMap())
      .filter(([, d]) =>
        (d.unitCost ?? 0) > 0 && (d.quantity ?? 0) > 0 && (d.frequency ?? 0) > 0
      )
      .map(([rowKey, d]) => ({
        rowKey,
        designation: d.designation,
        unitCost: d.unitCost ?? undefined,
        quantity: d.quantity ?? undefined,
        frequency: d.frequency ?? undefined,
        costItemId: d.costItemId ?? undefined,
      }));
  }

  async save() {
    if (!this.editTitle || !this.editFundId) {
      this.snack.open('Référence activité et fonds de financement requis', 'OK', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    try {
      const payload: any = {
        title: this.editTitle,
        fundId: this.editFundId,
        exchangeRate: this.editExchangeRate,
        transferFeeRate: this.editTransferFeeRate / 100,
        totalAmount: this.amounts()['grand_total'] ?? 0,
        lines: this.buildLines(),
        probableExecutionDate: this.editProbableExecutionDate || undefined,
      };
      if (this.editActivityRefId) payload.activityReferenceId = this.editActivityRefId;

      if (this.isNew()) {
        const created = await firstValueFrom(this.api.createBudget({ ...payload, budgetType: this.newType }));
        this.snack.open('Budget créé', 'OK', { duration: 2500 });
        this.router.navigate(['/budgets', created.id]);
      } else {
        const updated = await firstValueFrom(this.api.updateBudget(this.budget()!.id, payload));
        this.budget.set(updated);
        this.snack.open('Budget sauvegardé', 'OK', { duration: 2500 });
      }
    } catch {
      this.snack.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async submitBudget() {
    if (this.isNew()) return;
    if (!confirm('Soumettre ce budget pour approbation ?')) return;
    this.saving.set(true);
    try {
      if (this.canEdit()) {
        await firstValueFrom(this.api.updateBudget(this.budget()!.id, {
          title: this.editTitle,
          fundId: this.editFundId,
          exchangeRate: this.editExchangeRate,
          transferFeeRate: this.editTransferFeeRate / 100,
          totalAmount: this.amounts()['grand_total'] ?? 0,
          lines: this.buildLines(),
        }));
      }
      await firstValueFrom(this.api.submitBudget(this.budget()!.id));
      this.snack.open('Budget soumis avec succès', 'OK', { duration: 3000 });
      this.router.navigate(['/budgets']);
    } catch {
      this.snack.open('Erreur lors de la soumission', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async uploadTdr(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.budget()) return;
    const formData = new FormData();
    formData.append('file', file);
    this.tdrUploading.set(true);
    try {
      const updated = await firstValueFrom(this.api.uploadBudgetTdr(this.budget()!.id, formData));
      this.budget.update(b => ({ ...b, tdrFilePath: updated.tdrFilePath, tdrFileExt: updated.tdrFileExt }));
      this.snack.open('TDR téléversé avec succès', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors du téléversement du TDR', 'OK', { duration: 3000 });
    } finally {
      this.tdrUploading.set(false);
      input.value = '';
    }
  }

  async downloadTdr() {
    const b = this.budget();
    if (!b?.tdrFilePath) return;
    try {
      const blob = await firstValueFrom(this.api.downloadBudgetTdr(b.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TDR_${b.title?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40) ?? b.id}.${b.tdrFileExt ?? 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Erreur lors du téléchargement du TDR', 'OK', { duration: 3000 });
    }
  }

  private async buildPdfDoc(): Promise<import('jspdf').jsPDF | null> {
    const b = this.budget();
    if (!b) return null;

    // A4 paysage — 297 × 210 mm, marges 10 mm → largeur utile 277 mm
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const mL = 10;
    const mR = 10;

    const rows = this.effectiveRows();
    const amts = this.amounts();
    const rate = this.editExchangeRate;
    const lm = this.lineMap();

    // Séparateur milliers par point : 1234567 → "1.234.567"
    const N = (n: number | null | undefined) => {
      if (!n || n === 0) return '-';
      return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
    // Montant USD : séparateur milliers point, décimales virgule : "1.234,56"
    const NUSD = (amt: number) => {
      if (!amt || amt === 0 || !rate) return '-';
      const val = amt / rate;
      const parts = val.toFixed(2).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return parts.join(',');
    };

    // ── Palette Excel ──────────────────────────────────────────────────
    const black: [number, number, number] = [0, 0, 0];
    const colHeader: [number, number, number] = [102, 204, 255]; // #66CCFF
    const sectionBg: [number, number, number] = [192, 192, 192]; // #C0C0C0 silver
    const subtotalBg: [number, number, number] = [180, 199, 231]; // #B4C7E7
    const totalBg: [number, number, number] = [255, 255, 0]; // #FFFF00 jaune
    const grandBg: [number, number, number] = [0, 255, 255]; // #00FFFF cyan
    const dimText: [number, number, number] = [80, 80, 80];

    // ── Chargement logos (image2=gauche U.S.Embassy, image1=droite PSP-CI) ──
    const loadImg = async (url: string): Promise<string | null> => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch { return null; }
    };
    const [logoLeft, logoRight] = await Promise.all([
      loadImg('/logo_usaid.png'),  // U.S. Embassy — gauche  (166×60 px)
      loadImg('/logo_psp.png'),    // PSP-CI       — droite  (247×157 px)
    ]);

    // ── En-tête (L1 centré, L2 logos+BUDGET, L3 taux) ─────────────────

    // L1 : budgetNumber : titre (ou TITRE : titre si pas de numéro)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal', 'bold');
    doc.setTextColor(...black);
    const titreLabel = b.budgetNumber ? `${b.budgetNumber} : ${b.title || ''}` : `TITRE :  ${b.title || ''}`;
    doc.text(titreLabel, pageW / 2, 7, { align: 'center', maxWidth: pageW - 2 * mL });

    // L2 : logo gauche | BUDGET [fonds] | logo droite
    // Dimensions depuis les EMU Excel (1 EMU = 1/914400 pouce = 0,0254/914400 m)
    // image2 (gauche) : cx=1320543 → 36.7mm, cy=484199 → 13.4mm
    // image1 (droite) : cx=956422  → 26.6mm, cy=541624 → 15.0mm
    const lLogoW = 37, lLogoH = 13;   // logo gauche
    const rLogoW = 27, rLogoH = 15;   // logo droite
    const logoTop = 9;

    if (logoLeft) doc.addImage(logoLeft, 'PNG', mL, logoTop, lLogoW, lLogoH);
    if (logoRight) doc.addImage(logoRight, 'PNG', pageW - mR - rLogoW, logoTop, rLogoW, rLogoH);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    const actCode = b.activityReference?.activityCode;
    const budgetHeadLabel = actCode
      ? `BUDGET  ${b.fund?.name ?? ''}   |   Activité : ${actCode}`
      : `BUDGET  ${b.fund?.name ?? ''}`;
    doc.text(budgetHeadLabel, pageW / 2, 18, { align: 'center' });

    // L3 : 1 dollar = X FCFA — aligné droite (comme cols E-G du modèle)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`1 dollar =  ${rate}  FCFA`, pageW - mR, 26, { align: 'right' });

    // ── Corps tableau (L4 du modèle) ────────────────────────────────────
    const tableBody: any[][] = [];
    for (const row of rows) {
      const d = lm[row.rowKey];
      const amt = amts[row.rowKey] ?? 0;

      if (!this.canShow(row, amts)) continue;

      if (row.type === 'section_header') {
        tableBody.push([
          { content: row.num ?? '', styles: { fillColor: sectionBg, textColor: black, fontStyle: 'bold', halign: 'center' } },
          { content: row.label, colSpan: 6, styles: { fillColor: sectionBg, textColor: black, fontStyle: 'bold' } },
        ]);
      } else if (row.type === 'sub_header') {
        tableBody.push([
          '',
          { content: row.label, colSpan: 6, styles: { fontStyle: 'italic', textColor: dimText } },
        ]);
      } else if (row.type === 'item') {
        if (!amt) continue;
        tableBody.push([
          '',
          d?.designation || row.label,
          { content: N(d?.unitCost ?? 0), styles: { halign: 'right' } },
          { content: N(d?.quantity ?? 0), styles: { halign: 'center' } },
          { content: N(d?.frequency ?? 0), styles: { halign: 'center' } },
          { content: N(amt), styles: { halign: 'right' } },
          { content: NUSD(amt), styles: { halign: 'right', textColor: dimText } },
        ]);
      } else if (row.type === 'subtotal') {
        tableBody.push([
          '',
          { content: row.label, styles: { fillColor: subtotalBg, fontStyle: 'bold', textColor: black } },
          { content: '', styles: { fillColor: subtotalBg } },
          { content: '', styles: { fillColor: subtotalBg } },
          { content: '', styles: { fillColor: subtotalBg } },
          { content: N(amt), styles: { fillColor: subtotalBg, halign: 'right', fontStyle: 'bold', textColor: black } },
          { content: NUSD(amt), styles: { fillColor: subtotalBg, halign: 'right', textColor: dimText } },
        ]);
      } else if (row.type === 'total_section') {
        tableBody.push([
          '',
          { content: row.label, styles: { fillColor: totalBg, fontStyle: 'bold', textColor: black } },
          { content: '', styles: { fillColor: totalBg } },
          { content: '', styles: { fillColor: totalBg } },
          { content: '', styles: { fillColor: totalBg } },
          { content: N(amt), styles: { fillColor: totalBg, halign: 'right', fontStyle: 'bold', textColor: black } },
          { content: NUSD(amt), styles: { fillColor: totalBg, halign: 'right', textColor: dimText } },
        ]);
      } else if (row.type === 'tax') {
        tableBody.push([
          '',
          { content: row.label, styles: { fontStyle: 'italic', textColor: dimText } },
          '', '', '',
          { content: N(amt), styles: { halign: 'right' } },
          { content: NUSD(amt), styles: { halign: 'right', textColor: dimText } },
        ]);
      } else if (row.type === 'grand_total') {
        tableBody.push([
          { content: 'TOTAL', styles: { fillColor: grandBg, textColor: black, fontStyle: 'bold', halign: 'center' } },
          { content: row.label, colSpan: 4, styles: { fillColor: grandBg, textColor: black, fontStyle: 'bold' } },
          { content: N(amt), styles: { fillColor: grandBg, textColor: black, fontStyle: 'bold', halign: 'right', fontSize: 8.5 } },
          { content: NUSD(amt), styles: { fillColor: grandBg, textColor: black, fontStyle: 'bold', halign: 'right' } },
        ]);
      }
    }

    // Largeurs proportionnelles aux colonnes Excel (wpx A=54 B=498 C=118 D=101 E=107 F=123 G=122)
    // Colonnes montants élargies pour afficher les grands nombres : 13+107+29+21+21+43+43 = 277 mm
    autoTable(doc, {
      startY: 29,
      head: [["N°d'ordre", 'DÉSIGNATIONS', 'Coût unitaire\n(FCFA)', 'Quantité\n(Nbre)', 'Fréquence\n(Jours)', 'Montant total\n(FCFA)', 'Montant total\n(dollars)']],
      body: tableBody,
      headStyles: {
        fillColor: colHeader,
        textColor: black,
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
        valign: 'middle',
      },
      styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak', textColor: black },
      columnStyles: {
        0: { cellWidth: 13, halign: 'center' },
        1: { cellWidth: 107 },
        2: { cellWidth: 29, halign: 'right' },
        3: { cellWidth: 21, halign: 'center' },
        4: { cellWidth: 21, halign: 'center' },
        5: { cellWidth: 43, halign: 'right' },
        6: { cellWidth: 43, halign: 'right' },
      },
      margin: { top: 29, left: mL, right: mR },
      didDrawPage: () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const current = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(6.5);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${current}/${pageCount}`, pageW / 2, 206, { align: 'center' });
        // Signature système discrète
        const sigDate = new Date().toISOString().slice(0, 10);
        const rawSig = btoa((b.id + (b.budgetNumber ?? '')).slice(0, 36)).replace(/[^A-Z0-9]/gi, '').slice(0, 12).toUpperCase();
        doc.setFontSize(5.5);
        doc.setTextColor(190, 190, 190);
        doc.text(`${sigDate} | ${rawSig}`, pageW - mR, 206, { align: 'right' });
      },
    });

    return doc;
  }

  async exportPDF() {
    const b = this.budget();
    if (!b) return;
    const doc = await this.buildPdfDoc();
    if (!doc) return;
    const fundCode = b.fund?.code ?? b.id.slice(0, 8);
    doc.save(`Budget_${b.entityCode}_${b.budgetType}_${fundCode}_${b.id.slice(0, 8)}.pdf`);
  }

  // ── Clôture ────────────────────────────────────────────────────────────────

  canCloturer() {
    const roles: string[] = this.auth.currentUser()?.roles ?? [];
    return roles.some(r => ['admin_finance', 'super_admin'].includes(r));
  }

  canDeclassifier() {
    const roles: string[] = this.auth.currentUser()?.roles ?? [];
    return roles.includes('super_admin');
  }

  async cloturerBudget() {
    const b = this.budget();
    if (!b) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.cloturerBudget(b.id));
      this.budget.set(updated);
      this.snack.open('Budget clôturé avec succès', 'OK', { duration: 3000 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur lors de la clôture', 'OK', { duration: 4000 });
    } finally { this.saving.set(false); }
  }

  async declassifierBudget() {
    const b = this.budget();
    if (!b) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.declassifierBudget(b.id));
      this.budget.set(updated);
      this.snack.open('Budget déclassifié — statut restauré', 'OK', { duration: 3000 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur lors de la déclassification', 'OK', { duration: 4000 });
    } finally { this.saving.set(false); }
  }

  async downloadArchiveZip() {
    const b = this.budget();
    if (!b) return;
    this.saving.set(true);
    try {
      // Générer le PDF budget côté client puis l'envoyer en base64 au backend
      const doc = await this.buildPdfDoc();
      const pdfBase64 = doc ? doc.output('datauristring').split(',')[1] : undefined;

      const blob = await firstValueFrom(this.api.downloadBudgetArchiveZip(b.id, pdfBase64));
      const ref = b.budgetNumber ?? b.id.slice(0, 8);
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Budget_${ref}_archive_${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      let message = 'Erreur téléchargement archive';
      try {
        if (err?.error instanceof Blob) {
          const text = await (err.error as Blob).text();
          const parsed = JSON.parse(text);
          message = parsed?.message ?? message;
        } else {
          message = err?.error?.message ?? err?.message ?? message;
        }
      } catch {}
      this.snack.open(message, 'OK', { duration: 5000 });
    } finally { this.saving.set(false); }
  }
}
