import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { AppConfigService } from '../../../services/app-config.service';

const NATURES = ['CARBURANT', 'COMMUNICATION', 'FOURNITURES DE BUREAUX', 'HEBERGEMENT', 'PERDIEM', 'RESTAURATION', 'TRANSPORT'];

@Component({
  selector: 'app-cost-items',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTableModule, MatChipsModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="ci-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>list_alt</mat-icon>
          <div>
            <h1>Grille de coûts</h1>
            <p>{{items().length}} postes actifs · Géré par Admin Finance</p>
          </div>
        </div>
      </div>

      <div class="ci-body">

        <!-- ── Paramètres financiers (admin_finance uniquement) ── -->
        <mat-card class="finance-params-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>tune</mat-icon>
            <mat-card-title>Paramètres de calcul</mat-card-title>
            <mat-card-subtitle>Taux appliqués à tous les budgets</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="params-grid">
              <div class="param-item" *ngFor="let p of financeParams()">
                <div class="param-label">
                  <mat-icon>{{p.icon}}</mat-icon>
                  <span>{{p.label}}</span>
                </div>
                <mat-form-field appearance="outline" class="param-field">
                  <mat-label>Valeur</mat-label>
                  <input matInput [type]="p.inputType ?? 'text'" [(ngModel)]="p.draft"
                         [placeholder]="p.placeholder">
                  <span matSuffix *ngIf="p.suffix">{{p.suffix}}</span>
                </mat-form-field>
                <button class="btn-param-save" (click)="saveParam(p)"
                        [disabled]="p.draft === p.value || paramSaving()">
                  <mat-icon>save</mat-icon>
                  {{p.draft === p.value ? 'À jour' : 'Enregistrer'}}
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Filtres -->
        <div class="filters-bar">
          <mat-form-field appearance="outline" class="filter-nature">
            <mat-label>Filtrer par nature</mat-label>
            <mat-select [(ngModel)]="filterNature">
              <mat-option value="">Toutes</mat-option>
              <mat-option *ngFor="let n of natures" [value]="n">{{n}}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-search">
            <mat-label>Recherche</mat-label>
            <input matInput [(ngModel)]="filterText" placeholder="Désignation...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <button mat-raised-button class="btn-add" (click)="openForm()">
            <mat-icon>add</mat-icon> Nouveau poste
          </button>
        </div>

        <!-- Formulaire ajout/édition -->
        <mat-card class="form-card" *ngIf="showForm">
          <mat-card-header>
            <mat-icon mat-card-avatar>{{editId ? 'edit' : 'add_circle'}}</mat-icon>
            <mat-card-title>{{editId ? 'Modifier le poste' : 'Nouveau poste de dépense'}}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" class="item-form">
              <mat-form-field appearance="outline">
                <mat-label>Nature</mat-label>
                <mat-select formControlName="nature">
                  <mat-option *ngFor="let n of natures" [value]="n">{{n}}</mat-option>
                  <mat-option value="__new__">+ Nouvelle nature...</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" *ngIf="form.get('nature')?.value === '__new__'">
                <mat-label>Nom de la nouvelle nature</mat-label>
                <input matInput formControlName="newNature">
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Désignation</mat-label>
                <input matInput formControlName="designation">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Coût unitaire (FCFA)</mat-label>
                <input matInput type="number" formControlName="unitCost">
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Pièces justificatives</mat-label>
                <input matInput formControlName="justificatif" placeholder="FACTURE + BON DE LIVRAISON...">
              </mat-form-field>
            </form>
          </mat-card-content>
          <mat-card-actions>
            <button mat-stroked-button (click)="cancelForm()">Annuler</button>
            <button mat-raised-button class="btn-save" (click)="save()" [disabled]="form.invalid || saving()">
              <mat-icon>save</mat-icon> {{editId ? 'Enregistrer' : 'Ajouter'}}
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Tableau par nature -->
        <ng-container *ngFor="let group of groupedItems()">
          <div class="nature-group" *ngIf="!filterNature || filterNature === group.nature">
            <div class="nature-header">
              <span class="nature-badge">{{group.nature}}</span>
              <span class="nature-count">{{group.items.length}} poste(s)</span>
            </div>
            <div class="items-table-wrap">
              <table class="items-table">
                <thead>
                  <tr>
                    <th class="col-desig">Désignation</th>
                    <th class="col-cost">Coût unitaire (FCFA)</th>
                    <th class="col-justif">Pièces justificatives</th>
                    <th class="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of group.items">
                    <td class="desig-cell">{{item.designation}}</td>
                    <td class="cost-cell">{{fmtCost(item.unitCost)}}</td>
                    <td class="justif-cell">{{item.justificatif}}</td>
                    <td class="actions-cell">
                      <button mat-icon-button matTooltip="Modifier" (click)="edit(item)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Désactiver" (click)="deactivate(item.id)">
                        <mat-icon color="warn">delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>

        <div class="empty-state" *ngIf="filteredItems().length === 0 && !loading()">
          <mat-icon>search_off</mat-icon>
          <p>Aucun poste trouvé</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ci-container { padding:0; }
    .page-header { background:linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; position:relative; }
    .page-header-triband { height:6px; background:linear-gradient(to right,#F4A623 33.3%,#fff 33.3% 66.6%,#1F8A3C 66.6%); }
    .page-header-inner { display:flex; align-items:center; gap:12px; padding:16px 20px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.25rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.8; font-size:.82rem; }

    .ci-body { padding:16px 20px; max-width:1200px; margin:0 auto; }

    .filters-bar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .filter-nature { width:220px; }
    .filter-search { flex:1; min-width:200px; }
    .btn-add { background:#1F4E79 !important; color:#fff !important; margin-left:auto; }

    .form-card { margin-bottom:20px; border-top:4px solid #2E75B6 !important; }
    .item-form { display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; }
    .item-form mat-form-field { min-width:200px; }
    .item-form .wide { flex:1; min-width:300px; }
    .btn-save { background:#1F8A3C !important; color:#fff !important; }

    .nature-group { margin-bottom:24px; }
    .nature-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    .nature-badge {
      background:#1F4E79; color:#fff;
      padding:3px 14px; border-radius:20px;
      font-size:.8rem; font-weight:700; text-transform:uppercase;
    }
    .nature-count { font-size:.78rem; color:#888; }

    .items-table-wrap { border-radius:8px; border:1px solid #e0e0e0; overflow:hidden; }
    .items-table { width:100%; border-collapse:collapse; font-size:.83rem; }
    .items-table thead tr { background:#f5f7fa; }
    .items-table thead th { padding:8px 10px; text-align:left; font-weight:700; color:#1F4E79; border-bottom:1px solid #e0e0e0; white-space:nowrap; }
    .items-table tbody tr { border-bottom:1px solid #f0f0f0; }
    .items-table tbody tr:last-child { border-bottom:none; }
    .items-table tbody tr:hover { background:#f8f9fb; }
    .col-desig { min-width:250px; }
    .col-cost { width:160px; }
    .col-justif { min-width:200px; }
    .col-actions { width:90px; }
    .desig-cell { padding:6px 10px; }
    .cost-cell { padding:6px 10px; font-family:monospace; font-weight:600; color:#1F4E79; }
    .justif-cell { padding:6px 10px; font-size:.78rem; color:#555; }
    .actions-cell { padding:2px 4px; text-align:center; }

    .finance-params-card { margin-bottom:20px; border-top:4px solid #F4A623 !important; }
    .params-grid { display:flex; flex-wrap:wrap; gap:16px; margin-top:8px; }
    .param-item { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .param-label { display:flex; align-items:center; gap:6px; min-width:220px; font-size:.85rem; color:#444; }
    .param-label mat-icon { font-size:18px; width:18px; height:18px; color:#1F4E79; }
    .param-field { width:160px; }
    .btn-param-save {
      background:#1F4E79; color:#fff; border:none; border-radius:6px;
      padding:6px 14px; cursor:pointer; font-size:.8rem; display:flex; align-items:center; gap:4px;
    }
    .btn-param-save:disabled { opacity:.5; cursor:default; }
    .btn-param-save mat-icon { font-size:16px; width:16px; height:16px; }

    .empty-state { text-align:center; padding:48px; color:#aaa; }
    .empty-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; }
  `]
})
export class CostItemsComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private cfg = inject(AppConfigService);
  readonly auth = inject(AuthService);

  items = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  paramSaving = signal(false);
  financeParams = signal<Array<{ key: string; label: string; value: string; draft: string; icon: string; placeholder: string; suffix?: string; inputType?: string }>>([]);
  showForm = false;
  editId: string | null = null;
  filterNature = '';
  filterText = '';
  natures = NATURES;

  form = this.fb.group({
    nature: ['', Validators.required],
    newNature: [''],
    designation: ['', Validators.required],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    justificatif: [''],
  });

  filteredItems = computed(() => {
    let list = this.items();
    if (this.filterNature) list = list.filter(i => i.nature === this.filterNature);
    if (this.filterText) {
      const t = this.filterText.toLowerCase();
      list = list.filter(i => i.designation.toLowerCase().includes(t));
    }
    return list;
  });

  groupedItems = computed(() => {
    const map = new Map<string, any[]>();
    for (const item of this.filteredItems()) {
      if (!map.has(item.nature)) map.set(item.nature, []);
      map.get(item.nature)!.push(item);
    }
    return Array.from(map.entries()).map(([nature, items]) => ({ nature, items }));
  });

  ngOnInit() {
    this.load();
    this.api.getAppConfig().subscribe(config => {
      this.financeParams.set([
        { key: 'exchange_rate', label: 'Taux de change (FCFA/1 USD)', icon: 'currency_exchange', placeholder: '600', inputType: 'number', value: config['exchange_rate'] ?? '600', draft: config['exchange_rate'] ?? '600' },
        { key: 'tva_rate', label: 'Taux TVA (ex: 0.18 = 18%)', icon: 'receipt_long', placeholder: '0.18', inputType: 'number', value: config['tva_rate'] ?? '0.18', draft: config['tva_rate'] ?? '0.18' },
        { key: 'tdt_rate', label: 'Taux TDT (ex: 0.025 = 2.5%)', icon: 'receipt_long', placeholder: '0.025', inputType: 'number', value: config['tdt_rate'] ?? '0.025', draft: config['tdt_rate'] ?? '0.025' },
        { key: 'transfer_fee_rate', label: 'Frais transfert Contractualisation (ex: 0.05 = 5%)', icon: 'percent', placeholder: '0.05', inputType: 'number', value: config['transfer_fee_rate'] ?? '0.05', draft: config['transfer_fee_rate'] ?? '0.05' },
      ]);
    });
  }

  saveParam(p: any) {
    if (p.draft === p.value) return;
    this.paramSaving.set(true);
    this.api.updateAppConfig(p.key, p.draft).subscribe({
      next: () => {
        p.value = p.draft;
        this.cfg.set(p.key, p.draft);
        this.snack.open('Paramètre enregistré', 'OK', { duration: 2000 });
        this.paramSaving.set(false);
      },
      error: () => { this.snack.open('Erreur', 'OK', { duration: 3000 }); this.paramSaving.set(false); },
    });
  }

  load() {
    this.loading.set(true);
    this.api.getCostItems(false).subscribe({
      next: data => { this.items.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm() { this.showForm = true; this.editId = null; this.form.reset({ unitCost: 0 }); }
  cancelForm() { this.showForm = false; this.editId = null; this.form.reset(); }

  edit(item: any) {
    this.editId = item.id;
    this.showForm = true;
    this.form.patchValue({
      nature: item.nature,
      designation: item.designation,
      unitCost: item.unitCost,
      justificatif: item.justificatif ?? '',
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    const nature = v.nature === '__new__' ? v.newNature! : v.nature!;
    const payload = { nature, designation: v.designation!, unitCost: v.unitCost!, justificatif: v.justificatif ?? '' };

    const req = this.editId
      ? this.api.updateCostItem(this.editId, payload)
      : this.api.createCostItem(payload);

    req.subscribe({
      next: () => {
        this.snack.open(this.editId ? 'Poste mis à jour' : 'Poste ajouté', 'OK', { duration: 2500 });
        this.cancelForm();
        this.load();
      },
      error: () => this.snack.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 }),
      complete: () => this.saving.set(false),
    });
  }

  deactivate(id: string) {
    if (!confirm('Désactiver ce poste de coût ?')) return;
    this.api.deleteCostItem(id).subscribe({
      next: () => { this.snack.open('Poste désactivé', 'OK', { duration: 2500 }); this.load(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }

  fmtCost(v: number) {
    return new Intl.NumberFormat('fr-FR').format(v) + ' FCFA';
  }
}
