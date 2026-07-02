import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { SectionsService, ReferenceSection } from '../../services/sections.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

const OBJECTIF_LABELS: Record<string, string> = {
  obj1: 'Obj. 1 - Gouvernance',
  obj2: 'Obj. 2 - Achat & distribution',
  obj3: 'Obj. 3 - Ecosystème numérique',
  obj4: 'Obj. 4 - Transition durable',
  transversal: 'Transversal',
};

const CONTRIBUTION_LABELS: Record<string, string> = {
  structuree: 'Contribution structurée',
  commentaire: 'Commentaire',
  lecture_seule: 'Lecture seule',
};

const CONTRIBUTION_ICONS: Record<string, string> = {
  structuree: 'edit',
  commentaire: 'chat',
  lecture_seule: 'lock',
};

@Component({
  selector: 'app-reference',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MarkdownPipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatExpansionModule, MatBadgeModule,
  ],
  template: `
    <div class="page-container">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px">
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:600">Socle de référence - Proposition NPSP-CI</h1>
          <p style="margin:4px 0 0; color:#666; font-size:14px">
            Validé par le Chief of Party · Lecture seule · 18 axes de contribution
          </p>
        </div>
        <a mat-raised-button color="primary" routerLink="/contribute">
          <mat-icon>edit_note</mat-icon> Contribuer
        </a>
      </div>

      @if (loading()) {
        <div style="text-align:center; padding:60px">
          <mat-spinner diameter="48" style="margin:auto"></mat-spinner>
        </div>
      }

      @if (error()) {
        <mat-card style="background:#ffebee; color:#c62828; padding:16px">
          <mat-icon>error</mat-icon> {{ error() }}
        </mat-card>
      }

      @for (part of parts(); track part.partNumber) {
        <div style="margin-bottom:8px">
          <h2 style="font-size:14px; font-weight:700; color:#1565c0; margin:20px 0 6px; display:flex; align-items:center; gap:10px">
            <span style="background:#1565c0; color:#fff; border-radius:50%; width:26px; height:26px; flex-shrink:0;
                         display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700">
              {{ part.partNumber }}
            </span>
            {{ part.partTitle }}
          </h2>
          <mat-accordion multi>
            @for (section of part.sections; track section.id) {
              <mat-expansion-panel>
                <mat-expansion-panel-header>
                  <mat-panel-title style="font-weight:500; font-size:15px">
                    {{ section.titre }}
                  </mat-panel-title>
                  <mat-panel-description style="display:flex; align-items:center; gap:8px">
                    <span class="section-badge">{{ OBJECTIF_LABELS[section.objectif] }}</span>
                    <mat-chip [class]="'contribution-' + section.contributionMode" style="font-size:11px; min-height:22px">
                      <mat-icon style="font-size:14px; margin-right:4px">{{ CONTRIBUTION_ICONS[section.contributionMode] }}</mat-icon>
                      {{ CONTRIBUTION_LABELS[section.contributionMode] }}
                    </mat-chip>
                    @if ((section._count?.inputs ?? 0) > 0) {
                      <span style="font-size:12px; color:#1565c0; font-weight:600">
                        {{ section._count?.inputs }} input(s)
                      </span>
                    }
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <div style="padding:8px 0">
                  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px">
                    <span style="font-size:12px; color:#666">
                      <strong>NOFO :</strong> {{ section.rubriqueNofo }}
                    </span>
                    @if (section.entites.length > 0) {
                      <span style="font-size:12px; color:#666">
                        <strong>Entités :</strong> {{ section.entites.join(', ') }}
                      </span>
                    }
                  </div>

                  <div class="reference-text" [innerHTML]="section.texteReference | markdown"></div>

                  @if (section.contributionMode !== 'lecture_seule') {
                    <div style="margin-top:12px; text-align:right">
                      <a mat-stroked-button color="primary" [routerLink]="['/contribute', section.id]">
                        <mat-icon>edit_note</mat-icon> Contribuer sur cet axe
                      </a>
                    </div>
                  }
                </div>
              </mat-expansion-panel>
            }
          </mat-accordion>
        </div>
      }
    </div>
  `,
  styles: [`
    .contribution-structuree { background: #e8f5e9 !important; color: #1b5e20 !important; }
    .contribution-commentaire { background: #e3f2fd !important; color: #0d47a1 !important; }
    .contribution-lecture_seule { background: #f3e5f5 !important; color: #4a148c !important; }
    mat-expansion-panel { margin-bottom: 8px !important; }
  `],
})
export class ReferenceComponent implements OnInit {
  private sectionsService = inject(SectionsService);

  sections = signal<ReferenceSection[]>([]);
  loading = signal(true);
  error = signal('');

  readonly OBJECTIF_LABELS = OBJECTIF_LABELS;
  readonly CONTRIBUTION_LABELS = CONTRIBUTION_LABELS;
  readonly CONTRIBUTION_ICONS = CONTRIBUTION_ICONS;

  parts = computed(() => {
    const map = new Map<number, { partNumber: number; partTitle: string; sections: ReferenceSection[] }>();
    for (const s of this.sections()) {
      const pn = s.partNumber ?? 0;
      const pt = s.partTitle ?? 'Général';
      if (!map.has(pn)) map.set(pn, { partNumber: pn, partTitle: pt, sections: [] });
      map.get(pn)!.sections.push(s);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v);
  });

  ngOnInit() {
    this.sectionsService.getAll().subscribe({
      next: (data) => { this.sections.set(data); this.loading.set(false); },
      error: (e) => { this.error.set(e.message ?? 'Erreur de chargement'); this.loading.set(false); },
    });
  }
}
