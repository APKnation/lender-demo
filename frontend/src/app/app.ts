import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- Unauthenticated: just show the routed page (login) -->
    <ng-container *ngIf="!auth.isLoggedIn()">
      <router-outlet />
    </ng-container>

    <!-- Borrower Portal Layout -->
    <ng-container *ngIf="auth.isLoggedIn() && auth.isBorrower()">
      <div class="portal-shell">
        <header class="portal-header">
          <div class="portal-brand">🏦 <strong>NMB</strong> Borrower Portal</div>
          <nav class="portal-nav">
            <a routerLink="/portal" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">My Account</a>
            <a routerLink="/portal/apply-loan" routerLinkActive="active">Apply for Loan</a>
          </nav>
          <div class="portal-user">
            <span>👤 {{ auth.userFullName() || auth.userEmail() }}</span>
            <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Sign Out</button>
          </div>
        </header>
        <main class="portal-main">
          <router-outlet />
        </main>
      </div>
    </ng-container>

    <!-- Admin / Staff Layout with Sidebar -->
    <ng-container *ngIf="auth.isLoggedIn() && auth.isStaff()">
      <div class="admin-shell">
        <!-- Sidebar -->
        <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
          <div class="sidebar-header">
            <div class="sidebar-logo">
              <span class="logo-icon">🏦</span>
              <span class="logo-text">NMB DAIRE</span>
            </div>
            <button class="collapse-btn" (click)="toggleSidebar()">☰</button>
          </div>

          <div class="sidebar-user">
            <div class="user-avatar">{{ initials() }}</div>
            <div class="user-info">
              <div class="user-name">{{ auth.userFullName() || 'Staff' }}</div>
              <div class="user-role">{{ formatRole(auth.userRole()) }}</div>
            </div>
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section">
              <span class="nav-section-label">Overview</span>
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-item">
                <span class="nav-icon">📊</span><span class="nav-label">Dashboard</span>
              </a>
            </div>

            <div class="nav-section">
              <span class="nav-section-label">Borrowers</span>
              <a routerLink="/borrowers" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">👥</span><span class="nav-label">All Borrowers</span>
              </a>
              <a routerLink="/accounts" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">🏦</span><span class="nav-label">Accounts</span>
              </a>
              <a routerLink="/loans" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">💳</span><span class="nav-label">Loans</span>
              </a>
              <a routerLink="/transactions" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">↕️</span><span class="nav-label">Transactions</span>
              </a>
              <a routerLink="/repayments" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📅</span><span class="nav-label">Repayments</span>
              </a>
            </div>

            <div class="nav-section">
              <span class="nav-section-label">Credit & Audit</span>
              <a routerLink="/credit-results" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">⭐</span><span class="nav-label">Credit Results</span>
              </a>
              <a routerLink="/audit-logs" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📋</span><span class="nav-label">Audit Logs</span>
              </a>
              <a routerLink="/pull-history" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">🔄</span><span class="nav-label">Pull History</span>
              </a>
            </div>

            <div class="nav-section" *ngIf="auth.isAdmin()">
              <span class="nav-section-label">Administration</span>
              <a routerLink="/integration-settings" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">🔑</span><span class="nav-label">API Keys</span>
              </a>
            </div>
          </nav>

          <div class="sidebar-footer">
            <button class="nav-item logout-btn" (click)="auth.logout()">
              <span class="nav-icon">🚪</span><span class="nav-label">Sign Out</span>
            </button>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="admin-content">
          <header class="admin-header">
            <div class="header-left">
              <button class="collapse-btn-mobile" (click)="toggleSidebar()">☰</button>
              <h1 class="page-title">{{ pageTitle() }}</h1>
            </div>
            <div class="header-right">
              <span class="header-user">
                <span class="avatar-sm">{{ initials() }}</span>
                <span>{{ auth.userEmail() }}</span>
              </span>
            </div>
          </header>

          <main class="admin-main">
            <router-outlet />
          </main>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    /* ── Portal Layout ── */
    .portal-shell { display: flex; flex-direction: column; min-height: 100vh; }

    .portal-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 0 2rem;
      height: 60px;
      background: #1e2235;
      color: #fff;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .portal-brand { font-size: 1rem; color: #fff; white-space: nowrap; }
    .portal-brand strong { color: #60a5fa; }

    .portal-nav { display: flex; gap: 0.25rem; flex: 1; }
    .portal-nav a {
      color: rgba(255,255,255,0.7);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.875rem;
      transition: all 0.2s;
      text-decoration: none;
    }
    .portal-nav a.active,
    .portal-nav a:hover { color: #fff; background: rgba(255,255,255,0.1); }

    .portal-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.82rem;
      color: rgba(255,255,255,0.7);
    }
    .portal-main { flex: 1; padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }

    /* ── Admin Sidebar ── */
    .admin-shell { display: flex; min-height: 100vh; }

    .sidebar {
      width: var(--sidebar-width);
      background: var(--sidebar-bg);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 200;
      transition: width 0.25s ease;
      overflow: hidden;
    }
    .sidebar.collapsed { width: 64px; }
    .sidebar.collapsed .logo-text,
    .sidebar.collapsed .user-info,
    .sidebar.collapsed .nav-label,
    .sidebar.collapsed .nav-section-label,
    .sidebar.collapsed .sidebar-footer .nav-label { display: none; }
    .sidebar.collapsed .sidebar-user { padding: 1rem 0; justify-content: center; }
    .sidebar.collapsed .user-avatar { width: 36px; height: 36px; font-size: 0.8rem; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 12px; }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      height: 60px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    .sidebar-logo { display: flex; align-items: center; gap: 0.6rem; }
    .logo-icon { font-size: 1.4rem; }
    .logo-text { color: #fff; font-weight: 700; font-size: 1rem; }

    .collapse-btn, .collapse-btn-mobile {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s;
    }
    .collapse-btn:hover { color: #fff; }
    .collapse-btn-mobile { color: var(--text-secondary); font-size: 1.2rem; }

    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    .user-avatar {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #1a56db, #0e9f6e);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .user-name { color: #fff; font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { color: rgba(255,255,255,0.45); font-size: 0.72rem; }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem 0;
    }
    .nav-section { margin-bottom: 0.5rem; }
    .nav-section-label {
      display: block;
      padding: 6px 1.25rem 4px;
      color: rgba(255,255,255,0.3);
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 9px 1.25rem;
      color: var(--sidebar-text);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s;
      border-left: 3px solid transparent;
      text-decoration: none;
      background: none;
      border-top: none;
      border-right: none;
      border-bottom: none;
      width: 100%;
      text-align: left;
      font-family: var(--font);
    }
    .nav-item:hover { background: var(--sidebar-hover); color: #fff; text-decoration: none; }
    .nav-item.active {
      background: rgba(26, 86, 219, 0.25);
      color: #fff;
      border-left-color: var(--primary);
    }
    .nav-icon { font-size: 1.1rem; flex-shrink: 0; width: 22px; text-align: center; }

    .sidebar-footer {
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 0.5rem 0;
    }
    .logout-btn { color: rgba(255,255,255,0.5); }
    .logout-btn:hover { color: #f87171; background: rgba(239,68,68,0.1); }

    /* ── Admin Content ── */
    .admin-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left 0.25s ease;
    }

    .admin-header {
      height: 60px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .page-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
    .collapse-btn-mobile { display: none; }

    .header-right { display: flex; align-items: center; }
    .header-user {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.82rem;
      color: var(--text-secondary);
    }
    .avatar-sm {
      width: 30px; height: 30px;
      background: linear-gradient(135deg, #1a56db, #0e9f6e);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.7rem;
    }

    .admin-main {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }

    @media (max-width: 900px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: none; }
      .admin-content { margin-left: 0; }
      .collapse-btn-mobile { display: block; }
    }
  `]
})
export class App {
  auth = inject(AuthService);
  private router = inject(Router);
  sidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  initials(): string {
    const name = this.auth.userFullName() || this.auth.userEmail() || '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatRole(role: string | null): string {
    const map: Record<string, string> = {
      ADMIN: 'Administrator',
      DATA_OFFICER: 'Data Officer',
      AUDITOR: 'Auditor',
      READ_ONLY: 'Read Only',
      BORROWER: 'Borrower',
    };
    return map[role ?? ''] ?? role ?? '';
  }

  pageTitle(): string {
    const url = this.router.url;
    const map: Record<string, string> = {
      '/': 'Dashboard',
      '/borrowers': 'Borrowers',
      '/accounts': 'Accounts',
      '/loans': 'Loans',
      '/transactions': 'Transactions',
      '/repayments': 'Repayments',
      '/credit-results': 'Credit Results',
      '/audit-logs': 'Audit Logs',
      '/pull-history': 'Pull History',
      '/integration-settings': 'API Keys & Integration',
    };
    if (url.startsWith('/borrowers/')) return 'Borrower Detail';
    return map[url] ?? 'NMB DAIRE';
  }
}
