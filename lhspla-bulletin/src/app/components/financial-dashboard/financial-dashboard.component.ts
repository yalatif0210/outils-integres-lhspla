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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ENTITIES } from '../../models/bulletin.models';

const BUDGET_TYPE_LABELS: Record<string, string> = {
  ATELIER: 'Atelier',
  ACHAT_FOURNITURES: 'Achat fournitures',
  MISSION_TERRAIN: 'Mission terrain',
  APPUIS: 'Appuis',
  CONTRACTUALISATION: 'Contractualisation',
};

const CHART_COLORS = ['#1565C0', '#2E7D32', '#E65100', '#B71C1C', '#6A1B9A', '#00695C', '#F57F17'];

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTabsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, MatTableModule, MatProgressBarModule, MatPaginatorModule,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts: () => import('echarts') })],
  template: `
    <div class="fin-container">

      <!-- En-tête -->
      <div class="fin-header">
        <div class="fin-header-inner">
          <mat-icon>bar_chart</mat-icon>
          <div>
            <h1>Tableau de bord — Gestion financière</h1>
            <p class="fin-subtitle">Vue consolidée des budgets, MEMOs et paiements</p>
          </div>
        </div>
        <button mat-stroked-button (click)="reload()" [disabled]="loading()" class="btn-refresh">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </div>

      <!-- Filtres globaux -->
      <div class="filters-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Entité</mat-label>
          <mat-select [(ngModel)]="filterEntity" (ngModelChange)="reload()">
            <mat-option value="">Toutes les entités</mat-option>
            <mat-option *ngFor="let e of entities" [value]="e.code">{{e.code}} — {{e.name}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Type de budget</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="reload()">
            <mat-option value="">Tous les types</mat-option>
            <mat-option *ngFor="let t of budgetTypes" [value]="t.value">{{t.label}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-date">
          <mat-label>Du</mat-label>
          <input matInput type="date" [(ngModel)]="fromDate" (change)="reload()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-date">
          <mat-label>Au</mat-label>
          <input matInput type="date" [(ngModel)]="toDate" (change)="reload()">
        </mat-form-field>
        <button mat-icon-button matTooltip="Réinitialiser les filtres"
                *ngIf="filterEntity || filterType || fromDate || toDate"
                (click)="clearFilters()">
          <mat-icon>filter_alt_off</mat-icon>
        </button>
        <span class="loading-hint" *ngIf="loading()">Chargement...</span>
      </div>

      <!-- KPI Globaux -->
      <div class="kpi-grid" *ngIf="data() as d">
        <mat-card class="kpi-card">
          <div class="kpi-icon-wrap blue"><mat-icon>account_balance_wallet</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-val">{{fmtFcfa(d.global.totalBudgetAmount)}}</div>
            <div class="kpi-label">Montant total créé</div>
            <div class="kpi-sub">{{d.global.totalBudgets}} budget(s)</div>
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-icon-wrap green"><mat-icon>check_circle</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-val">{{fmtFcfa(d.global.totalApprovedAmount)}}</div>
            <div class="kpi-label">Montant total approuvé</div>
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-icon-wrap orange"><mat-icon>receipt_long</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-val">{{fmtFcfa(d.global.totalEngaged)}}</div>
            <div class="kpi-label">Montant engagé (preuves)</div>
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-icon-wrap teal"><mat-icon>paid</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-val">{{fmtFcfa(d.global.totalPaid)}}</div>
            <div class="kpi-label">Montant total payé</div>
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-icon-wrap red"><mat-icon>pending_actions</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-val">{{fmtFcfa(d.global.totalRemaining)}}</div>
            <div class="kpi-label">Restant à payer</div>
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-icon-wrap purple"><mat-icon>edit_note</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-val">{{d.global.totalMemos}}</div>
            <div class="kpi-label">MEMOs émis</div>
            <div class="kpi-sub">{{d.global.memoEmissionRate}}% des budgets</div>
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-icon-wrap green-dark"><mat-icon>trending_up</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-val" [class.positive]="d.global.netMemoImpact >= 0" [class.negative]="d.global.netMemoImpact < 0">
              {{d.global.netMemoImpact >= 0 ? '+' : ''}}{{fmtFcfa(d.global.netMemoImpact)}}
            </div>
            <div class="kpi-label">Impact net des MEMOs</div>
          </div>
        </mat-card>
      </div>

      <!-- Onglets d'analyse -->
      <mat-tab-group class="analysis-tabs" animationDuration="150ms" *ngIf="data() as d">

        <!-- ── Tab 1 : Budgets ── -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>account_balance</mat-icon> Budgets</ng-template>
          <div class="tab-content">
            <div class="section-title">Point financier par entité</div>
            <div echarts [options]="budgetBarChart(d)" class="chart-lg"></div>

            <div class="section-title" style="margin-top:24px">
              Détail par entité
              <span class="filter-count" *ngIf="hasFilter(fEntity)">— {{colFilter(d.byEntity, fEntity, gEntity).length}} / {{d.byEntity.length}} ligne(s)</span>
            </div>
            <div class="table-wrap">
              <table mat-table [dataSource]="pageSlice(colFilter(d.byEntity, fEntity, gEntity), pages.entity)" class="fin-table">
                <ng-container matColumnDef="entity">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">Entité</div>
                    <input class="col-filter" [(ngModel)]="fEntity['entity']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r"><strong>{{r.entityCode}}</strong></td>
                </ng-container>
                <ng-container matColumnDef="total">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Montant total créé</div>
                    <input class="col-filter" [(ngModel)]="fEntity['total']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">{{fmtFcfa(r.totalAmount)}}</td>
                </ng-container>
                <ng-container matColumnDef="approved">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Approuvé</div>
                    <input class="col-filter" [(ngModel)]="fEntity['approved']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col positive">{{fmtFcfa(r.approvedAmount)}}</td>
                </ng-container>
                <ng-container matColumnDef="memoRallonge">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Rallonge MEMO</div>
                    <input class="col-filter" [(ngModel)]="fEntity['memoRallonge']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col positive">{{r.memoRallonge > 0 ? '+' + fmtFcfa(r.memoRallonge) : '—'}}</td>
                </ng-container>
                <ng-container matColumnDef="memoReduction">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Réduction MEMO</div>
                    <input class="col-filter" [(ngModel)]="fEntity['memoReduction']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col negative">{{r.memoReduction > 0 ? '-' + fmtFcfa(r.memoReduction) : '—'}}</td>
                </ng-container>
                <ng-container matColumnDef="memoNet">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Impact net</div>
                    <input class="col-filter" [(ngModel)]="fEntity['memoNet']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col"
                      [class.positive]="r.memoRallonge - r.memoReduction > 0"
                      [class.negative]="r.memoRallonge - r.memoReduction < 0">
                    {{(r.memoRallonge > 0 || r.memoReduction > 0) ? ((r.memoRallonge - r.memoReduction >= 0 ? '+' : '') + fmtFcfa(r.memoRallonge - r.memoReduction)) : '—'}}
                  </td>
                </ng-container>
                <ng-container matColumnDef="effectiveApproved">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Budget ajusté</div>
                    <input class="col-filter" [(ngModel)]="fEntity['effectiveApproved']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col" style="font-weight:700">{{fmtFcfa(r.approvedAmount + r.memoRallonge - r.memoReduction)}}</td>
                </ng-container>
                <ng-container matColumnDef="engaged">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Engagé</div>
                    <input class="col-filter" [(ngModel)]="fEntity['engaged']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col orange">{{fmtFcfa(r.engagedAmount)}}</td>
                </ng-container>
                <ng-container matColumnDef="paid">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Payé</div>
                    <input class="col-filter" [(ngModel)]="fEntity['paid']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col teal">{{fmtFcfa(r.paidAmount)}}</td>
                </ng-container>
                <ng-container matColumnDef="remaining">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Restant à payer</div>
                    <input class="col-filter" [(ngModel)]="fEntity['remaining']" (input)="pages.entity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col negative">{{fmtFcfa(r.remainingToPay)}}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['entity','total','approved','memoRallonge','memoReduction','memoNet','effectiveApproved','engaged','paid','remaining']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['entity','total','approved','memoRallonge','memoReduction','memoNet','effectiveApproved','engaged','paid','remaining']"></tr>
              </table>
              <mat-paginator [length]="colFilter(d.byEntity, fEntity, gEntity).length" [pageSize]="pages.entity.size"
                [pageSizeOptions]="pageSizeOptions" showFirstLastButtons
                (page)="onPage(pages.entity, $event)">
              </mat-paginator>
            </div>

            <div class="section-title" style="margin-top:24px">Répartition par type de budget</div>
            <div class="type-grid">
              <mat-card class="type-card" *ngFor="let t of d.byBudgetType">
                <div class="type-label">{{budgetTypeLabel(t.budgetType)}}</div>
                <div class="type-count">{{t.count}} budget(s)</div>
                <div class="type-line">
                  <span class="type-line-lbl">Montant budgets</span>
                  <span class="type-line-val">{{fmtFcfa(t.totalAmount)}}</span>
                </div>
                <div class="type-line memo-line" *ngIf="t.memoRallonge > 0 || t.memoReduction > 0">
                  <span class="type-line-lbl">Impact MEMOs</span>
                  <span class="type-line-val"
                        [class.positive]="(t.memoRallonge - t.memoReduction) >= 0"
                        [class.negative]="(t.memoRallonge - t.memoReduction) < 0">
                    {{(t.memoRallonge - t.memoReduction) >= 0 ? '+' : ''}}{{fmtFcfa(t.memoRallonge - t.memoReduction)}}
                  </span>
                </div>
                <div class="type-line effective-line">
                  <span class="type-line-lbl">Montant effectif</span>
                  <span class="type-line-val type-effective-val">{{fmtFcfa(t.effectiveTotal)}}</span>
                </div>
                <div class="type-paid">Payé : {{fmtFcfa(t.paidAmount)}}</div>
                <mat-progress-bar mode="determinate"
                  [value]="t.effectiveTotal > 0 ? (t.paidAmount / t.effectiveTotal) * 100 : 0"
                  color="primary" class="type-bar">
                </mat-progress-bar>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- ── Tab 2 : MEMOs ── -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>edit_note</mat-icon> MEMOs</ng-template>
          <div class="tab-content">
            <div class="memo-kpi-row">
              <div class="memo-kpi">
                <span class="memo-kpi-val">{{d.global.totalMemos}}</span>
                <span class="memo-kpi-label">MEMOs émis</span>
              </div>
              <div class="memo-kpi">
                <span class="memo-kpi-val positive">+{{fmtFcfa(d.global.totalMemoRallonge)}}</span>
                <span class="memo-kpi-label">Total rallonges approuvées</span>
              </div>
              <div class="memo-kpi">
                <span class="memo-kpi-val negative">-{{fmtFcfa(d.global.totalMemoReduction)}}</span>
                <span class="memo-kpi-label">Total réductions approuvées</span>
              </div>
              <div class="memo-kpi">
                <span class="memo-kpi-val" [class.positive]="d.global.netMemoImpact >= 0" [class.negative]="d.global.netMemoImpact < 0">
                  {{d.global.netMemoImpact >= 0 ? '+' : ''}}{{fmtFcfa(d.global.netMemoImpact)}}
                </span>
                <span class="memo-kpi-label">Impact financier net</span>
              </div>
              <div class="memo-kpi">
                <span class="memo-kpi-val">{{d.global.budgetsWithMemo}}</span>
                <span class="memo-kpi-label">Budgets concernés</span>
              </div>
            </div>

            <div class="section-title">Rallonges vs Réductions par entité</div>
            <div echarts [options]="memoStackedChart(d)" class="chart-md"></div>

            <div class="section-title" style="margin-top:24px">
              Détail MEMOs par entité
              <span class="filter-count" *ngIf="hasFilter(fMemoEntity)">— {{colFilter(d.byEntity, fMemoEntity, gMemoEntity).length}} / {{d.byEntity.length}} ligne(s)</span>
            </div>
            <div class="table-wrap">
              <table mat-table [dataSource]="pageSlice(colFilter(d.byEntity, fMemoEntity, gMemoEntity), pages.memoEntity)" class="fin-table">
                <ng-container matColumnDef="entity">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">Entité</div>
                    <input class="col-filter" [(ngModel)]="fMemoEntity['entity']" (input)="pages.memoEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r"><strong>{{r.entityCode}}</strong></td>
                </ng-container>
                <ng-container matColumnDef="memoCount">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">MEMOs</div>
                    <input class="col-filter" [(ngModel)]="fMemoEntity['memoCount']" (input)="pages.memoEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">{{r.budgetsWithMemo}}</td>
                </ng-container>
                <ng-container matColumnDef="rallonge">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Rallonge approuvée</div>
                    <input class="col-filter" [(ngModel)]="fMemoEntity['rallonge']" (input)="pages.memoEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col positive">+{{fmtFcfa(r.memoRallonge)}}</td>
                </ng-container>
                <ng-container matColumnDef="reduction">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Réduction approuvée</div>
                    <input class="col-filter" [(ngModel)]="fMemoEntity['reduction']" (input)="pages.memoEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col negative">-{{fmtFcfa(r.memoReduction)}}</td>
                </ng-container>
                <ng-container matColumnDef="net">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Impact net</div>
                    <input class="col-filter" [(ngModel)]="fMemoEntity['net']" (input)="pages.memoEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col"
                      [class.positive]="r.memoRallonge - r.memoReduction >= 0"
                      [class.negative]="r.memoRallonge - r.memoReduction < 0">
                    {{r.memoRallonge - r.memoReduction >= 0 ? '+' : ''}}{{fmtFcfa(r.memoRallonge - r.memoReduction)}}
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['entity','memoCount','rallonge','reduction','net']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['entity','memoCount','rallonge','reduction','net']"></tr>
              </table>
              <mat-paginator [length]="colFilter(d.byEntity, fMemoEntity, gMemoEntity).length" [pageSize]="pages.memoEntity.size"
                [pageSizeOptions]="pageSizeOptions" showFirstLastButtons
                (page)="onPage(pages.memoEntity, $event)">
              </mat-paginator>
            </div>
          </div>
        </mat-tab>

        <!-- ── Tab 3 : Paiements ── -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>payments</mat-icon> Paiements</ng-template>
          <div class="tab-content">
            <div class="charts-row">
              <div class="chart-col">
                <div class="section-title">Paiements par entité</div>
                <div echarts [options]="paymentPieChart(d)" class="chart-sm"></div>
              </div>
              <div class="chart-col">
                <div class="section-title">Paiements par type de budget</div>
                <div echarts [options]="paymentTypeChart(d)" class="chart-sm"></div>
              </div>
            </div>
            <div class="section-title" style="margin-top:24px">Évolution mensuelle (créations & paiements)</div>
            <div echarts [options]="monthlyTrendChart(d)" class="chart-lg"></div>
          </div>
        </mat-tab>

        <!-- ── Tab 4 : Restant à payer ── -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>account_balance_wallet</mat-icon> Restant à payer</ng-template>
          <div class="tab-content">
            <div class="section-title">Restant à payer par entité</div>
            <div echarts [options]="remainingBarChart(d)" class="chart-md"></div>

            <div class="section-title" style="margin-top:24px">
              Top budgets — solde restant le plus élevé
              <span class="filter-count" *ngIf="hasFilter(fTopRem)">— {{colFilter(d.topRemaining, fTopRem, gTopRem).length}} / {{d.topRemaining.length}} ligne(s)</span>
            </div>
            <div class="table-wrap" *ngIf="d.topRemaining.length > 0; else noRemaining">
              <table mat-table [dataSource]="pageSlice(colFilter(d.topRemaining, fTopRem, gTopRem), pages.topRemaining)" class="fin-table">
                <ng-container matColumnDef="entity">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">Entité</div>
                    <input class="col-filter" [(ngModel)]="fTopRem['entity']" (input)="pages.topRemaining.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r">{{r.entityCode}}</td>
                </ng-container>
                <ng-container matColumnDef="number">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">N°</div>
                    <input class="col-filter" [(ngModel)]="fTopRem['number']" (input)="pages.topRemaining.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r"><span class="budget-num">{{r.budgetNumber || '—'}}</span></td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">Titre</div>
                    <input class="col-filter" [(ngModel)]="fTopRem['title']" (input)="pages.topRemaining.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="title-col">{{r.title}}</td>
                </ng-container>
                <ng-container matColumnDef="total">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Budget ajusté</div>
                    <input class="col-filter" [(ngModel)]="fTopRem['total']" (input)="pages.topRemaining.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">{{fmtFcfa(r.effectiveTotal)}}</td>
                </ng-container>
                <ng-container matColumnDef="paid">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Payé</div>
                    <input class="col-filter" [(ngModel)]="fTopRem['paid']" (input)="pages.topRemaining.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col teal">{{fmtFcfa(r.paidAmount)}}</td>
                </ng-container>
                <ng-container matColumnDef="remaining">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Restant</div>
                    <input class="col-filter" [(ngModel)]="fTopRem['remaining']" (input)="pages.topRemaining.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col negative">{{fmtFcfa(r.remainingToPay)}}</td>
                </ng-container>
                <ng-container matColumnDef="pct">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">% payé</div>
                    <input class="col-filter" [(ngModel)]="fTopRem['pct']" (input)="pages.topRemaining.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">
                    <mat-progress-bar mode="determinate"
                      [value]="r.effectiveTotal > 0 ? (r.paidAmount / r.effectiveTotal) * 100 : 0"
                      color="primary" style="width:80px; display:inline-block">
                    </mat-progress-bar>
                    <span style="font-size:11px; margin-left:4px">
                      {{r.effectiveTotal > 0 ? round((r.paidAmount / r.effectiveTotal) * 100) : 0}}%
                    </span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['entity','number','title','total','paid','remaining','pct']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['entity','number','title','total','paid','remaining','pct']"></tr>
              </table>
              <mat-paginator [length]="colFilter(d.topRemaining, fTopRem, gTopRem).length" [pageSize]="pages.topRemaining.size"
                [pageSizeOptions]="pageSizeOptions" showFirstLastButtons
                (page)="onPage(pages.topRemaining, $event)">
              </mat-paginator>
            </div>
            <ng-template #noRemaining>
              <div class="empty-state"><mat-icon>check_circle</mat-icon> Aucun budget avec un solde restant.</div>
            </ng-template>

            <div class="section-title" style="margin-top:28px">
              Tous les budgets approuvés
              <span class="filter-count" *ngIf="hasFilter(fAllBudgets)">— {{colFilter(d.allApprovedBudgets, fAllBudgets, gAllBudgets).length}} / {{(d.allApprovedBudgets?.length || 0)}} ligne(s)</span>
            </div>
            <div class="table-wrap" *ngIf="d.allApprovedBudgets?.length > 0; else noApproved">
              <table mat-table [dataSource]="pageSlice(colFilter(d.allApprovedBudgets, fAllBudgets, gAllBudgets), pages.allBudgets)" class="fin-table">
                <ng-container matColumnDef="entity2">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">Entité</div>
                    <input class="col-filter" [(ngModel)]="fAllBudgets['entity2']" (input)="pages.allBudgets.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r">{{r.entityCode}}</td>
                </ng-container>
                <ng-container matColumnDef="number2">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">N°</div>
                    <input class="col-filter" [(ngModel)]="fAllBudgets['number2']" (input)="pages.allBudgets.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r"><span class="budget-num">{{r.budgetNumber || '—'}}</span></td>
                </ng-container>
                <ng-container matColumnDef="title2">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">Titre</div>
                    <input class="col-filter" [(ngModel)]="fAllBudgets['title2']" (input)="pages.allBudgets.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="title-col">{{r.title}}</td>
                </ng-container>
                <ng-container matColumnDef="total2">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Budget ajusté</div>
                    <input class="col-filter" [(ngModel)]="fAllBudgets['total2']" (input)="pages.allBudgets.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">{{fmtFcfa(r.effectiveTotal)}}</td>
                </ng-container>
                <ng-container matColumnDef="paid2">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Payé</div>
                    <input class="col-filter" [(ngModel)]="fAllBudgets['paid2']" (input)="pages.allBudgets.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col teal">{{fmtFcfa(r.paidAmount)}}</td>
                </ng-container>
                <ng-container matColumnDef="remaining2">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Restant</div>
                    <input class="col-filter" [(ngModel)]="fAllBudgets['remaining2']" (input)="pages.allBudgets.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col negative">{{fmtFcfa(r.remainingToPay)}}</td>
                </ng-container>
                <ng-container matColumnDef="pct2">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">% payé</div>
                    <input class="col-filter" [(ngModel)]="fAllBudgets['pct2']" (input)="pages.allBudgets.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">
                    <mat-progress-bar mode="determinate"
                      [value]="r.effectiveTotal > 0 ? (r.paidAmount / r.effectiveTotal) * 100 : 0"
                      color="primary" style="width:80px; display:inline-block">
                    </mat-progress-bar>
                    <span style="font-size:11px; margin-left:4px">
                      {{r.effectiveTotal > 0 ? round((r.paidAmount / r.effectiveTotal) * 100) : 0}}%
                    </span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['entity2','number2','title2','total2','paid2','remaining2','pct2']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['entity2','number2','title2','total2','paid2','remaining2','pct2']"></tr>
              </table>
              <mat-paginator [length]="colFilter(d.allApprovedBudgets, fAllBudgets, gAllBudgets).length" [pageSize]="pages.allBudgets.size"
                [pageSizeOptions]="pageSizeOptions" showFirstLastButtons
                (page)="onPage(pages.allBudgets, $event)">
              </mat-paginator>
            </div>
            <ng-template #noApproved>
              <div class="empty-state"><mat-icon>info</mat-icon> Aucun budget approuvé.</div>
            </ng-template>
          </div>
        </mat-tab>

        <!-- ── Tab 5 : Taux MEMO ── -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>percent</mat-icon> Taux MEMO</ng-template>
          <div class="tab-content">
            <div class="section-title">
              Taux d'émission de MEMO par entité
              <span class="section-hint">= Budgets avec au moins 1 MEMO / Total budgets × 100</span>
            </div>
            <div echarts [options]="memoRateChart(d)" class="chart-md"></div>

            <div class="section-title" style="margin-top:24px">
              Détail par entité
              <span class="filter-count" *ngIf="hasFilter(fRateEntity)">— {{colFilter(d.byEntity, fRateEntity, gRateEntity).length}} / {{d.byEntity.length}} ligne(s)</span>
            </div>
            <div class="table-wrap">
              <table mat-table [dataSource]="pageSlice(colFilter(d.byEntity, fRateEntity, gRateEntity), pages.rateEntity)" class="fin-table">
                <ng-container matColumnDef="entity">
                  <th mat-header-cell *matHeaderCellDef><div class="ch-lbl">Entité</div>
                    <input class="col-filter" [(ngModel)]="fRateEntity['entity']" (input)="pages.rateEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r"><strong>{{r.entityCode}}</strong></td>
                </ng-container>
                <ng-container matColumnDef="total">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Total budgets</div>
                    <input class="col-filter" [(ngModel)]="fRateEntity['total']" (input)="pages.rateEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">{{r.totalBudgets}}</td>
                </ng-container>
                <ng-container matColumnDef="withMemo">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Avec MEMO</div>
                    <input class="col-filter" [(ngModel)]="fRateEntity['withMemo']" (input)="pages.rateEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">{{r.budgetsWithMemo}}</td>
                </ng-container>
                <ng-container matColumnDef="rate">
                  <th mat-header-cell *matHeaderCellDef class="num-col"><div class="ch-lbl">Taux (%)</div>
                    <input class="col-filter" [(ngModel)]="fRateEntity['rate']" (input)="pages.rateEntity.index=0" placeholder="⌕"></th>
                  <td mat-cell *matCellDef="let r" class="num-col">
                    <mat-progress-bar mode="determinate" [value]="r.memoEmissionRate" color="accent" style="width:80px; display:inline-block"></mat-progress-bar>
                    <strong style="margin-left:6px">{{r.memoEmissionRate}}%</strong>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['entity','total','withMemo','rate']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['entity','total','withMemo','rate']"></tr>
              </table>
              <mat-paginator [length]="colFilter(d.byEntity, fRateEntity, gRateEntity).length" [pageSize]="pages.rateEntity.size"
                [pageSizeOptions]="pageSizeOptions" showFirstLastButtons
                (page)="onPage(pages.rateEntity, $event)">
              </mat-paginator>
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="!loading() && !data()">
        <mat-icon>bar_chart</mat-icon> Aucune donnée disponible.
      </div>

    </div>
  `,
  styles: [`
    .fin-container { max-width: 1200px; margin: 0 auto; padding: 16px; }

    /* Header */
    .fin-header {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #1b3a5c, #1F4E79);
      color: white; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px;
    }
    .fin-header-inner { display: flex; align-items: center; gap: 14px; }
    .fin-header mat-icon { font-size: 36px; width: 36px; height: 36px; color: #BDD7EE; }
    .fin-header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .fin-subtitle { margin: 2px 0 0; font-size: 12px; opacity: 0.75; }
    .btn-refresh { color: white !important; border-color: rgba(255,255,255,0.4) !important; }

    /* Filters */
    .filters-bar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
      background: #f8f9fa; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;
    }
    .filter-field { min-width: 160px; }
    .filter-date { min-width: 130px; }
    .loading-hint { font-size: 12px; color: #888; }

    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 16px; }
    .kpi-card { border-radius: 10px !important; padding: 12px !important; display: flex; align-items: center; gap: 10px; }
    .kpi-icon-wrap {
      width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .kpi-icon-wrap mat-icon { font-size: 20px; width: 20px; height: 20px; color: white; }
    .kpi-icon-wrap.blue { background: #1565C0; }
    .kpi-icon-wrap.green { background: #2E7D32; }
    .kpi-icon-wrap.orange { background: #E65100; }
    .kpi-icon-wrap.teal { background: #00695C; }
    .kpi-icon-wrap.red { background: #B71C1C; }
    .kpi-icon-wrap.purple { background: #6A1B9A; }
    .kpi-icon-wrap.green-dark { background: #1B5E20; }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-val { font-size: 13px; font-weight: 700; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .kpi-label { font-size: 10px; color: #666; margin-top: 1px; }
    .kpi-sub { font-size: 10px; color: #999; }

    /* Tabs */
    .analysis-tabs { border-radius: 10px; background: white; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
    .tab-content { padding: 20px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1F4E79; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .section-hint { font-size: 11px; font-weight: 400; color: #888; }
    .filter-count { font-size: 11px; font-weight: 500; color: #E65100; }

    /* Charts */
    .chart-lg { width: 100%; height: 320px; }
    .chart-md { width: 100%; height: 260px; }
    .chart-sm { width: 100%; height: 240px; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .chart-col { }

    /* Tables */
    .table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e8eaf0; }
    .fin-table { width: 100%; }
    .fin-table th.mat-mdc-header-cell {
      background: #f0f4f8; font-size: 11px; color: #444; font-weight: 700;
      vertical-align: top; padding-top: 8px !important; padding-bottom: 6px !important;
    }
    .fin-table td { font-size: 12px; }
    .num-col { text-align: right !important; font-family: monospace; }
    .title-col { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .budget-num { font-size: 10px; font-weight: 700; color: #1F4E79; }

    /* Column filter inputs */
    .ch-lbl { font-size: 11px; font-weight: 700; color: #444; white-space: nowrap; }
    .col-filter {
      display: block; width: 100%; box-sizing: border-box;
      border: 1px solid #d0d8e4; border-radius: 3px;
      padding: 2px 5px; font-size: 10px; font-weight: 400;
      background: white; outline: none; font-family: inherit;
      margin-top: 4px; color: #333; min-width: 50px;
    }
    .col-filter:focus { border-color: #2E75B6; box-shadow: 0 0 0 2px rgba(46,117,182,0.15); }
    .num-col .col-filter { text-align: right; }

    /* Colors */
    .positive { color: #2E7D32; }
    .negative { color: #B71C1C; }
    .orange { color: #E65100; }
    .teal { color: #00695C; }

    /* Type cards */
    .type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .type-card { padding: 12px !important; border-radius: 8px !important; }
    .type-label { font-size: 11px; font-weight: 700; color: #1F4E79; margin-bottom: 4px; }
    .type-count { font-size: 11px; color: #888; margin-bottom: 6px; }
    .type-line { display: flex; justify-content: space-between; align-items: center; gap: 4px; margin: 2px 0; }
    .type-line-lbl { font-size: 10px; color: #888; }
    .type-line-val { font-size: 11px; font-weight: 600; font-family: monospace; }
    .memo-line .type-line-val { font-size: 10px; }
    .effective-line { border-top: 1px solid #e8eaf0; padding-top: 4px; margin-top: 4px; margin-bottom: 2px; }
    .type-effective-val { font-size: 12px; font-weight: 800; color: #1F4E79; }
    .type-paid { font-size: 11px; color: #2E7D32; margin: 6px 0 4px; }
    .type-bar { border-radius: 4px; }

    /* MEMO KPIs row */
    .memo-kpi-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .memo-kpi { background: #f0f4ff; border-radius: 8px; padding: 10px 16px; min-width: 140px; }
    .memo-kpi-val { display: block; font-size: 15px; font-weight: 700; font-family: monospace; }
    .memo-kpi-label { display: block; font-size: 10px; color: #555; margin-top: 2px; }

    /* Empty */
    .empty-state { display: flex; align-items: center; gap: 8px; color: #999; font-size: 13px; padding: 20px; justify-content: center; }

    /* Paginator */
    mat-paginator { border-top: 1px solid #eee; font-size: 12px; }

    @media (max-width: 700px) {
      .charts-row { grid-template-columns: 1fr; }
      .kpi-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class FinancialDashboardComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  data = signal<any>(null);
  loading = signal(false);

  filterEntity = '';
  filterType = '';
  fromDate = '';
  toDate = '';

  readonly entities = ENTITIES;
  readonly budgetTypes = [
    { value: 'ATELIER', label: 'Atelier' },
    { value: 'ACHAT_FOURNITURES', label: 'Achat fournitures' },
    { value: 'MISSION_TERRAIN', label: 'Mission terrain' },
    { value: 'APPUIS', label: 'Appuis' },
    { value: 'CONTRACTUALISATION', label: 'Contractualisation' },
  ];

  // Pagination state per table
  readonly pageSizeOptions = [5, 10, 25, 50];
  pages = {
    entity: { index: 0, size: 10 },
    memoEntity: { index: 0, size: 10 },
    rateEntity: { index: 0, size: 10 },
    topRemaining: { index: 0, size: 10 },
    allBudgets: { index: 0, size: 10 },
  };

  // Column filters per table
  fEntity: Record<string, string> = {};
  fMemoEntity: Record<string, string> = {};
  fTopRem: Record<string, string> = {};
  fAllBudgets: Record<string, string> = {};
  fRateEntity: Record<string, string> = {};

  // Getter maps for colFilter — map each column key to a row value accessor
  readonly gEntity: Record<string, (r: any) => any> = {
    entity: r => r.entityCode,
    total: r => r.totalAmount,
    approved: r => r.approvedAmount,
    memoRallonge: r => r.memoRallonge,
    memoReduction: r => r.memoReduction,
    memoNet: r => r.memoRallonge - r.memoReduction,
    effectiveApproved: r => r.approvedAmount + r.memoRallonge - r.memoReduction,
    engaged: r => r.engagedAmount,
    paid: r => r.paidAmount,
    remaining: r => r.remainingToPay,
  };
  readonly gMemoEntity: Record<string, (r: any) => any> = {
    entity: r => r.entityCode,
    memoCount: r => r.budgetsWithMemo,
    rallonge: r => r.memoRallonge,
    reduction: r => r.memoReduction,
    net: r => r.memoRallonge - r.memoReduction,
  };
  readonly gTopRem: Record<string, (r: any) => any> = {
    entity: r => r.entityCode,
    number: r => r.budgetNumber,
    title: r => r.title,
    total: r => r.effectiveTotal,
    paid: r => r.paidAmount,
    remaining: r => r.remainingToPay,
    pct: r => r.effectiveTotal > 0 ? Math.round((r.paidAmount / r.effectiveTotal) * 100) : 0,
  };
  readonly gAllBudgets: Record<string, (r: any) => any> = {
    entity2: r => r.entityCode,
    number2: r => r.budgetNumber,
    title2: r => r.title,
    total2: r => r.effectiveTotal,
    paid2: r => r.paidAmount,
    remaining2: r => r.remainingToPay,
    pct2: r => r.effectiveTotal > 0 ? Math.round((r.paidAmount / r.effectiveTotal) * 100) : 0,
  };
  readonly gRateEntity: Record<string, (r: any) => any> = {
    entity: r => r.entityCode,
    total: r => r.totalBudgets,
    withMemo: r => r.budgetsWithMemo,
    rate: r => r.memoEmissionRate,
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

  pageSlice(data: any[] | undefined, page: { index: number; size: number }): any[] {
    if (!data) return [];
    return data.slice(page.index * page.size, (page.index + 1) * page.size);
  }

  onPage(page: { index: number; size: number }, event: any) {
    page.index = event.pageIndex;
    page.size = event.pageSize;
  }

  private resetPages() {
    Object.values(this.pages).forEach(p => { p.index = 0; });
  }

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.resetPages();
    this.api.getFinancialDashboard({
      entityCode: this.filterEntity || undefined,
      budgetType: this.filterType || undefined,
      from: this.fromDate || undefined,
      to: this.toDate || undefined,
    }).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  clearFilters() {
    this.filterEntity = '';
    this.filterType = '';
    this.fromDate = '';
    this.toDate = '';
    this.reload();
  }

  fmtFcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);
  }

  round(n: number): number { return Math.round(n); }

  budgetTypeLabel(t: string): string { return BUDGET_TYPE_LABELS[t] ?? t; }

  // ─── Chart Options ──────────────────────────────────────────────────────────

  budgetBarChart(d: any): EChartsOption {
    const entities = d.byEntity.map((e: any) => e.entityCode);
    const fmt = this.fmtFcfa.bind(this);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        return items.map((p: any) =>
          `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}: <strong>${fmt(p.value)}</strong>`
        ).join('<br/>');
      }},
      legend: { data: ['Total créé', 'Approuvé', 'Engagé', 'Payé'], bottom: 0 },
      grid: { left: 80, right: 20, top: 30, bottom: 50 },
      xAxis: { type: 'category', data: entities, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => this.fmtM(v) } },
      series: [
        { name: 'Total créé', type: 'bar', data: d.byEntity.map((e: any) => e.totalAmount), itemStyle: { color: '#1565C0' } },
        { name: 'Approuvé', type: 'bar', data: d.byEntity.map((e: any) => e.approvedAmount), itemStyle: { color: '#2E7D32' } },
        { name: 'Engagé', type: 'bar', data: d.byEntity.map((e: any) => e.engagedAmount), itemStyle: { color: '#E65100' } },
        { name: 'Payé', type: 'bar', data: d.byEntity.map((e: any) => e.paidAmount), itemStyle: { color: '#00695C' } },
      ],
    };
  }

  memoStackedChart(d: any): EChartsOption {
    const entities = d.byEntity.filter((e: any) => e.memoRallonge > 0 || e.memoReduction > 0).map((e: any) => e.entityCode);
    const filtered = d.byEntity.filter((e: any) => e.memoRallonge > 0 || e.memoReduction > 0);
    if (entities.length === 0) return { title: { text: 'Aucun MEMO approuvé', left: 'center', top: 'center', textStyle: { color: '#aaa', fontSize: 14 } } };
    const fmt = this.fmtFcfa.bind(this);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        return items.map((p: any) =>
          `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}: <strong>${fmt(p.value)}</strong>`
        ).join('<br/>');
      }},
      legend: { data: ['Rallonge', 'Réduction'], bottom: 0 },
      grid: { left: 80, right: 20, top: 30, bottom: 50 },
      xAxis: { type: 'category', data: entities, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => this.fmtM(v) } },
      series: [
        { name: 'Rallonge', type: 'bar', stack: 'memo', data: filtered.map((e: any) => e.memoRallonge), itemStyle: { color: '#2E7D32' } },
        { name: 'Réduction', type: 'bar', stack: 'memo', data: filtered.map((e: any) => e.memoReduction), itemStyle: { color: '#B71C1C' } },
      ],
    };
  }

  paymentPieChart(d: any): EChartsOption {
    const hasData = d.byEntity.some((e: any) => e.paidAmount > 0);
    if (!hasData) return { title: { text: 'Aucun paiement enregistré', left: 'center', top: 'center', textStyle: { color: '#aaa', fontSize: 14 } } };
    const fmt = this.fmtFcfa.bind(this);
    return {
      tooltip: { trigger: 'item', confine: true, formatter: (p: any) => `${p.name}<br/>${fmt(p.value)} (${p.percent}%)` },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        data: d.byEntity.filter((e: any) => e.paidAmount > 0).map((e: any, i: number) => ({
          name: e.entityCode, value: e.paidAmount, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
        label: { fontSize: 11 },
      }],
    };
  }

  paymentTypeChart(d: any): EChartsOption {
    const fmt = this.fmtFcfa.bind(this);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.name}<br/>Montant payé : <strong>${fmt(p.value)}</strong>`;
      }},
      grid: { left: 130, right: 20, top: 20, bottom: 20 },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => this.fmtM(v) } },
      yAxis: { type: 'category', data: d.byBudgetType.map((t: any) => this.budgetTypeLabel(t.budgetType)), axisLabel: { fontSize: 10 } },
      series: [{ type: 'bar', data: d.byBudgetType.map((t: any) => t.paidAmount), itemStyle: { color: '#00695C' } }],
    };
  }

  monthlyTrendChart(d: any): EChartsOption {
    if (!d.monthlyTrend.length) return { title: { text: 'Pas de données temporelles', left: 'center', top: 'center', textStyle: { color: '#aaa' } } };
    const fmt = this.fmtFcfa.bind(this);
    return {
      tooltip: { trigger: 'axis', confine: true, formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        return items.map((p: any) =>
          `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}: <strong>${fmt(p.value)}</strong>`
        ).join('<br/>');
      }},
      legend: { data: ['Montant créé', 'Montant payé'], bottom: 0 },
      grid: { left: 80, right: 20, top: 30, bottom: 50 },
      xAxis: { type: 'category', data: d.monthlyTrend.map((m: any) => m.month), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => this.fmtM(v) } },
      series: [
        { name: 'Montant créé', type: 'line', smooth: true, data: d.monthlyTrend.map((m: any) => m.createdAmount), itemStyle: { color: '#1565C0' }, areaStyle: { opacity: 0.08 } },
        { name: 'Montant payé', type: 'line', smooth: true, data: d.monthlyTrend.map((m: any) => m.paid), itemStyle: { color: '#00695C' }, areaStyle: { opacity: 0.08 } },
      ],
    };
  }

  remainingBarChart(d: any): EChartsOption {
    const withRemaining = d.byEntity.filter((e: any) => e.remainingToPay > 0);
    if (!withRemaining.length) return { title: { text: 'Aucun solde restant', left: 'center', top: 'center', textStyle: { color: '#aaa', fontSize: 14 } } };
    const fmt = this.fmtFcfa.bind(this);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.name}<br/>Restant à payer : <strong>${fmt(p.value)}</strong>`;
      }},
      grid: { left: 70, right: 20, top: 20, bottom: 20 },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => this.fmtM(v) } },
      yAxis: { type: 'category', data: withRemaining.map((e: any) => e.entityCode) },
      series: [{ type: 'bar', data: withRemaining.map((e: any) => e.remainingToPay), itemStyle: { color: '#B71C1C' } }],
    };
  }

  memoRateChart(d: any): EChartsOption {
    const entities = d.byEntity.map((e: any) => e.entityCode);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => {
        const item = Array.isArray(p) ? p[0] : p;
        return `${item.name}<br/>${item.value}% des budgets`;
      }},
      grid: { left: 60, right: 20, top: 30, bottom: 20 },
      xAxis: { type: 'category', data: entities, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: d.byEntity.map((e: any) => e.memoEmissionRate),
        itemStyle: { color: '#6A1B9A' },
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 },
      }],
    };
  }

  private fmtM(v: number): string {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(v);
  }
}
