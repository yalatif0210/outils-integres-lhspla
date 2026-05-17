import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AppConfigService } from '../../services/app-config.service';
import { AuthService } from '../../services/auth.service';
import { ENTITIES } from '../../models/bulletin.models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTabsModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="settings-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>tune</mat-icon>
          <h1>Paramètres de l'application</h1>
        </div>
      </div>

      <mat-tab-group class="main-tabs" animationDuration="150ms">

        <!-- ── Onglet 1 : App Config ── -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>settings</mat-icon>&nbsp;Configuration</ng-template>
          <div class="tab-body">
            <div *ngIf="configLoading()" class="loading-state">
              <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
            </div>
            <div class="settings-grid" *ngIf="!configLoading()">
              <mat-card class="setting-card" *ngFor="let item of visibleItems()"
                        [class.finance-highlight]="item.key === 'fiscal_year_tag'">
                <mat-card-content>
                  <div class="setting-label">
                    <mat-icon class="setting-icon">settings</mat-icon>
                    <span>{{item.label}}</span>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Valeur</mat-label>
                    <input matInput [(ngModel)]="item.draft" [placeholder]="item.label">
                  </mat-form-field>
                  <div class="setting-preview" *ngIf="item.draft !== item.value">
                    <mat-icon>visibility</mat-icon>
                    <span>Aperçu : <em>{{item.draft}}</em></span>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button class="btn-save" (click)="saveConfig(item)"
                          [disabled]="item.draft === item.value || saving()">
                    <mat-icon>save</mat-icon>
                    {{item.draft === item.value ? 'Aucune modification' : 'Enregistrer'}}
                  </button>
                  <button mat-button (click)="item.draft = item.value" *ngIf="item.draft !== item.value">Annuler</button>
                </mat-card-actions>
              </mat-card>
            </div>

            <!-- Toggle MEMO budgétaire — super_admin uniquement -->
            <mat-card class="setting-card memo-toggle-card" *ngIf="auth.isSuperAdmin() && !configLoading()">
              <mat-card-content>
                <div class="setting-label">
                  <mat-icon class="setting-icon" style="color:#7b1fa2">edit_note</mat-icon>
                  <span>{{memoEnabledItem()?.label ?? 'Activer la gestion des MEMOs budgétaires'}}</span>
                  <span class="super-admin-badge">super_admin</span>
                </div>
                <p style="font-size:12px;color:#666;margin:0 0 12px">
                  Active la saisie de memos (rallonge, réduction, sans incidence) sur les budgets approuvés,
                  avec recalcul automatique du montant total et contrôle des paiements.
                </p>
                <div class="memo-toggle-row">
                  <span class="memo-status" [class.active]="memoEnabled()">
                    <mat-icon>{{memoEnabled() ? 'toggle_on' : 'toggle_off'}}</mat-icon>
                    {{memoEnabled() ? 'ACTIVÉ' : 'DÉSACTIVÉ'}}
                  </span>
                  <button class="btn-save" (click)="toggleMemoEnabled()" [disabled]="saving()">
                    <mat-icon>{{memoEnabled() ? 'toggle_off' : 'toggle_on'}}</mat-icon>
                    {{memoEnabled() ? 'Désactiver' : 'Activer'}} les MEMOs
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ── Onglet 2 : Références Activités ── -->
        <mat-tab *ngIf="!isFinanceOnly()">
          <ng-template mat-tab-label><mat-icon>task_alt</mat-icon>&nbsp;Références activités</ng-template>
          <div class="tab-body">

            <mat-card class="add-card" *ngIf="showRefForm()">
              <mat-card-header>
                <mat-card-title>{{editRefId() ? 'Modifier' : 'Nouvelle'}} référence activité</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="ref-form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Entité *</mat-label>
                    <mat-select [(ngModel)]="refForm.entityCode">
                      <mat-option *ngFor="let e of entities" [value]="e.code">{{e.code}} — {{e.fullName}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>OS</mat-label>
                    <input matInput [(ngModel)]="refForm.os" placeholder="ex: OS 4">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>OO</mat-label>
                    <input matInput [(ngModel)]="refForm.oo" placeholder="ex: OO 4.2">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Code activité</mat-label>
                    <input matInput [(ngModel)]="refForm.activityCode" placeholder="ex: 4.2.3">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>ID Tâche</mat-label>
                    <input matInput [(ngModel)]="refForm.taskId" placeholder="ex: 4.2.3.1">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="span-full">
                    <mat-label>Titre de l'activité *</mat-label>
                    <input matInput [(ngModel)]="refForm.title" placeholder="ex: Evaluation des besoins en formation...">
                  </mat-form-field>
                </div>
              </mat-card-content>
              <mat-card-actions>
                <button class="btn-save" (click)="saveRef()" [disabled]="!refForm.entityCode || !refForm.title">
                  <mat-icon>save</mat-icon> {{editRefId() ? 'Modifier' : 'Ajouter'}}
                </button>
                <button mat-button (click)="cancelRef()">Annuler</button>
              </mat-card-actions>
            </mat-card>

            <div class="list-toolbar">
              <span class="count-badge">
                <mat-icon class="badge-icon">filter_list</mat-icon>
                {{filteredRefs().length}} / {{allRefs().length}} référence(s)
              </span>
              <button class="btn-new" (click)="openRefForm()" *ngIf="!showRefForm()">
                <mat-icon>add</mat-icon> Nouvelle référence
              </button>
              <label class="btn-import" matTooltip="Colonnes attendues : entité | OS | OO | code activité | id tâche | titre activité">
                <mat-icon>table_view</mat-icon>
                {{importingRefs() ? 'Import...' : 'Importer Excel'}}
                <input type="file" accept=".xlsx,.xls" (change)="importRefs($event)" [disabled]="importingRefs()" hidden>
              </label>
              <button class="btn-clear" *ngIf="hasRefFilter()" (click)="clearRefFilter()" matTooltip="Effacer les filtres">
                <mat-icon>filter_alt_off</mat-icon> Effacer filtres
              </button>
            </div>

            <mat-card class="table-card">
              <mat-card-content>
                <div class="table-scroll">
                  <table class="ref-table">
                    <thead>
                      <tr>
                        <th>Entité</th><th>OS</th><th>OO</th><th>Code</th><th>ID Tâche</th>
                        <th>Titre</th><th class="col-actions-h"></th>
                      </tr>
                      <tr class="filter-row">
                        <td>
                          <select class="filter-select" [(ngModel)]="refF.entity" (ngModelChange)="refPage.set(1)">
                            <option value="">Toutes</option>
                            <option *ngFor="let e of entities" [value]="e.code">{{e.code}}</option>
                          </select>
                        </td>
                        <td><input class="filter-input" [(ngModel)]="refF.os" (ngModelChange)="refPage.set(1)" placeholder="OS…"></td>
                        <td><input class="filter-input" [(ngModel)]="refF.oo" (ngModelChange)="refPage.set(1)" placeholder="OO…"></td>
                        <td><input class="filter-input" [(ngModel)]="refF.code" (ngModelChange)="refPage.set(1)" placeholder="Code…"></td>
                        <td><input class="filter-input" [(ngModel)]="refF.taskId" (ngModelChange)="refPage.set(1)" placeholder="ID…"></td>
                        <td><input class="filter-input" [(ngModel)]="refF.title" (ngModelChange)="refPage.set(1)" placeholder="Titre…"></td>
                        <td></td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let r of pagedRefs()">
                        <td><span class="entity-chip">{{r.entityCode}}</span></td>
                        <td class="code-cell">{{r.os || '—'}}</td>
                        <td class="code-cell">{{r.oo || '—'}}</td>
                        <td class="code-cell">{{r.activityCode || '—'}}</td>
                        <td class="code-cell">{{r.taskId || '—'}}</td>
                        <td class="title-cell">{{r.title}}</td>
                        <td class="actions-cell">
                          <button mat-icon-button (click)="editRef(r)" matTooltip="Modifier"><mat-icon>edit</mat-icon></button>
                          <button mat-icon-button color="warn" (click)="deleteRef(r)" matTooltip="Désactiver"><mat-icon>delete_outline</mat-icon></button>
                        </td>
                      </tr>
                      <tr *ngIf="filteredRefs().length === 0">
                        <td colspan="7" class="empty-row">Aucune référence correspondant aux filtres.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="paginator">
                  <span class="pag-info">{{pagedInfo(filteredRefs().length, refPage())}}</span>
                  <div class="pag-controls">
                    <button class="pag-btn" [disabled]="refPage() <= 1" (click)="refPage.set(refPage() - 1)">
                      <mat-icon>chevron_left</mat-icon>
                    </button>
                    <span class="pag-num">{{refPage()}} / {{totalPages(filteredRefs().length)}}</span>
                    <button class="pag-btn" [disabled]="refPage() >= totalPages(filteredRefs().length)" (click)="refPage.set(refPage() + 1)">
                      <mat-icon>chevron_right</mat-icon>
                    </button>
                  </div>
                  <select class="pag-size" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                    <option [ngValue]="10">10 / page</option>
                    <option [ngValue]="25">25 / page</option>
                    <option [ngValue]="50">50 / page</option>
                  </select>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ── Onglet 3 : Thèmes Risques ── -->
        <mat-tab *ngIf="!isFinanceOnly()">
          <ng-template mat-tab-label><mat-icon>label_outline</mat-icon>&nbsp;Thèmes de risques</ng-template>
          <div class="tab-body">

            <mat-card class="add-card" *ngIf="showThemeForm()">
              <mat-card-content>
                <div class="cat-form-row">
                  <mat-form-field appearance="outline" class="flex1">
                    <mat-label>{{editThemeId() ? 'Modifier le thème' : 'Nouveau thème *'}}</mat-label>
                    <input matInput [(ngModel)]="themeName" placeholder="ex: Gouvernance, Approvisionnement, RH…">
                  </mat-form-field>
                  <button class="btn-save" (click)="saveTheme()" [disabled]="!themeName.trim()">
                    <mat-icon>save</mat-icon> {{editThemeId() ? 'Modifier' : 'Ajouter'}}
                  </button>
                  <button mat-button (click)="cancelTheme()">Annuler</button>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="list-toolbar">
              <span class="count-badge">
                <mat-icon class="badge-icon">filter_list</mat-icon>
                {{filteredThemes().length}} / {{riskThemes().length}} thème(s)
              </span>
              <button class="btn-new" (click)="openThemeForm()" *ngIf="!showThemeForm()">
                <mat-icon>add</mat-icon> Nouveau thème
              </button>
              <label class="btn-import" matTooltip="Colonnes attendues : theme | categorie — une ligne par catégorie">
                <mat-icon>table_view</mat-icon>
                {{importingThemes() ? 'Import...' : 'Importer Excel (Thèmes + Catégories)'}}
                <input type="file" accept=".xlsx,.xls" (change)="importThemesCategories($event)" [disabled]="importingThemes()" hidden>
              </label>
              <button class="btn-clear" *ngIf="hasThemeFilter()" (click)="clearThemeFilter()" matTooltip="Effacer les filtres">
                <mat-icon>filter_alt_off</mat-icon> Effacer filtres
              </button>
            </div>

            <mat-card class="table-card">
              <mat-card-content>
                <table class="ref-table">
                  <thead>
                    <tr><th>Thème</th><th>Statut</th><th class="col-actions-h"></th></tr>
                    <tr class="filter-row">
                      <td><input class="filter-input" [(ngModel)]="themeF.name" (ngModelChange)="themePage.set(1)" placeholder="Rechercher…"></td>
                      <td>
                        <select class="filter-select" [(ngModel)]="themeF.status" (ngModelChange)="themePage.set(1)">
                          <option value="">Tous</option>
                          <option value="active">Actif</option>
                          <option value="inactive">Inactif</option>
                        </select>
                      </td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let t of pagedThemes()">
                      <td class="title-cell">{{t.name}}</td>
                      <td><span class="status-chip" [class.active]="t.isActive">{{t.isActive ? 'Actif' : 'Inactif'}}</span></td>
                      <td class="actions-cell">
                        <button mat-icon-button (click)="editTheme(t)" matTooltip="Modifier"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button color="warn" (click)="deleteTheme(t)" matTooltip="Désactiver"><mat-icon>delete_outline</mat-icon></button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredThemes().length === 0">
                      <td colspan="3" class="empty-row">Aucun thème correspondant aux filtres.</td>
                    </tr>
                  </tbody>
                </table>
                <div class="paginator">
                  <span class="pag-info">{{pagedInfo(filteredThemes().length, themePage())}}</span>
                  <div class="pag-controls">
                    <button class="pag-btn" [disabled]="themePage() <= 1" (click)="themePage.set(themePage() - 1)">
                      <mat-icon>chevron_left</mat-icon>
                    </button>
                    <span class="pag-num">{{themePage()}} / {{totalPages(filteredThemes().length)}}</span>
                    <button class="pag-btn" [disabled]="themePage() >= totalPages(filteredThemes().length)" (click)="themePage.set(themePage() + 1)">
                      <mat-icon>chevron_right</mat-icon>
                    </button>
                  </div>
                  <select class="pag-size" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                    <option [ngValue]="10">10 / page</option>
                    <option [ngValue]="25">25 / page</option>
                    <option [ngValue]="50">50 / page</option>
                  </select>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ── Onglet 4 : Catégories Risques ── -->
        <mat-tab *ngIf="!isFinanceOnly()">
          <ng-template mat-tab-label><mat-icon>warning_amber</mat-icon>&nbsp;Catégories de risques</ng-template>
          <div class="tab-body">

            <mat-card class="add-card" *ngIf="showCatForm()">
              <mat-card-content>
                <div class="cat-form-row">
                  <mat-form-field appearance="outline" class="flex1">
                    <mat-label>{{editCatId() ? 'Modifier la catégorie' : 'Nouvelle catégorie *'}}</mat-label>
                    <input matInput [(ngModel)]="catName" placeholder="ex: Ressources humaines, Approvisionnement…">
                  </mat-form-field>
                  <mat-form-field appearance="outline" style="min-width:200px">
                    <mat-label>Thème</mat-label>
                    <mat-select [(ngModel)]="catThemeId">
                      <mat-option value="">— Aucun thème —</mat-option>
                      <mat-option *ngFor="let t of riskThemes()" [value]="t.id">{{t.name}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button class="btn-save" (click)="saveCat()" [disabled]="!catName.trim()">
                    <mat-icon>save</mat-icon> {{editCatId() ? 'Modifier' : 'Ajouter'}}
                  </button>
                  <button mat-button (click)="cancelCat()">Annuler</button>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="list-toolbar">
              <span class="count-badge">
                <mat-icon class="badge-icon">filter_list</mat-icon>
                {{filteredCats().length}} / {{riskCategories().length}} catégorie(s)
              </span>
              <button class="btn-new" (click)="openCatForm()" *ngIf="!showCatForm()">
                <mat-icon>add</mat-icon> Nouvelle catégorie
              </button>
              <button class="btn-clear" *ngIf="hasCatFilter()" (click)="clearCatFilter()" matTooltip="Effacer les filtres">
                <mat-icon>filter_alt_off</mat-icon> Effacer filtres
              </button>
            </div>

            <mat-card class="table-card">
              <mat-card-content>
                <table class="ref-table">
                  <thead>
                    <tr><th>Thème</th><th>Catégorie</th><th>Statut</th><th class="col-actions-h"></th></tr>
                    <tr class="filter-row">
                      <td>
                        <select class="filter-select" [(ngModel)]="catF.themeId" (ngModelChange)="catPage.set(1)">
                          <option value="">Tous les thèmes</option>
                          <option *ngFor="let t of riskThemes()" [value]="t.id">{{t.name}}</option>
                        </select>
                      </td>
                      <td><input class="filter-input" [(ngModel)]="catF.name" (ngModelChange)="catPage.set(1)" placeholder="Rechercher…"></td>
                      <td>
                        <select class="filter-select" [(ngModel)]="catF.status" (ngModelChange)="catPage.set(1)">
                          <option value="">Toutes</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let c of pagedCats()">
                      <td class="theme-chip-cell">
                        <span class="theme-chip" *ngIf="getThemeName(c.themeId) as tn">{{tn}}</span>
                        <span class="no-theme" *ngIf="!getThemeName(c.themeId)">—</span>
                      </td>
                      <td class="title-cell">{{c.name}}</td>
                      <td><span class="status-chip" [class.active]="c.isActive">{{c.isActive ? 'Active' : 'Inactive'}}</span></td>
                      <td class="actions-cell">
                        <button mat-icon-button (click)="editCat(c)" matTooltip="Modifier"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button color="warn" (click)="deleteCat(c)" matTooltip="Désactiver"><mat-icon>delete_outline</mat-icon></button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredCats().length === 0">
                      <td colspan="4" class="empty-row">Aucune catégorie correspondant aux filtres.</td>
                    </tr>
                  </tbody>
                </table>
                <div class="paginator">
                  <span class="pag-info">{{pagedInfo(filteredCats().length, catPage())}}</span>
                  <div class="pag-controls">
                    <button class="pag-btn" [disabled]="catPage() <= 1" (click)="catPage.set(catPage() - 1)">
                      <mat-icon>chevron_left</mat-icon>
                    </button>
                    <span class="pag-num">{{catPage()}} / {{totalPages(filteredCats().length)}}</span>
                    <button class="pag-btn" [disabled]="catPage() >= totalPages(filteredCats().length)" (click)="catPage.set(catPage() + 1)">
                      <mat-icon>chevron_right</mat-icon>
                    </button>
                  </div>
                  <select class="pag-size" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                    <option [ngValue]="10">10 / page</option>
                    <option [ngValue]="25">25 / page</option>
                    <option [ngValue]="50">50 / page</option>
                  </select>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ── Onglet 5 : Fonds de Financement ── -->
        <mat-tab *ngIf="!isFinanceOnly()">
          <ng-template mat-tab-label><mat-icon>account_balance</mat-icon>&nbsp;Fonds de financement</ng-template>
          <div class="tab-body">

            <mat-card class="add-card" *ngIf="showFundForm()">
              <mat-card-content>
                <div class="cat-form-row">
                  <mat-form-field appearance="outline" class="flex1">
                    <mat-label>Nom du fonds *</mat-label>
                    <input matInput [(ngModel)]="fundName" placeholder="ex: Fond USAID">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Code *</mat-label>
                    <input matInput [(ngModel)]="fundCode" placeholder="ex: USAID-01" style="text-transform:uppercase">
                  </mat-form-field>
                  <mat-form-field appearance="outline" style="width:100px">
                    <mat-label>Ordre</mat-label>
                    <input matInput type="number" [(ngModel)]="fundOrder" min="0">
                  </mat-form-field>
                  <button class="btn-save" (click)="saveFund()" [disabled]="!fundName.trim() || !fundCode.trim()">
                    <mat-icon>save</mat-icon> {{editFundId() ? 'Modifier' : 'Ajouter'}}
                  </button>
                  <button mat-button (click)="cancelFund()">Annuler</button>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="list-toolbar">
              <span class="count-badge">
                <mat-icon class="badge-icon">filter_list</mat-icon>
                {{filteredFunds().length}} / {{financingFunds().length}} fonds
              </span>
              <button class="btn-new" (click)="openFundForm()" *ngIf="!showFundForm()">
                <mat-icon>add</mat-icon> Nouveau fonds
              </button>
              <button class="btn-clear" *ngIf="hasFundFilter()" (click)="clearFundFilter()" matTooltip="Effacer les filtres">
                <mat-icon>filter_alt_off</mat-icon> Effacer filtres
              </button>
            </div>

            <mat-card class="table-card">
              <mat-card-content>
                <table class="ref-table">
                  <thead>
                    <tr><th>Nom</th><th>Code</th><th>Ordre</th><th>Statut</th><th class="col-actions-h"></th></tr>
                    <tr class="filter-row">
                      <td><input class="filter-input" [(ngModel)]="fundF.name" (ngModelChange)="fundPage.set(1)" placeholder="Nom…"></td>
                      <td><input class="filter-input" [(ngModel)]="fundF.code" (ngModelChange)="fundPage.set(1)" placeholder="Code…"></td>
                      <td></td>
                      <td>
                        <select class="filter-select" [(ngModel)]="fundF.status" (ngModelChange)="fundPage.set(1)">
                          <option value="">Tous</option>
                          <option value="active">Actif</option>
                          <option value="inactive">Inactif</option>
                        </select>
                      </td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let f of pagedFunds()">
                      <td class="title-cell">{{f.name}}</td>
                      <td class="code-cell">{{f.code}}</td>
                      <td class="num-cell">{{f.order}}</td>
                      <td><span class="status-chip" [class.active]="f.isActive">{{f.isActive ? 'Actif' : 'Inactif'}}</span></td>
                      <td class="actions-cell">
                        <button mat-icon-button (click)="editFund(f)" matTooltip="Modifier"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button color="warn" (click)="deleteFund(f)" matTooltip="Désactiver"><mat-icon>delete_outline</mat-icon></button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredFunds().length === 0">
                      <td colspan="5" class="empty-row">Aucun fonds correspondant aux filtres.</td>
                    </tr>
                  </tbody>
                </table>
                <div class="paginator">
                  <span class="pag-info">{{pagedInfo(filteredFunds().length, fundPage())}}</span>
                  <div class="pag-controls">
                    <button class="pag-btn" [disabled]="fundPage() <= 1" (click)="fundPage.set(fundPage() - 1)">
                      <mat-icon>chevron_left</mat-icon>
                    </button>
                    <span class="pag-num">{{fundPage()}} / {{totalPages(filteredFunds().length)}}</span>
                    <button class="pag-btn" [disabled]="fundPage() >= totalPages(filteredFunds().length)" (click)="fundPage.set(fundPage() + 1)">
                      <mat-icon>chevron_right</mat-icon>
                    </button>
                  </div>
                  <select class="pag-size" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                    <option [ngValue]="10">10 / page</option>
                    <option [ngValue]="25">25 / page</option>
                    <option [ngValue]="50">50 / page</option>
                  </select>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ── Onglet 6 : Modèle Demande de Paiement ── -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>receipt_long</mat-icon>&nbsp;Modèle paiement</ng-template>
          <div class="tab-body">
            <mat-card class="setting-card">
              <mat-card-content>
                <div class="setting-label">
                  <mat-icon class="setting-icon">table_view</mat-icon>
                  <span>Modèle Excel — Demande de paiement</span>
                </div>
                <p style="font-size:12.5px;color:#555;margin:0 0 16px">
                  Ce fichier Excel est mis à disposition des entités pour déposer leurs demandes de paiement.
                  Seul <strong>admin_finance</strong> ou <strong>super_admin</strong> peut le mettre à jour.
                </p>
                <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
                  <label class="btn-template-upload" *ngIf="auth.isAdminFinance() || auth.isSuperAdmin()">
                    <mat-icon>upload_file</mat-icon>
                    {{templateUploading() ? 'Envoi...' : 'Déposer le modèle Excel'}}
                    <input type="file" accept=".xlsx,.xls" (change)="uploadTemplate($event)"
                           [disabled]="templateUploading()" hidden>
                  </label>
                  <button mat-stroked-button (click)="downloadTemplate()" class="btn-template-dl">
                    <mat-icon>download</mat-icon> Télécharger le modèle
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .settings-container { max-width: 1100px; margin: 0 auto; padding: 24px 16px 40px; }

    .page-header {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
      color: white; border-radius: 14px; padding: 0;
      margin-bottom: 24px; overflow: hidden;
      box-shadow: 0 6px 24px rgba(31,78,121,0.22);
    }
    .page-header-inner { display: flex; align-items: center; gap: 12px; padding: 22px 28px; }
    .page-header-inner mat-icon { font-size: 28px; width: 28px; height: 28px; color: #BDD7EE; }
    .page-header-inner h1 { margin: 0; font-size: 21px; font-weight: 800; }

    .main-tabs { background: transparent; }
    .tab-body { padding: 20px 0; display: flex; flex-direction: column; gap: 16px; }

    .loading-state { text-align: center; padding: 60px; color: #aaa; }
    .loading-state mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto 12px; color: #BDD7EE; }

    /* ── Config tab ── */
    .settings-grid { display: flex; flex-direction: column; gap: 16px; }
    .setting-card {
      border-radius: 14px !important; border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.08) !important;
    }
    .finance-highlight { border-color: #f57c00 !important; background: #fff8f0 !important; }
    .memo-toggle-card { border-color: #7b1fa2 !important; background: #fce4ec !important; }
    .super-admin-badge { background: #7b1fa2; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 8px; margin-left: 8px; }
    .memo-toggle-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .memo-status { display: flex; align-items: center; gap: 5px; font-weight: 700; font-size: 13px; }
    .memo-status mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .memo-status { color: #888; }
    .memo-status.active { color: #1b5e20; }
    .setting-label { display: flex; align-items: center; gap: 8px; color: #1F4E79; font-weight: 700; font-size: 14px; margin-bottom: 12px; }
    .setting-icon { color: #2E75B6; font-size: 20px; width: 20px; height: 20px; }
    .full-width { width: 100%; }
    .setting-preview {
      display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #667085;
      background: #F6FAFF; padding: 8px 12px; border-radius: 8px; margin-top: 4px; border: 1px solid #DEEAF1;
    }
    .setting-preview mat-icon { font-size: 16px; width: 16px; height: 16px; color: #2E75B6; }
    .setting-preview em { color: #1F4E79; font-style: normal; font-weight: 600; }

    /* ── Shared buttons ── */
    .btn-save {
      background: #1F4E79; color: white; border: none; border-radius: 8px;
      height: 38px; padding: 0 18px; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background .15s;
    }
    .btn-save:hover:not(:disabled) { background: #163d61; }
    .btn-save:disabled { background: #D0D7E2; color: #aaa; cursor: not-allowed; }
    .btn-save mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .btn-new {
      background: #C00000; color: white; border: none; border-radius: 8px;
      height: 38px; padding: 0 18px; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background .15s;
    }
    .btn-new:hover { background: #a30000; }
    .btn-new mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .btn-clear {
      background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; border-radius: 8px;
      height: 38px; padding: 0 14px; font-size: 12.5px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 5px; transition: background .15s;
    }
    .btn-clear:hover { background: #ffe0b2; }
    .btn-clear mat-icon { font-size: 17px; width: 17px; height: 17px; }

    .btn-import {
      display: inline-flex; align-items: center; gap: 6px;
      background: #276221; color: #fff; border: none; border-radius: 8px;
      height: 38px; padding: 0 16px; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background .15s; white-space: nowrap;
    }
    .btn-import:hover { background: #1e4d18; }
    .btn-import mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .btn-template-upload {
      display: inline-flex; align-items: center; gap: 6px;
      background: #1F4E79; color: #fff; border: none; border-radius: 8px;
      height: 38px; padding: 0 18px; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background .15s;
    }
    .btn-template-upload:hover { background: #163d61; }
    .btn-template-upload mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-template-dl { color: #1F4E79; border-color: #1F4E79; }

    /* ── Add card ── */
    .add-card {
      border-radius: 14px !important; border: 2px solid #2E75B6 !important;
      box-shadow: 0 4px 16px rgba(46,117,182,0.15) !important;
    }
    .add-card mat-card-title { color: #1F4E79; font-size: 15px; font-weight: 700; }

    /* ── Forms ── */
    .ref-form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .span-full { grid-column: 1 / -1; }
    .cat-form-row { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .flex1 { flex: 1; min-width: 260px; }

    /* ── Toolbar ── */
    .list-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .count-badge {
      background: #EEF4FA; color: #1F4E79; padding: 6px 14px;
      border-radius: 20px; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; gap: 4px;
    }
    .badge-icon { font-size: 14px; width: 14px; height: 14px; }

    /* ── Table card ── */
    .table-card { border-radius: 14px !important; border: 1px solid #E8EDF5 !important; box-shadow: 0 2px 12px rgba(31,78,121,0.08) !important; }
    .table-scroll { overflow-x: auto; }
    table.ref-table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 500px; }

    /* Header row */
    .ref-table th {
      background: #EEF4FA; color: #1F4E79; padding: 10px 12px;
      text-align: left; font-weight: 700; font-size: 11.5px;
      border-bottom: 1px solid #DEEAF1; white-space: nowrap;
    }
    .col-actions-h { width: 80px; }

    /* Filter row */
    .filter-row td {
      background: #F5F8FC; padding: 5px 8px;
      border-bottom: 2px solid #DEEAF1;
    }
    .filter-input {
      width: 100%; height: 28px; box-sizing: border-box;
      border: 1px solid #D0DAE8; border-radius: 5px;
      padding: 2px 7px; font-size: 11.5px; background: #fff; outline: none;
      color: #333;
    }
    .filter-input:focus { border-color: #2E75B6; box-shadow: 0 0 0 2px rgba(46,117,182,0.12); }
    .filter-input::placeholder { color: #b0b8c8; }
    .filter-select {
      width: 100%; height: 28px; box-sizing: border-box;
      border: 1px solid #D0DAE8; border-radius: 5px;
      padding: 2px 5px; font-size: 11.5px; background: #fff;
      cursor: pointer; color: #333; outline: none;
    }
    .filter-select:focus { border-color: #2E75B6; }

    /* Data rows */
    .ref-table td { padding: 9px 12px; border-bottom: 1px solid #F0F4F8; vertical-align: middle; }
    .ref-table tbody tr:last-child td { border-bottom: none; }
    .ref-table tbody tr:hover td { background: #F6FAFF; }
    .code-cell { font-family: monospace; font-size: 12px; color: #2E75B6; font-weight: 600; }
    .title-cell { max-width: 320px; word-break: break-word; }
    .actions-cell { white-space: nowrap; }
    .empty-row { text-align: center; color: #aaa; font-style: italic; padding: 28px !important; }
    .num-cell { text-align: center; }

    /* Chips */
    .entity-chip { background: #1F4E79; color: white; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 800; }
    .status-chip { padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #f0f0f0; color: #aaa; }
    .status-chip.active { background: #C6EFCE; color: #276221; }
    .theme-chip-cell { white-space: nowrap; }
    .theme-chip { background: #E8EDF5; color: #1F4E79; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .no-theme { color: #ccc; }

    /* ── Paginator ── */
    .paginator {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 10px 14px; border-top: 1px solid #EEF4FA;
      background: #FAFCFF; border-radius: 0 0 12px 12px;
      font-size: 12px; color: #555;
    }
    .pag-info { flex: 1; min-width: 120px; color: #666; }
    .pag-controls { display: flex; align-items: center; gap: 6px; }
    .pag-btn {
      background: #EEF4FA; border: 1px solid #DEEAF1; border-radius: 6px;
      width: 30px; height: 30px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #1F4E79; transition: background .12s; padding: 0;
    }
    .pag-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .pag-btn:hover:not(:disabled) { background: #DEEAF1; }
    .pag-btn:disabled { opacity: 0.38; cursor: default; }
    .pag-num { font-weight: 700; color: #1F4E79; min-width: 64px; text-align: center; font-size: 12px; }
    .pag-size {
      border: 1px solid #DEEAF1; border-radius: 6px;
      padding: 3px 7px; font-size: 11.5px; background: #fff;
      cursor: pointer; height: 30px; color: #333;
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  private api = inject(ApiService);
  private cfg = inject(AppConfigService);
  private snack = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  readonly entities = ENTITIES;

  readonly isFinanceOnly = () =>
    this.auth.hasAnyRole('admin_finance') && !this.auth.hasAnyRole('super_admin', 'admin_system');

  readonly financeConfigKeys = ['fiscal_year_tag', 'exchange_rate', 'tva_rate', 'tdt_rate', 'transfer_fee_rate'];

  // memo_enabled est géré par un toggle dédié (super_admin uniquement), pas dans la liste générique
  readonly SUPER_ADMIN_ONLY_KEYS = ['memo_enabled'];

  visibleItems = () => {
    const list = this.items().filter(i => !this.SUPER_ADMIN_ONLY_KEYS.includes(i.key));
    if (this.isFinanceOnly()) return list.filter(i => this.financeConfigKeys.includes(i.key));
    return list;
  };

  memoEnabledItem = () => this.items().find(i => i.key === 'memo_enabled');
  memoEnabled = () => this.memoEnabledItem()?.value === 'true';

  // ── Config tab ──
  items = signal<{ key: string; label: string; value: string; draft: string }[]>([]);
  configLoading = signal(true);
  saving = signal(false);

  // ── Data signals ──
  allRefs = signal<any[]>([]);
  riskThemes = signal<any[]>([]);
  riskCategories = signal<any[]>([]);
  financingFunds = signal<any[]>([]);

  // ── Pagination ──
  pageSize = 10;
  refPage = signal(1);
  themePage = signal(1);
  catPage = signal(1);
  fundPage = signal(1);

  // ── Filter state ──
  refF = { entity: '', os: '', oo: '', code: '', taskId: '', title: '' };
  themeF = { name: '', status: '' };
  catF = { themeId: '', name: '', status: '' };
  fundF = { name: '', code: '', status: '' };

  // ── Form state — refs ──
  showRefForm = signal(false);
  editRefId = signal<string | null>(null);
  refForm: any = { entityCode: '', os: '', oo: '', activityCode: '', taskId: '', title: '' };

  // ── Form state — themes ──
  showThemeForm = signal(false);
  editThemeId = signal<string | null>(null);
  themeName = '';

  // ── Form state — categories ──
  showCatForm = signal(false);
  editCatId = signal<string | null>(null);
  catName = '';
  catThemeId = '';

  // ── Form state — funds ──
  showFundForm = signal(false);
  editFundId = signal<string | null>(null);
  fundName = '';
  fundCode = '';
  fundOrder = 0;

  ngOnInit() {
    this.api.getAppConfigFull().subscribe({
      next: list => { this.items.set(list.map(i => ({ ...i, draft: i.value }))); this.configLoading.set(false); },
      error: () => this.configLoading.set(false),
    });
    this.loadRefs();
    this.loadThemes();
    this.loadCats();
    this.loadFunds();
  }

  // ── Pagination helpers ──
  totalPages(count: number): number { return Math.max(1, Math.ceil(count / this.pageSize)); }
  pagedInfo(count: number, page: number): string {
    if (count === 0) return 'Aucun résultat';
    const from = (page - 1) * this.pageSize + 1;
    const to = Math.min(page * this.pageSize, count);
    return `${from}–${to} sur ${count}`;
  }
  onPageSizeChange() { this.refPage.set(1); this.themePage.set(1); this.catPage.set(1); this.fundPage.set(1); }

  // ── Filtered + paged — refs ──
  filteredRefs(): any[] {
    const f = this.refF;
    const q = (s: string) => s.toLowerCase();
    return this.allRefs().filter(r =>
      (!f.entity || r.entityCode === f.entity) &&
      (!f.os || r.os?.toLowerCase().includes(q(f.os))) &&
      (!f.oo || r.oo?.toLowerCase().includes(q(f.oo))) &&
      (!f.code || r.activityCode?.toLowerCase().includes(q(f.code))) &&
      (!f.taskId || r.taskId?.toLowerCase().includes(q(f.taskId))) &&
      (!f.title || r.title?.toLowerCase().includes(q(f.title)))
    );
  }
  pagedRefs(): any[] {
    const p = this.refPage(), s = this.pageSize;
    return this.filteredRefs().slice((p - 1) * s, p * s);
  }
  hasRefFilter(): boolean { const f = this.refF; return !!(f.entity || f.os || f.oo || f.code || f.taskId || f.title); }
  clearRefFilter() { this.refF = { entity: '', os: '', oo: '', code: '', taskId: '', title: '' }; this.refPage.set(1); }

  // ── Filtered + paged — themes ──
  filteredThemes(): any[] {
    const f = this.themeF;
    return this.riskThemes().filter(t =>
      (!f.name || t.name.toLowerCase().includes(f.name.toLowerCase())) &&
      (!f.status || (f.status === 'active' ? t.isActive : !t.isActive))
    );
  }
  pagedThemes(): any[] {
    const p = this.themePage(), s = this.pageSize;
    return this.filteredThemes().slice((p - 1) * s, p * s);
  }
  hasThemeFilter(): boolean { return !!(this.themeF.name || this.themeF.status); }
  clearThemeFilter() { this.themeF = { name: '', status: '' }; this.themePage.set(1); }

  // ── Filtered + paged — categories ──
  filteredCats(): any[] {
    const f = this.catF;
    return this.riskCategories().filter(c =>
      (!f.themeId || c.themeId === f.themeId) &&
      (!f.name || c.name.toLowerCase().includes(f.name.toLowerCase())) &&
      (!f.status || (f.status === 'active' ? c.isActive : !c.isActive))
    );
  }
  pagedCats(): any[] {
    const p = this.catPage(), s = this.pageSize;
    return this.filteredCats().slice((p - 1) * s, p * s);
  }
  hasCatFilter(): boolean { return !!(this.catF.themeId || this.catF.name || this.catF.status); }
  clearCatFilter() { this.catF = { themeId: '', name: '', status: '' }; this.catPage.set(1); }

  // ── Filtered + paged — funds ──
  filteredFunds(): any[] {
    const f = this.fundF;
    return this.financingFunds().filter(fn =>
      (!f.name || fn.name.toLowerCase().includes(f.name.toLowerCase())) &&
      (!f.code || fn.code.toLowerCase().includes(f.code.toLowerCase())) &&
      (!f.status || (f.status === 'active' ? fn.isActive : !fn.isActive))
    );
  }
  pagedFunds(): any[] {
    const p = this.fundPage(), s = this.pageSize;
    return this.filteredFunds().slice((p - 1) * s, p * s);
  }
  hasFundFilter(): boolean { return !!(this.fundF.name || this.fundF.code || this.fundF.status); }
  clearFundFilter() { this.fundF = { name: '', code: '', status: '' }; this.fundPage.set(1); }

  // ── Config ──
  saveConfig(item: any) {
    if (item.draft === item.value) return;
    this.saving.set(true);
    this.api.updateAppConfig(item.key, item.draft).subscribe({
      next: () => { item.value = item.draft; this.cfg.set(item.key, item.draft); this.snack.open('Paramètre enregistré', 'OK', { duration: 2000 }); this.saving.set(false); },
      error: () => { this.snack.open('Erreur', 'OK', { duration: 3000 }); this.saving.set(false); },
    });
  }

  toggleMemoEnabled() {
    const item = this.memoEnabledItem();
    if (!item) return;
    const newValue = item.value === 'true' ? 'false' : 'true';
    this.saving.set(true);
    this.api.updateAppConfig('memo_enabled', newValue).subscribe({
      next: () => {
        item.value = newValue;
        item.draft = newValue;
        this.cfg.set('memo_enabled', newValue);
        this.snack.open(`MEMOs budgétaires ${newValue === 'true' ? 'activés' : 'désactivés'}`, 'OK', { duration: 2500 });
        this.saving.set(false);
      },
      error: () => { this.snack.open('Erreur', 'OK', { duration: 3000 }); this.saving.set(false); },
    });
  }

  // ── Activity refs ──
  loadRefs() { this.api.getAllActivityRefs().subscribe(list => this.allRefs.set(list)); }

  openRefForm() {
    this.editRefId.set(null);
    this.refForm = { entityCode: '', os: '', oo: '', activityCode: '', taskId: '', title: '' };
    this.showRefForm.set(true);
  }
  editRef(r: any) {
    this.editRefId.set(r.id);
    this.refForm = { entityCode: r.entityCode, os: r.os, oo: r.oo, activityCode: r.activityCode, taskId: r.taskId, title: r.title };
    this.showRefForm.set(true);
  }
  saveRef() {
    const obs = this.editRefId()
      ? this.api.updateActivityRef(this.editRefId()!, this.refForm)
      : this.api.createActivityRef(this.refForm);
    obs.subscribe({
      next: () => { this.snack.open(this.editRefId() ? 'Référence modifiée' : 'Référence ajoutée', 'OK', { duration: 2000 }); this.loadRefs(); this.cancelRef(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }
  cancelRef() { this.showRefForm.set(false); this.editRefId.set(null); }
  deleteRef(r: any) {
    if (!confirm(`Désactiver la référence "${r.title}" ?`)) return;
    this.api.deleteActivityRef(r.id).subscribe({
      next: () => { this.snack.open('Référence désactivée', 'OK', { duration: 2000 }); this.loadRefs(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }

  // ── Risk themes ──
  loadThemes() { this.api.getAllRiskThemes().subscribe(list => this.riskThemes.set(list)); }

  getThemeName(themeId: string | null): string {
    if (!themeId) return '';
    return this.riskThemes().find(t => t.id === themeId)?.name ?? '';
  }
  openThemeForm() { this.editThemeId.set(null); this.themeName = ''; this.showThemeForm.set(true); }
  editTheme(t: any) { this.editThemeId.set(t.id); this.themeName = t.name; this.showThemeForm.set(true); }
  saveTheme() {
    if (!this.themeName.trim()) return;
    const obs = this.editThemeId()
      ? this.api.updateRiskTheme(this.editThemeId()!, { name: this.themeName.trim() })
      : this.api.createRiskTheme({ name: this.themeName.trim() });
    obs.subscribe({
      next: () => { this.snack.open(this.editThemeId() ? 'Thème modifié' : 'Thème ajouté', 'OK', { duration: 2000 }); this.loadThemes(); this.cancelTheme(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }
  cancelTheme() { this.showThemeForm.set(false); this.editThemeId.set(null); this.themeName = ''; }
  deleteTheme(t: any) {
    if (!confirm(`Désactiver le thème "${t.name}" ?`)) return;
    this.api.deleteRiskTheme(t.id).subscribe({
      next: () => { this.snack.open('Thème désactivé', 'OK', { duration: 2000 }); this.loadThemes(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }

  // ── Risk categories ──
  loadCats() { this.api.getAllRiskCategories().subscribe(list => this.riskCategories.set(list)); }

  openCatForm() { this.editCatId.set(null); this.catName = ''; this.catThemeId = ''; this.showCatForm.set(true); }
  editCat(c: any) { this.editCatId.set(c.id); this.catName = c.name; this.catThemeId = c.themeId ?? ''; this.showCatForm.set(true); }
  saveCat() {
    if (!this.catName.trim()) return;
    const payload: any = { name: this.catName.trim(), themeId: this.catThemeId || null };
    const obs = this.editCatId()
      ? this.api.updateRiskCategory(this.editCatId()!, payload)
      : this.api.createRiskCategory(payload);
    obs.subscribe({
      next: () => { this.snack.open(this.editCatId() ? 'Catégorie modifiée' : 'Catégorie ajoutée', 'OK', { duration: 2000 }); this.loadCats(); this.cancelCat(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }
  cancelCat() { this.showCatForm.set(false); this.editCatId.set(null); this.catName = ''; this.catThemeId = ''; }
  deleteCat(c: any) {
    if (!confirm(`Désactiver la catégorie "${c.name}" ?`)) return;
    this.api.deleteRiskCategory(c.id).subscribe({
      next: () => { this.snack.open('Catégorie désactivée', 'OK', { duration: 2000 }); this.loadCats(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }

  // ── Financing funds ──
  loadFunds() { this.api.getAllFinancingFunds().subscribe(list => this.financingFunds.set(list)); }

  openFundForm() { this.editFundId.set(null); this.fundName = ''; this.fundCode = ''; this.fundOrder = 0; this.showFundForm.set(true); }
  editFund(f: any) { this.editFundId.set(f.id); this.fundName = f.name; this.fundCode = f.code; this.fundOrder = f.order; this.showFundForm.set(true); }
  saveFund() {
    if (!this.fundName.trim() || !this.fundCode.trim()) return;
    const payload = { name: this.fundName.trim(), code: this.fundCode.trim().toUpperCase(), order: this.fundOrder };
    const obs = this.editFundId()
      ? this.api.updateFinancingFund(this.editFundId()!, payload)
      : this.api.createFinancingFund(payload);
    obs.subscribe({
      next: () => { this.snack.open(this.editFundId() ? 'Fonds modifié' : 'Fonds ajouté', 'OK', { duration: 2000 }); this.loadFunds(); this.cancelFund(); },
      error: () => this.snack.open('Erreur (nom/code déjà existant ?)', 'OK', { duration: 3000 }),
    });
  }
  cancelFund() { this.showFundForm.set(false); this.editFundId.set(null); }
  deleteFund(f: any) {
    if (!confirm(`Désactiver le fonds "${f.name}" ?`)) return;
    this.api.deleteFinancingFund(f.id).subscribe({
      next: () => { this.snack.open('Fonds désactivé', 'OK', { duration: 2000 }); this.loadFunds(); },
      error: () => this.snack.open('Erreur', 'OK', { duration: 3000 }),
    });
  }

  // ── Excel imports ──
  importingRefs = signal(false);
  importingThemes = signal(false);

  async importRefs(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    this.importingRefs.set(true);
    try {
      const res = await firstValueFrom(this.api.importActivityRefs(fd));
      this.snack.open(`Import terminé — ${res.created} créée(s), ${res.skipped} ignorée(s)`, 'OK', { duration: 5000 });
      this.loadRefs();
    } catch {
      this.snack.open('Erreur lors de l\'import Excel', 'OK', { duration: 4000 });
    } finally {
      this.importingRefs.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async importThemesCategories(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    this.importingThemes.set(true);
    try {
      const res = await firstValueFrom(this.api.importRiskThemesCategories(fd));
      const msg = `Thèmes : ${res.themes.created} créé(s), ${res.themes.existing} existant(s) · Catégories : ${res.categories.created} créée(s), ${res.categories.existing} mise(s) à jour`;
      this.snack.open(msg, 'OK', { duration: 6000 });
      this.loadThemes();
      this.loadCats();
    } catch {
      this.snack.open('Erreur lors de l\'import Excel', 'OK', { duration: 4000 });
    } finally {
      this.importingThemes.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  // ── Payment template ──
  templateUploading = signal(false);

  async uploadTemplate(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    this.templateUploading.set(true);
    try {
      await firstValueFrom(this.api.uploadPaymentTemplate(fd));
      this.snack.open('Modèle Excel mis à jour', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors du dépôt du modèle', 'OK', { duration: 3000 });
    } finally {
      this.templateUploading.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async downloadTemplate() {
    try {
      const blob = await firstValueFrom(this.api.downloadPaymentTemplate());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'modele_demande_paiement.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snack.open('Aucun modèle disponible. Veuillez d\'abord en déposer un.', 'OK', { duration: 4000 });
    }
  }
}
