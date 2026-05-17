import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-entity-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatChipsModule, MatTooltipModule,
    MatSelectModule, MatFormFieldModule, MatPaginatorModule,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts: () => import("echarts") })],
  template: `
    <div class="entity-dash">
      <div class="dash-header">
        <div class="dash-header-inner">
          <button mat-icon-button routerLink="/home" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="entity-badge">{{entityCode}}</div>
          <div>
            <h1>Tableau de bord entité</h1>
            <p>Suivi des performances · {{weeksLabel()}}</p>
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" *ngIf="dashboard()">
        <mat-card class="kpi-card">
          <mat-icon class="kpi-icon green">check_circle</mat-icon>
          <div class="kpi-val">{{getSubmittedCount()}}</div>
          <div class="kpi-label">Semaines soumises</div>
        </mat-card>
        <mat-card class="kpi-card" [class.alert]="getOnTimeRate() < 70">
          <mat-icon class="kpi-icon" [class.green]="getOnTimeRate() >= 70" [class.orange]="getOnTimeRate() < 70">schedule</mat-icon>
          <div class="kpi-val">{{getOnTimeRate()}}%</div>
          <div class="kpi-label">Taux dans les délais</div>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-icon class="kpi-icon blue">task_alt</mat-icon>
          <div class="kpi-val">{{getTotalActivities()}}</div>
          <div class="kpi-label">Total activités réalisées</div>
        </mat-card>
        <mat-card class="kpi-card" [class.alert]="getCritiqueCount() > 0">
          <mat-icon class="kpi-icon" [class.red]="getCritiqueCount() > 0" [class.green]="getCritiqueCount() === 0">warning</mat-icon>
          <div class="kpi-val">{{getCritiqueCount()}}</div>
          <div class="kpi-label">Risques critiques signalés</div>
        </mat-card>
      </div>

      <div class="charts-grid" *ngIf="dashboard()">
        <!-- Activités par semaine -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title><mat-icon>bar_chart</mat-icon> Activités par semaine</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="activitiesChart()" class="chart"></div>
          </mat-card-content>
        </mat-card>

        <!-- Soumission dans les délais -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title><mat-icon>schedule</mat-icon> Ponctualité des soumissions</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="onTimeChart()" class="chart"></div>
          </mat-card-content>
        </mat-card>

        <!-- Évolution des risques -->
        <mat-card class="chart-card full-width">
          <mat-card-header>
            <mat-card-title><mat-icon>trending_up</mat-icon> Évolution des risques par criticité</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="riskChart()" class="chart"></div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Historique complet avec filtres -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title><mat-icon>table_chart</mat-icon> Historique des saisies</mat-card-title>
        </mat-card-header>
        <mat-card-content>

          <!-- Filtres cascade mois → semaine -->
          <div class="history-filters" *ngIf="allHistory().length > 0">
            <mat-form-field appearance="outline" class="filter-month">
              <mat-label><mat-icon>calendar_month</mat-icon> Mois</mat-label>
              <mat-select [ngModel]="selectedMonth()" (ngModelChange)="selectedMonth.set($event); onMonthChange()">
                <mat-option value="">Tous les mois</mat-option>
                <mat-option *ngFor="let m of historyMonths()" [value]="m.key">{{m.label}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-week">
              <mat-label><mat-icon>event</mat-icon> Semaine</mat-label>
              <mat-select [ngModel]="selectedWeekId()" (ngModelChange)="selectedWeekId.set($event); histPageIndex.set(0)">
                <mat-option value="">Toutes les semaines</mat-option>
                <mat-option *ngFor="let w of weeksForMonth()" [value]="w.weekId">{{w.weekReference}}</mat-option>
              </mat-select>
            </mat-form-field>
            <span class="hist-count">{{filteredHistory().length}} semaine(s)</span>
          </div>

          <div class="empty-history" *ngIf="allHistory().length === 0">
            <mat-icon>history</mat-icon>
            <p>Aucun historique disponible.</p>
          </div>

          <table class="recap-table" *ngIf="pagedHistory().length > 0">
            <thead>
              <tr>
                <th>Semaine</th>
                <th>Statut</th>
                <th>Soumission</th>
                <th>Délai</th>
                <th>Responsable</th>
                <th>Activités</th>
                <th>Planifiées</th>
                <th>Risques</th>
                <th>Critiques</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of pagedHistory()">
                <td class="week-col">{{row.weekReference}}</td>
                <td><span class="status-chip" [class]="row.weekStatus">{{row.weekStatus === 'active' ? 'Active' : 'Clôturée'}}</span></td>
                <td><span class="sub-chip" [class]="row.submissionStatus">
                  {{row.submissionStatus === 'submitted' ? '✅ Soumis' : row.submissionStatus === 'draft' ? '✏️ Brouillon' : '❌ Manquant'}}
                </span></td>
                <td>
                  <span *ngIf="row.onTime === true" class="ontime yes">✅ Dans délai</span>
                  <span *ngIf="row.onTime === false" class="ontime no">⚠️ Hors délai</span>
                  <span *ngIf="row.onTime === null">—</span>
                </td>
                <td>{{row.responsible || '—'}}</td>
                <td class="num">{{row.activitiesCount}}</td>
                <td class="num">{{row.plannedCount}}</td>
                <td class="num">{{row.risksCount}}</td>
                <td class="num" [class.red]="row.critiqueCount > 0">{{row.critiqueCount || '—'}}</td>
                <td>
                  <a mat-icon-button [routerLink]="['/entity', entityCode]"
                     [queryParams]="{week: row.weekId}" matTooltip="Consulter">
                    <mat-icon>open_in_new</mat-icon>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <mat-paginator
            *ngIf="filteredHistory().length > 2"
            [length]="filteredHistory().length"
            [pageSize]="histPageSize()"
            [pageSizeOptions]="[5, 10, 20]"
            [pageIndex]="histPageIndex()"
            (page)="onHistPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .entity-dash { max-width: 1200px; margin: 0 auto; padding: 24px 16px 40px; }

    /* ─── Header ─── */
    .dash-header {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
      color: white; border-radius: 14px; padding: 0;
      margin-bottom: 24px; overflow: hidden;
      box-shadow: 0 6px 24px rgba(31,78,121,0.22);
    }
    .dash-header-triband { height: 4px; background: linear-gradient(to right, #2E75B6 33.33%, white 33.33% 66.66%, #C00000 66.66%); }
    .dash-header-inner { display: flex; align-items: center; gap: 14px; padding: 20px 28px; }
    .back-btn { color: rgba(255,255,255,0.8) !important; }
    .entity-badge {
      background: rgba(255,255,255,0.18);
      border: 1.5px solid rgba(255,255,255,0.3);
      color: white; font-weight: 800;
      font-size: 18px; letter-spacing: 1px;
      padding: 6px 16px; border-radius: 10px;
      flex-shrink: 0;
    }
    .dash-header h1 { margin: 0 0 3px; font-size: 19px; font-weight: 800; }
    .dash-header p { margin: 0; font-size: 12.5px; opacity: 0.72; }

    /* ─── KPIs ─── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card {
      border-radius: 14px !important; padding: 22px 18px !important;
      text-align: center;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
      border-top: 4px solid #2E75B6 !important;
    }
    .kpi-card.alert { border-top-color: #C00000 !important; background: #FFF8F8 !important; }
    .kpi-icon { font-size: 38px; width: 38px; height: 38px; margin: 0 auto 10px; display: block; }
    .kpi-icon.green { color: #276221; } .kpi-icon.blue { color: #2E75B6; }
    .kpi-icon.orange { color: #C55A11; } .kpi-icon.red { color: #C00000; }
    .kpi-val { font-size: 34px; font-weight: 800; color: #1F4E79; line-height: 1.1; }
    .kpi-card.alert .kpi-val { color: #C00000; }
    .kpi-label { font-size: 12px; color: #667085; margin-top: 6px; font-weight: 500; }

    /* ─── Charts ─── */
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .chart-card {
      border-radius: 14px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }
    .full-width { grid-column: 1 / -1; }
    .chart { height: 260px; }
    mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #1F4E79; font-weight: 700; }
    mat-card-title mat-icon { color: #2E75B6; }

    /* ─── Table ─── */
    .table-card {
      border-radius: 14px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }
    table.recap-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .recap-table th {
      background: #EEF4FA; color: #1F4E79;
      padding: 10px 12px; text-align: left;
      font-weight: 700; font-size: 11.5px;
      border-bottom: 2px solid #DEEAF1; white-space: nowrap;
    }
    .recap-table td { padding: 9px 12px; border-bottom: 1px solid #F0F4F8; vertical-align: middle; }
    .recap-table tbody tr:last-child td { border-bottom: none; }
    .recap-table tr:hover td { background: #F6FAFF; }
    .week-col { font-size: 12px; color: #667085; max-width: 130px; }
    .num { text-align: center; font-weight: 700; color: #334; }
    .num.red { color: #C00000; }

    .status-chip { padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .status-chip.active { background: #C6EFCE; color: #276221; }
    .status-chip.closed { background: #F0F4F8; color: #aaa; }
    .sub-chip { font-size: 12px; }
    .ontime.yes { color: #276221; font-size: 12px; font-weight: 600; }
    .ontime.no { color: #C55A11; font-size: 12px; font-weight: 600; }

    /* ─── History filters ─── */
    .history-filters {
      display: flex; align-items: flex-start; gap: 12px;
      flex-wrap: wrap; margin-bottom: 12px; padding-top: 4px;
    }
    .filter-month { min-width: 200px; }
    .filter-week { min-width: 260px; flex: 1; }
    .hist-count {
      align-self: center; font-size: 12px; color: #667085;
      background: #F0F4F8; padding: 4px 12px; border-radius: 20px;
      font-weight: 600; white-space: nowrap;
    }
    .empty-history { text-align: center; padding: 48px 20px; color: #aaa; }
    .empty-history mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto 12px; color: #D0D7E2; }

    @media (max-width: 768px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
      .filter-week { min-width: 180px; }
    }
  `]
})
export class EntityDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  entityCode = '';
  dashboard = signal<any>(null);
  allHistory = signal<any[]>([]);
  activitiesChart = signal<EChartsOption>({});
  onTimeChart = signal<EChartsOption>({});
  riskChart = signal<EChartsOption>({});

  // History filters
  selectedMonth = signal('');
  selectedWeekId = signal('');
  histPageIndex = signal(0);
  histPageSize = signal(5);

  /** All months from history — a week belongs to a month if weekStart OR weekEnd is in that month */
  readonly historyMonths = computed(() => {
    const seen = new Set<string>();
    const months: { key: string; label: string }[] = [];
    for (const row of this.allHistory()) {
      for (const dt of [row.weekStart, row.weekEnd]) {
        if (!dt) continue;
        const d = new Date(dt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!seen.has(key)) {
          seen.add(key);
          months.push({ key, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });
        }
      }
    }
    // Sort chronologically descending
    return months.sort((a, b) => b.key.localeCompare(a.key));
  });

  /** Weeks that belong to the selected month (or all if no month selected) */
  readonly weeksForMonth = computed(() => {
    const m = this.selectedMonth();
    if (!m) return this.allHistory();
    return this.allHistory().filter(row => this.weekBelongsToMonth(row, m));
  });

  /** Rows matching both month + week filters */
  readonly filteredHistory = computed(() => {
    let rows = this.allHistory();
    const m = this.selectedMonth();
    const wid = this.selectedWeekId();
    if (m) rows = rows.filter(row => this.weekBelongsToMonth(row, m));
    if (wid) rows = rows.filter(row => row.weekId === wid);
    return rows;
  });

  readonly pagedHistory = computed(() => {
    const start = this.histPageIndex() * this.histPageSize();
    return this.filteredHistory().slice(start, start + this.histPageSize());
  });

  ngOnInit() {
    this.entityCode = this.route.snapshot.params['code'] ?? this.auth.entityCode() ?? '';
    this.api.getEntityDashboard(this.entityCode, 12).subscribe(d => {
      this.dashboard.set(d);
      this.buildCharts(d);
    });
    this.api.getEntityHistory(this.entityCode).subscribe(h => this.allHistory.set(h));
  }

  onMonthChange() {
    this.selectedWeekId.set('');
    this.histPageIndex.set(0);
  }

  onHistPage(e: PageEvent) {
    this.histPageIndex.set(e.pageIndex);
    this.histPageSize.set(e.pageSize);
  }

  private weekBelongsToMonth(row: any, monthKey: string): boolean {
    for (const dt of [row.weekStart, row.weekEnd]) {
      if (!dt) continue;
      const d = new Date(dt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key === monthKey) return true;
    }
    return false;
  }

  weeksLabel(): string { return `12 dernières semaines`; }

  getSubmittedCount(): number {
    return this.dashboard()?.recentSubmissions?.filter((r: any) => r.submissionStatus === 'submitted').length ?? 0;
  }
  getOnTimeRate(): number {
    const rows = this.dashboard()?.onTimeTrend ?? [];
    if (!rows.length) return 0;
    const onTime = rows.filter((r: any) => r.onTime).length;
    return Math.round((onTime / rows.length) * 100);
  }
  getTotalActivities(): number {
    return this.dashboard()?.submissionTrend?.reduce((s: number, r: any) => s + r.activitiesCount, 0) ?? 0;
  }
  getCritiqueCount(): number {
    return this.dashboard()?.recentSubmissions?.reduce((s: number, r: any) => s + (r.critiqueCount ?? 0), 0) ?? 0;
  }

  private buildCharts(d: any) {
    const trend = d.submissionTrend ?? [];
    const labels = trend.map((r: any) => this.fmtShort(r.weekStart));

    this.activitiesChart.set({
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const label = items[0]?.axisValueLabel ?? '';
          return items.reduce((html: string, p: any) =>
            html + `${p.marker} ${p.seriesName} : <strong>${p.value}</strong><br/>`,
            `<strong>${label}</strong><br/>`);
        },
      },
      legend: { data: ['Réalisées', 'Planifiées'], bottom: 0 },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value' },
      series: [
        { name: 'Réalisées', type: 'bar', data: trend.map((r: any) => r.activitiesCount), itemStyle: { color: '#2E75B6' } },
        { name: 'Planifiées', type: 'bar', data: trend.map((r: any) => r.plannedCount), itemStyle: { color: '#548235' } },
      ],
    });

    const onTime = d.onTimeTrend ?? [];
    this.onTimeChart.set({
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const label = p?.axisValueLabel ?? p?.name ?? '';
          const val = p?.value ?? 0;
          const status = val <= 0
            ? '✅ Dans les délais'
            : `⚠️ Retard : <strong>${val} h</strong>`;
          return `<strong>${label}</strong><br/>${status}`;
        },
      },
      xAxis: { type: 'category', data: onTime.map((r: any) => this.fmtShort(r.weekStart)), axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}h' } },
      series: [{
        name: 'Retard (h)',
        type: 'bar',
        data: onTime.map((r: any) => r.delayHours ?? 0),
        itemStyle: { color: (p: any) => p.value <= 0 ? '#548235' : '#C55A11' },
      }],
    });

    const risks = d.riskTrend ?? [];
    this.riskChart.set({
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
      xAxis: { type: 'category', data: risks.map((r: any) => this.fmtShort(r.weekStart)), axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value' },
      series: [
        { name: 'Critique', type: 'bar', stack: 'risk', data: risks.map((r: any) => r.critique), itemStyle: { color: '#ff4d4d' } },
        { name: 'Élevé', type: 'bar', stack: 'risk', data: risks.map((r: any) => r.eleve), itemStyle: { color: '#FF9900' } },
        { name: 'Modéré', type: 'bar', stack: 'risk', data: risks.map((r: any) => r.modere), itemStyle: { color: '#FFD700' } },
        { name: 'Faible', type: 'bar', stack: 'risk', data: risks.map((r: any) => r.faible), itemStyle: { color: '#70AD47' } },
      ],
    });
  }

  private fmtShort(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
}
