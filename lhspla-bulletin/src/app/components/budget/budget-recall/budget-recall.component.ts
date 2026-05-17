import { Component, Input, OnInit, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

const ACTION_LABELS: Record<string, string> = {
  created: 'Rappel créé',
  doc_added: 'Pièce ajoutée',
  doc_deleted: 'Pièce supprimée',
  doc_approved: 'Pièce approuvée',
  doc_rejected: 'Pièce rejetée',
  closed: 'Rappel clôturé',
  reopened: 'Rappel réouvert',
  rejected: 'Rappel rejeté',
  cancelled: 'Rappel annulé',
};

const ACTION_ICONS: Record<string, string> = {
  created: 'add_circle',
  doc_added: 'attach_file',
  doc_deleted: 'delete',
  doc_approved: 'check_circle',
  doc_rejected: 'cancel',
  closed: 'lock',
  reopened: 'lock_open',
  rejected: 'block',
  cancelled: 'undo',
};

@Component({
  selector: 'app-budget-recall',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, MatSnackBarModule, MatProgressBarModule,
  ],
  template: `
    <div class="recall-section">
      <div class="recall-header">
        <mat-icon class="recall-icon">folder_special</mat-icon>
        <h3>Rappels &amp; Pièces Justificatives</h3>
        <span class="recall-badge open" *ngIf="openCount() > 0">{{openCount()}} ouvert(s)</span>
        <button mat-stroked-button class="btn-new-recall" (click)="showCreateForm=true"
                *ngIf="canCreateRecall() && !showCreateForm">
          <mat-icon>add</mat-icon> Nouveau rappel
        </button>
      </div>

      <!-- Formulaire création -->
      <mat-card class="create-form-card" *ngIf="showCreateForm">
        <mat-card-content>
          <h4>Créer un rappel</h4>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Motif du rappel *</mat-label>
            <textarea matInput [(ngModel)]="newReason" rows="3"
                      placeholder="Ex: Transmission des factures d'hôtel et reçus carburant..."></textarea>
          </mat-form-field>
          <div class="form-actions">
            <button mat-stroked-button (click)="showCreateForm=false; newReason=''">Annuler</button>
            <button mat-raised-button color="primary" (click)="createRecall()"
                    [disabled]="!newReason.trim() || saving()">
              <mat-icon>send</mat-icon> Créer le rappel
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <div *ngIf="loading()" class="mini-loading">
        <mat-icon>hourglass_empty</mat-icon> Chargement...
      </div>

      <div *ngIf="!loading() && recalls().length === 0 && !showCreateForm" class="empty-state">
        <mat-icon>inbox</mat-icon>
        <p>Aucun rappel pour ce budget.</p>
      </div>

      <!-- Carte par rappel -->
      <mat-card class="recall-card" *ngFor="let recall of recalls()"
                [class.closed]="recall.status === 'closed'"
                [class.rejected]="recall.status === 'rejected'"
                [class.cancelled]="recall.status === 'cancelled'">
        <mat-card-content>

          <!-- Entête rappel -->
          <div class="recall-meta">
            <span class="status-chip"
                  [class.open]="recall.status==='open'"
                  [class.closed]="recall.status==='closed'"
                  [class.rejected]="recall.status==='rejected'"
                  [class.cancelled]="recall.status==='cancelled'">
              <mat-icon>{{statusIcon(recall.status)}}</mat-icon>
              {{statusLabel(recall.status)}}
            </span>
            <span class="recall-date">{{recall.createdAt | date:'dd/MM/yyyy HH:mm'}}</span>
            <span class="closed-info" *ngIf="recall.closedBy && recall.status === 'closed'">
              — Clôturé par {{recall.closedBy.firstName}} {{recall.closedBy.lastName}}
              le {{recall.closedAt | date:'dd/MM/yyyy'}}
            </span>
            <span class="spacer"></span>
            <ng-container *ngIf="recall.status === 'open'">
              <span class="coverage-badge"
                    [class.full]="allRequiredApproved(recall)"
                    [class.partial]="someApproved(recall) && !allRequiredApproved(recall)"
                    [class.none]="!someApproved(recall)">
                <mat-icon>{{allRequiredApproved(recall) ? 'check_circle' : 'warning'}}</mat-icon>
                {{approvedCount(recall)}}/{{requiredLines().length}} approuvés
              </span>
            </ng-container>
          </div>

          <p class="recall-reason"><strong>Motif :</strong> {{recall.reason}}</p>

          <!-- Motif de rejet global -->
          <div class="rejection-banner" *ngIf="recall.status === 'rejected' && recall.rejectionReason">
            <mat-icon>block</mat-icon>
            <span><strong>Motif de rejet :</strong> {{recall.rejectionReason}}</span>
          </div>

          <!-- Tableau lignes budgétaires + documents (uniquement si open) -->
          <div class="lines-table" *ngIf="recall.status === 'open' || recall.status === 'closed'">
            <div class="lines-header">
              <span class="col-line">Poste de dépense</span>
              <span class="col-justif">Pièce attendue</span>
              <span class="col-docs">Documents joints</span>
              <span class="col-action" *ngIf="recall.status==='open' && (canUploadDoc() || canClose())"></span>
            </div>

            <div class="line-row" *ngFor="let line of requiredLines()"
                 [class.approved]="hasApprovedDoc(recall, line.id)"
                 [class.covered]="docsForLine(recall, line.id).length > 0 && !hasApprovedDoc(recall, line.id)"
                 [class.missing]="docsForLine(recall, line.id).length === 0">

              <div class="col-line">
                <span class="line-key">{{line.rowKey}}</span>
                <span class="line-desig">{{line.designation || '—'}}</span>
              </div>

              <div class="col-justif">
                <span class="justif-tag" *ngIf="line.costItem?.justificatif">
                  {{line.costItem.justificatif}}
                </span>
                <span class="no-justif" *ngIf="!line.costItem?.justificatif">—</span>
              </div>

              <div class="col-docs">
                <div class="doc-chip" *ngFor="let doc of docsForLine(recall, line.id)"
                     [class.doc-approved]="doc.docStatus === 'approved'"
                     [class.doc-rejected]="doc.docStatus === 'rejected'">
                  <mat-icon class="doc-status-icon">{{docStatusIcon(doc.docStatus)}}</mat-icon>
                  <mat-icon class="doc-type-icon">{{fileIcon(doc.fileType)}}</mat-icon>
                  <span class="doc-name" [title]="doc.fileName">{{doc.fileName}}</span>
                  <span class="doc-size">({{formatSize(doc.fileSize)}})</span>
                  <span class="doc-rejected-note" *ngIf="doc.docStatus === 'rejected' && doc.rejectionNote"
                        [matTooltip]="doc.rejectionNote">
                    <mat-icon>info_outline</mat-icon>
                  </span>
                  <button mat-icon-button class="btn-download" (click)="openFile(doc)"
                          matTooltip="Télécharger">
                    <mat-icon>download</mat-icon>
                  </button>
                  <!-- Boutons revue admin_finance -->
                  <ng-container *ngIf="recall.status==='open' && canClose() && doc.docStatus === 'pending'">
                    <button mat-icon-button class="btn-approve" (click)="approveDoc(recall, doc)"
                            matTooltip="Approuver">
                      <mat-icon>check_circle</mat-icon>
                    </button>
                    <button mat-icon-button class="btn-reject-doc" (click)="startDocReject(recall.id, doc.id)"
                            matTooltip="Rejeter">
                      <mat-icon>cancel</mat-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngIf="recall.status==='open' && canClose() && doc.docStatus !== 'pending'">
                    <button mat-icon-button class="btn-reset-doc" (click)="resetDoc(recall, doc)"
                            matTooltip="Annuler la revue">
                      <mat-icon>undo</mat-icon>
                    </button>
                  </ng-container>
                  <button mat-icon-button color="warn" (click)="deleteDoc(recall, doc)"
                          *ngIf="recall.status==='open' && canUploadDoc() && doc.docStatus === 'pending'"
                          matTooltip="Supprimer">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>

                <!-- Formulaire rejet inline -->
                <div class="reject-doc-form" *ngIf="docRejectTarget?.recallId === recall.id && docRejectTarget?.docId === getDociForLine(recall, line)">
                  <mat-form-field appearance="outline" class="full-width reject-field">
                    <mat-label>Motif de rejet *</mat-label>
                    <input matInput [(ngModel)]="docRejectNote" placeholder="Ex: Facture illisible, montant incorrect...">
                  </mat-form-field>
                  <div class="reject-doc-actions">
                    <button mat-stroked-button (click)="cancelDocReject()">Annuler</button>
                    <button mat-raised-button color="warn" (click)="confirmDocReject(recall)"
                            [disabled]="!docRejectNote.trim() || saving()">
                      <mat-icon>cancel</mat-icon> Rejeter
                    </button>
                  </div>
                </div>

                <span class="no-doc" *ngIf="docsForLine(recall, line.id).length === 0">
                  <mat-icon>warning_amber</mat-icon> Manquant
                </span>
              </div>

              <div class="col-action" *ngIf="recall.status==='open' && canUploadDoc()">
                <button mat-icon-button color="primary"
                        (click)="startUpload(recall.id, line.id)"
                        matTooltip="Joindre un fichier">
                  <mat-icon>attach_file</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Formulaire rejet inline pour doc qui n'est pas dans requiredLines -->
          <div class="reject-doc-form standalone" *ngIf="docRejectTarget?.recallId === recall.id && !isDocInRequiredLines(recall)">
            <span class="reject-doc-title">Rejet de : <strong>{{getDocName(recall)}}</strong></span>
            <mat-form-field appearance="outline" class="full-width reject-field">
              <mat-label>Motif de rejet *</mat-label>
              <input matInput [(ngModel)]="docRejectNote" placeholder="Ex: Facture illisible, montant incorrect...">
            </mat-form-field>
            <div class="reject-doc-actions">
              <button mat-stroked-button (click)="cancelDocReject()">Annuler</button>
              <button mat-raised-button color="warn" (click)="confirmDocReject(recall)"
                      [disabled]="!docRejectNote.trim() || saving()">
                <mat-icon>cancel</mat-icon> Rejeter
              </button>
            </div>
          </div>

          <!-- Formulaire upload -->
          <div class="upload-form" *ngIf="uploadTarget?.recallId === recall.id">
            <div class="upload-form-inner">
              <div class="upload-line-info">
                <mat-icon>info_outline</mat-icon>
                Fichier pour : <strong>{{getLineName(uploadTarget!.lineId)}}</strong>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description (optionnel)</mat-label>
                <input matInput [(ngModel)]="uploadDesc"
                       placeholder="ex: Facture N°2345 du 15/04/2026">
              </mat-form-field>
              <div class="file-pick-row">
                <label class="file-pick-label">
                  <mat-icon>cloud_upload</mat-icon>
                  <span>{{selectedFile ? selectedFile.name : 'Choisir un fichier (PDF, Excel, PNG, JPG, ZIP — max 10 Mo)'}}</span>
                  <input type="file" hidden (change)="onFileSelected($event)"
                         accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg,.zip">
                </label>
              </div>
              <mat-progress-bar *ngIf="uploading()" mode="indeterminate"></mat-progress-bar>
              <div class="form-actions">
                <button mat-stroked-button (click)="cancelUpload()">Annuler</button>
                <button mat-raised-button color="primary" (click)="uploadDoc(recall)"
                        [disabled]="!selectedFile || uploading()">
                  <mat-icon>cloud_upload</mat-icon> Envoyer
                </button>
              </div>
            </div>
          </div>

          <!-- Autres lignes (montant = 0) -->
          <div class="extra-docs-section" *ngIf="recall.status==='open' && canUploadDoc()">
            <button mat-button color="primary" (click)="toggleExtraUpload(recall.id)">
              <mat-icon>add</mat-icon>
              Ajouter un document sur un autre poste
            </button>
            <div class="extra-upload-form" *ngIf="extraUploadRecallId === recall.id">
              <mat-form-field appearance="outline" style="width:220px">
                <mat-label>Poste de dépense *</mat-label>
                <mat-select [(ngModel)]="extraLineId">
                  <mat-option *ngFor="let l of allLines()" [value]="l.id">
                    {{l.rowKey}} — {{l.designation || 'Sans désignation'}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:200px">
                <mat-label>Description (optionnel)</mat-label>
                <input matInput [(ngModel)]="uploadDesc" placeholder="Description">
              </mat-form-field>
              <label class="file-pick-label compact">
                <mat-icon>attach_file</mat-icon>
                <span>{{selectedFile ? selectedFile.name : 'Choisir un fichier'}}</span>
                <input type="file" hidden (change)="onFileSelected($event)"
                       accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg,.zip">
              </label>
              <button mat-raised-button color="primary" (click)="uploadExtraDoc(recall)"
                      [disabled]="!selectedFile || !extraLineId || uploading()">
                <mat-icon>send</mat-icon> Envoyer
              </button>
              <button mat-stroked-button (click)="cancelExtraUpload()">Annuler</button>
            </div>
          </div>

          <!-- Formulaire rejet global du rappel -->
          <div class="global-reject-form" *ngIf="globalRejectRecallId === recall.id">
            <div class="global-reject-inner">
              <mat-icon class="reject-warn-icon">warning_amber</mat-icon>
              <div class="global-reject-content">
                <strong>Rejeter ce rappel en entier</strong>
                <mat-form-field appearance="outline" class="full-width reject-field">
                  <mat-label>Motif de rejet *</mat-label>
                  <textarea matInput [(ngModel)]="globalRejectNote" rows="2"
                            placeholder="Ex: Pièces insuffisantes, format non conforme..."></textarea>
                </mat-form-field>
                <div class="reject-doc-actions">
                  <button mat-stroked-button (click)="cancelGlobalReject()">Annuler</button>
                  <button mat-raised-button color="warn" (click)="confirmGlobalReject(recall)"
                          [disabled]="!globalRejectNote.trim() || saving()">
                    <mat-icon>block</mat-icon> Confirmer le rejet
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Journal d'audit -->
          <div class="audit-section">
            <button mat-button class="btn-audit" (click)="toggleAudit(recall.id)">
              <mat-icon>history</mat-icon>
              Journal d'audit
              <mat-icon class="chevron">{{expandedAudit === recall.id ? 'expand_less' : 'expand_more'}}</mat-icon>
            </button>
            <div class="audit-log" *ngIf="expandedAudit === recall.id">
              <div *ngIf="auditLoading()" class="mini-loading"><mat-icon>hourglass_empty</mat-icon> Chargement...</div>
              <div class="audit-entry" *ngFor="let entry of auditLogs()">
                <mat-icon class="audit-icon" [class]="'action-' + entry.action">
                  {{ACTION_ICONS[entry.action] || 'history'}}
                </mat-icon>
                <div class="audit-body">
                  <span class="audit-action">{{ACTION_LABELS[entry.action] || entry.action}}</span>
                  <span class="audit-who">par {{entry.user?.firstName}} {{entry.user?.lastName}}</span>
                  <span class="audit-when">{{entry.createdAt | date:'dd/MM/yyyy HH:mm'}}</span>
                  <div class="audit-detail" *ngIf="entry.detail">{{entry.detail}}</div>
                </div>
              </div>
              <div *ngIf="!auditLoading() && auditLogs().length === 0" class="empty-audit">
                Aucun événement.
              </div>
            </div>
          </div>

        </mat-card-content>

        <mat-card-actions>
          <!-- Boutons admin_finance : clôturer / rejeter globalement -->
          <ng-container *ngIf="recall.status === 'open' && canClose()">
            <button mat-raised-button class="btn-close"
                    (click)="closeRecall(recall)"
                    [disabled]="saving() || !allRequiredApproved(recall)"
                    [matTooltip]="!allRequiredApproved(recall) ? 'Approuvez toutes les pièces requises avant de clôturer' : 'Clôturer le rappel'">
              <mat-icon>check_circle</mat-icon> Clôturer
            </button>
            <button mat-stroked-button color="warn" class="btn-global-reject"
                    (click)="startGlobalReject(recall.id)"
                    *ngIf="globalRejectRecallId !== recall.id"
                    [disabled]="saving()">
              <mat-icon>block</mat-icon> Rejeter le rappel
            </button>
          </ng-container>

          <!-- Bouton réouvrir -->
          <button mat-stroked-button (click)="reopenRecall(recall)"
                  *ngIf="recall.status === 'closed' && canClose()" [disabled]="saving()">
            <mat-icon>refresh</mat-icon> Réouvrir
          </button>

          <!-- Bouton annuler (initiateur seulement, sans interaction finance) -->
          <button mat-stroked-button color="warn" class="btn-cancel-recall"
                  *ngIf="recall.status === 'open' && canCreateRecall() && !hasFinanceInteracted(recall)"
                  (click)="cancelRecall(recall)" [disabled]="saving()">
            <mat-icon>undo</mat-icon> Annuler le rappel
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .recall-section { margin-top: 8px; }

    .recall-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 0 8px;
      border-top: 2px solid #e0e0e0;
    }
    .recall-icon { color: #2E75B6; }
    .recall-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1F4E79; flex: 1; }
    .recall-badge {
      padding: 2px 10px; border-radius: 12px; font-size: .75rem; font-weight: 700;
    }
    .recall-badge.open { background: #ff9800; color: #fff; }
    .btn-new-recall { color: #1F4E79; border-color: #2E75B6; font-size: .82rem; }

    .create-form-card {
      border-radius: 10px !important; border: 2px solid #2E75B6 !important; margin-bottom: 12px;
    }
    .create-form-card h4 { margin: 0 0 12px; color: #1F4E79; font-size: .95rem; font-weight: 700; }
    .full-width { width: 100%; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

    .mini-loading { display: flex; align-items: center; gap: 6px; color: #aaa; padding: 12px 0; font-size: .85rem; }
    .empty-state { text-align: center; padding: 20px; color: #aaa; }
    .empty-state mat-icon { font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto 6px; }

    .recall-card { border-radius: 10px !important; margin-bottom: 14px; border: 1px solid #dde5f0 !important; }
    .recall-card.closed { background: #fafafa !important; }
    .recall-card.rejected { background: #fff5f5 !important; border-color: #ffcdd2 !important; }
    .recall-card.cancelled { background: #f9f9f9 !important; border-color: #e0e0e0 !important; opacity: .85; }

    .recall-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .spacer { flex: 1; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 10px; border-radius: 12px; font-size: .78rem; font-weight: 700;
    }
    .status-chip mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .status-chip.open { background: #fff3e0; color: #e65100; }
    .status-chip.closed { background: #e8f5e9; color: #2e7d32; }
    .status-chip.rejected { background: #fce4ec; color: #c62828; }
    .status-chip.cancelled { background: #f5f5f5; color: #757575; }
    .recall-date { font-size: .8rem; color: #888; }
    .closed-info { font-size: .8rem; color: #888; font-style: italic; }

    .coverage-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 12px; font-size: .78rem; font-weight: 700;
    }
    .coverage-badge mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .coverage-badge.full { background: #e8f5e9; color: #2e7d32; }
    .coverage-badge.partial { background: #fff8e1; color: #f57f17; }
    .coverage-badge.none { background: #fce4ec; color: #c62828; }

    .recall-reason { margin: 0 0 12px; font-size: .88rem; }

    .rejection-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fce4ec; color: #c62828; border-radius: 8px;
      padding: 8px 12px; margin-bottom: 10px; font-size: .85rem;
    }
    .rejection-banner mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    /* Tableau lignes */
    .lines-table { border: 1px solid #e3eaf5; border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
    .lines-header {
      display: grid;
      grid-template-columns: 2fr 1.2fr 2.5fr 40px;
      background: #1F4E79; color: #fff;
      padding: 7px 10px; font-size: .78rem; font-weight: 700; gap: 8px;
    }
    .line-row {
      display: grid;
      grid-template-columns: 2fr 1.2fr 2.5fr 40px;
      padding: 7px 10px; gap: 8px;
      border-top: 1px solid #f0f0f0; align-items: flex-start;
      font-size: .83rem;
    }
    .line-row.approved { background: #f0fff4; }
    .line-row.covered { background: #fffbf0; }
    .line-row.missing { background: #fff8f8; }

    .line-key { font-weight: 700; font-size: .75rem; color: #2E75B6; display: block; }
    .line-desig { font-size: .82rem; color: #333; }

    .justif-tag {
      background: #e3eaf5; color: #1F4E79;
      padding: 2px 8px; border-radius: 4px; font-size: .75rem;
    }
    .no-justif { color: #aaa; font-size: .78rem; }

    .doc-chip {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 6px; background: #eef3fb; border-radius: 6px;
      margin-bottom: 3px; flex-wrap: nowrap; border-left: 3px solid transparent;
    }
    .doc-chip.doc-approved { background: #f0fff4; border-left-color: #2e7d32; }
    .doc-chip.doc-rejected { background: #fff5f5; border-left-color: #c62828; opacity: .8; }
    .doc-status-icon { font-size: 15px; width: 15px; height: 15px; flex-shrink: 0; }
    .doc-chip.doc-approved .doc-status-icon { color: #2e7d32; }
    .doc-chip.doc-rejected .doc-status-icon { color: #c62828; }
    .doc-chip:not(.doc-approved):not(.doc-rejected) .doc-status-icon { color: #bbb; }
    .doc-type-icon { font-size: 16px; width: 16px; height: 16px; color: #2E75B6; flex-shrink: 0; }
    .doc-name { font-size: .78rem; font-weight: 600; color: #1F4E79; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-size { font-size: .72rem; color: #888; white-space: nowrap; }
    .doc-rejected-note { display: flex; align-items: center; color: #c62828; cursor: help; }
    .doc-rejected-note mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .btn-download { width: 28px; height: 28px; line-height: 28px; }
    .btn-download mat-icon { font-size: 16px; width: 16px; height: 16px; color: #2E75B6; }
    .btn-approve mat-icon { color: #2e7d32 !important; }
    .btn-reject-doc mat-icon { color: #c62828 !important; }
    .btn-reset-doc mat-icon { color: #888 !important; }
    .no-doc { display: flex; align-items: center; gap: 4px; color: #e57373; font-size: .78rem; }
    .no-doc mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .col-action { display: flex; justify-content: center; align-items: flex-start; }

    /* Formulaire rejet doc inline */
    .reject-doc-form {
      background: #fff5f5; border-radius: 8px; padding: 10px;
      margin: 4px 0 6px; border: 1px dashed #ef9a9a;
    }
    .reject-doc-form.standalone { margin-top: 8px; }
    .reject-doc-title { font-size: .83rem; color: #c62828; font-weight: 600; display: block; margin-bottom: 6px; }
    .reject-field { margin-top: 4px; }
    .reject-doc-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }

    /* Upload form */
    .upload-form {
      background: #f5f8ff; border-radius: 8px; padding: 12px;
      margin: 4px 0 10px; border: 1px dashed #90b4e8;
    }
    .upload-form-inner { display: flex; flex-direction: column; gap: 8px; }
    .upload-line-info {
      display: flex; align-items: center; gap: 6px;
      font-size: .83rem; color: #1F4E79; font-weight: 600;
    }
    .upload-line-info mat-icon { font-size: 16px; width: 16px; height: 16px; color: #2E75B6; }
    .file-pick-label {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; padding: 10px 14px;
      border: 1px dashed #2E75B6; border-radius: 8px;
      font-size: .82rem; color: #2E75B6; background: #fff;
    }
    .file-pick-label:hover { background: #eef3fb; }
    .file-pick-label.compact { padding: 6px 10px; font-size: .78rem; }

    /* Extra docs */
    .extra-docs-section { margin: 4px 0 4px; }
    .extra-upload-form {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      margin-top: 8px; padding: 10px; background: #f5f8ff;
      border-radius: 8px; border: 1px dashed #90b4e8;
    }

    /* Rejet global */
    .global-reject-form {
      background: #fff8f0; border-radius: 8px; padding: 12px;
      margin: 8px 0; border: 1px dashed #ffcc80;
    }
    .global-reject-inner { display: flex; gap: 10px; align-items: flex-start; }
    .reject-warn-icon { font-size: 28px; width: 28px; height: 28px; color: #f57c00; flex-shrink: 0; margin-top: 4px; }
    .global-reject-content { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .global-reject-content strong { font-size: .9rem; color: #c62828; }

    /* Actions card */
    .btn-close { background: #1b5e20; color: #fff; }
    .btn-global-reject { margin-left: 8px; }
    .btn-cancel-recall { }

    /* Audit */
    .audit-section { margin-top: 8px; border-top: 1px solid #f0f0f0; padding-top: 4px; }
    .btn-audit { font-size: .8rem; color: #666; display: flex; align-items: center; gap: 4px; }
    .btn-audit .chevron { font-size: 18px; width: 18px; height: 18px; }
    .audit-log { padding: 6px 4px; display: flex; flex-direction: column; gap: 6px; }
    .audit-entry { display: flex; align-items: flex-start; gap: 10px; font-size: .8rem; }
    .audit-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    .action-created { color: #1976d2; }
    .action-doc_added { color: #388e3c; }
    .action-doc_deleted { color: #d32f2f; }
    .action-doc_approved { color: #2e7d32; }
    .action-doc_rejected { color: #c62828; }
    .action-closed { color: #2e7d32; }
    .action-reopened { color: #f57c00; }
    .action-rejected { color: #c62828; }
    .action-cancelled { color: #757575; }
    .audit-body { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
    .audit-action { font-weight: 700; color: #333; }
    .audit-who { color: #555; }
    .audit-when { color: #aaa; font-size: .75rem; }
    .audit-detail { width: 100%; color: #666; font-size: .77rem; font-style: italic; }
    .empty-audit { font-size: .8rem; color: #aaa; padding: 4px; }
  `]
})
export class BudgetRecallComponent implements OnInit, OnChanges {
  @Input() budgetId!: string;
  @Input() budgetStatus!: string;
  @Input() budgetEntityCode!: string;
  @Input() budgetLines: any[] = [];
  @Input() lineAmounts: Record<string, number> = {};

