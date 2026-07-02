import {
  Component, inject, signal, OnInit, OnDestroy, computed, HostListener,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription, debounceTime, takeUntil, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuillEditorComponent } from 'ngx-quill';
import { SectionsService, ReferenceSection } from '../../services/sections.service';
import { InputsService, Input, InputType, InputStatus, InputTranslation } from '../../services/inputs.service';
import { AuthService } from '../../services/auth.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

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

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['clean'],
  ],
};

@Component({
  selector: 'app-contribute',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MarkdownPipe, QuillEditorComponent,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatChipsModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div style="margin-bottom:16px; display:flex; align-items:center; gap:16px">
        <a mat-button routerLink="/reference">
          <mat-icon>arrow_back</mat-icon> Retour au socle
        </a>
        <a mat-stroked-button routerLink="/mes-contributions">
          <mat-icon>list_alt</mat-icon> Mes contributions
        </a>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start">

        <!-- Colonne gauche -->
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
                <p style="font-size:12px; color:#666; margin-bottom:4px">
                  <strong>Mode :</strong>
                  {{ currentSection()!.contributionMode === 'structuree' ? 'Formulaire structuré' : 'Commentaire uniquement' }}
                  &nbsp;·&nbsp;
                  <strong>Entités :</strong> {{ currentSection()!.entites.join(', ') }}
                </p>
                <div class="reference-text" style="max-height:300px; overflow:auto; font-size:13px"
                     [innerHTML]="currentSection()!.texteReference | markdown"></div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Inputs existants -->
          @if (existingInputs().length > 0) {
            <mat-card style="margin-top:16px">
              <mat-card-header>
                <mat-card-title>Contributions existantes ({{ existingInputs().length }})</mat-card-title>
              </mat-card-header>
              <mat-card-content style="padding:0 16px">
                <div>
                  @for (inp of existingInputs(); track inp.id) {
                    <div style="padding:10px 0; border-bottom:1px solid #eeeeee">
                      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap">
                        <span class="section-badge">{{ TYPE_LABELS[inp.type] }}</span>
                        <span [class]="'chip-' + inp.status"
                              style="font-size:11px; padding:2px 6px; border-radius:4px">
                          {{ STATUS_LABELS[inp.status] }}
                        </span>
                        @if (inp.status !== 'draft') {
                          <mat-icon style="font-size:14px; color:#f57c00" matTooltip="Verrouillé — contacter le Super Admin pour rouvrir">lock</mat-icon>
                        }
                        <span style="font-size:11px; color:#666">{{ inp.entity.code }} · {{ inp.author.email }}</span>
                      </div>
                      @if (inp.title) {
                        <div style="font-weight:500; font-size:13px">{{ inp.title }}</div>
                      }
                      @if (inp.content) {
                        <div class="rich-content" style="margin-top:2px; color:#444; word-break:break-word; white-space:normal"
                             [innerHTML]="inp.content"></div>
                      }
                      @if (inp.status === 'draft' && inp.authorUserId === auth.currentUser()?.id) {
                        <button mat-stroked-button style="margin-top:6px; font-size:12px"
                                (click)="resumeDraft(inp)">
                          <mat-icon>edit</mat-icon> Reprendre ce brouillon
                        </button>
                      }
                      @if (inp.authorUserId !== auth.currentUser()?.id && allowedTypes().includes('comment')) {
                        <button mat-stroked-button color="accent" style="margin-top:6px; font-size:12px"
                                (click)="toggleCommentBox(inp)">
                          <mat-icon>{{ commentingOnId() === inp.id ? 'close' : 'chat' }}</mat-icon>
                          {{ commentingOnId() === inp.id ? 'Annuler' : 'Commenter' }}
                        </button>
                        @if (commentingOnId() === inp.id) {
                          <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px">
                            <textarea
                              rows="3"
                              placeholder="Votre commentaire..."
                              [value]="inlineCommentText()"
                              (input)="inlineCommentText.set($any($event.target).value)"
                              style="width:100%; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px; padding:8px; font-size:13px; font-family:inherit; resize:vertical; outline:none">
                            </textarea>
                            <div style="display:flex; gap:8px">
                              <button mat-flat-button color="accent"
                                      [disabled]="!inlineCommentText().trim() || submittingInlineComment()"
                                      (click)="submitInlineComment(inp)">
                                @if (submittingInlineComment()) {
                                  <mat-spinner diameter="16" style="display:inline-block"></mat-spinner>
                                } @else {
                                  <ng-container><mat-icon>send</mat-icon> Envoyer</ng-container>
                                }
                              </button>
                            </div>
                          </div>
                        }
                      }
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Colonne droite : formulaire + section EN -->
        <div>
          <mat-card>
            <mat-card-header>
              <mat-icon mat-card-avatar>edit_note</mat-icon>
              <mat-card-title>
                {{ draftId() ? 'Modifier le brouillon' : 'Nouvelle contribution' }}
              </mat-card-title>
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
                <!-- Indicateur auto-save -->
                @if (autosaveLabel()) {
                  <div style="font-size:12px; color:#888; margin-bottom:8px; display:flex; align-items:center; gap:4px">
                    @if (autosaving()) {
                      <mat-spinner diameter="12"></mat-spinner>
                    } @else {
                      <mat-icon style="font-size:14px">save</mat-icon>
                    }
                    {{ autosaveLabel() }}
                  </div>
                }

                <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex; flex-direction:column; gap:16px">

                  <!-- Sélection du type (filtré selon inputTypes de la section) -->
                  <mat-form-field appearance="outline">
                    <mat-label>Type de contribution</mat-label>
                    <mat-select formControlName="type">
                      @for (t of allowedTypes(); track t) {
                        <mat-option [value]="t">{{ TYPE_LABELS[t] }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <!-- Titre -->
                  @if (selectedType() !== 'comment') {
                    <mat-form-field appearance="outline">
                      <mat-label>{{ titleLabel() }}</mat-label>
                      <input matInput formControlName="title" />
                    </mat-form-field>
                  }

                  <!-- Contenu principal -->
                  @if (selectedType() === 'activity' || selectedType() === 'comment') {
                    <div class="quill-field">
                      <div class="field-label">
                        {{ selectedType() === 'comment' ? 'Commentaire *' : 'Description *' }}
                      </div>
                      <quill-editor formControlName="content" [modules]="quillModules"
                                    placeholder="Saisissez votre texte…" theme="snow"></quill-editor>
                    </div>
                  }

                  <!-- Champs type: activite -->
                  @if (selectedType() === 'activity') {
                    <div class="quill-field">
                      <div class="field-label">Intrant (moyens / ressources)</div>
                      <quill-editor formControlName="means" [modules]="quillModules" theme="snow"></quill-editor>
                    </div>
                    <div class="quill-field">
                      <div class="field-label">Extrant attendu</div>
                      <quill-editor formControlName="output" [modules]="quillModules" theme="snow"></quill-editor>
                    </div>
                    <mat-form-field appearance="outline">
                      <mat-label>Objectif rattaché (ex: obj1)</mat-label>
                      <input matInput formControlName="objective" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Précédent / source (optionnel)</mat-label>
                      <input matInput formControlName="sourceRef" />
                    </mat-form-field>
                  }

                  <!-- Champs type: jalon -->
                  @if (selectedType() === 'milestone') {
                    <mat-form-field appearance="outline">
                      <mat-label>Livrable attendu *</mat-label>
                      <input matInput formControlName="deliverable" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Méthode de vérification *</mat-label>
                      <input matInput formControlName="verificationMethod" />
                    </mat-form-field>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                      <mat-form-field appearance="outline">
                        <mat-label>Mois d'échéance * (M1–M6)</mat-label>
                        <mat-select formControlName="dueMonth">
                          @for (m of ['M1','M2','M3','M4','M5','M6']; track m) {
                            <mat-option [value]="m">{{ m }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Montant proposé (optionnel)</mat-label>
                        <input matInput formControlName="paymentAmountProposed" placeholder="ex: 15 000 USD" />
                      </mat-form-field>
                    </div>
                  }

                  <!-- Champs type: indicateur -->
                  @if (selectedType() === 'indicator') {
                    <mat-form-field appearance="outline">
                      <mat-label>Base / ligne de référence</mat-label>
                      <input matInput formControlName="baseline" placeholder="ex: à mesurer" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Valeur cible *</mat-label>
                      <input matInput formControlName="targetValue" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Source de donnée *</mat-label>
                      <input matInput formControlName="dataSource" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Fréquence *</mat-label>
                      <mat-select formControlName="frequency">
                        <mat-option value="Mensuel">Mensuel</mat-option>
                        <mat-option value="Trimestriel">Trimestriel</mat-option>
                        <mat-option value="Ponctuel M2">Ponctuel M2</mat-option>
                        <mat-option value="Ponctuel M3">Ponctuel M3</mat-option>
                        <mat-option value="Ponctuel M6">Ponctuel M6</mat-option>
                      </mat-select>
                    </mat-form-field>
                  }

                  <!-- Champs type: risque -->
                  @if (selectedType() === 'risk') {
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                      <mat-form-field appearance="outline">
                        <mat-label>Probabilité *</mat-label>
                        <mat-select formControlName="likelihood">
                          <mat-option value="Faible">Faible</mat-option>
                          <mat-option value="Moyenne">Moyenne</mat-option>
                          <mat-option value="Elevee">Elevée</mat-option>
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Impact *</mat-label>
                        <mat-select formControlName="impact">
                          <mat-option value="Faible">Faible</mat-option>
                          <mat-option value="Moyen">Moyen</mat-option>
                          <mat-option value="Eleve">Élevé</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                    <div class="quill-field">
                      <div class="field-label">Mesure d'atténuation *</div>
                      <quill-editor formControlName="mitigation" [modules]="quillModules" theme="snow"></quill-editor>
                    </div>
                  }

                  <!-- Champs type: commentaire -->
                  @if (selectedType() === 'comment') {
                    <mat-form-field appearance="outline">
                      <mat-label>Référence au passage visé (optionnel)</mat-label>
                      <input matInput formControlName="targetRef" placeholder="ex: §3 ligne 2" />
                    </mat-form-field>
                  }

                  <div style="display:flex; gap:12px; justify-content:flex-end; align-items:center">
                    <button mat-stroked-button type="button" (click)="resetForm()">
                      <mat-icon>clear</mat-icon> Effacer
                    </button>
                    <button mat-raised-button color="primary" type="submit" [disabled]="submitting()">
                      @if (submitting()) {
                        <mat-spinner diameter="20" style="margin:auto"></mat-spinner>
                      } @else {
                        <ng-container><mat-icon>send</mat-icon> Soumettre</ng-container>
                      }
                    </button>
                  </div>
                </form>
              }
            </mat-card-content>
          </mat-card>

          <!-- Section traduction EN (disponible dès qu'un brouillon existe) -->
          @if (draftId()) {
            <mat-card style="margin-top:16px">
              <mat-card-header>
                <mat-icon mat-card-avatar>translate</mat-icon>
                <mat-card-title>English translation (optional)</mat-card-title>
                <mat-card-subtitle>EN version — plain text, no formatting required</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content style="display:flex; flex-direction:column; gap:12px; padding-top:8px">

                <!-- Bouton Traduire -->
                <div style="display:flex; justify-content:flex-end">
                  <button mat-stroked-button type="button" [disabled]="translating()" (click)="autoTranslate()"
                          matTooltip="Traduit tous les champs via IA (écrase la traduction existante)">
                    @if (translating()) {
                      <mat-spinner diameter="16" style="display:inline-block; margin-right:6px"></mat-spinner> Traduction…
                    } @else {
                      <ng-container><mat-icon>auto_awesome</mat-icon> Traduire</ng-container>
                    }
                  </button>
                </div>

                @if (selectedType() !== 'comment') {
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">
                      Title (EN) <span style="color:#888; font-weight:400; text-transform:none">— FR : {{ form.get('title')?.value }}</span>
                    </div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().title ?? ''"
                           (input)="setTrans('title', $any($event.target).value)"
                           placeholder="Title in English…" />
                  </div>
                }

                @if (selectedType() === 'activity' || selectedType() === 'comment') {
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Content (EN)</div>
                    <textarea rows="4"
                              style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                              [value]="translationDraft().content ?? ''"
                              (input)="setTrans('content', $any($event.target).value)"
                              placeholder="Content in English…"></textarea>
                  </div>
                }

                @if (selectedType() === 'activity') {
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Inputs / means (EN)</div>
                    <textarea rows="2" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                              [value]="translationDraft().means ?? ''"
                              (input)="setTrans('means', $any($event.target).value)"
                              placeholder="Inputs in English…"></textarea>
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Outputs (EN)</div>
                    <textarea rows="2" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                              [value]="translationDraft().output ?? ''"
                              (input)="setTrans('output', $any($event.target).value)"
                              placeholder="Outputs in English…"></textarea>
                  </div>
                }

                @if (selectedType() === 'milestone') {
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Deliverable (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().deliverable ?? ''"
                           (input)="setTrans('deliverable', $any($event.target).value)"
                           placeholder="Deliverable in English…" />
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Verification method (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().verificationMethod ?? ''"
                           (input)="setTrans('verificationMethod', $any($event.target).value)"
                           placeholder="Verification method in English…" />
                  </div>
                }

                @if (selectedType() === 'indicator') {
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Target value (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().targetValue ?? ''"
                           (input)="setTrans('targetValue', $any($event.target).value)"
                           placeholder="Target value in English…" />
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Baseline (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().baseline ?? ''"
                           (input)="setTrans('baseline', $any($event.target).value)"
                           placeholder="Baseline in English…" />
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Data source (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().dataSource ?? ''"
                           (input)="setTrans('dataSource', $any($event.target).value)"
                           placeholder="Data source in English…" />
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Frequency (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().frequency ?? ''"
                           (input)="setTrans('frequency', $any($event.target).value)"
                           placeholder="Frequency in English…" />
                  </div>
                }

                @if (selectedType() === 'risk') {
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Likelihood (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().likelihood ?? ''"
                           (input)="setTrans('likelihood', $any($event.target).value)"
                           placeholder="e.g. Low / Medium / High" />
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Impact (EN)</div>
                    <input style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box"
                           [value]="translationDraft().impact ?? ''"
                           (input)="setTrans('impact', $any($event.target).value)"
                           placeholder="e.g. Low / Medium / High" />
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:#1565c0; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px">Mitigation measure (EN)</div>
                    <textarea rows="3" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; box-sizing:border-box; resize:vertical"
                              [value]="translationDraft().mitigation ?? ''"
                              (input)="setTrans('mitigation', $any($event.target).value)"
                              placeholder="Mitigation measure in English…"></textarea>
                  </div>
                }

                <div style="display:flex; justify-content:flex-end; padding-top:4px">
                  <button mat-stroked-button type="button" [disabled]="savingTranslation()" (click)="saveTranslation()">
                    @if (savingTranslation()) {
                      <mat-spinner diameter="16"></mat-spinner>
                    } @else {
                      <ng-container><mat-icon>save</mat-icon> Save EN</ng-container>
                    }
                  </button>
                </div>

              </mat-card-content>
            </mat-card>
          }

        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class ContributeComponent implements OnInit, OnDestroy {

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  hasUnsavedChanges(): boolean {
    return !!this._draftId() && !this.submitting();
  }
  private route = inject(ActivatedRoute);
  private sectionsService = inject(SectionsService);
  private inputsService = inject(InputsService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private autosaveSubject$ = new Subject<void>();
  private formValueSub: Subscription | null = null;

  auth = inject(AuthService);

  sections = signal<ReferenceSection[]>([]);
  currentSection = signal<ReferenceSection | null>(null);
  existingInputs = signal<Input[]>([]);
  submitting = signal(false);
  autosaving = signal(false);
  autosaveLabel = signal('');

  private _draftId = signal<string | null>(null);
  draftId = this._draftId.asReadonly();
  private isSaving = false;
  translationDraft = signal<Partial<InputTranslation>>({});
  savingTranslation = signal(false);
  translating = signal(false);

  commentingOnId = signal<string | null>(null);
  inlineCommentText = signal('');
  submittingInlineComment = signal(false);

  selectedSectionId = '';

  readonly TYPE_LABELS = TYPE_LABELS;
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly quillModules = QUILL_MODULES;

  form = this.fb.group({
    type: ['comment' as InputType, Validators.required],
    title: [''],
    content: [''],
    means: [''],
    output: [''],
    objective: [''],
    sourceRef: [''],
    deliverable: [''],
    verificationMethod: [''],
    dueMonth: [''],
    paymentAmountProposed: [''],
    targetValue: [''],
    baseline: [''],
    dataSource: [''],
    frequency: [''],
    likelihood: [''],
    impact: [''],
    mitigation: [''],
    targetRef: [''],
  });

  selectedType = computed(() => (this.form.get('type')?.value as InputType) ?? 'comment');

  titleLabel(): string {
    switch (this.selectedType()) {
      case 'milestone': return 'Description du jalon *';
      case 'indicator': return "Intitulé de l'indicateur *";
      case 'risk': return 'Description du risque *';
      default: return 'Titre *';
    }
  }

  allowedTypes = computed<InputType[]>(() => {
    const section = this.currentSection();
    if (!section) return ['comment'];
    const types = section.inputTypes as InputType[];
    return types.length > 0 ? types : ['comment'];
  });

  ngOnInit() {
    this.sectionsService.getAll().subscribe(sections => {
      this.sections.set(sections);
      const paramId = this.route.snapshot.paramMap.get('sectionId');
      if (paramId) {
        this.selectedSectionId = paramId;
        this.onSectionChange(paramId);
      }
    });

    this.autosaveSubject$.pipe(
      debounceTime(2500),
      takeUntil(this.destroy$),
    ).subscribe(() => this.runAutosave());
  }

  ngOnDestroy() {
    this.formValueSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSectionChange(id: string) {
    this.selectedSectionId = id;
    const section = this.sections().find(s => s.id === id);
    this.currentSection.set(section ?? null);
    this._draftId.set(null);
    this.isSaving = false;
    this.autosaveLabel.set('');
    this.translationDraft.set({});

    const defaultType = section?.inputTypes?.[0] as InputType ?? 'comment';
    this.form.patchValue({ type: defaultType }, { emitEvent: false });

    this.loadExistingInputs(id);

    // Watch for form changes to trigger auto-save (unsubscribe previous section first)
    this.formValueSub?.unsubscribe();
    this.formValueSub = this.form.valueChanges.pipe(
      debounceTime(100),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ).subscribe(() => this.autosaveSubject$.next());
  }

  loadExistingInputs(sectionId: string) {
    this.inputsService.getAll({ sectionId }).subscribe(inputs => this.existingInputs.set(inputs));
  }

  setTrans(field: string, value: string) {
    this.translationDraft.update(d => ({ ...d, [field]: value }));
  }

  autoTranslate() {
    if (!this._draftId()) return;
    this.translating.set(true);
    this.inputsService.autoTranslate(this._draftId()!).subscribe({
      next: (t) => {
        this.translating.set(false);
        this.translationDraft.set({ ...t });
        this.snackBar.open('Traduction EN générée', 'OK', { duration: 2500 });
      },
      error: (e) => {
        this.translating.set(false);
        this.snackBar.open(e.error?.message ?? 'Erreur LLM', 'Fermer', { duration: 5000 });
      },
    });
  }

  saveTranslation() {
    if (!this._draftId()) return;
    this.savingTranslation.set(true);
    this.inputsService.upsertTranslation(this._draftId()!, { ...this.translationDraft() }).subscribe({
      next: () => {
        this.savingTranslation.set(false);
        this.snackBar.open('Traduction EN enregistrée', 'OK', { duration: 2000 });
      },
      error: (e) => {
        this.savingTranslation.set(false);
        this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  resumeDraft(inp: Input) {
    this._draftId.set(inp.id);
    this.translationDraft.set(inp.translation ? { ...inp.translation } : {});
    this.form.patchValue({
      type: inp.type,
      title: inp.title ?? '',
      content: inp.content ?? '',
      means: inp.means ?? '',
      output: inp.output ?? '',
      objective: inp.objective ?? '',
      sourceRef: inp.sourceRef ?? '',
      deliverable: inp.deliverable ?? '',
      verificationMethod: inp.verificationMethod ?? '',
      dueMonth: inp.dueMonth ?? '',
      paymentAmountProposed: inp.paymentAmountProposed ?? '',
      targetValue: inp.targetValue ?? '',
      baseline: inp.baseline ?? '',
      dataSource: inp.dataSource ?? '',
      frequency: inp.frequency ?? '',
      likelihood: inp.likelihood ?? '',
      impact: inp.impact ?? '',
      mitigation: inp.mitigation ?? '',
      targetRef: inp.targetRef ?? '',
    }, { emitEvent: false });
    this.autosaveLabel.set('Brouillon chargé');
    this.snackBar.open('Brouillon repris', 'OK', { duration: 2000 });
  }

  private hasContent(v: any): boolean {
    const fields = ['content', 'title', 'means', 'output', 'objective', 'sourceRef',
      'deliverable', 'verificationMethod', 'dueMonth', 'paymentAmountProposed',
      'targetValue', 'baseline', 'dataSource', 'frequency',
      'likelihood', 'impact', 'mitigation', 'targetRef'];
    return fields.some(f => {
      const val = (v[f] ?? '').toString().replace(/<[^>]+>/g, '').trim();
      return val.length > 0;
    });
  }

  private runAutosave() {
    if (!this.selectedSectionId || this.isSaving || this.submitting()) return;
    const v = this.form.value;
    if (!this.hasContent(v)) return;
    const payload = this.buildPayload(v);

    this.isSaving = true;
    this.autosaving.set(true);
    this.autosaveLabel.set('Enregistrement...');

    const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const done = () => { this.isSaving = false; this.autosaving.set(false); };

    if (this._draftId()) {
      this.inputsService.update(this._draftId()!, payload).subscribe({
        next: () => { done(); this.autosaveLabel.set(`Brouillon enregistré à ${now()}`); },
        error: () => { done(); this.autosaveLabel.set('Erreur d\'enregistrement'); },
      });
    } else {
      this.inputsService.create({
        referenceSectionId: this.selectedSectionId,
        ...payload,
      }).subscribe({
        next: (inp) => {
          this._draftId.set(inp.id);
          done();
          this.autosaveLabel.set(`Brouillon enregistré à ${now()}`);
          this.loadExistingInputs(this.selectedSectionId);
        },
        error: () => { done(); this.autosaveLabel.set('Erreur d\'enregistrement'); },
      });
    }
  }

  submit() {
    if (this.submitting()) return;
    this.submitting.set(true);
    const v = this.form.value;
    const payload = this.buildPayload(v);

    const doSubmit = (id: string) => {
      this.inputsService.updateStatus(id, 'submitted').subscribe({
        next: () => {
          this.submitting.set(false);
          this.snackBar.open('Contribution soumise avec succès !', 'OK', { duration: 3000 });
          this._draftId.set(null);
          this.resetForm();
          this.loadExistingInputs(this.selectedSectionId);
        },
        error: (e) => {
          this.submitting.set(false);
          this.snackBar.open(e.error?.message ?? 'Erreur lors de la soumission', 'Fermer', { duration: 5000 });
        },
      });
    };

    if (this._draftId()) {
      this.inputsService.update(this._draftId()!, payload).subscribe({
        next: () => doSubmit(this._draftId()!),
        error: (e) => {
          this.submitting.set(false);
          this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 5000 });
        },
      });
    } else {
      this.inputsService.create({
        referenceSectionId: this.selectedSectionId,
        ...payload,
      }).subscribe({
        next: (inp) => {
          this._draftId.set(inp.id);
          doSubmit(inp.id);
        },
        error: (e) => {
          this.submitting.set(false);
          this.snackBar.open(e.error?.message ?? 'Erreur', 'Fermer', { duration: 5000 });
        },
      });
    }
  }

  private buildPayload(v: any) {
    return {
      type: (v.type || 'comment') as InputType,
      ...(v.title && { title: v.title }),
      ...(v.content && { content: v.content }),
      ...(v.means && { means: v.means }),
      ...(v.output && { output: v.output }),
      ...(v.objective && { objective: v.objective }),
      ...(v.sourceRef && { sourceRef: v.sourceRef }),
      ...(v.deliverable && { deliverable: v.deliverable }),
      ...(v.verificationMethod && { verificationMethod: v.verificationMethod }),
      ...(v.dueMonth && { dueMonth: v.dueMonth }),
      ...(v.paymentAmountProposed && { paymentAmountProposed: v.paymentAmountProposed }),
      ...(v.targetValue && { targetValue: v.targetValue }),
      ...(v.baseline && { baseline: v.baseline }),
      ...(v.dataSource && { dataSource: v.dataSource }),
      ...(v.frequency && { frequency: v.frequency }),
      ...(v.likelihood && { likelihood: v.likelihood }),
      ...(v.impact && { impact: v.impact }),
      ...(v.mitigation && { mitigation: v.mitigation }),
      ...(v.targetRef && { targetRef: v.targetRef }),
    };
  }

  toggleCommentBox(inp: Input) {
    if (this.commentingOnId() === inp.id) {
      this.commentingOnId.set(null);
      this.inlineCommentText.set('');
    } else {
      this.commentingOnId.set(inp.id);
      this.inlineCommentText.set('');
    }
  }

  cancelInlineComment() {
    this.commentingOnId.set(null);
    this.inlineCommentText.set('');
  }

  submitInlineComment(inp: Input) {
    const text = this.inlineCommentText().trim();
    if (!text || this.submittingInlineComment()) return;
    this.submittingInlineComment.set(true);

    this.inputsService.create({
      referenceSectionId: this.selectedSectionId,
      type: 'comment',
      content: text,
      targetRef: inp.id,
    }).subscribe({
      next: (created) => {
        this.inputsService.updateStatus(created.id, 'submitted').subscribe({
          next: () => {
            this.submittingInlineComment.set(false);
            this.commentingOnId.set(null);
            this.inlineCommentText.set('');
            this.snackBar.open('Commentaire soumis', 'OK', { duration: 2500 });
            this.loadExistingInputs(this.selectedSectionId);
          },
          error: (e) => {
            this.submittingInlineComment.set(false);
            this.snackBar.open(e.error?.message ?? 'Erreur lors de la soumission', 'Fermer', { duration: 4000 });
          },
        });
      },
      error: (e) => {
        this.submittingInlineComment.set(false);
        this.snackBar.open(e.error?.message ?? 'Erreur lors de la création', 'Fermer', { duration: 4000 });
      },
    });
  }

  resetForm() {
    this._draftId.set(null);
    this.isSaving = false;
    this.autosaveLabel.set('');
    this.translationDraft.set({});
    const defaultType = this.currentSection()?.inputTypes?.[0] as InputType ?? 'comment';
    this.form.reset({ type: defaultType }, { emitEvent: false });
  }
}
