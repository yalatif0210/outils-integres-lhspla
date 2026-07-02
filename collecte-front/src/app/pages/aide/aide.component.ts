import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-aide',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatExpansionModule, MatDividerModule],
  template: `
    <div class="page-container" style="max-width:860px; margin:0 auto">

      <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px">
        <a mat-button routerLink="/reference">
          <mat-icon>arrow_back</mat-icon> Retour au socle
        </a>
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:600">Aide — Module Collecte</h1>
          <p style="margin:4px 0 0; color:#666; font-size:14px">Proposition NPSP-CI · GHSD</p>
        </div>
      </div>

      <!-- Esprit du document -->
      <mat-card style="margin-bottom:20px">
        <mat-card-header>
          <mat-icon mat-card-avatar style="color:#1565c0">lightbulb</mat-icon>
          <mat-card-title>L'esprit du document</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding:0 16px 16px">
          <p style="line-height:1.7; color:#333">
            Ce module collecte les contributions des sept équipes (QAD, CAD, CAC, S&amp;E, SI, COM, PMO)
            pour construire la proposition NPSP-CI/GHSD. Chaque section correspond à une rubrique du NOFO.
            Le socle de référence est validé par le Chief of Party — il n'est pas modifiable.
            Votre rôle est d'enrichir ce socle avec des <strong>activités</strong>, <strong>jalons</strong>,
            <strong>indicateurs</strong>, <strong>risques</strong> ou <strong>commentaires</strong> propres à votre entité.
          </p>
          <p style="line-height:1.7; color:#333; margin-top:8px">
            Tous les inputs passent par un cycle : <strong>Brouillon → Soumis → Retenu / Rejeté</strong>.
            Seuls les inputs retenus par le PMO figurent dans l'export final.
          </p>
        </mat-card-content>
      </mat-card>

      <!-- Guide par rôle -->
      <mat-card style="margin-bottom:20px">
        <mat-card-header>
          <mat-icon mat-card-avatar style="color:#2e7d32">people</mat-icon>
          <mat-card-title>Guide par rôle</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding:0 16px 16px">
          <table style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #e0e0e0">Rôle</th>
                <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #e0e0e0">Ce que vous pouvez faire</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eeeeee; font-weight:600">Contributeur (entité)</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eeeeee">
                  Créer / modifier ses brouillons · Soumettre · Reprendre un brouillon · Commenter les contributions d'autrui · Supprimer ses propres brouillons
                </td>
              </tr>
              <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eeeeee; font-weight:600">PMO / COP</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eeeeee">
                  Voir toutes les contributions · Retenir ou rejeter les inputs soumis · Saisir le montant final des jalons · Exporter DOCX / XLSX
                </td>
              </tr>
              <tr>
                <td style="padding:8px 12px; font-weight:600">Super Admin</td>
                <td style="padding:8px 12px">
                  Toutes les actions PMO · Déverrouiller un input soumis/retenu · Supprimer n'importe quel input · Restaurer depuis la corbeille
                </td>
              </tr>
            </tbody>
          </table>
        </mat-card-content>
      </mat-card>

      <!-- FAQ -->
      <mat-card style="margin-bottom:20px">
        <mat-card-header>
          <mat-icon mat-card-avatar style="color:#e65100">help_outline</mat-icon>
          <mat-card-title>Questions fréquentes</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding:0 8px 8px">
          <mat-accordion>

            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>Mon input est enregistré automatiquement ?</mat-panel-title>
              </mat-expansion-panel-header>
              <p>Oui. Dès que vous commencez à remplir un formulaire, un brouillon est créé automatiquement toutes les 2,5 secondes. Le statut <em>Brouillon enregistré à HH:MM</em> confirme la sauvegarde. Si vous quittez la page, un avertissement vous rappelle qu'un brouillon est en cours.</p>
            </mat-expansion-panel>

            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>Quelle différence entre « Soumettre » et « Enregistrer » ?</mat-panel-title>
              </mat-expansion-panel-header>
              <p>L'enregistrement automatique crée un <strong>brouillon</strong> (visible uniquement par vous et votre entité). <strong>Soumettre</strong> verrouille l'input et le rend visible au PMO pour qualification. Une fois soumis, vous ne pouvez plus le modifier sans passer par le Super Admin.</p>
            </mat-expansion-panel>

            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>Mon input soumis est modifié par erreur. Que faire ?</mat-panel-title>
              </mat-expansion-panel-header>
              <p>Contactez le Super Admin ou le PMO. Seul le Super Admin peut repasser un input au statut <em>Brouillon</em> pour permettre une correction.</p>
            </mat-expansion-panel>

            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>Quels champs sont obligatoires selon le type ?</mat-panel-title>
              </mat-expansion-panel-header>
              <ul style="line-height:1.9">
                <li><strong>Activité :</strong> description (contenu)</li>
                <li><strong>Jalon :</strong> titre · livrable · méthode de vérification · mois d'échéance</li>
                <li><strong>Indicateur :</strong> intitulé · valeur cible · source de donnée · fréquence</li>
                <li><strong>Risque :</strong> description · probabilité · impact · mesure d'atténuation</li>
                <li><strong>Commentaire :</strong> contenu</li>
              </ul>
            </mat-expansion-panel>

            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>Je ne vois pas mon type de contribution dans la liste.</mat-panel-title>
              </mat-expansion-panel-header>
              <p>Chaque section n'accepte que certains types d'input (définis dans le socle). Par exemple, la section <em>Plan des étapes clés</em> accepte les <strong>jalons</strong> et les <strong>commentaires</strong>. Si le type dont vous avez besoin n'est pas disponible, contactez le PMO.</p>
            </mat-expansion-panel>

          </mat-accordion>
        </mat-card-content>
      </mat-card>

      <!-- Glossaire -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar style="color:#6a1b9a">menu_book</mat-icon>
          <mat-card-title>Vocabulaire clé</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding:0 16px 16px; font-size:13px; line-height:1.8">
          <dl style="margin:8px 0 0">
            <dt style="font-weight:600">Axe / Section</dt>
            <dd style="margin:0 0 8px 16px">Rubrique de la proposition NPSP-CI correspondant à une section du NOFO.</dd>
            <dt style="font-weight:600">Input</dt>
            <dd style="margin:0 0 8px 16px">Contribution d'une entité sur un axe (activité, jalon, indicateur, risque ou commentaire).</dd>
            <dt style="font-weight:600">Brouillon</dt>
            <dd style="margin:0 0 8px 16px">Input en cours de rédaction, non encore soumis au PMO. Modifiable librement.</dd>
            <dt style="font-weight:600">Retenu</dt>
            <dd style="margin:0 0 8px 16px">Input validé par le PMO et inclus dans l'export final.</dd>
            <dt style="font-weight:600">PMO</dt>
            <dd style="margin:0 0 8px 16px">Project Management Office — entité qui qualifie les contributions et produit les exports.</dd>
            <dt style="font-weight:600">COP</dt>
            <dd style="margin:0 0 8px 16px">Chief of Party — valide le socle de référence et peut réviser les inputs en phase de consolidation.</dd>
          </dl>
        </mat-card-content>
      </mat-card>

    </div>
  `,
  styles: [`
    mat-expansion-panel { box-shadow: none !important; border-bottom: 1px solid #eeeeee; }
    mat-expansion-panel:last-child { border-bottom: none; }
  `],
})
export class AideComponent {}
