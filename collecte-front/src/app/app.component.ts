import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <mat-toolbar color="primary">
      <mat-icon style="margin-right:8px">assignment</mat-icon>
      <span style="font-weight:600">NPSP-CI — Collecte GHSD</span>
      <span style="flex:1"></span>

      <a mat-button routerLink="/reference" routerLinkActive="active-nav">
        <mat-icon>menu_book</mat-icon> Socle de référence
      </a>
      <a mat-button routerLink="/contribute" routerLinkActive="active-nav">
        <mat-icon>edit_note</mat-icon> Contribuer
      </a>
      <a mat-button routerLink="/consolidation" routerLinkActive="active-nav">
        <mat-icon>dashboard</mat-icon> Consolidation
      </a>

      <span style="margin: 0 12px; opacity:.5">|</span>

      <span style="font-size:13px; opacity:.85">
        {{ auth.getDisplayName() }}
        @if (auth.entityCode()) {
          <span style="margin-left:6px; background:rgba(255,255,255,.2); border-radius:4px; padding:2px 6px; font-size:11px">
            {{ auth.entityCode() }}
          </span>
        }
      </span>

      <a mat-icon-button [href]="mainAppUrl" matTooltip="Retour à l'application principale">
        <mat-icon>home</mat-icon>
      </a>
    </mat-toolbar>

    <router-outlet />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .active-nav { background: rgba(255,255,255,.15) !important; border-radius: 4px; }
  `],
})
export class AppComponent {
  auth = inject(AuthService);
  mainAppUrl = environment.mainAppUrl;
}
