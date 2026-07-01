import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { InputsService, Input, InputStatus, InputType } from '../../services/inputs.service';
import { SectionsService } from '../../services/sections.service';
import { AuthService } from '../../services/auth.service';

const TYPE_LABELS: Record<InputType, string> = {
  activity: 'Activite', indicator: 'Indicateur',
  milestone: 'Jalon', comment: 'Commentaire', risk: 'Risque',
};

const STATUS_LABELS: Record<InputStatus, string> = {
  draft: 'Brouillon', submitted: 'Soumis', retained: 'Retenu', rejected: 'Rejeté',
};

@Component({
  selector: 'app-mes-contributions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatChipsModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule, MatDividerModule, MatSlideToggleModule,
  ],
  template: `
    <div class="page-container">
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px; flex-wrap:wrap">
        <a mat-button routerLink="/reference">
          <mat-icon>arrow_back</mat-icon> Socle
        </a>
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:600">Mes contributions</h1>
          <p style="margin:4px 0 0; color:#666; font-size:14px">
            {{ showEntityView ? 'Tous les inputs de l\'entité ' + auth.entityCode() : 'Vos inputs personnels' }}
          </p>
        </div>
        <span style="flex:1"></span>
        @if (auth.entityCode()) {
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer">
            <mat-slide-toggle [(ngModel)]="showEntityView" (ngModelChange)="reload()">
            </mat-slide-toggle>
            Voir toute mon entité ({{ auth.entityCode() }})
          </label>
        }
      </div>

      <!-- Filtres -->
      <mat-card style="margin-bottom:16px">
        <mat-card-content style="padding:12px; display:flex; gap:16px; flex-wrap:wrap; align-items:center">
          <mat-form-field appearance="outline" style="min-width:200px">
            <mat-label>Axe</mat-label>
            <mat-select [(ngModel)]="filterSection">
              <mat-option value="">Tous</mat-option>
              @for (s of sections(); track s.id) {
                <mat-option [value]="s.id">{{ s.titre | slice:0:40 }}...</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:140px">
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="filterStatus">
              <mat-option value="">Tous</mat-option>
              <mat-option value="draft">Brouillon</mat-option>
              <mat-option value="submitted">Soumis</mat-option>
              <mat-option value="retained">Retenu</mat-option>
              <mat-option value="rejected">Rejeté</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:140px">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="filterType">
              <mat-option value="">Tous</mat-option>
              <mat-option value="activity">Activite</mat-option>
              <mat-option value="indicator">Indicateur</mat-option>
              <mat-option value="milestone">Jalon</mat-option>
              <mat-option value="comment">Commentaire</mat-option>
              <mat-option value="risk">Risque</mat-option>
            </mat-select>
          </mat-form-field>

          <span style="font-size:13px; color:#555">{{ filtered().length }} résultat(s)</span>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div style="text-align:center; padding:60px">
          <mat-spinner diameter="48" style="margin:auto"></mat-spinner>
        </div>
      }

      @if (!loading()) {
        <!-- Groupes par statut -->
        @for (group of statusGroups(); track group.status) {
          @if (group.items.length > 0) {
            <div style="margin-bottom:24px">
              <h2 style="font-size:16px; font-weight:600; color:#333; margin-bottom:8px; display:flex; align-items:center; gap:8px">
                <span [class]="'chip-' + group.status"
                      style="padding:3px 10px; border-radius:12px; font-size:13px">
                  {{ STATUS_LABELS[group.status] }}
                </span>
                <span style="font-size:13px; color:#888">{{ group.items.length }}</span>
              </h2>

              <div style="display:flex; flex-direction:column; gap:8px">
                @for (inp of group.items; track inp.id) {
                  <mat-card [style.border-left]="group.status === 'draft' ? '4px solid #1976d2' :
                                                 group.status === 'retained' ? '4px solid #2e7d32' :
                                                 group.status === 'rejected' ? '4px solid #c62828' : '4px solid #f57c00'">
                    <mat-card-content style="padding:12px">
                      <div style="display:flex; align-items:start; gap:12px">
                        <div style="flex:1">
                          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap">
                            <span class="section-badge" style="font-size:11px">{{ TYPE_LABELS[inp.type] }}</span>
                            <span style="font-size:12px; color:#555">{{ inp.referenceSection?.titre | slice:0:50 }}...</span>
                            <span style="font-size:11px; color:#888">{{ inp.entity.code }}</span>
                            @if (group.status !== 'draft') {
                              <mat-icon style="font-size:14px; color:#f57c00"
                                        matTooltip="Verrouillé - contacter le Super Admin pour rouvrir">lock</mat-icon>
                            }
                          </div>
                          @if (inp.title) {
                            <div style="font-weight:500; font-size:14px">{{ inp.title }}</div>
                          }
                          <div style="font-size:12px; color:#666; margin-top:4px">
                            Modifié le {{ inp.updatedAt | date:'dd/MM/yyyy à HH:mm' }}
                          </div>
                          @if (inp.type === 'milestone' && inp.paymentAmountProposed) {
                            <div style="font-size:12px; color:#555; margin-top:2px">
                              Montant proposé : {{ inp.paymentAmountProposed }}
                              @if (inp.paymentAmountFinal) {
                                → <strong>Retenu : {{ inp.paymentAmountFinal }}</strong>
                              }
                            </div>
                          }
                          @if (group.status === 'rejected') {
                            <div style="font-size:12px; color:#c62828; margin-top:4px">
                              Contribution rejetée — contactez le PMO pour plus d'informations.
                            </div>
                          }
                        </div>
                        <div style="display:flex; gap:4px">
                          @if (group.status === 'draft') {
                            <button mat-raised-button color="primary" style="font-size:12px"
                                    (click)="resumeDraft(inp)">
                              <mat-icon>edit</mat-icon> Reprendre
                            </button>
                            <button mat-icon-button color="warn" (click)="deleteDraft(inp)"
                                    matTooltip="Supprimer ce brouillon">
                              <mat-icon>delete</mat-icon>
                            </button>
                          } @else {
                            <button mat-stroked-button style="font-size:12px" disabled>
                              <mat-icon>lock</mat-icon> Verrouillé
                            </button>
                          }
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </div>
          }
        }

        @if (filtered().length === 0) {
          <div style="text-align:center; padding:60px; color:#999">
            <mat-icon style="font-size:48px; display:block; margin-bottom:12px">inbox</mat-icon>
            <p>Aucune contribution trouvée.</p>
            <a mat-raised-button color="primary" routerLink="/contribute">
              <mat-icon>add</mat-icon> Créer une contribution
            </a>
          </div>
        }
      }
    </div>
  `,
  styles: [``],
})
export class MesContributionsComponent implements OnInit {
  private inputsService = inject(InputsService);
  private sectionsService = inject(SectionsService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  auth = inject(AuthService);

  readonly TYPE_LABELS = TYPE_LABELS;
  readonly STATUS_LABELS = STATUS_LABELS;

  allInputs = signal<Input[]>([]);
  sections = signal<any[]>([]);
  loading = signal(true);
  showEntityView = false;

  filterSection = '';
  filterStatus = '';
  filterType = '';

  filtered = computed(() =>
    this.allInputs().filter(i => {
      if (this.filterSection && i.referenceSectionId !== this.filterSection) return false;
      if (this.filterStatus && i.status !== this.filterStatus) return false;
      if (this.filterType && i.type !== this.filterType) return false;
      return true;
    }),
  );

  statusGroups = computed(() => {
    const order: InputStatus[] = ['draft', 'submitted', 'retained', 'rejected'];
    return order.map(s => ({
      status: s,
      items: this.filtered().filter(i => i.status === s),
    }));
  });

  ngOnInit() {
    this.sectionsService.getAll().subscribe(s => this.sections.set(s));
    this.reload();
  }

  reload() {
    this.loading.set(true);
    const params = this.showEntityView && this.auth.entityCode()
      ? { entityCode: this.auth.entityCode()! }
      : {};
    this.inputsService.getMine(params).subscribe({
      next: (inputs) => { this.allInputs.set(inputs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resumeDraft(inp: Input) {
    this.router.navigate(['/contribute', inp.referenceSectionId]);
  }

  deleteDraft(inp: Input) {
    if (!confirm('Supprimer ce brouillon ?')) return;
    this.inputsService.delete(inp.id).subscribe({
      next: () => {
        this.allInputs.update(list => list.filter(i => i.id !== inp.id));
        this.snackBar.open('Brouillon supprimé', 'OK', { duration: 2000 });
      },
      error: (e) => this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }
}
