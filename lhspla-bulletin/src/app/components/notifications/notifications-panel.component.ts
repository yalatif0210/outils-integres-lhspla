import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatBadgeModule],
  template: `
    <!-- Trigger button -->
    <button class="notif-btn" (click)="toggle()" [class.open]="open()">
      <mat-icon [matBadge]="unreadCount() || null" matBadgeColor="warn" matBadgeSize="small">
        notifications
      </mat-icon>
    </button>

    <!-- Panel -->
    <div class="notif-panel" *ngIf="open()" (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="panel-header">
        <div class="panel-header-triband"></div>
        <div class="panel-header-inner">
          <mat-icon class="header-icon">notifications</mat-icon>
          <span class="header-title">Notifications</span>
          <span class="unread-badge" *ngIf="unreadCount() > 0">{{unreadCount()}}</span>
          <button class="mark-all-btn" *ngIf="unreadCount() > 0" (click)="markAllRead()">
            <mat-icon>done_all</mat-icon> Tout lire
          </button>
        </div>
      </div>

      <!-- Recherche -->
      <div class="search-bar">
        <mat-icon class="search-icon">search</mat-icon>
        <input class="search-input" type="text"
               [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
               placeholder="Rechercher dans les notifications...">
        <button *ngIf="searchTerm()" class="search-clear" (click)="searchTerm.set('')">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Liste -->
      <div class="panel-body">
        <div *ngIf="filteredNotifications().length === 0" class="notif-empty">
          <mat-icon>{{searchTerm() ? 'search_off' : 'notifications_none'}}</mat-icon>
          <p>{{searchTerm() ? 'Aucun résultat' : 'Aucune notification'}}</p>
        </div>

        <div *ngFor="let n of filteredNotifications()" class="notif-item"
             [class.unread]="!n.isRead" (click)="markRead(n)">
          <div class="notif-icon-wrap" [class]="'ic-' + getIconClass(n.type)">
            <mat-icon>{{getIcon(n.type)}}</mat-icon>
          </div>
          <div class="notif-content">
            <p class="notif-title">{{n.title}}</p>
            <p class="notif-msg">{{n.message}}</p>
            <span class="notif-time">{{formatTime(n.createdAt)}}</span>
          </div>
          <span class="unread-dot" *ngIf="!n.isRead"></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { position: relative; display: inline-flex; align-items: center; }

    /* ── Trigger ── */
    .notif-btn {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.85);
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .notif-btn:hover, .notif-btn.open { background: rgba(255,255,255,0.15); color: white; }
    .notif-btn mat-icon { font-size: 24px; width: 24px; height: 24px; }

    /* ── Panel ── */
    .notif-panel {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 380px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(31,78,121,0.22), 0 2px 8px rgba(0,0,0,0.12);
      border: 1px solid #E0EAF4;
      z-index: 9999;
      overflow: hidden;
      animation: slideDown .18s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Panel header ── */
    .panel-header {
      background: linear-gradient(135deg, #163d61 0%, #1F4E79 60%, #245d8f 100%);
      color: white;
    }
    .panel-header-triband {
      height: 3px;
      background: linear-gradient(to right, #2E75B6 33.33%, rgba(255,255,255,0.9) 33.33% 66.66%, #C00000 66.66%);
    }
    .panel-header-inner {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 16px;
    }
    .header-icon { font-size: 20px; width: 20px; height: 20px; color: #BDD7EE; }
    .header-title { font-size: 15px; font-weight: 800; flex: 1; letter-spacing: .3px; }
    .unread-badge {
      background: #C00000; color: white;
      font-size: 11px; font-weight: 800;
      min-width: 20px; height: 20px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      padding: 0 5px;
    }
    .mark-all-btn {
      background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3);
      color: white; border-radius: 8px; cursor: pointer;
      font-size: 11.5px; font-weight: 600;
      padding: 4px 10px; display: flex; align-items: center; gap: 4px;
      transition: background .15s;
    }
    .mark-all-btn:hover { background: rgba(255,255,255,0.28); }
    .mark-all-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* ── Search bar ── */
    .search-bar {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px;
      background: #F0F4FA;
      border-bottom: 1px solid #E0EAF4;
    }
    .search-icon { font-size: 16px; width: 16px; height: 16px; color: #8AA5C0; flex-shrink: 0; }
    .search-input {
      flex: 1; border: none; background: transparent;
      font-size: 12.5px; color: #1a2340; outline: none;
      font-family: inherit;
    }
    .search-input::placeholder { color: #AAB8C8; }
    .search-clear {
      background: none; border: none; cursor: pointer; padding: 0; line-height: 1;
      display: flex; align-items: center; color: #AAB8C8;
    }
    .search-clear mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .search-clear:hover { color: #556; }

    /* ── Body ── */
    .panel-body {
      max-height: 360px;
      overflow-y: auto;
      background: #F8FAFD;
    }
    .panel-body::-webkit-scrollbar { width: 5px; }
    .panel-body::-webkit-scrollbar-track { background: #F0F4F8; }
    .panel-body::-webkit-scrollbar-thumb { background: #B8CCE0; border-radius: 4px; }

    /* ── Empty state ── */
    .notif-empty {
      text-align: center; padding: 40px 20px; color: #B0BEC5;
    }
    .notif-empty mat-icon {
      font-size: 48px; width: 48px; height: 48px;
      display: block; margin: 0 auto 10px; color: #CFD8DC;
    }
    .notif-empty p { font-size: 13px; }

    /* ── Notification item ── */
    .notif-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 13px 16px;
      border-bottom: 1px solid #EDF2F7;
      cursor: pointer;
      background: white;
      transition: background .12s;
      position: relative;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: #F0F6FF; }
    .notif-item.unread {
      background: #EEF5FF;
      border-left: 4px solid #2E75B6;
    }
    .notif-item.unread:hover { background: #E4EFFF; }

    /* ── Icon wrap ── */
    .notif-icon-wrap {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .notif-icon-wrap mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .ic-warn    { background: #FFF3E8; color: #C55A11; }
    .ic-warn mat-icon { color: #C55A11; }
    .ic-danger  { background: #FFF0F0; color: #C00000; }
    .ic-danger mat-icon { color: #C00000; }
    .ic-success { background: #F0FFF4; color: #276221; }
    .ic-success mat-icon { color: #276221; }
    .ic-info    { background: #EEF5FF; color: #2E75B6; }
    .ic-info mat-icon { color: #2E75B6; }

    /* ── Content ── */
    .notif-content { flex: 1; min-width: 0; }
    .notif-title { margin: 0 0 3px; font-size: 13px; font-weight: 700; color: #1a2340; line-height: 1.3; }
    .notif-msg { margin: 0 0 5px; font-size: 12px; color: #556; line-height: 1.45; white-space: normal; }
    .notif-time { font-size: 11px; color: #9FABB8; font-weight: 500; }

    /* ── Unread dot ── */
    .unread-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #2E75B6; flex-shrink: 0; margin-top: 4px;
    }
  `]
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private elRef = inject(ElementRef);

  notifications = signal<any[]>([]);
  unreadCount = signal(0);
  open = signal(false);
  searchTerm = signal('');

  private prevUnreadCount = -1;
  private pollInterval: any;

  filteredNotifications = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.notifications();
    if (!term) return list;
    return list.filter(n =>
      n.title?.toLowerCase().includes(term) ||
      n.message?.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.loadUnreadCount();
    this.pollInterval = setInterval(() => this.pollUnreadCount(), 30000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  toggle() {
    const wasOpen = this.open();
    this.open.set(!wasOpen);
    if (!wasOpen) {
      this.loadNotifications();
      if (this.unreadCount() > 0) this.playNotificationSound();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.elRef.nativeElement.contains(e.target)) this.open.set(false);
  }

  loadUnreadCount() {
    this.api.getUnreadCount().subscribe(r => {
      this.prevUnreadCount = r.count;
      this.unreadCount.set(r.count);
    });
  }

  private pollUnreadCount() {
    this.api.getUnreadCount().subscribe(r => {
      const newCount = r.count;
      if (this.prevUnreadCount >= 0 && newCount > this.prevUnreadCount) {
        this.playNotificationSound();
        if (this.open()) this.loadNotifications();
      }
      this.prevUnreadCount = newCount;
      this.unreadCount.set(newCount);
    });
  }

  private playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  loadNotifications() {
    this.api.getNotifications().subscribe(list => {
      this.notifications.set(list);
      this.unreadCount.set(list.filter((n: any) => !n.isRead).length);
    });
  }

  markRead(n: any) {
    if (n.isRead) return;
    this.api.markRead(n.id).subscribe(() => {
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      this.unreadCount.update(c => Math.max(0, c - 1));
    });
  }

  markAllRead() {
    this.api.markAllRead().subscribe(() => {
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      this.unreadCount.set(0);
    });
  }

  getIcon(type: string): string {
    const map: Record<string, string> = {
      LATE_SUBMISSION: 'warning', CRITICAL_RISK: 'dangerous',
      SUBMISSION: 'check_circle', NEW_WEEK: 'calendar_today',
      BUDGET_SUBMITTED: 'account_balance_wallet', BUDGET_RETURNED: 'replay',
      BUDGET_TPM_APPROVED: 'verified_user', BUDGET_APPROVED: 'check_circle',
      BUDGET_REJECTED: 'cancel', BUDGET_RECALL: 'attach_file',
      BUDGET_RECALL_CLOSED: 'task_alt',
      RECALL_DOC_APPROVED: 'check_circle', RECALL_DOC_REJECTED: 'cancel', RECALL_REJECTED: 'cancel',
      MISSION_SUBMITTED: 'flight_takeoff', MISSION_TPM_APPROVED: 'thumb_up',
      MISSION_TPM_REJECTED: 'thumb_down', MISSION_TRANSMITTED: 'send',
      MISSION_COP_APPROVED: 'gavel', MISSION_REJECTED: 'cancel',
      MISSION_DOCS_GENERATED: 'description', MISSION_DG_VALIDATED: 'verified',
      MISSION_COMPLETED: 'flag',
    };
    return map[type] ?? 'notifications';
  }

  getIconClass(type: string): string {
    const map: Record<string, string> = {
      LATE_SUBMISSION: 'warn', CRITICAL_RISK: 'danger',
      SUBMISSION: 'success', NEW_WEEK: 'info',
      BUDGET_SUBMITTED: 'info', BUDGET_RETURNED: 'warn',
      BUDGET_TPM_APPROVED: 'info', BUDGET_APPROVED: 'success',
      BUDGET_REJECTED: 'danger', BUDGET_RECALL: 'warn',
      BUDGET_RECALL_CLOSED: 'success',
      RECALL_DOC_APPROVED: 'success', RECALL_DOC_REJECTED: 'danger', RECALL_REJECTED: 'danger',
      MISSION_SUBMITTED: 'info', MISSION_TPM_APPROVED: 'success',
      MISSION_TPM_REJECTED: 'warn', MISSION_TRANSMITTED: 'info',
      MISSION_COP_APPROVED: 'success', MISSION_REJECTED: 'danger',
      MISSION_DOCS_GENERATED: 'info', MISSION_DG_VALIDATED: 'success',
      MISSION_COMPLETED: 'success',
    };
    return map[type] ?? 'info';
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `il y a ${diff} min`;
    if (diff < 1440) return `il y a ${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('fr-FR');
  }
}
