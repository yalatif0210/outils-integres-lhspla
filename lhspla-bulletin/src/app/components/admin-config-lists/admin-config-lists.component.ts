import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

const LIST_TYPES = [
  { key: 'rejection_reasons', label: 'Motifs de rejet budget', icon: 'cancel', hint: 'Affichés dans le formulaire de rejet (Finance / TPM / COP)' },
  { key: 'cities', label: 'Villes de mission', icon: 'location_city', hint: 'Affichées dans le formulaire de demande de mission (multi-sélect)' },
  { key: 'transport_modes', label: 'Moyens de transport', icon: 'directions_car', hint: 'Affichés dans le formulaire de demande de mission' },
];

const DEFAULT_SEEDS: Record<string, string[]> = {
  rejection_reasons: [
    'Budget incomplet',
    'Montants non justifiés',
    'Activités non éligibles au financement',
    'Non-conformité aux procédures',
    'Documentation insuffisante',
    'Dépassement du plafond autorisé',
    'Autre',
  ],
  cities: [
    'Abidjan', 'Yamoussoukro', 'Bouaké', 'Daloa', 'San Pédro', 'Korhogo',
    'Man', 'Gagnoa', 'Abengourou', 'Divo', 'Duekoué', 'Touba', 'Odienné',
    'Bondoukou', 'Sassandra', 'Agboville', 'Soubré', 'Sinfra', 'Séguéla',
    'Ferkessédougou', 'Mankono', 'Bongouanou', 'Dimbokro', 'Tiassalé', 'Lakota',
    'Issia', 'Guiglo', 'Bouaflé', 'Banfora (BF)', 'Autre',
  ],
  transport_modes: [
    'Véhicule NPSP', 'Véhicule de location', 'Transport commun', 'Avion', 'Bateau', 'Moto', 'À pied',
  ],
};

