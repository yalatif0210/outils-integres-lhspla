import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

const ENTITIES = ['CAD', 'CAC', 'PMO', 'QAD', 'SE', 'SI', 'FINANCES', 'COM'];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTableModule, MatChipsModule, MatSnackBarModule,
    MatDialogModule, MatTooltipModule, MatPaginatorModule
  ],
  template: `
    <div class="users-container">
      <div class="page-header">
        <div class="page-header-inner">
          <mat-icon>manage_accounts</mat-icon>
          <h1>Gestion des utilisateurs</h1>
          <button class="btn-new" (click)="showForm.set(true)" *ngIf="!showForm()">
            <mat-icon>add</mat-icon> Nouvel utilisateur
          </button>
        </div>
      </div>

      <!-- Formulaire création -->
      <mat-card class="create-form" *ngIf="showForm()" #formCard>
        <mat-card-header>
          <mat-card-title>{{editId() ? 'Modifier' : 'Créer'}} un utilisateur</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Prénom</mat-label>
              <input matInput [(ngModel)]="form.firstName" placeholder="Prénom">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nom</mat-label>
              <input matInput [(ngModel)]="form.lastName" placeholder="Nom de famille">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="form.email" placeholder="user@npsp.ci">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Téléphone (SMS)</mat-label>
              <input matInput type="tel" [(ngModel)]="form.phone" placeholder="+2250700000000">
              <mat-hint>Format international requis : +225XXXXXXXXXX</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Rôle(s)</mat-label>
              <mat-select [(ngModel)]="form.roles" multiple (ngModelChange)="onRoleChange()">
                <mat-option value="super_admin" *ngIf="auth.isSuperAdmin()">Super Admin</mat-option>
                <mat-option value="admin_system">Admin Système</mat-option>
                <mat-option value="admin_tpm">Admin TPM</mat-option>
                <mat-option value="admin_finance">Admin Finance</mat-option>
                <mat-option value="chief_of_party">Chief of Party</mat-option>
                <mat-option value="assistant_direction">Assistant(e) Direction</mat-option>
                <mat-option value="chargee_tresorerie">Chargée de Trésorerie</mat-option>
                <mat-option value="entity_member">Membre Entité</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" *ngIf="form.roles?.includes('entity_member')">
              <mat-label>Entité</mat-label>
              <mat-select [(ngModel)]="form.entityCode">
                <mat-option *ngFor="let e of entities" [value]="e">{{e}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{editId() ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}}</mat-label>
              <input matInput [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="form.password" placeholder="Min. 8 caractères">
              <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
                <mat-icon>{{showPwd() ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
              <mat-hint *ngIf="editId()">Laisser vide pour conserver le mot de passe actuel</mat-hint>
            </mat-form-field>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="saveUser()" [disabled]="!isFormValid()">
            <mat-icon>save</mat-icon> {{editId() ? 'Modifier' : 'Créer'}}
          </button>
          <button mat-button (click)="cancelForm()">Annuler</button>
        </mat-card-actions>
      </mat-card>

      <!-- Filtre -->
      <div class="filters">
        <mat-form-field appearance="outline" class="search">
          <mat-label>Rechercher</mat-label>
          <input matInput [ngModel]="search()" (ngModelChange)="search.set($event); pageIndex.set(0)" placeholder="Nom, email, entité...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Rôle</mat-label>
          <mat-select [ngModel]="filterRole()" (ngModelChange)="filterRole.set($event); pageIndex.set(0)">
            <mat-option value="">Tous</mat-option>
            <mat-option value="super_admin">Super Admin</mat-option>
            <mat-option value="admin_system">Admin Système</mat-option>
            <mat-option value="admin_tpm">Admin TPM</mat-option>
            <mat-option value="admin_finance">Admin Finance</mat-option>
            <mat-option value="chief_of_party">COP</mat-option>
            <mat-option value="assistant_direction">Assist. Direction</mat-option>
            <mat-option value="chargee_tresorerie">Chargée Trésorerie</mat-option>
            <mat-option value="entity_member">Membres</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <table class="users-table">
            <thead>
              <tr>
                <th>Nom</th><th>Email</th><th>Rôle</th><th>Entité</th>
                <th>Statut</th><th>Créé le</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of pagedUsers()">
                <td class="name-col">{{u.firstName}} {{u.lastName}}</td>
                <td class="email-col">{{u.email}}</td>
                <td>
                  <span class="role-chip" *ngFor="let r of (u.roles ?? [u.role])" [class]="r" style="margin-right:3px">{{roleLabel(r)}}</span>
                </td>
                <td>
                  <span class="entity-chip" *ngIf="u.entityCode">{{u.entityCode}}</span>
                  <span class="resp-badge" *ngIf="u.isEntityResponsible" matTooltip="Responsable désigné">★</span>
                  <span *ngIf="!u.entityCode">—</span>
                </td>
                <td><span class="status-chip" [class.active]="u.isActive" [class.inactive]="!u.isActive">
                  {{u.isActive ? 'Actif' : 'Inactif'}}
                </span></td>
                <td class="date-col">{{u.createdAt | date:'dd/MM/yyyy'}}</td>
                <td class="actions-col">
                  <button mat-icon-button (click)="editUser(u)" matTooltip="Modifier">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="toggleActive(u)" [matTooltip]="u.isActive ? 'Désactiver' : 'Activer'">
                    <mat-icon [color]="u.isActive ? 'warn' : 'primary'">
                      {{u.isActive ? 'block' : 'check_circle'}}
                    </mat-icon>
                  </button>
                  <button mat-icon-button *ngIf="(u.roles ?? [u.role])?.includes('entity_member') && !u.isEntityResponsible"
                          (click)="setResponsible(u)" matTooltip="Désigner comme responsable">
                    <mat-icon style="color:#856404">star_outline</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="table-footer">{{filteredUsers().length}} utilisateur(s)</div>
          <mat-paginator
            *ngIf="filteredUsers().length > pageSize()"
            [length]="filteredUsers().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .users-container { max-width: 1200px; margin: 0 auto; padding: 24px 16px 40px; }

    /* ─── Page header ─── */
    .page-header {
      background: linear-gradient(150deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
      color: white; border-radius: 14px; padding: 0;
      margin-bottom: 24px; overflow: hidden;
      box-shadow: 0 6px 24px rgba(31,78,121,0.22);
    }
    .page-header-triband { height: 4px; background: linear-gradient(to right, #2E75B6 33.33%, white 33.33% 66.66%, #C00000 66.66%); }
    .page-header-inner { display: flex; align-items: center; gap: 12px; padding: 22px 28px; }
    .page-header-inner mat-icon { font-size: 28px; width: 28px; height: 28px; color: #BDD7EE; }
    .page-header-inner h1 { margin: 0; font-size: 21px; font-weight: 800; flex: 1; letter-spacing: .2px; }
    .btn-new {
      background: #C00000; color: white;
      border: none; border-radius: 8px;
      height: 38px; padding: 0 18px; font-weight: 700; font-size: 13px;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      box-shadow: 0 2px 10px rgba(192,0,0,0.3);
      transition: background .15s;
    }
    .btn-new:hover { background: #a30000; }
    .btn-new mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ─── Create form card ─── */
    .create-form {
      border-radius: 14px !important; margin-bottom: 20px;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }
    .create-form mat-card-title { color: #1F4E79; font-size: 16px; font-weight: 700; }
    .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; }

    /* ─── Filters ─── */
    .filters { display: flex; gap: 12px; margin-bottom: 14px; }
    .search { flex: 1; }

    /* ─── Table card ─── */
    .table-card {
      border-radius: 14px !important;
      border: 1px solid #E8EDF5 !important;
      box-shadow: 0 2px 12px rgba(31,78,121,0.09) !important;
    }
    table.users-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .users-table th {
      background: #EEF4FA; color: #1F4E79;
      padding: 11px 14px; text-align: left;
      font-weight: 700; font-size: 12px; letter-spacing: .2px;
      border-bottom: 2px solid #DEEAF1;
    }
    .users-table th:first-child { border-radius: 6px 0 0 0; }
    .users-table th:last-child { border-radius: 0 6px 0 0; }
    .users-table td { padding: 10px 14px; border-bottom: 1px solid #F0F4F8; vertical-align: middle; }
    .users-table tbody tr:last-child td { border-bottom: none; }
    .users-table tbody tr:hover td { background: #F6FAFF; }

    .name-col { font-weight: 700; color: #1a2340; font-size: 13.5px; }
    .email-col { font-size: 12px; color: #667085; }
    .date-col { font-size: 11.5px; color: #aaa; }
    .actions-col { white-space: nowrap; }
    .table-footer { text-align: right; font-size: 12px; color: #999; padding: 8px 14px; }

    /* ─── Chips ─── */
    .role-chip { padding: 3px 11px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .role-chip.super_admin { background: #1F4E79; color: #fff; }
    .role-chip.admin_system { background: #DEEAF1; color: #1F4E79; }
    .role-chip.admin_tpm { background: #EDE7F6; color: #6A1B9A; }
    .role-chip.admin_finance { background: #E2EFDA; color: #276221; }
    .role-chip.chief_of_party { background: #FFF2CC; color: #856404; }
    .role-chip.entity_member { background: #E8F5E9; color: #276221; }
    .role-chip.assistant_direction { background: #FFF3E0; color: #E65100; }
    .role-chip.chargee_tresorerie { background: #E3F2FD; color: #0D47A1; }

    .entity-chip {
      background: #1F4E79; color: white;
      padding: 3px 9px; border-radius: 20px;
      font-size: 11px; font-weight: 800;
    }
    .status-chip { padding: 3px 11px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .status-chip.active { background: #C6EFCE; color: #276221; }
    .status-chip.inactive { background: #f0f0f0; color: #aaa; }
    .resp-badge {
      background: #FFF2CC; color: #856404;
      padding: 2px 7px; border-radius: 8px;
      font-size: 12px; margin-left: 4px; font-weight: 800;
    }

    /* Button colors */
    button[mat-raised-button][color="primary"] { color: white !important; }
  `]
})
export class AdminUsersComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  @ViewChild('formCard', { read: ElementRef }) formCard?: ElementRef;

  users = signal<any[]>([]);
  showForm = signal(false);
  editId = signal<string | null>(null);
  showPwd = signal(false);
  search = signal('');
  filterRole = signal('');
  pageIndex = signal(0);
  pageSize = signal(10);
  readonly entities = ENTITIES;

  form: any = { firstName: '', lastName: '', email: '', phone: '', roles: ['entity_member'], entityCode: '', password: '' };

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase();
    const role = this.filterRole();
    return this.users().filter(u => {
      const userRoles: string[] = u.roles ?? (u.role ? [u.role] : []);
      const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email} ${u.entityCode ?? ''}`.toLowerCase().includes(q);
      const matchRole = !role || userRoles.includes(role);
      return matchSearch && matchRole;
    });
  });

  readonly pagedUsers = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  ngOnInit() { this.loadUsers(); }

  onPage(e: PageEvent) { this.pageIndex.set(e.pageIndex); this.pageSize.set(e.pageSize); }

  loadUsers() {
    this.api.getUsers().subscribe(u => this.users.set(u));
  }

  onRoleChange() {
    if (!this.form.roles?.includes('entity_member')) this.form.entityCode = null;
  }

  isFormValid(): boolean {
    const pwdOk = this.editId()
      ? (!this.form.password || this.form.password.length >= 8)
      : this.form.password?.length >= 8;
    const rolesOk = this.form.roles?.length > 0;
    const entityOk = !this.form.roles?.includes('entity_member') || this.form.entityCode;
    return !!(this.form.firstName && this.form.lastName && this.form.email && rolesOk && entityOk && pwdOk);
  }

  saveUser() {
    const obs = this.editId()
      ? this.api.updateUser(this.editId()!, this.form)
      : this.api.createUser(this.form);
    obs.subscribe({
      next: () => {
        this.snack.open(this.editId() ? 'Utilisateur modifié' : 'Utilisateur créé', 'OK', { duration: 2000 });
        this.loadUsers();
        this.cancelForm();
      },
      error: e => this.snack.open(e.error?.message?.error ?? 'Erreur', 'OK', { duration: 3000 })
    });
  }

  editUser(u: any) {
    this.editId.set(u.id);
    this.form = {
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? '',
      roles: u.roles ?? (u.role ? [u.role] : ['entity_member']),
      entityCode: u.entityCode ?? '',
    };
    this.showForm.set(true);
    setTimeout(() => this.formCard?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editId.set(null);
    this.showPwd.set(false);
    this.form = { firstName: '', lastName: '', email: '', phone: '', roles: ['entity_member'], entityCode: '', password: '' };
  }

  toggleActive(u: any) {
    const msg = u.isActive ? `Désactiver ${u.firstName} ${u.lastName} ?` : `Réactiver ${u.firstName} ${u.lastName} ?`;
    if (!confirm(msg)) return;
    this.api.toggleUserActive(u.id).subscribe(() => {
      this.snack.open('Statut mis à jour', 'OK', { duration: 2000 });
      this.loadUsers();
    });
  }

  setResponsible(u: any) {
    if (!confirm(`Désigner ${u.firstName} ${u.lastName} comme responsable de l'entité ${u.entityCode} ?`)) return;
    this.api.setEntityResponsible(u.id).subscribe({
      next: () => {
        this.snack.open(`${u.firstName} ${u.lastName} est maintenant le responsable de ${u.entityCode}`, 'OK', { duration: 3000 });
        this.loadUsers();
      },
      error: e => this.snack.open(e.error?.message ?? 'Erreur', 'OK', { duration: 3000 })
    });
  }

  roleLabel(role: string): string {
    const map: any = { super_admin: 'Super Admin', admin_system: 'Admin', admin_tpm: 'Admin TPM', admin_finance: 'Admin Finance', chief_of_party: 'COP', entity_member: 'Membre', assistant_direction: 'Assist. Dir.', chargee_tresorerie: 'Chargée Trés.' };
    return map[role] ?? role;
  }
}
