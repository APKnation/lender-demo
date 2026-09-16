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
      <div class="flex flex-col min-h-screen">
        <header class="sticky top-0 z-100 flex items-center gap-6 h-[60px] px-4 sm:px-8 bg-sidebar text-white">
          <div class="text-sm whitespace-nowrap"><strong class="text-blue-400">NMB</strong> Borrower Portal</div>
          <nav class="flex gap-1 flex-1">
            <a routerLink="/portal" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}"
               class="px-3.5 py-1.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10 transition no-underline"
               >My Account</a>
            <a routerLink="/portal/apply-loan" routerLinkActive="active"
               class="px-3.5 py-1.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10 transition no-underline"
               >Apply for Loan</a>
          </nav>
          <div class="hidden sm:flex items-center gap-3 text-[0.82rem] text-white/70">
            <span>{{ auth.userFullName() || auth.userEmail() }}</span>
            <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Sign Out</button>
          </div>
          <button class="sm:hidden btn btn-ghost btn-sm" (click)="auth.logout()">Exit</button>
        </header>
        <main class="flex-1 p-4 sm:p-8 max-w-[1200px] mx-auto w-full">
          <router-outlet />
        </main>
      </div>
    </ng-container>

    <!-- Admin / Staff Layout with Sidebar -->
    <ng-container *ngIf="auth.isLoggedIn() && auth.isStaff()">
      <div class="flex min-h-screen">
        <!-- Mobile backdrop -->
        <div
          class="fixed inset-0 bg-black/50 z-150 lg:hidden"
          [class.opacity-100]="mobileOpen()"
          [class.opacity-0]="!mobileOpen()"
          [class.pointer-events-none]="!mobileOpen()"
          (click)="closeMobile()"
        ></div>

        <!-- Sidebar -->
        <aside
          class="fixed inset-y-0 left-0 z-200 flex flex-col bg-sidebar overflow-hidden transition-all duration-300 lg:translate-x-0"
          [style.width]="'var(--app-sidebar-width, 260px)'"
          [class.-translate-x-full]="!mobileOpen()"
          [class.translate-x-0]="mobileOpen()"
        >
          <div class="flex items-center justify-between h-[60px] px-4 border-b border-white/10 shrink-0">
            <div class="flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">N</span>
              <span class="text-white font-bold text-sm">NMB DAIRE</span>
            </div>
            <button class="topbar-btn text-white/50 hover:text-white text-lg lg:hidden" (click)="closeMobile()" aria-label="Close menu">✕</button>
          </div>

          <div class="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
            <div class="w-9 h-9 shrink-0 rounded-full bg-linear-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white font-bold text-[0.8rem]">
              {{ initials() }}
            </div>
            <div class="min-w-0">
              <div class="text-white font-semibold text-[0.85rem] truncate">{{ auth.userFullName() || 'Staff' }}</div>
              <div class="text-white/45 text-[0.72rem]">{{ formatRole(auth.userRole()) }}</div>
            </div>
          </div>

          <nav class="flex-1 overflow-y-auto py-3">
            <div class="mb-2">
              <span class="nav-section">Overview</span>
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Ov</span><span>Dashboard</span>
              </a>
            </div>

            <div class="mb-2">
              <span class="nav-section">Borrowers</span>
              <a routerLink="/borrowers" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Br</span><span>All Borrowers</span>
              </a>
              <a routerLink="/accounts" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Ac</span><span>Accounts</span>
              </a>
              <a routerLink="/loans" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Ln</span><span>Loans</span>
              </a>
              <a routerLink="/loan-approvals" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Ap</span><span>Loan Approvals</span>
              </a>
              <a routerLink="/transactions" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Tx</span><span>Transactions</span>
              </a>
              <a routerLink="/repayments" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Rp</span><span>Repayments</span>
              </a>
            </div>

            <div class="mb-2">
              <span class="nav-section">Credit &amp; DAIRE</span>
              <a routerLink="/credit-results" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Cr</span><span>Credit Results</span>
              </a>
              <a routerLink="/daire" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">DC</span><span>DAIRE Central</span>
              </a>
            </div>

            <div class="mb-2" *ngIf="auth.isAdmin()">
              <span class="nav-section">Administration</span>
              <a routerLink="/integration-settings" routerLinkActive="active" (click)="closeMobile()" class="nav-item mx-3">
                <span class="nav-ico">Ak</span><span>API Keys</span>
              </a>
            </div>
          </nav>

          <div class="border-t border-white/10 py-2">
            <button class="nav-item w-full bg-transparent border-0 cursor-pointer font-sans hover:bg-red-500/10 hover:text-red-400" (click)="auth.logout()">
              <span class="nav-ico">So</span><span>Sign Out</span>
            </button>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col min-h-screen lg:ml-[var(--app-sidebar-width,260px)]">
          <header class="sticky top-0 z-100 h-[60px] bg-surface border-b border-line flex items-center justify-between px-4 sm:px-8">
            <div class="flex items-center gap-4">
              <button class="lg:hidden topbar-btn text-xl" (click)="openMobile()" aria-label="Open menu">≡</button>
              <h1 class="text-base font-semibold text-ink">{{ pageTitle() }}</h1>
            </div>
            <div class="flex items-center gap-2.5 text-[0.82rem] text-ink-soft">
              <span class="w-[30px] h-[30px] rounded-full bg-linear-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white font-bold text-[0.7rem]">{{ initials() }}</span>
              <span class="hidden sm:inline">{{ auth.userEmail() }}</span>
            </div>
          </header>

          <main class="flex-1 p-4 sm:p-8 overflow-y-auto">
            <router-outlet />
            <footer class="pt-10 pb-4 text-center text-xs text-muted">
              NMB DAIRE Lender Subsystem · {{ year }}
            </footer>
          </main>
        </div>
      </div>
    </ng-container>
  `,
})
export class App {
  auth = inject(AuthService);
  private router = inject(Router);
  mobileOpen = signal(false);
  readonly year = new Date().getFullYear();

  openMobile(): void {
    this.mobileOpen.set(true);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
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
      '/loan-approvals': 'Loan Approvals',
      '/transactions': 'Transactions',
      '/repayments': 'Repayments',
      '/credit-results': 'Credit Results',
      '/daire': 'DAIRE Central System',
      '/integration-settings': 'API Keys & Integration',
    };
    if (url.startsWith('/borrowers/')) return 'Borrower Detail';
    return map[url] ?? 'NMB DAIRE';
  }
}