  readonly ACTION_LABELS = ACTION_LABELS;
  readonly ACTION_ICONS = ACTION_ICONS;

  api = inject(ApiService);
  auth = inject(AuthService);
  snack = inject(MatSnackBar);

  recalls = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  uploading = signal(false);
  auditLogs = signal<any[]>([]);
  auditLoading = signal(false);

  showCreateForm = false;
  newReason = '';
  expandedAudit: string | null = null;

  uploadTarget: { recallId: string; lineId: string } | null = null;
  uploadDesc = '';
  selectedFile: File | null = null;

  extraUploadRecallId: string | null = null;
  extraLineId = '';

  docRejectTarget: { recallId: string; docId: string } | null = null;
  docRejectNote = '';

  globalRejectRecallId: string | null = null;
  globalRejectNote = '';

  openCount = () => this.recalls().filter(r => r.status === 'open').length;

  canCreateRecall() {
    return this.auth.isEntityMember()
      && this.budgetStatus === 'approved'
      && this.budgetEntityCode === this.auth.entityCode();
  }
  canUploadDoc() {
    return this.canCreateRecall() || this.auth.isAdminFinance() || this.auth.isSuperAdmin();
  }
  canClose() { return this.auth.isAdminFinance() || this.auth.isSuperAdmin(); }

