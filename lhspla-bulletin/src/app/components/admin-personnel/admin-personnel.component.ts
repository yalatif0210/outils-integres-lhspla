import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface PersonnelItem {
  id: string;
  fullName: string;
  service: string;
  function: string;
  waveNumber?: string;
  email?: string;
  isActive: boolean;
  order: number;
}

@Component({
  selector: 'app-admin-personnel',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatSnackBarModule, MatTooltipModule, MatDialogModule,
  ],
  template: `
    <div class="personnel-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>people</mat-icon>
          <div>
            <h1>Gestion du Personnel</h1>
            <p>Liste des agents et staffs administrables pour les demandes de mission</p>
          </div>
          <div class="header-actions">
            <button mat-raised-button class="btn-seed"
                    *ngIf="auth.isSuperAdmin() && list().length === 0"
                    (click)="seed()" [disabled]="saving()">
              <mat-icon>auto_fix_high</mat-icon> Initialiser (seed)
            </button>
            <button mat-raised-button color="primary" (click)="openForm(null)" [disabled]="saving()">
              <mat-icon>person_add</mat-icon> Ajouter
            </button>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Rechercher</mat-label>
          <input matInput [(ngModel)]="searchText" placeholder="Nom, service, fonction...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <label class="show-inactive-toggle">
          <input type="checkbox" [(ngModel)]="showInactive" (ngModelChange)="reload()">
          Afficher inactifs
        </label>
        <span class="count-chip">{{filtered().length}} agent(s)</span>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon><p>Chargement...</p>
      </div>
      <div *ngIf="!loading() && filtered().length === 0" class="empty-state">
        <mat-icon>people_outline</mat-icon>
        <p>Aucun agent trouvé.</p>
        <button mat-stroked-button *ngIf="auth.isSuperAdmin() && list().length === 0"
                (click)="seed()" [disabled]="saving()">
          <mat-icon>auto_fix_high</mat-icon> Initialiser la liste (seed)
        </button>
      </div>

      <div class="personnel-table" *ngIf="!loading() && filtered().length > 0">
        <table>
          <thead>
            <tr>
              <th class="col-order">#</th>
              <th>Nom complet</th>
              <th>Service</th>
              <th>Fonction</th>
              <th>N° Wave</th>
              <th>Email</th>
              <th class="col-status">Statut</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of filtered()" [class.inactive]="!p.isActive">
              <td class="col-order">{{p.order}}</td>
              <td class="name-cell">{{p.fullName}}</td>
              <td>{{p.service}}</td>
              <td>{{p.function}}</td>
              <td>{{p.waveNumber || '—'}}</td>
              <td>{{p.email || '—'}}</td>
              <td class="col-status">
                <span class="status-badge" [class.active]="p.isActive" [class.inactive-badge]="!p.isActive">
                  {{p.isActive ? 'Actif' : 'Inactif'}}
                </span>
              </td>
              <td class="col-actions">
                <button mat-icon-button matTooltip="Modifier" (click)="openForm(p)" [disabled]="saving()">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button [matTooltip]="p.isActive ? 'Désactiver' : 'Réactiver'"
                        (click)="toggleActive(p)" [disabled]="saving()">
                  <mat-icon>{{p.isActive ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Supprimer" color="warn"
                        *ngIf="auth.isSuperAdmin()"
                        (click)="remove(p)" [disabled]="saving()">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Formulaire inline (modale légère) -->
    <div class="form-overlay" *ngIf="formOpen()" (click)="closeForm()">
      <div class="form-panel" (click)="$event.stopPropagation()">
        <h2>{{editingId() ? 'Modifier l\'agent' : 'Nouvel agent'}}</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nom complet *</mat-label>
            <input matInput [(ngModel)]="formData.fullName" placeholder="Prénom NOM">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Service *</mat-label>
            <input matInput [(ngModel)]="formData.service" placeholder="SUIVI-EVAL, ADMIN...">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fonction *</mat-label>
            <input matInput [(ngModel)]="formData.function" placeholder="Coordinateur, Assistant...">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>N° Wave</mat-label>
            <input matInput [(ngModel)]="formData.waveNumber" placeholder="Numéro Wave Money">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput [(ngModel)]="formData.email" type="email" placeholder="agent@npsp-ci.org">
          </mat-form-field>
        </div>
        <div class="form-actions">
          <button mat-stroked-button (click)="closeForm()">Annuler</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving() || !formValid()">
            <mat-icon>save</mat-icon> {{saving() ? 'Enregistrement...' : 'Enregistrer'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .personnel-container { padding: 0; position: relative; }

    .page-header { background: linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%); color:#fff; }
    .page-header-triband { height:6px; background:linear-gradient(to right,#F4A623 33.3%,#fff 33.3% 66.6%,#1F8A3C 66.6%); }
    .page-header-inner { display:flex; align-items:center; gap:12px; padding:16px 20px; }
    .page-header-inner mat-icon { font-size:28px; width:28px; height:28px; opacity:.9; }
    .page-header-inner h1 { margin:0; font-size:1.2rem; font-weight:700; }
    .page-header-inner p { margin:0; opacity:.8; font-size:.82rem; }
    .header-actions { margin-left:auto; display:flex; gap:8px; }
    .btn-seed { background:#F4A623; color:#fff; }

    .filter-bar { display:flex; align-items:center; gap:16px; padding:12px 20px; background:#f8f9fa; border-bottom:1px solid #e0e0e0; flex-wrap:wrap; }
    .search-field { min-width:260px; }
    .show-inactive-toggle { display:flex; align-items:center; gap:6px; font-size:.85rem; color:#555; cursor:pointer; }
    .count-chip { margin-left:auto; background:#1F4E79; color:#fff; padding:3px 14px; border-radius:14px; font-size:.8rem; font-weight:700; }

    .loading-state, .empty-state { text-align:center; padding:60px; color:#888; }
    .loading-state mat-icon, .empty-state mat-icon { font-size:48px; display:block; margin:0 auto 12px; }

    .personnel-table { padding:16px 20px; overflow-x:auto; }
    table { width:100%; border-collapse:collapse; font-size:.87rem; }
    thead tr { background:#f0f4f8; }
    th { padding:10px 12px; text-align:left; font-weight:700; color:#1F4E79; border-bottom:2px solid #dce8f3; white-space:nowrap; }
    td { padding:10px 12px; border-bottom:1px solid #f0f0f0; vertical-align:middle; }
    tr.inactive td { opacity:.55; }
    tr:hover td { background:#f8fafc; }
    .col-order { width:40px; text-align:center; color:#aaa; font-size:.8rem; }
    .name-cell { font-weight:600; color:#1F4E79; }
    .col-status { width:90px; }
    .col-actions { width:120px; white-space:nowrap; }

    .status-badge { padding:3px 10px; border-radius:12px; font-size:.75rem; font-weight:700; }
    .status-badge.active { background:#e8f5e9; color:#2e7d32; }
    .status-badge.inactive-badge { background:#fafafa; color:#aaa; border:1px solid #ddd; }

    /* overlay form */
    .form-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; display:flex; align-items:center; justify-content:center; }
    .form-panel { background:#fff; border-radius:12px; padding:28px 32px; width:520px; max-width:95vw; box-shadow:0 8px 40px rgba(0,0,0,.25); }
    .form-panel h2 { margin:0 0 20px; color:#1F4E79; font-size:1.1rem; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .full-width { grid-column:1/-1; }
    .form-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
  `]
})
export class AdminPersonnelComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  snack = inject(MatSnackBar);

  list = signal<PersonnelItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  searchText = '';
  showInactive = false;

  formOpen = signal(false);
  editingId = signal<string | null>(null);
  formData: { fullName: string; service: string; function: string; waveNumber: string; email: string } = {
    fullName: '', service: '', function: '', waveNumber: '', email: '',
  };

  filtered = computed(() => {
    const txt = this.searchText.toLowerCase();
    return this.list().filter(p => {
      if (!this.showInactive && !p.isActive) return false;
      if (!txt) return true;
      return p.fullName.toLowerCase().includes(txt)
        || p.service.toLowerCase().includes(txt)
        || p.function.toLowerCase().includes(txt);
    });
  });

  formValid() {
    return this.formData.fullName.trim() && this.formData.service.trim() && this.formData.function.trim();
  }

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.api.getPersonnel(this.showInactive).subscribe({
      next: data => { this.list.set(data); this.loading.set(false); },
      error: () => { this.snack.open('Erreur de chargement', 'OK', { duration: 3000 }); this.loading.set(false); },
    });
  }

  openForm(p: PersonnelItem | null) {
    if (p) {
      this.editingId.set(p.id);
      this.formData = { fullName: p.fullName, service: p.service, function: p.function, waveNumber: p.waveNumber ?? '', email: p.email ?? '' };
    } else {
      this.editingId.set(null);
      this.formData = { fullName: '', service: '', function: '', waveNumber: '', email: '' };
    }
    this.formOpen.set(true);
  }

  closeForm() { this.formOpen.set(false); }

  async save() {
    if (!this.formValid()) return;
    this.saving.set(true);
    const payload: any = {
      fullName: this.formData.fullName.trim(),
      service: this.formData.service.trim(),
      function: this.formData.function.trim(),
    };
    if (this.formData.waveNumber.trim()) payload.waveNumber = this.formData.waveNumber.trim();
    if (this.formData.email.trim()) payload.email = this.formData.email.trim();

    try {
      const id = this.editingId();
      if (id) {
        const updated = await firstValueFrom(this.api.updatePersonnel(id, payload));
        this.list.update(list => list.map(p => p.id === id ? updated : p));
        this.snack.open('Agent mis à jour', 'OK', { duration: 2500 });
      } else {
        const created = await firstValueFrom(this.api.createPersonnel(payload));
        this.list.update(list => [...list, created]);
        this.snack.open('Agent ajouté', 'OK', { duration: 2500 });
      }
      this.closeForm();
    } catch {
      this.snack.open('Erreur lors de l\'enregistrement', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(p: PersonnelItem) {
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.updatePersonnel(p.id, { isActive: !p.isActive }));
      this.list.update(list => list.map(x => x.id === p.id ? updated : x));
      this.snack.open(p.isActive ? 'Agent désactivé' : 'Agent réactivé', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async remove(p: PersonnelItem) {
    if (!confirm(`Supprimer définitivement ${p.fullName} ?`)) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deletePersonnel(p.id));
      this.list.update(list => list.filter(x => x.id !== p.id));
      this.snack.open('Agent supprimé', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async seed() {
    if (!confirm('Initialiser la liste du personnel avec les agents NPSP-CI ?')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.seedPersonnel());
      this.snack.open('Initialisation terminée', 'OK', { duration: 2500 });
      this.reload();
    } catch {
      this.snack.open('Erreur lors de l\'initialisation', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
