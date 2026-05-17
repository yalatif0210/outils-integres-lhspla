import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { ApiService } from '../../services/api.service';
import { ENTITIES as ENTITY_LIST } from '../../models/bulletin.models';
import type { EChartsOption } from 'echarts';

const ENTITIES = ['CAD', 'CAC', 'PMO', 'QAD', 'SE', 'SI', 'FINANCES', 'COM'];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatTableModule, MatTooltipModule,
    MatFormFieldModule, MatSelectModule, MatInputModule,
    MatPaginatorModule, NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts: () => import("echarts") })],
  template: `
    <div class="dash-container">
      <div class="dash-header">
        <div class="dash-header-inner">
          <mat-icon>dashboard</mat-icon>
          <h1>Tableau de bord — Administration</h1>
        </div>
      </div>

      <!-- Filtres -->
      <div class="admin-filters">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Année fiscale</mat-label>
          <mat-select [(ngModel)]="filterYear" (ngModelChange)="reload()">
            <mat-option value="">Toutes les années</mat-option>
            <mat-option *ngFor="let y of availableYears" [value]="y">{{y}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field filter-field-wide">
          <mat-label>Semaine</mat-label>
          <mat-select [(ngModel)]="filterWeekId" (ngModelChange)="reload()">
            <mat-option value="">Toutes les semaines</mat-option>
            <mat-option *ngFor="let w of weekPeriods" [value]="w.id">
              {{formatWeekPeriod(w)}}
            </mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Entité</mat-label>
          <mat-select [(ngModel)]="filterEntity" (ngModelChange)="reload()">
            <mat-option value="">Toutes les entités</mat-option>
            <mat-option *ngFor="let e of entityList" [value]="e.code">{{e.code}} — {{e.name}}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-icon-button matTooltip="Réinitialiser" (click)="clearFilters()"
                *ngIf="filterYear || filterWeekId || filterEntity">
          <mat-icon>filter_alt_off</mat-icon>
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" *ngIf="overview()">
        <mat-card class="kpi-card">
          <mat-icon class="kpi-icon blue">group</mat-icon>
          <div class="kpi-val">{{overview().activeUsers}}</div>
          <div class="kpi-label">Utilisateurs actifs</div>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-icon class="kpi-icon green">calendar_today</mat-icon>
          <div class="kpi-val">{{overview().activeWeeks}}</div>
          <div class="kpi-label">Semaines actives</div>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-icon class="kpi-icon orange">pending_actions</mat-icon>
          <div class="kpi-val">{{getPendingCount()}}</div>
          <div class="kpi-label">Saisies en attente</div>
        </mat-card>
        <mat-card class="kpi-card" [class.alert]="criticalRisks().length > 0">
          <mat-icon class="kpi-icon red">warning</mat-icon>
          <div class="kpi-val">{{criticalRisks().length}}</div>
          <div class="kpi-label">Risques critiques actifs</div>
        </mat-card>
      </div>

      <div class="charts-grid">
        <!-- Taux de soumission -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title><mat-icon>trending_up</mat-icon> Taux de soumission (12 semaines)</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="submissionRateChart()" class="chart"></div>
          </mat-card-content>
        </mat-card>

        <!-- Tendance risques -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title><mat-icon>bar_chart</mat-icon> Évolution des risques</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="riskTrendChart()" class="chart"></div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Heatmap -->
      <mat-card class="heatmap-card">
        <mat-card-header>
          <mat-card-title><mat-icon>grid_on</mat-icon> Heatmap de complétion — Entités × Semaines</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="heatmap-wrapper" *ngIf="heatmap().length > 0">
            <div class="heatmap-legend">
              <span class="legend-item missing">Manquant</span>
              <span class="legend-item draft">Brouillon</span>
              <span class="legend-item submitted-late">Soumis (hors délai)</span>
              <span class="legend-item submitted-ontime">Soumis (dans délai)</span>
            </div>
            <table class="heatmap-table">
              <thead>
                <tr>
                  <th class="entity-col">Entité</th>
                  <th *ngFor="let w of heatmap()" class="week-col" [matTooltip]="w.weekReference">
                    {{formatWeekShort(w.weekStart)}}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let entity of entities">
                  <td class="entity-name">{{entity}}</td>
                  <td *ngFor="let w of heatmap()" class="cell"
                      [class]="getCellClass(w, entity)"
                      [matTooltip]="getCellTooltip(w, entity)">
                    <mat-icon class="cell-icon">{{getCellIcon(w, entity)}}</mat-icon>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Comparaison entités -->
      <mat-card class="chart-card full-width">
        <mat-card-header>
          <mat-card-title><mat-icon>compare_arrows</mat-icon> Comparaison inter-entités</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div echarts [options]="entityComparisonChart()" class="chart-tall"></div>
        </mat-card-content>
      </mat-card>

      <!-- Risques critiques -->
      <mat-card class="alerts-card" *ngIf="criticalRisks().length > 0">
        <mat-card-header>
          <mat-card-title class="alert-title">
            <mat-icon>dangerous</mat-icon> Risques critiques en attente de décision
            <span class="filter-count" *ngIf="hasFilter(fRisks)">
              — {{colFilter(criticalRisks(), fRisks, gRisks).length}} / {{criticalRisks().length}} ligne(s)
            </span>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table class="alerts-table">
            <thead>
              <tr>
                <th>
                  <div class="ch-lbl">Entité</div>
                  <input class="col-filter" [(ngModel)]="fRisks['entityCode']" (input)="pageRisks.index=0" placeholder="⌕">
                </th>
                <th>
                  <div class="ch-lbl">Semaine</div>
                  <input class="col-filter" [(ngModel)]="fRisks['weekReference']" (input)="pageRisks.index=0" placeholder="⌕">
                </th>
                <th>
                  <div class="ch-lbl">Catégorie</div>
                  <input class="col-filter" [(ngModel)]="fRisks['category']" (input)="pageRisks.index=0" placeholder="⌕">
                </th>
                <th>
                  <div class="ch-lbl">Description</div>
                  <input class="col-filter" [(ngModel)]="fRisks['description']" (input)="pageRisks.index=0" placeholder="⌕">
                </th>
                <th>
                  <div class="ch-lbl">Action attendue</div>
                  <input class="col-filter" [(ngModel)]="fRisks['expectedAction']" (input)="pageRisks.index=0" placeholder="⌕">
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of pageSlice(colFilter(criticalRisks(), fRisks, gRisks), pageRisks)">
                <td><span class="entity-chip">{{r.entityCode}}</span></td>
                <td class="week-ref">{{r.weekReference}}</td>
                <td>{{r.category}}</td>
                <td>{{r.description}}</td>
                <td>{{r.expectedAction}}</td>
              </tr>
            </tbody>
          </table>
          <mat-paginator
            [length]="colFilter(criticalRisks(), fRisks, gRisks).length"
            [pageSize]="pageRisks.size"
            [pageIndex]="pageRisks.index"
            [pageSizeOptions]="[5, 10, 25, 50]"
            (page)="onPageRisks($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .dash-container { max-width: 1400px; margin: 0 auto; padding: 24px 16px 40px; }
    .admin-filters {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
      background: #f5f7fa; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px;
    }
    .admin-filters .filter-field { min-width: 160px; }
    .admin-filters .filter-field-wide { min-width: 220px; }

    /* ─── Header ─── */
    .dash-header {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
      color: white; border-radius: 14px; padding: 0;
      margin-bottom: 24px; overflow: hidden;
      box-shadow: 0 6px 24px rgba(31,78,121,0.22);
    }
    .dash-header-triband { height: 4px; background: linear-gradient(to right, #2E75B6 33.33%, white 33.33% 66.66%, #C00000 66.66%); }
    .dash-header-inner { display: flex; align-items: center; gap: 12px; padding: 22px 28px; }
    .dash-header-inner mat-icon { font-size: 28px; width: 28px; height: 28px; color: #BDD7EE; }
    .dash-header-inner h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: .2px; }

    /* ─── KPI cards ─── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card {
      border-radius: 14px !important;
      padding: 22px 18px !important;
      text-align: center;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
      border-top: 4px solid #2E75B6 !important;
      position: relative; overflow: hidden;
    }
    .kpi-card::after {
      content: '';
      position: absolute; bottom: -20px; right: -20px;
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(31,78,121,0.04);
    }
    .kpi-card.alert { border-top-color: #C00000 !important; background: #FFF8F8 !important; }
    .kpi-icon { font-size: 40px; width: 40px; height: 40px; margin: 0 auto 10px; display: block; }
    .kpi-icon.blue { color: #2E75B6; }
    .kpi-icon.green { color: #276221; }
    .kpi-icon.orange { color: #C55A11; }
    .kpi-icon.red { color: #C00000; }
    .kpi-val { font-size: 38px; font-weight: 800; color: #1F4E79; line-height: 1.1; }
    .kpi-card.alert .kpi-val { color: #C00000; }
    .kpi-label { font-size: 12px; color: #667085; margin-top: 6px; font-weight: 500; }

    /* ─── Charts ─── */
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .chart-card, .heatmap-card, .alerts-card {
      border-radius: 14px !important; margin-bottom: 20px;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }
    .full-width { grid-column: 1 / -1; }
    .chart { height: 280px; }
    .chart-tall { height: 320px; }
    mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 14.5px; color: #1F4E79; font-weight: 700; }
    mat-card-title mat-icon { color: #2E75B6; }

    /* ─── Heatmap ─── */
    .heatmap-wrapper { overflow-x: auto; }
    .heatmap-legend { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .legend-item { font-size: 11px; padding: 3px 11px; border-radius: 20px; font-weight: 600; }
    .legend-item.missing { background: #F0F4F8; color: #aaa; }
    .legend-item.draft { background: #FFF3E0; color: #C55A11; }
    .legend-item.submitted-late { background: #FFF0F0; color: #9E0000; }
    .legend-item.submitted-ontime { background: #F0FFF4; color: #276221; }

    table.heatmap-table { border-collapse: collapse; min-width: 800px; }
    .entity-col { width: 80px; font-weight: 600; text-align: left; padding: 6px 10px; color: #1F4E79; background: #EEF4FA; }
    .week-col { width: 60px; text-align: center; font-size: 10.5px; color: #667085; padding: 4px; max-width: 60px; background: #EEF4FA; }
    .entity-name { font-weight: 800; color: #1F4E79; padding: 8px 10px; font-size: 12.5px; }
    .cell { text-align: center; padding: 5px; border: 1px solid #F0F4F8; }
    .cell.missing { background: #F8F9FB; }
    .cell.draft { background: #FFF8F0; }
    .cell.submitted-late { background: #FFF5F5; }
    .cell.submitted-ontime { background: #F0FFF4; }
    .cell-icon { font-size: 18px; width: 18px; height: 18px; }
    .cell.missing .cell-icon { color: #D0D7E2; }
    .cell.draft .cell-icon { color: #C55A11; }
    .cell.submitted-late .cell-icon { color: #C00000; }
    .cell.submitted-ontime .cell-icon { color: #276221; }

    /* ─── Critical risks ─── */
    table.alerts-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .alerts-table th {
      background: #FFF0F0; color: #6B0000;
      padding: 8px 12px 6px; text-align: left;
      font-weight: 700; font-size: 12px; letter-spacing: .2px;
      border-bottom: 2px solid #FFCCCC; vertical-align: top;
    }
    .alerts-table td { padding: 9px 12px; border-bottom: 1px solid #FFF0F0; vertical-align: top; }
    .alerts-table tbody tr:last-child td { border-bottom: none; }
    .alerts-table tr:hover td { background: #FFF5F5; }
    .alert-title { color: #C00000 !important; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .alert-title mat-icon { color: #C00000 !important; }
    .entity-chip { background: #1F4E79; color: white; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 800; }
    .week-ref { font-size: 12px; color: #999; }

    /* ─── Column filters ─── */
    .ch-lbl { font-size: 11.5px; font-weight: 700; margin-bottom: 4px; white-space: nowrap; }
    .col-filter {
      width: 100%; padding: 2px 6px;
      border: 1px solid #ffaaaa; border-radius: 4px;
      font-size: 11px; background: #fff; color: #333;
      box-sizing: border-box;
    }
    .col-filter:focus { outline: none; border-color: #C00000; background: #fff8f8; }
    .filter-count { font-size: 12px; font-weight: 400; color: #888; }

    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  readonly entities = ENTITIES;
  readonly entityList = ENTITY_LIST;
  availableYears: string[] = [];
  weekPeriods: any[] = [];

  filterYear = '';
  filterWeekId = '';
  filterEntity = '';

  pageRisks = { index: 0, size: 10 };
  fRisks: Record<string, string> = {};

  readonly gRisks: Record<string, (r: any) => any> = {
    entityCode:     r => r.entityCode,
    weekReference:  r => r.weekReference,
    category:       r => r.category,
    description:    r => r.description,
    expectedAction: r => r.expectedAction,
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

  onPageRisks(evt: PageEvent) {
    this.pageRisks.index = evt.pageIndex;
    this.pageRisks.size = evt.pageSize;
  }

  overview = signal<any>(null);
  heatmap = signal<any[]>([]);
  submissionRateTrend = signal<any[]>([]);
  riskTrendData = signal<any[]>([]);
  criticalRisks = signal<any[]>([]);
  entityComparison = signal<any[]>([]);

  submissionRateChart = signal<EChartsOption>({});
  riskTrendChart = signal<EChartsOption>({});
  entityComparisonChart = signal<EChartsOption>({});

  ngOnInit() {
    this.api.getDashboardAvailableYears().subscribe({ next: y => this.availableYears = y, error: () => {} });
    this.api.getDashboardWeekPeriods().subscribe({ next: w => this.weekPeriods = w, error: () => {} });
    this.reload();
  }

  reload() {
    const f = {
      year: this.filterYear || undefined,
      weekId: this.filterWeekId || undefined,
      entityCode: this.filterEntity || undefined,
    };
    this.api.getAdminOverview({ year: f.year, weekId: f.weekId }).subscribe(d => this.overview.set(d));
    this.api.getCriticalRisks().subscribe(d => this.criticalRisks.set(d));
    this.api.getHeatmap(12, f).subscribe(d => this.heatmap.set(d));
    this.api.getSubmissionRateTrend(12, f).subscribe(d => {
      this.submissionRateTrend.set(d);
      this.buildSubmissionRateChart(d);
    });
    this.api.getRiskTrend(12, f).subscribe(d => {
      this.riskTrendData.set(d);
      this.buildRiskTrendChart(d);
    });
    this.api.getEntityComparison(f).subscribe(d => {
      this.entityComparison.set(d);
      this.buildEntityComparisonChart(d);
    });
  }

  clearFilters() {
    this.filterYear = '';
    this.filterWeekId = '';
    this.filterEntity = '';
    this.reload();
  }

  getPendingCount(): number {
    if (!this.overview()) return 0;
    const weeks = this.overview().recentWeeks ?? [];
    return weeks
      .filter((w: any) => w.status === 'active')
      .flatMap((w: any) => w.submissions)
      .filter((s: any) => s.status === 'draft').length;
  }

  private buildSubmissionRateChart(data: any[]) {
    this.submissionRateChart.set({
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const label = items[0]?.axisValueLabel ?? '';
          return items.reduce((html: string, p: any) =>
            html + `${p.marker} ${p.seriesName} : <strong>${p.value}%</strong><br/>`,
            `<strong>${label}</strong><br/>`);
        },
      },
      legend: { data: ['Taux soumission (%)', 'Dans délai (%)'], bottom: 0 },
      xAxis: { type: 'category', data: data.map(d => this.formatWeekShort(d.weekStart)), axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        { name: 'Taux soumission (%)', type: 'bar', data: data.map(d => d.submissionRate), itemStyle: { color: '#2E75B6' } },
        { name: 'Dans délai (%)', type: 'line', data: data.map(d => d.onTimeRate), itemStyle: { color: '#548235' }, symbol: 'circle', symbolSize: 6 },
      ],
    });
  }

  private buildRiskTrendChart(data: any[]) {
    this.riskTrendChart.set({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const label = items[0]?.axisValueLabel ?? '';
          const total = items.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
          const lines = items
            .filter((p: any) => (p.value ?? 0) > 0)
            .map((p: any) => `${p.marker} ${p.seriesName} : <strong>${p.value}</strong>`)
            .join('<br/>');
          return `<strong>${label}</strong><br/>${lines || 'Aucun risque'}<br/><hr style="margin:4px 0"/>Total : <strong>${total}</strong>`;
        },
      },
      legend: { data: ['Critique', 'Élevé', 'Modéré', 'Faible'], bottom: 0 },
      xAxis: { type: 'category', data: data.map(d => this.formatWeekShort(d.weekStart)), axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value' },
      series: [
        { name: 'Critique', type: 'bar', stack: 'total', data: data.map(d => d.critique), itemStyle: { color: '#ff4d4d' } },
        { name: 'Élevé', type: 'bar', stack: 'total', data: data.map(d => d.eleve), itemStyle: { color: '#FF9900' } },
        { name: 'Modéré', type: 'bar', stack: 'total', data: data.map(d => d.modere), itemStyle: { color: '#FFD700' } },
        { name: 'Faible', type: 'bar', stack: 'total', data: data.map(d => d.faible), itemStyle: { color: '#70AD47' } },
      ],
    });
  }

  private buildEntityComparisonChart(data: any[]) {
    this.entityComparisonChart.set({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const label = items[0]?.axisValueLabel ?? '';
          return items.reduce((html: string, p: any) =>
            html + `${p.marker} ${p.seriesName} : <strong>${p.value}</strong><br/>`,
            `<strong>${label}</strong><br/>`);
        },
      },
      legend: { data: ['Activités réalisées', 'Activités planifiées', 'Risques'], bottom: 0 },
      xAxis: { type: 'category', data: data.map(d => d.entityCode) },
      yAxis: { type: 'value' },
      series: [
        { name: 'Activités réalisées', type: 'bar', data: data.map(d => d.totalActivities), itemStyle: { color: '#2E75B6' } },
        { name: 'Activités planifiées', type: 'bar', data: data.map(d => d.totalPlanned), itemStyle: { color: '#548235' } },
        { name: 'Risques', type: 'bar', data: data.map(d => d.totalRisks), itemStyle: { color: '#C55A11' } },
      ],
    });
  }

  formatWeekShort(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  formatWeekPeriod(w: any): string {
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const status = w.status === 'active' ? ' ✓' : '';
    return `${fmt(w.weekStart)} → ${fmt(w.weekEnd)}${status}`;
  }

  getCellClass(week: any, entityCode: string): string {
    const e = week.entities?.find((x: any) => x.code === entityCode);
    if (!e || e.status === 'missing') return 'missing';
    if (e.status === 'draft') return 'draft';
    return e.onTime ? 'submitted-ontime' : 'submitted-late';
  }

  getCellIcon(week: any, entityCode: string): string {
    const e = week.entities?.find((x: any) => x.code === entityCode);
    if (!e || e.status === 'missing') return 'radio_button_unchecked';
    if (e.status === 'draft') return 'edit';
    return e.onTime ? 'check_circle' : 'check_circle';
  }

  getCellTooltip(week: any, entityCode: string): string {
    const e = week.entities?.find((x: any) => x.code === entityCode);
    if (!e || e.status === 'missing') return `${entityCode} — Non saisi`;
    if (e.status === 'draft') return `${entityCode} — Brouillon`;
    const when = e.submittedAt ? new Date(e.submittedAt).toLocaleString('fr-FR') : '';
    return `${entityCode} — Soumis ${e.onTime ? '(dans délai)' : '(hors délai)'}\n${when}`;
  }
}
