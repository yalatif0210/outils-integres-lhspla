import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { SectionsService, ReferenceSection } from '../../services/sections.service';
import { InputsService, Input, InputType, InputStatus } from '../../services/inputs.service';
import { AuthService } from '../../services/auth.service';

const TYPE_LABELS: Record<InputType, string> = {
  activity: 'Activité',
  indicator: 'Indicateur',
  milestone: 'Jalon',
  comment: 'Commentaire',
  risk: 'Risque',
};

const STATUS_LABELS: Record<InputStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  retained: 'Retenu',
  rejected: 'Rejeté',
};

@Component({
  selector: 'app-contribute',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatChipsModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule, MatListModule,
  ],
  template: `
    <div class="page-container">
      <div style="margin-bottom:16px">
        <a mat-button routerLink="/reference">
          <mat-icon>arrow_back</mat-icon> Retour au socle
        </a>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start">

        <!-- Colonne gauche : sélection de section + texte de référence -->
        <div>
          <mat-card>
            <mat-card-header>
              <mat-icon mat-card-avatar>menu_book</mat-icon>
              <mat-card-title>Choisir un axe</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" style="width:100%; margin-top:8px">
                <mat-label>Axe de contribution</mat-label>
                <mat-select [(value)]="selectedSectionId" (selectionChange)="onSectionChange($event.value)">
                  @for (s of sections(); track s.id) {
                    @if (s.contributionMode !== 'lecture_seule') {
                      <mat-option [value]="s.id">{{ s.titre }}</mat-option>
                    }
                  }
                </mat-select>
              </mat-form-field>

              @if (currentSection()) {
                <div>
                  <p style="font-size:12px; color:#666; margin-bottom:4px">
                    <strong>Mode :</strong>
                    {{ currentSection()!.contributionMode === 'structuree' ? 'Formulaire structuré' : 'Commentaire uniquement' }}
                    &nbsp;·&nbsp;
                    <strong>Entités :</strong> {{ currentSection()!.entites.join(', ') }}
                  </p>
                  <div class="reference-text" style="max-height:300px; overflow:auto; font-size:13px">
                    {{ currentSection()!.texteReference }}
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Inputs existants pour cet axe -->
          @if (existingInputs().length > 0) {
            <mat-card style="margin-top:16px">
              <mat-card-header>
                <mat-card-title>Contributions existantes ({{ existingInputs().length }})</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-list>
                  @for (inp of existingInputs(); track inp.id) {
                    <mat-list-item style="height:auto; padding:8px 0">
                      <div style="width:100%">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                          <span class="section-badge">{{ TYPE_LABELS[inp.type] }}</span>
                          <span [class]="'chip-' + inp.status" style="font-size:11px; padding:2px 6px; border-radius:4px">
                            {{ STATUS_LABELS[inp.status] }}
                          </span>
                          <span style="font-size:11px; color:#666">{{ inp.entity.code }} · {{ inp.author.email }}</span>
                        </div>
                        @if (inp.title) {
                          <div style="font-weight:500; font-size:13px">{{ inp.title }}</div>
                        }
                        <div style="font-size:13px; color:#444; margin-top:2px; line-height:1.4">
                          {{ inp.content | slice:0:200 }}{{ inp.content.length > 200 ? '…' : '' }}
                        </div>
                      </div>
                    </mat-list-item>
                    <mat-divider></mat-divider>
                  }
                </mat-list>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Colonne droite : formulaire de contribution -->
        <div>
          <mat-card>
            <mat-card-header>
              <mat-icon mat-card-avatar>edit_note</mat-icon>
              <mat-card-title>Nouvelle contribution</mat-card-title>
              <mat-card-subtitle>
                Entité : <strong>{{ auth.getEntityLabel() }}</strong>
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (!selectedSectionId) {
                <p style="color:#999; text-align:center; padding:24px">
                  <mat-icon style="font-size:40px; display:block; margin-bottom:8px">touch_app</mat-icon>
                  Sélectionnez un axe à gauche pour commencer
                </p>
              } @else {
                <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex; flex-direction:column; gap:16px">

                  <mat-form-field appearance="outline">
                    <mat-label>Type de contribution</mat-label>
                    <mat-select formControlName="type">
                      @if (currentSection()?.contributionMode === 'structuree') {
                        <mat-option value="activity">Activité</mat-option>
                        <mat-option value="indicator">Indicateur</mat-option>
                        <mat-option value="milestone">Jalon</mat-option>
                        <mat-option value="risk">Risque</mat-option>
                      }
                      <mat-option value="comment">Commentaire</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Titre (optionnel)</mat-label>
                    <input matInput formControlName="title" />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Contenu *</mat-label>
                    <textarea matInput formControlName="content" rows="5" placeholder="Décrivez votre contribution…"></textarea>
                    <mat-error>Le contenu est obligatoire</mat-error>
                  </mat-form-field>

                  @if (isStructured()) {
                    <mat-divider></mat-divider>
                    <p style="font-size:12px; font-weight:600; color:#555; margin:0">Champs structurés (optionnels)</p>

                    <mat-form-field appearance="outline">
                      <mat-label>Intrant (means / ressources)</mat-label>
                      <textarea matInput formControlName="means" rows="2"></textarea>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Extrant attendu (output)</mat-label>
                      <textarea matInput formControlName="output" rows="2"></textarea>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Méthode de vérification</mat-label>
                      <input matInput formControlName="verificationMethod" />
                    </mat-form-field>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                      <mat-form-field appearance="outline">
                        <mat-label>Valeur cible</mat-label>
                        <input matInput formControlName="targetValue" />
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Échéance (ex: M3, M6)</mat-label>
                        <input matInput formControlName="dueMonth" />
                      </mat-form-field>
                    </div>
                  }

                  <div style="display:flex; gap:12px; justify-content:flex-end">
                    <button mat-stroked-button type="button" (click)="resetForm()">
                      <mat-icon>clear</mat-icon> Effacer
                    </button>
                    <button mat-raised-button color="primary" type="submit"
                            [disabled]="form.invalid || submitting()">
                      @if (submitting()) {
                        <mat-spinner diameter="20" style="margin:auto"></mat-spinner>
                      } @else {
                        <mat-icon>send</mat-icon> Soumettre
                      }
                    </button>
                  </div>
                </form>
              }
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class ContributeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sectionsService = inject(SectionsService);
  private inputsService = inject(InputsService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  sections = signal<ReferenceSection[]>([]);
  currentSection = signal<ReferenceSection | null>(null);
  existingInputs = signal<Input[]>([]);
  submitting = signal(false);
  selectedSectionId = '';

  readonly TYPE_LABELS = TYPE_LABELS;
  readonly STATUS_LABELS = STATUS_LABELS;

  form = this.fb.group({
    type: ['comment', Validators.required],
    title: [''],
    content: ['', Validators.required],
    means: [''],
    output: [''],
    verificationMethod: [''],
    targetValue: [''],
    dueMonth: [''],
  });

  isStructured() {
    return this.form.value.type !== 'comment' && this.currentSection()?.contributionMode === 'structuree';
  }

  ngOnInit() {
    this.sectionsService.getAll().subscribe(sections => {
      this.sections.set(sections);
      const paramId = this.route.snapshot.paramMap.get('sectionId');
      if (paramId) {
        this.selectedSectionId = paramId;
        this.onSectionChange(paramId);
      }
    });
  }

  onSectionChange(id: string) {
    this.selectedSectionId = id;
    const section = this.sections().find(s => s.id === id);
    this.currentSection.set(section ?? null);
    this.loadExistingInputs(id);
  }

  loadExistingInputs(sectionId: string) {
    this.inputsService.getAll({ sectionId }).subscribe(inputs => this.existingInputs.set(inputs));
  }

  submit() {
    if (this.form.invalid || !this.selectedSectionId) return;
    this.submitting.set(true);
    const v = this.form.value;
    this.inputsService.create({
      referenceSectionId: this.selectedSectionId,
      type: v.type as InputType,
      content: v.content!,
      title: v.title || undefined,
      means: v.means || undefined,
      output: v.output || undefined,
      verificationMethod: v.verificationMethod || undefined,
      targetValue: v.targetValue || undefined,
      dueMonth: v.dueMonth || undefined,
    }).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.snackBar.open('Contribution soumise avec succès !', 'OK', { duration: 3000 });
        this.resetForm();
        this.loadExistingInputs(this.selectedSectionId);
      },
      error: (e) => {
        this.submitting.set(false);
        this.snackBar.open(e.error?.message ?? 'Erreur lors de la soumission', 'Fermer', { duration: 5000 });
      },
    });
  }

  resetForm() {
    this.form.reset({ type: 'comment' });
  }
}
