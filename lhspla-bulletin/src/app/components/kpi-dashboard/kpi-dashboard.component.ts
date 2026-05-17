import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ENTITIES } from '../../models/bulletin.models';

const MISSION_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending_tpm: 'En attente TPM',
  pending_cop: 'En attente COP',
  cop_approved: 'Approuvée COP',
  pending_dg: 'En attente DG',
  in_progress: 'En cours',
  completed: 'Complétée',
  cancelled: 'Annulée',
};

const MISSION_STATUS_COLORS: Record<string, string> = {
  draft: '#9e9e9e', pending_tpm: '#ff9800', pending_cop: '#ff9800',
  cop_approved: '#2196f3', pending_dg: '#9c27b0', in_progress: '#4caf50',
  completed: '#1976d2', cancelled: '#f44336',
};

@Component({
  selector: 'app-kpi-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTabsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, MatTableModule, MatPaginatorModule,
  ],
  template: `
    <div class="kpi-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>insights</mat-icon>
          <div>
            <h1>Tableau de bord KPI</h1>
            <p>{{auth.roleLabel()}}{{entityLabel()}}</p>
          </div>
        </div>
      </div>

      <!-- Filtres globaux -->
      <div class="filters-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Année fiscale</mat-label>
          <mat-select [(ngModel)]="filterFiscalYear" (ngModelChange)="reload()">
            <mat-option value="">Toutes les années</mat-option>
            <mat-option *ngFor="let y of availableYears" [value]="y">{{y}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-date" *ngIf="!filterFiscalYear">
          <mat-label>Du</mat-label>
          <input matInput type="date" [(ngModel)]="fromDate" (change)="reload()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-date" *ngIf="!filterFiscalYear">
          <mat-label>Au</mat-label>
          <input matInput type="date" [(ngModel)]="toDate" (change)="reload()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field" *ngIf="isGlobal()">
          <mat-label>Entité</mat-label>
          <mat-select [(ngModel)]="filterEntity" (ngModelChange)="reload()">
            <mat-option value="">Toutes les entités</mat-option>
            <mat-option *ngFor="let e of entities" [value]="e.code">{{e.code}} — {{e.name}}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-icon-button matTooltip="Réinitialiser" (click)="clearFilters()"
                *ngIf="filterFiscalYear || fromDate || toDate || filterEntity">
          <mat-icon>filter_alt_off</mat-icon>
        </button>
        <span class="loading-hint" *ngIf="loading()">Chargement...</span>
      </div>

      <mat-tab-group class="main-tabs" animationDuration="150ms">

        <!-- ── Onglet Budgets ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>account_balance_wallet</mat-icon>&nbsp;Budgets
          </ng-template>
          <div class="tab-body" *ngIf="budgetKpis() as kpis">

            <!-- Montant total — budget + memos + total ajusté -->
            <div class="amount-hero">
              <mat-icon>payments</mat-icon>
              <div class="amount-breakdown">
                <div class="amount-row">
                  <span class="amount-label">Montant budgets approuvés</span>
                  <span class="amount-value">{{fmtFcfa(kpis.totalAmountFcfa)}}</span>
                </div>
                <div class="amount-row memo-row" *ngIf="kpis.totalMemoRallonge > 0 || kpis.totalMemoReduction > 0">
                  <span class="amount-label memo-lbl">
                    Impact MEMOs approuvés
                    <span *ngIf="kpis.totalMemoRallonge > 0" class="memo-detail">(+{{fmtFcfa(kpis.totalMemoRallonge)}} rallonge</span>
                    <span *ngIf="kpis.totalMemoReduction > 0" class="memo-detail"> / -{{fmtFcfa(kpis.totalMemoReduction)}} réduction)</span>
                    <span *ngIf="kpis.totalMemoRallonge > 0 && !kpis.totalMemoReduction" class="memo-detail">)</span>
                  </span>
                  <span class="amount-value memo-val"
                        [class.positive]="(kpis.totalMemoRallonge - kpis.totalMemoReduction) >= 0"
                        [class.negative]="(kpis.totalMemoRallonge - kpis.totalMemoReduction) < 0">
                    {{(kpis.totalMemoRallonge - kpis.totalMemoReduction) >= 0 ? '+' : ''}}{{fmtFcfa(kpis.totalMemoRallonge - kpis.totalMemoReduction)}}
                  </span>
                </div>
                <div class="amount-row total-row">
                  <span class="amount-label">Montant total ajusté (budget + MEMOs)</span>
                  <span class="amount-value total-val">{{fmtFcfa(kpis.effectiveTotalFcfa ?? kpis.totalAmountFcfa)}}</span>
                </div>
              </div>
            </div>

            <!-- KPI cards -->
            <div class="kpi-grid">
              <div class="kpi-card" style="--color:#1976d2">
                <mat-icon>task_alt</mat-icon>
                <span class="kpi-num">{{kpis.total}}</span>
                <span class="kpi-lbl">Budgets approuvés</span>
              </div>
              <div class="kpi-card" style="--color:#9e9e9e">
                <mat-icon>hourglass_empty</mat-icon>
                <span class="kpi-num">{{kpis.idle}}</span>
                <span class="kpi-lbl">Sans activité</span>
              </div>
              <div class="kpi-card" style="--color:#ff9800">
                <mat-icon>pending</mat-icon>
                <span class="kpi-num">{{kpis.withPendingPayment}}</span>
                <span class="kpi-lbl">Demande paiement en attente</span>
              </div>
              <div class="kpi-card" style="--color:#2196f3">
                <mat-icon>verified</mat-icon>
                <span class="kpi-num">{{kpis.withValidatedPayment}}</span>
                <span class="kpi-lbl">Demande validée (attente preuve)</span>
              </div>
              <div class="kpi-card" style="--color:#4caf50">
                <mat-icon>check_circle</mat-icon>
                <span class="kpi-num">{{kpis.fullySolded}}</span>
                <span class="kpi-lbl">Entièrement soldés</span>
              </div>
              <div class="kpi-card" style="--color:#f44336">
                <mat-icon>attach_file</mat-icon>
                <span class="kpi-num">{{kpis.withOpenRecalls}}</span>
                <span class="kpi-lbl">Rappels ouverts</span>
              </div>
              <div class="kpi-card" style="--color:#388e3c">
                <mat-icon>done_all</mat-icon>
                <span class="kpi-num">{{kpis.withClosedRecalls}}</span>
                <span class="kpi-lbl">Rappels clôturés</span>
              </div>
            </div>

            <!-- Tableau par entité (rôles globaux sans filtre entité) -->
            <mat-card class="table-card" *ngIf="kpis.byEntity?.length > 0">
              <mat-card-content>
                <div class="table-title">
                  <mat-icon>apartment</mat-icon> Répartition par entité
                  <span class="filter-count" *ngIf="hasFilter(fBudgetEntity)">
                    — {{colFilter(kpis.byEntity, fBudgetEntity, gBudgetEntity).length}} / {{kpis.byEntity.length}} ligne(s)
                  </span>
                </div>
                <table mat-table [dataSource]="pageSlice(colFilter(kpis.byEntity, fBudgetEntity, gBudgetEntity), pages.byEntity)" class="kpi-table">
                  <ng-container matColumnDef="entityCode">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Entité</div>
                      <input class="col-filter" [(ngModel)]="fBudgetEntity['entityCode']" (input)="pages.byEntity.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let e"><span class="entity-chip">{{e.entityCode}}</span></td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Budgets</div>
                      <input class="col-filter" [(ngModel)]="fBudgetEntity['total']" (input)="pages.byEntity.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let e"><strong>{{e.total}}</strong></td>
                  </ng-container>
                  <ng-container matColumnDef="totalAmountFcfa">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Montant FCFA</div>
                      <input class="col-filter" [(ngModel)]="fBudgetEntity['totalAmountFcfa']" (input)="pages.byEntity.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let e" class="amount-cell">{{fmtFcfa(e.totalAmountFcfa)}}</td>
                  </ng-container>
                  <ng-container matColumnDef="pendingPayment">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Pmt en attente</div>
                      <input class="col-filter" [(ngModel)]="fBudgetEntity['pendingPayment']" (input)="pages.byEntity.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let e">
                      <span class="count-chip warn" *ngIf="e.pendingPayment > 0">{{e.pendingPayment}}</span>
                      <span *ngIf="e.pendingPayment === 0" class="none">—</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="solded">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Soldés</div>
                      <input class="col-filter" [(ngModel)]="fBudgetEntity['solded']" (input)="pages.byEntity.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let e">
                      <span class="count-chip ok" *ngIf="e.solded > 0">{{e.solded}}</span>
                      <span *ngIf="e.solded === 0" class="none">—</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="openRecalls">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Rappels ouverts</div>
                      <input class="col-filter" [(ngModel)]="fBudgetEntity['openRecalls']" (input)="pages.byEntity.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let e">
                      <span class="count-chip danger" *ngIf="e.openRecalls > 0">{{e.openRecalls}}</span>
                      <span *ngIf="e.openRecalls === 0" class="none">—</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="closedRecalls">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Rappels clôturés</div>
                      <input class="col-filter" [(ngModel)]="fBudgetEntity['closedRecalls']" (input)="pages.byEntity.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let e">
                      <span class="count-chip ok" *ngIf="e.closedRecalls > 0">{{e.closedRecalls}}</span>
                      <span *ngIf="!e.closedRecalls || e.closedRecalls === 0" class="none">—</span>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="budgetColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: budgetColumns;"></tr>
                </table>
                <mat-paginator
                  [length]="colFilter(kpis.byEntity, fBudgetEntity, gBudgetEntity).length"
                  [pageSize]="pages.byEntity.size"
                  [pageIndex]="pages.byEntity.index"
                  [pageSizeOptions]="[5, 10, 25, 50]"
                  (page)="onPage($event, 'byEntity')"
                  showFirstLastButtons>
                </mat-paginator>
              </mat-card-content>
            </mat-card>
          </div>
          <div class="tab-body" *ngIf="!budgetKpis() && !loading()">
            <p class="empty">Aucune donnée disponible.</p>
          </div>
        </mat-tab>

        <!-- ── Onglet Missions ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>flight_takeoff</mat-icon>&nbsp;Missions
          </ng-template>
          <div class="tab-body" *ngIf="missionStats() as ms">

            <!-- Filtres missions (COP/super_admin) -->
            <div class="mission-filters" *ngIf="isGlobal()">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Année fiscale</mat-label>
                <mat-select [(ngModel)]="filterFiscalYear" (ngModelChange)="reloadMissions()">
                  <mat-option value="">Toutes les années</mat-option>
                  <mat-option *ngFor="let y of availableYears" [value]="y">{{y}}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Entité</mat-label>
                <mat-select [(ngModel)]="filterEntity" (ngModelChange)="reloadMissions()">
                  <mat-option value="">Toutes les entités</mat-option>
                  <mat-option *ngFor="let e of entities" [value]="e.code">{{e.code}} — {{e.name}}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Filtrer par agent</mat-label>
                <mat-select [(ngModel)]="filterPersonnelId" (ngModelChange)="reloadMissions()">
                  <mat-option value="">Tous les agents</mat-option>
                  <mat-option *ngFor="let p of personnel()" [value]="p.id">
                    {{p.fullName}} — {{p.service}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- KPI statuts -->
            <div class="kpi-grid">
              <div class="kpi-card" style="--color:#1976d2">
                <mat-icon>flight_takeoff</mat-icon>
                <span class="kpi-num">{{ms.stats.total}}</span>
                <span class="kpi-lbl">Total demandes</span>
              </div>
              <div class="kpi-card" style="--color:#ff9800">
                <mat-icon>schedule</mat-icon>
                <span class="kpi-num">{{ms.stats.pendingTpm + ms.stats.pendingCop + ms.stats.copApproved + ms.stats.pendingDg}}</span>
                <span class="kpi-lbl">En cours de validation</span>
              </div>
              <div class="kpi-card" style="--color:#4caf50">
                <mat-icon>directions_run</mat-icon>
                <span class="kpi-num">{{ms.stats.inProgress}}</span>
                <span class="kpi-lbl">En cours</span>
              </div>
              <div class="kpi-card" style="--color:#1565c0">
                <mat-icon>check_circle</mat-icon>
                <span class="kpi-num">{{ms.stats.completed}}</span>
                <span class="kpi-lbl">Complétées</span>
              </div>
              <div class="kpi-card" style="--color:#9e9e9e">
                <mat-icon>cancel</mat-icon>
                <span class="kpi-num">{{ms.stats.cancelled}}</span>
                <span class="kpi-lbl">Annulées</span>
              </div>
            </div>

            <!-- Détail statuts -->
            <mat-card class="table-card">
              <mat-card-content>
                <div class="table-title"><mat-icon>bar_chart</mat-icon> Détail par statut</div>
                <div class="status-bars">
                  <ng-container *ngFor="let s of missionStatusKeys">
                    <div class="status-bar-row" *ngIf="ms.stats[s] > 0">
                      <span class="status-dot" [style.background]="statusColor(s)"></span>
                      <span class="status-name">{{statusLabel(s)}}</span>
                      <div class="bar-track">
                        <div class="bar-fill" [style.width]="pct(ms.stats[s], ms.stats.total) + '%'"
                             [style.background]="statusColor(s)"></div>
                      </div>
                      <span class="bar-count">{{ms.stats[s]}}</span>
                    </div>
                  </ng-container>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Tableau par personnel (COP/super_admin) -->
            <mat-card class="table-card" *ngIf="ms.byPersonnel?.length > 0">
              <mat-card-content>
                <div class="table-title">
                  <mat-icon>people</mat-icon> Missions par agent
                  <span class="filter-count" *ngIf="hasFilter(fPersonnel)">
                    — {{colFilter(ms.byPersonnel, fPersonnel, gPersonnel).length}} / {{ms.byPersonnel.length}} ligne(s)
                  </span>
                </div>
                <table mat-table [dataSource]="pageSlice(colFilter(ms.byPersonnel, fPersonnel, gPersonnel), pages.byPersonnel)" class="kpi-table">
                  <ng-container matColumnDef="fullName">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Agent</div>
                      <input class="col-filter" [(ngModel)]="fPersonnel['fullName']" (input)="pages.byPersonnel.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let p"><strong>{{p.fullName}}</strong></td>
                  </ng-container>
                  <ng-container matColumnDef="service">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Service</div>
                      <input class="col-filter" [(ngModel)]="fPersonnel['service']" (input)="pages.byPersonnel.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let p" class="light">{{p.service}}</td>
                  </ng-container>
                  <ng-container matColumnDef="function">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Fonction</div>
                      <input class="col-filter" [(ngModel)]="fPersonnel['function']" (input)="pages.byPersonnel.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let p" class="light">{{p.function}}</td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Total</div>
                      <input class="col-filter" [(ngModel)]="fPersonnel['total']" (input)="pages.byPersonnel.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let p"><strong>{{p.total}}</strong></td>
                  </ng-container>
                  <ng-container matColumnDef="inProgress">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">En cours</div>
                      <input class="col-filter" [(ngModel)]="fPersonnel['inProgress']" (input)="pages.byPersonnel.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let p">
                      <span class="count-chip ok" *ngIf="p.inProgress > 0">{{p.inProgress}}</span>
                      <span *ngIf="p.inProgress === 0" class="none">—</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="completed">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Complétées</div>
                      <input class="col-filter" [(ngModel)]="fPersonnel['completed']" (input)="pages.byPersonnel.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let p">
                      <span class="count-chip info" *ngIf="p.completed > 0">{{p.completed}}</span>
                      <span *ngIf="p.completed === 0" class="none">—</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="cancelled">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Annulées</div>
                      <input class="col-filter" [(ngModel)]="fPersonnel['cancelled']" (input)="pages.byPersonnel.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let p">
                      <span class="count-chip danger" *ngIf="p.cancelled > 0">{{p.cancelled}}</span>
                      <span *ngIf="p.cancelled === 0" class="none">—</span>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="personnelColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: personnelColumns;"></tr>
                </table>
                <mat-paginator
                  [length]="colFilter(ms.byPersonnel, fPersonnel, gPersonnel).length"
                  [pageSize]="pages.byPersonnel.size"
                  [pageIndex]="pages.byPersonnel.index"
                  [pageSizeOptions]="[5, 10, 25, 50]"
                  (page)="onPage($event, 'byPersonnel')"
                  showFirstLastButtons>
                </mat-paginator>
              </mat-card-content>
            </mat-card>

            <!-- Liste missions propres (entity_member) -->
            <mat-card class="table-card" *ngIf="ms.missions?.length > 0">
              <mat-card-content>
                <div class="table-title">
                  <mat-icon>list</mat-icon> Mes demandes de mission
                  <span class="filter-count" *ngIf="hasFilter(fMissions)">
                    — {{colFilter(ms.missions, fMissions, gMissions).length}} / {{ms.missions.length}} ligne(s)
                  </span>
                </div>
                <table mat-table [dataSource]="pageSlice(colFilter(ms.missions, fMissions, gMissions), pages.missions)" class="kpi-table">
                  <ng-container matColumnDef="object">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Objet</div>
                      <input class="col-filter" [(ngModel)]="fMissions['object']" (input)="pages.missions.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let m" class="obj-cell">{{m.object}}</td>
                  </ng-container>
                  <ng-container matColumnDef="location">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Lieu</div>
                      <input class="col-filter" [(ngModel)]="fMissions['location']" (input)="pages.missions.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let m" class="light">{{m.location}}</td>
                  </ng-container>
                  <ng-container matColumnDef="departureDate">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Départ</div>
                      <input class="col-filter" [(ngModel)]="fMissions['departureDate']" (input)="pages.missions.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let m">{{m.departureDate | date:'dd/MM/yyyy'}}</td>
                  </ng-container>
                  <ng-container matColumnDef="returnDate">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Retour</div>
                      <input class="col-filter" [(ngModel)]="fMissions['returnDate']" (input)="pages.missions.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let m">{{m.returnDate | date:'dd/MM/yyyy'}}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>
                      <div class="ch-lbl">Statut</div>
                      <input class="col-filter" [(ngModel)]="fMissions['status']" (input)="pages.missions.index=0" placeholder="⌕">
                    </th>
                    <td mat-cell *matCellDef="let m">
                      <span class="status-badge" [style.background]="statusColor(m.status)">
                        {{statusLabel(m.status)}}
                      </span>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="missionColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: missionColumns;"></tr>
                </table>
                <mat-paginator
                  [length]="colFilter(ms.missions, fMissions, gMissions).length"
                  [pageSize]="pages.missions.size"
                  [pageIndex]="pages.missions.index"
                  [pageSizeOptions]="[5, 10, 25, 50]"
                  (page)="onPage($event, 'missions')"
                  showFirstLastButtons>
                </mat-paginator>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .kpi-container { padding: 0; }

    .page-header { background: linear-gradient(135deg, #1F4E79 0%, #2E75B6 100%); color: #fff; }
    .page-header-inner { display: flex; align-items: center; gap: 12px; padding: 18px 20px; }
    .page-header-inner mat-icon { font-size: 28px; width: 28px; height: 28px; opacity: .9; }
    .page-header-inner h1 { margin: 0; font-size: 1.2rem; font-weight: 700; }
    .page-header-inner p { margin: 0; opacity: .8; font-size: .8rem; }

    .filters-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 12px 20px; background: #f5f7fa; border-bottom: 1px solid #e0e0e0;
    }
    .filter-field { min-width: 160px; }
    .filter-date { min-width: 150px; }
    .loading-hint { font-size: 12px; color: #888; font-style: italic; }

    .tab-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

    /* Montant hero */
    .amount-hero {
      display: flex; align-items: flex-start; gap: 14px;
      background: linear-gradient(135deg, #1F4E79, #2E75B6);
      color: #fff; border-radius: 12px; padding: 18px 24px;
    }
    .amount-hero mat-icon { font-size: 36px; width: 36px; height: 36px; opacity: .9; flex-shrink: 0; }
    .amount-breakdown { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .amount-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .memo-row { opacity: .9; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 4px; }
    .total-row { border-top: 2px solid rgba(255,255,255,0.35); padding-top: 6px; margin-top: 2px; }
    .amount-label { font-size: 12px; opacity: .85; }
    .memo-lbl { font-size: 11px; }
    .memo-detail { font-size: 10px; opacity: .8; }
    .amount-value { font-size: 1.4rem; font-weight: 800; font-family: monospace; white-space: nowrap; }
    .memo-val { font-size: 1.1rem; }
    .memo-val.positive { color: #b9f6ca; }
    .memo-val.negative { color: #ffcdd2; }
    .total-val { font-size: 1.8rem; }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .kpi-card {
      border-radius: 12px; padding: 16px; background: #fff;
      border-left: 4px solid var(--color);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
    }
    .kpi-card mat-icon { color: var(--color); font-size: 22px; width: 22px; height: 22px; }
    .kpi-num { font-size: 2rem; font-weight: 800; color: var(--color); line-height: 1; }
    .kpi-lbl { font-size: 11px; color: #666; font-weight: 500; line-height: 1.3; }

    /* Tables */
    .table-card { border-radius: 12px !important; border: 1px solid #e8edf5 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important; }
    .table-title { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1F4E79; font-size: 14px; margin-bottom: 12px; }
    .table-title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .kpi-table { width: 100%; }
    .mat-mdc-header-row { background: #eef4fa; }
    .mat-mdc-header-cell { color: #1F4E79; font-weight: 700; font-size: 11.5px; vertical-align: top; padding-top: 8px !important; padding-bottom: 6px !important; }
    .mat-mdc-cell { font-size: 12.5px; }
    .mat-mdc-row:hover td { background: #f6faff; }
    .amount-cell { font-family: monospace; font-size: 12px; font-weight: 600; }
    .obj-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .light { color: #888; font-size: 12px; }

    /* Column filters */
    .ch-lbl { font-size: 11.5px; font-weight: 700; color: #1F4E79; margin-bottom: 4px; white-space: nowrap; }
    .col-filter {
      width: 100%; max-width: 120px; padding: 2px 6px;
      border: 1px solid #cfd8e3; border-radius: 4px;
      font-size: 11px; background: #fff; color: #333;
      box-sizing: border-box;
    }
    .col-filter:focus { outline: none; border-color: #2E75B6; background: #f0f6ff; }
    .filter-count { font-size: 12px; font-weight: 400; color: #888; margin-left: 4px; }

    .entity-chip { background: #1F4E79; color: #fff; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 800; }
    .count-chip { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .count-chip.ok { background: #e8f5e9; color: #2e7d32; }
    .count-chip.warn { background: #fff3e0; color: #e65100; }
    .count-chip.danger { background: #ffebee; color: #c62828; }
    .count-chip.info { background: #e3f2fd; color: #1565c0; }
    .none { color: #ccc; font-size: 12px; }
    .status-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; color: #fff; }
    .empty { color: #aaa; text-align: center; font-style: italic; padding: 40px; }

    /* Status bars */
    .status-bars { display: flex; flex-direction: column; gap: 8px; }
    .status-bar-row { display: flex; align-items: center; gap: 10px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .status-name { font-size: 12px; color: #555; min-width: 180px; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width .4s; }
    .bar-count { font-size: 12px; font-weight: 700; color: #333; min-width: 24px; text-align: right; }

    /* Mission filters */
    .mission-filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
  `],
})
export class KpiDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private api = inject(ApiService);

  readonly entities = ENTITIES;
  budgetKpis = signal<any>(null);
  missionStats = signal<any>(null);
  personnel = signal<any[]>([]);
  loading = signal(false);

  fromDate = '';
  toDate = '';
  filterEntity = '';
  filterPersonnelId = '';
  filterFiscalYear = '';
  availableYears: string[] = [];

  readonly budgetColumns = ['entityCode', 'total', 'totalAmountFcfa', 'pendingPayment', 'solded', 'openRecalls', 'closedRecalls'];
  readonly personnelColumns = ['fullName', 'service', 'function', 'total', 'inProgress', 'completed', 'cancelled'];
  readonly missionColumns = ['object', 'location', 'departureDate', 'returnDate', 'status'];
  readonly missionStatusKeys = ['draft', 'pendingTpm', 'pendingCop', 'copApproved', 'pendingDg', 'inProgress', 'completed', 'cancelled'];

  pages = {
    byEntity:    { index: 0, size: 10 },
    byPersonnel: { index: 0, size: 10 },
    missions:    { index: 0, size: 10 },
  };

  fBudgetEntity: Record<string, string> = {};
  fPersonnel: Record<string, string> = {};
  fMissions: Record<string, string> = {};

  readonly gBudgetEntity: Record<string, (r: any) => any> = {
    entityCode:      r => r.entityCode,
    total:           r => r.total,
    totalAmountFcfa: r => r.totalAmountFcfa,
    pendingPayment:  r => r.pendingPayment,
    solded:          r => r.solded,
    openRecalls:     r => r.openRecalls,
    closedRecalls:   r => r.closedRecalls,
  };

  readonly gPersonnel: Record<string, (r: any) => any> = {
    fullName:   r => r.fullName,
    service:    r => r.service,
    function:   r => r.function,
    total:      r => r.total,
    inProgress: r => r.inProgress,
    completed:  r => r.completed,
    cancelled:  r => r.cancelled,
  };

  readonly gMissions: Record<string, (r: any) => any> = {
    object:        r => r.object,
    location:      r => r.location,
    departureDate: r => r.departureDate ? new Date(r.departureDate).toLocaleDateString('fr-FR') : '',
    returnDate:    r => r.returnDate ? new Date(r.returnDate).toLocaleDateString('fr-FR') : '',
    status:        r => this.statusLabel(r.status),
  };

  colFilter(data: any[] | undefined, f: Record<string, string>, g: Record<string, (r: any) => any>): any[] {
    if (!data) return [];
    const active = Object.entries(f).filter(([, v]) => v?.trim());
    if (!active.length) return data;
    return data.filter(row => active.every(([k, v]) => {
      const fn = g[k];
      return fn ? String(fn(row) ?? '').toLowerCase().includes(v.trim().toLowerCase()) : true;
    }));
  }

  hasFilter(f: Record<string, string>): boolean {
    return Object.values(f).some(v => v?.trim());
  }

  pageSlice(data: any[], page: { index: number; size: number }): any[] {
    const start = page.index * page.size;
    return data.slice(start, start + page.size);
  }

  onPage(evt: PageEvent, key: 'byEntity' | 'byPersonnel' | 'missions') {
    this.pages[key].index = evt.pageIndex;
    this.pages[key].size = evt.pageSize;
  }

  resetPages() {
    this.pages.byEntity.index = 0;
    this.pages.byPersonnel.index = 0;
    this.pages.missions.index = 0;
  }

  isGlobal() {
    return this.auth.hasAnyRole('super_admin', 'admin_system', 'admin_finance', 'chief_of_party');
  }

  entityLabel() {
    const code = this.auth.entityCode();
    if (!code || this.isGlobal()) return '';
    const e = ENTITIES.find(x => x.code === code);
    return e ? ` — ${e.code}` : '';
  }

  ngOnInit() {
    this.api.getDashboardAvailableYears().subscribe({ next: y => this.availableYears = y, error: () => {} });
    this.loadPersonnel();
    this.reload();
  }

  reload() {
    this.resetPages();
    this.reloadBudgets();
    this.reloadMissions();
  }

  reloadBudgets() {
    this.loading.set(true);
    this.api.getBudgetKpis({
      entityCode: this.filterEntity,
      from: this.filterFiscalYear ? undefined : this.fromDate,
      to: this.filterFiscalYear ? undefined : this.toDate,
      fiscalYear: this.filterFiscalYear || undefined,
    }).subscribe({
      next: data => { this.budgetKpis.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  reloadMissions() {
    this.loading.set(true);
    this.api.getMissionStats({
      entityCode: this.filterEntity,
      personnelId: this.filterPersonnelId,
      from: this.filterFiscalYear ? undefined : this.fromDate,
      to: this.filterFiscalYear ? undefined : this.toDate,
      fiscalYear: this.filterFiscalYear || undefined,
    }).subscribe({
      next: data => { this.missionStats.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadPersonnel() {
    if (!this.isGlobal()) return;
    this.api.getPersonnel().subscribe({ next: list => this.personnel.set(list), error: () => {} });
  }

  clearFilters() {
    this.fromDate = '';
    this.toDate = '';
    this.filterEntity = '';
    this.filterPersonnelId = '';
    this.filterFiscalYear = '';
    this.reload();
  }

  fmtFcfa(n: number): string {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
  }

  statusLabel(s: string) {
    const map: Record<string, string> = {
      ...MISSION_STATUS_LABELS,
      pendingTpm: 'En attente TPM', pendingCop: 'En attente COP',
      copApproved: 'Approuvée COP', pendingDg: 'En attente DG',
      inProgress: 'En cours',
    };
    return map[s] ?? s;
  }

  statusColor(s: string) {
    const map: Record<string, string> = {
      ...MISSION_STATUS_COLORS,
      pendingTpm: '#ff9800', pendingCop: '#ff9800',
      copApproved: '#2196f3', pendingDg: '#9c27b0',
      inProgress: '#4caf50',
    };
    return map[s] ?? '#9e9e9e';
  }

  pct(val: number, total: number): number {
    return total > 0 ? Math.round((val / total) * 100) : 0;
  }
}