  requiredLines() {
    return this.budgetLines.filter(l => (this.lineAmounts[l.id] ?? 0) > 0);
  }

  allLines() { return this.budgetLines; }

  docsForLine(recall: any, lineId: string): any[] {
    return (recall.documents ?? []).filter((d: any) => d.budgetLineId === lineId);
  }

  hasApprovedDoc(recall: any, lineId: string): boolean {
    return this.docsForLine(recall, lineId).some((d: any) => d.docStatus === 'approved');
  }

  allRequiredApproved(recall: any): boolean {
    const required = this.requiredLines();
    if (required.length === 0) return false;
    return required.every(l => this.hasApprovedDoc(recall, l.id));
  }

  someApproved(recall: any): boolean {
    return this.requiredLines().some(l => this.hasApprovedDoc(recall, l.id));
  }

  approvedCount(recall: any): number {
    return this.requiredLines().filter(l => this.hasApprovedDoc(recall, l.id)).length;
  }

  hasFinanceInteracted(recall: any): boolean {
    return (recall.documents ?? []).some((d: any) => d.docStatus !== 'pending');
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      open: 'Ouvert', closed: 'Clôturé', rejected: 'Rejeté', cancelled: 'Annulé',
    };
    return map[status] ?? status;
  }

  statusIcon(status: string): string {
    const map: Record<string, string> = {
      open: 'lock_open', closed: 'lock', rejected: 'block', cancelled: 'undo',
    };
    return map[status] ?? 'help';
  }

  docStatusIcon(status: string): string {
    if (status === 'approved') return 'check_circle';
    if (status === 'rejected') return 'cancel';
    return 'radio_button_unchecked';
  }

  getDociForLine(recall: any, line: any): string | undefined {
    if (!this.docRejectTarget || this.docRejectTarget.recallId !== recall.id) return undefined;
    return this.docRejectTarget.docId;
  }

  isDocInRequiredLines(recall: any): boolean {
    if (!this.docRejectTarget || this.docRejectTarget.recallId !== recall.id) return false;
    for (const line of this.requiredLines()) {
      for (const doc of this.docsForLine(recall, line.id)) {
        if (doc.id === this.docRejectTarget.docId) return true;
      }
    }
    return false;
  }

  getDocName(recall: any): string {
    if (!this.docRejectTarget) return '';
    const doc = (recall.documents ?? []).find((d: any) => d.id === this.docRejectTarget!.docId);
    return doc?.fileName ?? '';
  }

  getLineName(lineId: string): string {
    const l = this.budgetLines.find(x => x.id === lineId);
    return l ? `${l.rowKey} — ${l.designation || 'Sans désignation'}` : lineId;
  }

  fileIcon(mime: string): string {
    if (!mime) return 'insert_drive_file';
    if (mime === 'application/pdf') return 'picture_as_pdf';
    if (mime.startsWith('image/')) return 'image';
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (mime.includes('zip')) return 'folder_zip';
    return 'insert_drive_file';
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  ngOnInit() { this.load(); }
  ngOnChanges() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getRecallsByBudget(this.budgetId).subscribe({
      next: list => { this.recalls.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  async createRecall() {
    if (!this.newReason.trim()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createRecall({ budgetId: this.budgetId, reason: this.newReason.trim() }));
      this.snack.open('Rappel créé', 'OK', { duration: 2500 });
      this.showCreateForm = false;
      this.newReason = '';
      this.load();
    } catch {
      this.snack.open('Erreur lors de la création', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Doc review ──

  startDocReject(recallId: string, docId: string) {
    this.docRejectTarget = { recallId, docId };
    this.docRejectNote = '';
    this.uploadTarget = null;
    this.extraUploadRecallId = null;
    this.globalRejectRecallId = null;
  }

  cancelDocReject() {
    this.docRejectTarget = null;
    this.docRejectNote = '';
  }

  async approveDoc(recall: any, doc: any) {
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.reviewRecallDoc(recall.id, doc.id, { decision: 'approved' }));
      this.recalls.update(list => list.map(r => r.id === recall.id ? updated : r));
      this.snack.open('Pièce approuvée', 'OK', { duration: 2000 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async resetDoc(recall: any, doc: any) {
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.reviewRecallDoc(recall.id, doc.id, { decision: 'pending' as any }));
      this.recalls.update(list => list.map(r => r.id === recall.id ? updated : r));
      this.snack.open('Revue annulée', 'OK', { duration: 2000 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async confirmDocReject(recall: any) {
    if (!this.docRejectTarget || !this.docRejectNote.trim()) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.reviewRecallDoc(recall.id, this.docRejectTarget.docId, {
          decision: 'rejected',
          rejectionNote: this.docRejectNote.trim(),
        })
      );
      this.recalls.update(list => list.map(r => r.id === recall.id ? updated : r));
      this.snack.open('Pièce rejetée', 'OK', { duration: 2500 });
      this.cancelDocReject();
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Global reject ──

  startGlobalReject(recallId: string) {
    this.globalRejectRecallId = recallId;
    this.globalRejectNote = '';
    this.docRejectTarget = null;
    this.uploadTarget = null;
  }

  cancelGlobalReject() {
    this.globalRejectRecallId = null;
    this.globalRejectNote = '';
  }

  async confirmGlobalReject(recall: any) {
    if (!this.globalRejectNote.trim()) return;
    if (!confirm(`Rejeter définitivement ce rappel ? Cette action ne peut pas être annulée.`)) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.rejectRecall(recall.id, { reason: this.globalRejectNote.trim() }));
      this.recalls.update(list => list.map(r => r.id === recall.id ? updated : r));
      this.snack.open('Rappel rejeté', 'OK', { duration: 2500 });
      this.cancelGlobalReject();
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Cancel (initiator) ──

  async cancelRecall(recall: any) {
    if (!confirm('Annuler ce rappel ? Cette action est irréversible.')) return;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.cancelRecall(recall.id));
      this.recalls.update(list => list.map(r => r.id === recall.id ? updated : r));
      this.snack.open('Rappel annulé', 'OK', { duration: 2500 });
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Upload ──

  startUpload(recallId: string, lineId: string) {
    this.uploadTarget = { recallId, lineId };
    this.uploadDesc = '';
    this.selectedFile = null;
    this.extraUploadRecallId = null;
    this.docRejectTarget = null;
    this.globalRejectRecallId = null;
  }

  cancelUpload() {
    this.uploadTarget = null;
    this.selectedFile = null;
    this.uploadDesc = '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  async uploadDoc(recall: any) {
    if (!this.selectedFile || !this.uploadTarget) return;
    await this.doUpload(recall.id, this.uploadTarget.lineId, this.selectedFile, this.uploadDesc);
    this.cancelUpload();
  }

  toggleExtraUpload(recallId: string) {
    if (this.extraUploadRecallId === recallId) {
      this.cancelExtraUpload();
    } else {
      this.extraUploadRecallId = recallId;
      this.extraLineId = '';
      this.uploadDesc = '';
      this.selectedFile = null;
      this.uploadTarget = null;
    }
  }

  cancelExtraUpload() {
    this.extraUploadRecallId = null;
    this.extraLineId = '';
    this.selectedFile = null;
    this.uploadDesc = '';
  }

  async uploadExtraDoc(recall: any) {
    if (!this.selectedFile || !this.extraLineId) return;
    await this.doUpload(recall.id, this.extraLineId, this.selectedFile, this.uploadDesc);
    this.cancelExtraUpload();
  }

  private async doUpload(recallId: string, lineId: string, file: File, description: string) {
    this.uploading.set(true);
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      fd.append('budgetLineId', lineId);
      if (description.trim()) fd.append('description', description.trim());
      await firstValueFrom(this.api.addRecallDocument(recallId, fd));
      this.snack.open('Document ajouté', 'OK', { duration: 2500 });
      this.load();
    } catch (err: any) {
      const msg = err?.error?.message || 'Erreur lors de l\'envoi';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.uploading.set(false);
    }
  }

  async deleteDoc(recall: any, doc: any) {
    if (!confirm(`Supprimer "${doc.fileName}" ?`)) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteRecallDocument(recall.id, doc.id));
      this.snack.open('Document supprimé', 'OK', { duration: 2500 });
      this.load();
    } catch {
      this.snack.open('Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async openFile(doc: any) {
    try {
      const blob = await firstValueFrom(this.api.downloadUploadedFile(doc.filePath));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      this.snack.open('Impossible de télécharger le fichier', 'OK', { duration: 3000 });
    }
  }

  async toggleAudit(recallId: string) {
    if (this.expandedAudit === recallId) {
      this.expandedAudit = null;
      return;
    }
    this.expandedAudit = recallId;
    this.auditLoading.set(true);
    try {
      const logs = await firstValueFrom(this.api.getRecallAudit(recallId));
      this.auditLogs.set(logs);
    } catch {
      this.auditLogs.set([]);
    } finally {
      this.auditLoading.set(false);
    }
  }

  async closeRecall(recall: any) {
    if (!this.allRequiredApproved(recall)) return;
    if (!confirm('Clôturer ce rappel ? Toutes les pièces sont approuvées.')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.closeRecall(recall.id));
      this.snack.open('Rappel clôturé', 'OK', { duration: 2500 });
      this.load();
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async reopenRecall(recall: any) {
    if (!confirm('Réouvrir ce rappel ?')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.reopenRecall(recall.id));
      this.snack.open('Rappel réouvert', 'OK', { duration: 2500 });
      this.load();
    } catch {
      this.snack.open('Erreur', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