@Component({
  selector: 'app-admin-config-lists',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatTabsModule,
    MatSlideToggleModule, MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>tune</mat-icon>
          <div>
            <h1>Listes configurables</h1>
            <p>Gérez les motifs de rejet, villes et moyens de transport</p>
          </div>
        </div>
      </div>

      <mat-tab-group class="tabs-body" animationDuration="150ms">
        <mat-tab *ngFor="let listType of LIST_TYPES" [label]="listType.label">
          <div class="tab-content">
            <div class="tab-hint"><mat-icon>info_outline</mat-icon> {{listType.hint}}</div>

            <div class="add-form">
              <mat-form-field appearance="outline" class="add-field">
                <mat-label>Nouvelle valeur</mat-label>
                <input matInput [(ngModel)]="newValues[listType.key]" placeholder="Saisir une valeur..." (keydown.enter)="addItem(listType.key)">
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="addItem(listType.key)" [disabled]="!newValues[listType.key]?.trim() || saving()">
                <mat-icon>add</mat-icon> Ajouter
              </button>
              <button mat-stroked-button (click)="seedDefaults(listType.key)" [disabled]="saving()" *ngIf="items(listType.key).length === 0"
                      title="Insérer les valeurs par défaut">
                <mat-icon>playlist_add</mat-icon> Valeurs par défaut
              </button>
            </div>

            <div class="items-list" *ngIf="items(listType.key).length > 0; else emptyState">
              <div class="item-row" *ngFor="let item of items(listType.key); let i = index"
                   [class.inactive]="!item.isActive">
                <span class="item-order">{{i + 1}}</span>
                <span class="item-value" *ngIf="editingId !== item.id">{{item.value}}</span>
                <mat-form-field appearance="outline" class="edit-field" *ngIf="editingId === item.id">
                  <input matInput [(ngModel)]="editValue" (keydown.enter)="saveEdit(listType.key, item.id)" (keydown.escape)="cancelEdit()">
                </mat-form-field>
                <div class="item-actions">
                  <ng-container *ngIf="editingId !== item.id">
                    <button mat-icon-button (click)="startEdit(item)" title="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <mat-slide-toggle [checked]="item.isActive" (change)="toggleActive(listType.key, item)"
                                      [title]="item.isActive ? 'Désactiver' : 'Activer'"></mat-slide-toggle>
                    <button mat-icon-button color="warn" (click)="deleteItem(listType.key, item.id)" title="Supprimer">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngIf="editingId === item.id">
                    <button mat-icon-button color="primary" (click)="saveEdit(listType.key, item.id)" title="Enregistrer">
                      <mat-icon>check</mat-icon>
                    </button>
                    <button mat-icon-button (click)="cancelEdit()" title="Annuler">
                      <mat-icon>close</mat-icon>
                    </button>
                  </ng-container>
                </div>
              </div>
            </div>
            <ng-template #emptyState>
              <div class="empty-state">
                <mat-icon>list_alt</mat-icon>
                <p>Aucune valeur configurée. Cliquez sur "Valeurs par défaut" pour commencer.</p>
              </div>
            </ng-template>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-container { min-height:100vh; background:#f5f7fa; }
    .page-header { background:linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; padding:16px 20px; display:flex; align-items:center; gap:12px; }
    .page-header-inner { display:flex; align-items:center; gap:12px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; }
    .page-header-inner h1 { margin:0; font-size:1.2rem; font-weight:700; }
    .page-header-inner p { margin:0; font-size:.8rem; opacity:.8; }

    .tabs-body { margin:16px 20px; }
    .tab-content { padding:16px 0; display:flex; flex-direction:column; gap:14px; }
    .tab-hint { display:flex; align-items:center; gap:6px; font-size:.82rem; color:#667085; background:#f0f4f8; padding:8px 12px; border-radius:6px; }
    .tab-hint mat-icon { font-size:16px; width:16px; height:16px; color:#2E75B6; }

    .add-form { display:flex; align-items:center; gap:10px; }
    .add-field { flex:1; }

    .items-list { display:flex; flex-direction:column; gap:6px; }
    .item-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#fff; border:1px solid #e0e0e0; border-radius:8px; transition:opacity .15s; }
    .item-row.inactive { opacity:.45; background:#f5f5f5; }
    .item-order { min-width:24px; font-size:.78rem; color:#999; font-weight:700; text-align:center; }
    .item-value { flex:1; font-size:.9rem; color:#1F4E79; font-weight:500; }
    .item-actions { display:flex; align-items:center; gap:4px; margin-left:auto; }
    .edit-field { flex:1; }
    .edit-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display:none; }

    .empty-state { text-align:center; padding:32px; color:#aaa; }
    .empty-state mat-icon { font-size:40px; display:block; margin:0 auto 8px; }
    .empty-state p { font-size:.88rem; }
  `]
})
export class AdminConfigListsComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  LIST_TYPES = LIST_TYPES;
  saving = signal(false);

  private _items: Record<string, any[]> = {};
  private _itemsSignals: Record<string, ReturnType<typeof signal<any[]>>> = {};
  newValues: Record<string, string> = {};
  editingId: string | null = null;
  editValue = '';

  items(type: string): any[] {
    if (!this._itemsSignals[type]) this._itemsSignals[type] = signal([]);
    return this._itemsSignals[type]();
  }

  private setItems(type: string, data: any[]) {
    if (!this._itemsSignals[type]) this._itemsSignals[type] = signal([]);
    this._itemsSignals[type].set(data);
  }

  async ngOnInit() {
    for (const { key } of LIST_TYPES) {
      this.newValues[key] = '';
      try {
        const items = await firstValueFrom(this.api.getConfigLists(key));
        this.setItems(key, items);
      } catch {
        this.setItems(key, []);
      }
    }
  }

  async addItem(type: string) {
    const value = this.newValues[type]?.trim();
    if (!value) return;
    this.saving.set(true);
    try {
      const item = await firstValueFrom(this.api.createConfigListItem({ type, value, order: this.items(type).length }));
      this.setItems(type, [...this.items(type), item]);
      this.newValues[type] = '';
      this.snack.open(`"${value}" ajouté`, 'OK', { duration: 2000 });
    } catch {
      this.snack.open('Erreur lors de l\'ajout', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  startEdit(item: any) {
    this.editingId = item.id;
    this.editValue = item.value;
  }

  cancelEdit() {
    this.editingId = null;
    this.editValue = '';
  }

  async saveEdit(type: string, id: string) {
    const value = this.editValue.trim();
    if (!value) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.updateConfigListItem(id, { value }));
      this.setItems(type, this.items(type).map(i => i.id === id ? { ...i, value: updated.value } : i));
      this.cancelEdit();
      this.snack.open('Valeur modifiée', 'OK', { duration: 2000 });
    } catch {
      this.snack.open('Erreur lors de la modification', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(type: string, item: any) {
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.updateConfigListItem(item.id, { isActive: !item.isActive }));
      this.setItems(type, this.items(type).map(i => i.id === item.id ? { ...i, isActive: updated.isActive } : i));
    } catch {
      this.snack.open('Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteItem(type: string, id: string) {
    if (!confirm('Supprimer cette valeur ?')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteConfigListItem(id));
      this.setItems(type, this.items(type).filter(i => i.id !== id));
      this.snack.open('Valeur supprimée', 'OK', { duration: 2000 });
    } catch {
      this.snack.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async seedDefaults(type: string) {
    const values = DEFAULT_SEEDS[type];
    if (!values?.length) return;
    this.saving.set(true);
    try {
      const items = await firstValueFrom(this.api.seedConfigList(type, values));
      this.setItems(type, items);
      this.snack.open(`${items.length} valeurs insérées`, 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erreur lors de l\'initialisation', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
