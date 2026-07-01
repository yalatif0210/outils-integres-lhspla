import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InputsService, Input, InputType, InputStatus } from '../../services/inputs.service';
import { AuthService } from '../../services/auth.service';

const TYPE_LABELS: Record<InputType, string> = {
  activity: 'Activite', indicator: 'Indicateur',
  milestone: 'Jalon', comment: 'Commentaire', risk: 'Risque',
};
const STATUS_LABELS: Record<InputStatus, string> = {
  draft: 'Brouillon', submitted: 'Soumis', retained: 'Retenu', rejected: 'Rejeté',
};

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px">
        <a mat-button routerLink="/consolidation">
          <mat-icon>arrow_back</mat-icon> Consolidation
        </a>
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:600; color:#c62828">
            <mat-icon style="vertical-align:middle">delete_sweep</mat-icon>
            Corbeille — Super Admin
          </h1>
          <p style="margin:4px 0 0; color:#666; font-size:14px">{{ items().length }} input(s) supprimé(s)</p>
        </div>
      </div>

      @if (loading()) {
        <div style="text-align:center; padding:60px">
          <mat-spinner diameter="48" style="margin:auto"></mat-spinner>
        </div>
      }

      @if (!loading()) {
        @if (items().length === 0) {
          <div style="text-align:center; padding:60px; color:#999">
            <mat-icon style="font-size:48px; display:block; margin-bottom:12px">delete_sweep</mat-icon>
            Corbeille vide
          </div>
        }
        <div style="display:flex; flex-direction:column; gap:8px">
          @for (inp of items(); track inp.id) {
            <mat-card style="border-left:4px solid #c62828">
              <mat-card-content style="padding:12px">
                <div style="display:flex; align-items:start; gap:12px">
                  <div style="flex:1">
                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px; flex-wrap:wrap">
                      <span class="section-badge" style="font-size:11px">{{ TYPE_LABELS[inp.type] }}</span>
                      <span [class]="'chip-' + inp.status"
                            style="font-size:11px; padding:2px 6px; border-radius:4px">{{ STATUS_LABELS[inp.status] }}</span>
                      <span style="font-size:12px; color:#555">{{ inp.referenceSection?.titre | slice:0:50 }}...</span>
                      <span style="font-size:11px; color:#888">{{ inp.entity.code }} · {{ inp.author.email }}</span>
                    </div>
                    @if (inp.title) {
                      <div style="font-weight:500; font-size:14px">{{ inp.title }}</div>
                    }
                    <div style="font-size:12px; color:#c62828; margin-top:4px">
                      Supprimé le {{ inp.deletedAt | date:'dd/MM/yyyy à HH:mm' }}
                    </div>
                  </div>
                  <button mat-raised-button color="primary" (click)="restore(inp)"
                          matTooltip="Restaurer cet input">
                    <mat-icon>restore</mat-icon> Restaurer
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [``],
})
export class TrashComponent implements OnInit {
  private inputsService = inject(InputsService);
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);

  items = signal<Input[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.inputsService.getTrash().subscribe({
      next: (list) => { this.items.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  restore(inp: Input) {
    this.inputsService.restore(inp.id).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.id !== inp.id));
        this.snackBar.open('Input restauré', 'OK', { duration: 2000 });
      },
      error: (e) => this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }
}
