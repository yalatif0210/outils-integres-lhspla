import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../services/auth.service';
import { NotificationsPanelComponent } from '../notifications/notifications-panel.component';
import { ENTITIES } from '../../models/bulletin.models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatDividerModule, MatTooltipModule, MatBadgeModule,
    NotificationsPanelComponent,
  ],
  template: `
    <mat-toolbar class="navbar" *ngIf="auth.isLoggedIn()">
      <!-- Brand -->
      <a routerLink="/home" class="navbar-brand" (click)="closeMenu()">
        <mat-icon class="brand-icon">assignment_turned_in</mat-icon>
        <div class="brand-text">
          <span class="brand-title">LHSPLA-TA</span>
          <span class="brand-sub">Outil Intégré LHSPLA</span>
        </div>
      </a>

      <!-- Nav links — desktop uniquement -->
      <nav class="nav-links desktop-nav">
        <a mat-button routerLink="/home" routerLinkActive="active-link">
          <mat-icon>dashboard</mat-icon> Accueil
        </a>

        <button mat-button [matMenuTriggerFor]="entitiesMenu">
          <mat-icon>groups</mat-icon> Entités <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <a mat-button routerLink="/compilation" routerLinkActive="active-link"
           *ngIf="auth.isAdminOrCOP()">
          <mat-icon>summarize</mat-icon> Compilation
        </a>

        <button mat-button [matMenuTriggerFor]="entityFinanceMenu"
                *ngIf="auth.isEntityMember() && !auth.isAdminFinance() && !auth.isAdmin()">
          <mat-icon>account_balance</mat-icon> Finance <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <a mat-button routerLink="/budgets" routerLinkActive="active-link"
           *ngIf="!auth.isEntityMember() || auth.isAdminFinance() || auth.isAdmin()">
          <mat-icon>account_balance_wallet</mat-icon> Budgets
        </a>

        <!-- Menu Tableaux de bord COP (regroupé) -->
        <button mat-button [matMenuTriggerFor]="copDashboardMenu"
                *ngIf="auth.isAdminOrCOP() || auth.isAdminFinance()">
          <mat-icon>dashboard</mat-icon> Tableaux de bord <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <!-- KPI visible pour les autres rôles -->
        <a mat-button routerLink="/dashboard/kpi" routerLinkActive="active-link"
           *ngIf="!auth.isAdminOrCOP() && !auth.isAdminFinance()">
          <mat-icon>insights</mat-icon> KPI
        </a>

        <button mat-button [matMenuTriggerFor]="financeMenu" *ngIf="auth.isAdminFinance()">
          <mat-icon>account_balance</mat-icon> Finance <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <button mat-button [matMenuTriggerFor]="tpmMenu" *ngIf="auth.isAdminTPM()">
          <mat-icon>verified_user</mat-icon> TPM <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <a mat-button routerLink="/missions" routerLinkActive="active-link">
          <mat-icon>flight_takeoff</mat-icon> Missions
        </a>

        <button mat-button [matMenuTriggerFor]="stockMenu">
          <mat-icon>inventory_2</mat-icon> Stock <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <button mat-button [matMenuTriggerFor]="adminMenu" *ngIf="auth.isAdmin()">
          <mat-icon>admin_panel_settings</mat-icon> Admin <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <button mat-button [matMenuTriggerFor]="directionMenu"
                *ngIf="auth.isAssistantDirection()">
          <mat-icon>business_center</mat-icon> Direction <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>

        <button mat-button [matMenuTriggerFor]="tresorerieMenu"
                *ngIf="auth.isChargeeTresorerie() && !auth.isAdminFinance() && !auth.isAdmin()">
          <mat-icon>payments</mat-icon> Trésorerie <mat-icon class="arrow">arrow_drop_down</mat-icon>
        </button>
      </nav>

      <div class="spacer"></div>

      <app-notifications-panel *ngIf="auth.isLoggedIn()"></app-notifications-panel>

      <!-- User menu — desktop -->
      <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn desktop-nav">
        <div class="user-avatar">{{initials()}}</div>
        <div class="user-info">
          <span class="user-name">{{auth.fullName()}}</span>
          <span class="user-role">{{auth.roleLabel()}} {{userEntity}}</span>
        </div>
        <mat-icon class="arrow">arrow_drop_down</mat-icon>
      </button>

      <!-- Hamburger — mobile uniquement -->
      <button mat-icon-button class="mobile-hamburger" (click)="toggleMenu()"
              aria-label="Menu navigation">
        <mat-icon>{{mobileMenuOpen() ? 'close' : 'menu'}}</mat-icon>
      </button>
    </mat-toolbar>

    <!-- ── Menus desktop (mat-menu) ───────────────────────────────────────── -->

    <mat-menu #copDashboardMenu="matMenu">
      <a mat-menu-item routerLink="/dashboard/admin">
        <mat-icon>analytics</mat-icon> Dashboard Activités
      </a>
      <a mat-menu-item routerLink="/dashboard/kpi">
        <mat-icon>insights</mat-icon> KPI Budgets & Missions
      </a>
      <a mat-menu-item routerLink="/missions/dashboard"
         *ngIf="auth.hasAnyRole('super_admin','admin_tpm','chief_of_party','assistant_direction')">
        <mat-icon>table_chart</mat-icon> Tableau de bord Missions
      </a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/dashboard/financial">
        <mat-icon>bar_chart</mat-icon> Gestion financière
      </a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/brief">
        <mat-icon>newspaper</mat-icon> Weekly Operations Brief
      </a>
    </mat-menu>

    <mat-menu #stockMenu="matMenu">
      <a mat-menu-item routerLink="/stock/import" *ngIf="auth.isQadMember()">
        <mat-icon>upload_file</mat-icon> Importer État de stock
      </a>
      <a mat-menu-item routerLink="/stock/consult">
        <mat-icon>inventory_2</mat-icon> Consulter État de stock
      </a>
    </mat-menu>

    <mat-menu #entitiesMenu="matMenu">
      <a mat-menu-item *ngFor="let e of entities" [routerLink]="['/entity', e.code]">
        <mat-icon>edit_note</mat-icon>
        <span class="menu-code">{{e.code}}</span>
        <span class="menu-name">{{e.fullName}}</span>
      </a>
      <ng-container *ngIf="auth.isAdminOrCOP()">
        <mat-divider></mat-divider>
        <a mat-menu-item *ngFor="let e of entities" [routerLink]="['/dashboard/entity', e.code]">
          <mat-icon>bar_chart</mat-icon>
          <span>Dashboard {{e.code}}</span>
        </a>
      </ng-container>
      <ng-container *ngIf="auth.isEntityMember() && auth.entityCode() === 'QAD'">
        <mat-divider></mat-divider>
        <a mat-menu-item routerLink="/stock/import"><mat-icon>upload_file</mat-icon> Importer État de stock</a>
      </ng-container>
    </mat-menu>

    <mat-menu #entityFinanceMenu="matMenu">
      <a mat-menu-item routerLink="/budgets"><mat-icon>account_balance_wallet</mat-icon> Budgets</a>
      <a mat-menu-item routerLink="/budget-recalls"><mat-icon>attach_file</mat-icon> Rappels & Justificatifs</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/brief"><mat-icon>newspaper</mat-icon> Weekly Operations Brief</a>
    </mat-menu>

    <mat-menu #financeMenu="matMenu">
      <a mat-menu-item routerLink="/budgets"><mat-icon>account_balance_wallet</mat-icon> Budgets</a>
      <a mat-menu-item routerLink="/budget-recalls"><mat-icon>attach_file</mat-icon> Rappels & Justificatifs</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/admin/cost-items"><mat-icon>list_alt</mat-icon> Grille de coûts</a>
      <a mat-menu-item routerLink="/admin/config-lists"><mat-icon>format_list_bulleted</mat-icon> Listes configurables</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/stock/consult"><mat-icon>inventory_2</mat-icon> Consulter État de stock</a>
      <a mat-menu-item routerLink="/brief"><mat-icon>newspaper</mat-icon> Weekly Operations Brief</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/admin/settings"><mat-icon>tune</mat-icon> Paramètres</a>
    </mat-menu>

    <mat-menu #tpmMenu="matMenu">
      <a mat-menu-item routerLink="/budgets"><mat-icon>account_balance_wallet</mat-icon> Budgets à vérifier</a>
      <a mat-menu-item routerLink="/budget-recalls"><mat-icon>attach_file</mat-icon> Rappels & Justificatifs</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/missions/dashboard"><mat-icon>table_chart</mat-icon> Tableau de bord Missions</a>
    </mat-menu>

    <mat-menu #adminMenu="matMenu">
      <a mat-menu-item routerLink="/admin/users"><mat-icon>manage_accounts</mat-icon> Gestion utilisateurs</a>
      <a mat-menu-item routerLink="/admin/weeks"><mat-icon>date_range</mat-icon> Gestion des semaines</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/admin/personnel"><mat-icon>people</mat-icon> Gestion du personnel</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/budget-recalls"><mat-icon>attach_file</mat-icon> Rappels & Justificatifs</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/stock/consult"><mat-icon>inventory_2</mat-icon> Consulter État de stock</a>
      <a mat-menu-item routerLink="/brief"><mat-icon>newspaper</mat-icon> Weekly Operations Brief</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/admin/config-lists"><mat-icon>format_list_bulleted</mat-icon> Listes configurables</a>
      <a mat-menu-item routerLink="/admin/settings"><mat-icon>tune</mat-icon> Paramètres</a>
    </mat-menu>

    <mat-menu #tresorerieMenu="matMenu">
      <a mat-menu-item routerLink="/budgets"><mat-icon>account_balance_wallet</mat-icon> Budgets approuvés</a>
    </mat-menu>

    <mat-menu #directionMenu="matMenu">
      <a mat-menu-item routerLink="/missions"><mat-icon>flight_takeup</mat-icon> Demandes de mission</a>
      <a mat-menu-item routerLink="/missions/dashboard"><mat-icon>table_chart</mat-icon> Tableau de bord Missions</a>
      <a mat-menu-item routerLink="/admin/personnel"><mat-icon>people</mat-icon> Gestion du personnel</a>
      <mat-divider></mat-divider>
      <a mat-menu-item routerLink="/budgets"><mat-icon>account_balance_wallet</mat-icon> Budgets</a>
    </mat-menu>

    <mat-menu #userMenu="matMenu">
      <a mat-menu-item routerLink="/profile"><mat-icon>account_circle</mat-icon> Mon profil</a>
      <a mat-menu-item [routerLink]="['/dashboard/entity', auth.entityCode()]"
         *ngIf="auth.isEntityMember() && auth.entityCode()">
        <mat-icon>bar_chart</mat-icon> Mon tableau de bord
      </a>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="auth.logout()">
        <mat-icon color="warn">logout</mat-icon>
        <span style="color:#9E0000">Se déconnecter</span>
      </button>
    </mat-menu>

    <!-- ── Overlay mobile menu ────────────────────────────────────────────── -->
    <div class="mobile-overlay" [class.open]="mobileMenuOpen()" (click)="closeMenu()"></div>

    <nav class="mobile-drawer" [class.open]="mobileMenuOpen()" *ngIf="auth.isLoggedIn()">
      <!-- En-tête utilisateur -->
      <div class="drawer-user">
        <div class="drawer-avatar">{{initials()}}</div>
        <div class="drawer-user-info">
          <span class="drawer-name">{{auth.fullName()}}</span>
          <span class="drawer-role">{{auth.roleLabel()}}{{userEntity ? ' — ' + userEntity : ''}}</span>
        </div>
      </div>

      <!-- Navigation principale -->
      <div class="drawer-section">
        <span class="drawer-section-label">Navigation</span>
        <a class="drawer-link" routerLink="/home" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>dashboard</mat-icon> Accueil
        </a>
        <a class="drawer-link" routerLink="/dashboard/kpi" routerLinkActive="drawer-active"
           *ngIf="!auth.isAdminOrCOP() && !auth.isAdminFinance()" (click)="closeMenu()">
          <mat-icon>insights</mat-icon> KPI Dashboard
        </a>
      </div>

      <!-- Tableaux de bord COP -->
      <div class="drawer-section" *ngIf="auth.isAdminOrCOP() || auth.isAdminFinance()">
        <span class="drawer-section-label">Tableaux de bord COP</span>
        <a class="drawer-link" routerLink="/dashboard/admin" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>analytics</mat-icon> Dashboard Activités
        </a>
        <a class="drawer-link" routerLink="/dashboard/kpi" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>insights</mat-icon> KPI Budgets & Missions
        </a>
        <a class="drawer-link" routerLink="/missions/dashboard" routerLinkActive="drawer-active"
           *ngIf="auth.hasAnyRole('super_admin','admin_tpm','chief_of_party','assistant_direction')"
           (click)="closeMenu()">
          <mat-icon>table_chart</mat-icon> TB Missions
        </a>
        <a class="drawer-link" routerLink="/dashboard/financial" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>bar_chart</mat-icon> Gestion financière
        </a>
      </div>

      <!-- Missions -->
      <div class="drawer-section">
        <span class="drawer-section-label">Missions</span>
        <a class="drawer-link" routerLink="/missions" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>flight_takeoff</mat-icon> Demandes de mission
        </a>
        <a class="drawer-link" routerLink="/missions/dashboard" routerLinkActive="drawer-active"
           *ngIf="auth.hasAnyRole('super_admin','admin_tpm','chief_of_party','assistant_direction') && !auth.isAdminOrCOP() && !auth.isAdminFinance()"
           (click)="closeMenu()">
          <mat-icon>table_chart</mat-icon> Tableau de bord Missions
        </a>
      </div>

      <!-- Stock & Brief (visible à tous) -->
      <div class="drawer-section">
        <span class="drawer-section-label">Opérations</span>
        <a class="drawer-link" routerLink="/stock/import" routerLinkActive="drawer-active"
           *ngIf="auth.isQadMember()" (click)="closeMenu()">
          <mat-icon>upload_file</mat-icon> Importer État de stock
        </a>
        <a class="drawer-link" routerLink="/stock/consult" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>inventory_2</mat-icon> Consulter État de stock
        </a>
        <a class="drawer-link" routerLink="/brief" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>newspaper</mat-icon> Weekly Operations Brief
        </a>
      </div>

      <!-- Finance -->
      <div class="drawer-section">
        <span class="drawer-section-label">Finance</span>
        <a class="drawer-link" routerLink="/budgets" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>account_balance_wallet</mat-icon> Budgets
        </a>
        <a class="drawer-link" routerLink="/budget-recalls" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>attach_file</mat-icon> Rappels & Justificatifs
        </a>
        <a class="drawer-link" routerLink="/admin/cost-items" routerLinkActive="drawer-active"
           *ngIf="auth.isAdminFinance() || auth.isAdmin()" (click)="closeMenu()">
          <mat-icon>list_alt</mat-icon> Grille de coûts
        </a>
        <a class="drawer-link" routerLink="/admin/config-lists" routerLinkActive="drawer-active"
           *ngIf="auth.isAdminFinance() || auth.isAdmin()" (click)="closeMenu()">
          <mat-icon>format_list_bulleted</mat-icon> Listes configurables
        </a>
      </div>

      <!-- Entités (COP/admin) -->
      <div class="drawer-section" *ngIf="auth.isAdminOrCOP() || auth.isAdminFinance()">
        <span class="drawer-section-label">Entités</span>
        <a class="drawer-link" *ngFor="let e of entities"
           [routerLink]="['/entity', e.code]" (click)="closeMenu()">
          <mat-icon>edit_note</mat-icon>
          <span class="menu-code">{{e.code}}</span> {{e.name}}
        </a>
      </div>

      <!-- Compilation -->
      <div class="drawer-section" *ngIf="auth.isAdminOrCOP()">
        <a class="drawer-link" routerLink="/compilation" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>summarize</mat-icon> Compilation
        </a>
      </div>

      <!-- Admin -->
      <div class="drawer-section" *ngIf="auth.isAdmin()">
        <span class="drawer-section-label">Administration</span>
        <a class="drawer-link" routerLink="/admin/users" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>manage_accounts</mat-icon> Utilisateurs
        </a>
        <a class="drawer-link" routerLink="/admin/weeks" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>date_range</mat-icon> Semaines
        </a>
        <a class="drawer-link" routerLink="/admin/personnel" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>people</mat-icon> Personnel
        </a>
        <a class="drawer-link" routerLink="/admin/settings" routerLinkActive="drawer-active" (click)="closeMenu()">
          <mat-icon>tune</mat-icon> Paramètres
        </a>
      </div>

      <!-- Profil + déconnexion -->
      <div class="drawer-footer">
        <a class="drawer-link" routerLink="/profile" (click)="closeMenu()">
          <mat-icon>account_circle</mat-icon> Mon profil
        </a>
        <a class="drawer-link drawer-link-danger" (click)="logout()">
          <mat-icon>logout</mat-icon> Se déconnecter
        </a>
      </div>
    </nav>

    <!-- ── Barre de navigation mobile inférieure ──────────────────────────── -->
    <nav class="bottom-nav" *ngIf="auth.isLoggedIn()">
      <a class="bottom-nav-item" routerLink="/home" routerLinkActive="bottom-active"
         [routerLinkActiveOptions]="{exact: true}">
        <mat-icon>home</mat-icon>
        <span>Accueil</span>
      </a>
      <a class="bottom-nav-item" routerLink="/missions" routerLinkActive="bottom-active">
        <mat-icon>flight_takeoff</mat-icon>
        <span>Missions</span>
      </a>
      <a class="bottom-nav-item" routerLink="/budgets" routerLinkActive="bottom-active">
        <mat-icon>account_balance_wallet</mat-icon>
        <span>Budgets</span>
      </a>
      <a class="bottom-nav-item" routerLink="/dashboard/kpi" routerLinkActive="bottom-active">
        <mat-icon>insights</mat-icon>
        <span>KPI</span>
      </a>
      <a class="bottom-nav-item" routerLink="/missions/dashboard" routerLinkActive="bottom-active"
         *ngIf="auth.hasAnyRole('super_admin','admin_tpm','chief_of_party','assistant_direction')">
        <mat-icon>table_chart</mat-icon>
        <span>TB Miss.</span>
      </a>
    </nav>
  `,
  styles: [`
    :host { display: block; }

    /* ── Toolbar ─────────────────────────────────────────────────────────── */
    .navbar {
      background: linear-gradient(90deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
      color: white;
      padding: 0 20px;
      height: 68px;
      display: flex; align-items: center; gap: 6px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.25);
      position: sticky; top: 0; z-index: 1000;
      margin-bottom: 0;
    }
    .navbar::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(to right, #2E75B6 33.33%, rgba(255,255,255,0.6) 33.33% 66.66%, #C00000 66.66%);
    }

    /* ── Brand ───────────────────────────────────────────────────────────── */
    .navbar-brand {
      display: flex; align-items: center; gap: 10px;
      text-decoration: none; color: white;
      padding: 4px 10px 4px 0;
      border-right: 1px solid rgba(255,255,255,0.15);
      margin-right: 6px;
    }
    .brand-icon { font-size: 30px; width: 30px; height: 30px; color: #BDD7EE; flex-shrink: 0; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.2; }
    .brand-title { font-size: 17px; font-weight: 800; letter-spacing: 1.2px; }
    .brand-sub { font-size: 9.5px; opacity: 0.72; letter-spacing: .3px; }

    /* ── Desktop nav ─────────────────────────────────────────────────────── */
    .nav-links { display: flex; align-items: center; gap: 1px; }
    .nav-links a, .nav-links button {
      color: rgba(255,255,255,0.82);
      font-size: 12.5px; font-weight: 500;
      border-radius: 6px; padding: 0 12px; height: 36px;
      transition: background .15s, color .15s;
    }
    .nav-links a:hover, .nav-links button:hover {
      color: white; background: rgba(255,255,255,0.12);
    }
    .active-link {
      color: white !important;
      background: rgba(255,255,255,0.18) !important;
      font-weight: 600 !important;
    }
    .arrow { font-size: 17px; width: 17px; height: 17px; opacity: 0.65; vertical-align: middle; }
    .spacer { flex: 1; }

    /* ── User button ─────────────────────────────────────────────────────── */
    .user-btn {
      color: rgba(255,255,255,0.9);
      display: flex; align-items: center; gap: 8px;
      padding: 4px 10px; border-radius: 8px;
      transition: background .15s;
    }
    .user-btn:hover { background: rgba(255,255,255,0.12); }
    .user-avatar, .drawer-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #2E75B6, #1F4E79);
      border: 2px solid rgba(255,255,255,0.45);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800; flex-shrink: 0;
      color: white;
    }
    .user-info { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
    .user-name { font-size: 13px; font-weight: 600; }
    .user-role { font-size: 10px; opacity: 0.68; }

    /* ── Menu items ──────────────────────────────────────────────────────── */
    .menu-code {
      font-weight: 800; color: #1F4E79;
      min-width: 72px; display: inline-block;
      font-size: 12px; letter-spacing: .3px;
    }
    .menu-name { font-size: 13px; color: #555; }

    /* ── Hamburger (mobile only) ─────────────────────────────────────────── */
    .mobile-hamburger {
      display: none;
      color: white;
    }

    /* ── Mobile overlay ──────────────────────────────────────────────────── */
    .mobile-overlay {
      display: none;
      position: fixed; inset: 0; z-index: 1099;
      background: rgba(0,0,0,0.45);
      opacity: 0; transition: opacity .25s;
      pointer-events: none;
    }
    .mobile-overlay.open { opacity: 1; pointer-events: auto; }

    /* ── Mobile drawer ───────────────────────────────────────────────────── */
    .mobile-drawer {
      display: none;
      position: fixed; top: 0; left: 0; bottom: 0;
      width: 290px; z-index: 1100;
      background: #fff;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform .25s cubic-bezier(.4,0,.2,1);
      box-shadow: 4px 0 20px rgba(0,0,0,0.18);
      padding-bottom: 80px;
    }
    .mobile-drawer.open { transform: translateX(0); }

    .drawer-user {
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(135deg, #163d61, #1F4E79);
      color: white; padding: 20px 16px;
    }
    .drawer-user-info { display: flex; flex-direction: column; }
    .drawer-name { font-size: 14px; font-weight: 700; }
    .drawer-role { font-size: 11px; opacity: .75; }

    .drawer-section {
      padding: 8px 0;
      border-bottom: 1px solid #f0f4f8;
    }
    .drawer-section-label {
      display: block;
      font-size: 10px; font-weight: 800; letter-spacing: 1px;
      color: #999; text-transform: uppercase;
      padding: 6px 16px 2px;
    }
    .drawer-link {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 16px;
      text-decoration: none; color: #2c3e50;
      font-size: 14px; font-weight: 500;
      transition: background .15s;
      cursor: pointer;
    }
    .drawer-link mat-icon { font-size: 20px; width: 20px; height: 20px; color: #1F4E79; }
    .drawer-link:hover { background: #f0f6ff; }
    .drawer-active { background: #e8f0fb; color: #1F4E79; font-weight: 700; }
    .drawer-active mat-icon { color: #1F4E79; }
    .drawer-link-danger { color: #c62828; }
    .drawer-link-danger mat-icon { color: #c62828; }
    .drawer-footer {
      padding: 8px 0;
      margin-top: 4px;
    }

    /* ── Bottom navigation bar (mobile only) ─────────────────────────────── */
    .bottom-nav {
      display: none;
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 998;
      align-items: stretch;
      justify-content: space-around;
      background: #fff;
      border-top: 1px solid #e0e0e0;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .bottom-nav-item {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; flex: 1;
      text-decoration: none;
      color: #888;
      font-size: 10px; font-weight: 500;
      padding: 6px 0 8px;
      transition: color .15s;
      min-height: 56px;
    }
    .bottom-nav-item mat-icon {
      font-size: 22px; width: 22px; height: 22px;
      transition: color .15s;
    }
    .bottom-nav-item:hover { color: #1F4E79; }
    .bottom-active {
      color: #1F4E79 !important;
      font-weight: 700;
    }
    .bottom-active mat-icon { color: #1F4E79; }

    /* ── Responsive breakpoints ──────────────────────────────────────────── */
    @media (max-width: 840px) {
      .desktop-nav { display: none !important; }
      .mobile-hamburger { display: flex !important; }
      .mobile-overlay { display: block; }
      .mobile-drawer { display: block; }
      .bottom-nav { display: flex !important; }

      .navbar { padding: 0 12px; gap: 4px; }
      .brand-sub { display: none; }
      .navbar { margin-bottom: 0; }
    }

    /* ── Print ───────────────────────────────────────────────────────────── */
    @media print {
      .navbar, .bottom-nav, .mobile-drawer, .mobile-overlay { display: none !important; }
    }
  `]
})
export class NavbarComponent {
  readonly auth = inject(AuthService);

  mobileMenuOpen = signal(false);

  get entities() {
    if (this.auth.isAdminOrCOP() || this.auth.isAdminFinance()) return ENTITIES;
    const code = this.auth.entityCode();
    return code ? ENTITIES.filter(e => e.code === code) : [];
  }

  get userEntity() {
    if (this.auth.isAdminOrCOP() || this.auth.isAdminFinance()) return '';
    const code = this.auth.entityCode();
    return code ? ENTITIES.find(e => e.code === code)?.name : null;
  }

  initials(): string {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  toggleMenu() { this.mobileMenuOpen.update(v => !v); }
  closeMenu() { this.mobileMenuOpen.set(false); }

  logout() {
    this.closeMenu();
    this.auth.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.closeMenu(); }
}
