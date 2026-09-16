import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app" [class.logged-in]="auth.isLoggedIn()">
      <nav class="navbar" *ngIf="auth.isLoggedIn()">
        <div class="nav-brand">DAIRE Lender Dashboard</div>
        <div class="nav-links">
          <a routerLink="/borrowers" routerLinkActive="active">Borrowers</a>
          <a routerLink="/accounts" routerLinkActive="active">Accounts</a>
          <a routerLink="/transactions" routerLinkActive="active">Transactions</a>
          <a routerLink="/loans" routerLinkActive="active">Loans</a>
          <a routerLink="/repayments" routerLinkActive="active">Repayments</a>
          <a routerLink="/pull-history" routerLinkActive="active">Pull History</a>
          <a routerLink="/credit-results" routerLinkActive="active">Credit Results</a>
          <a routerLink="/audit-logs" routerLinkActive="active">Audit Logs</a>
          <a routerLink="/integration-settings" routerLinkActive="active">Settings</a>
          <button (click)="auth.logout()" class="logout-btn">Logout</button>
        </div>
      </nav>
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .navbar { background: #1a1a2e; color: white; padding: 1rem 2rem; display: flex; align-items: center; }
    .nav-brand { font-weight: bold; font-size: 1.2rem; margin-right: 2rem; }
    .nav-links { display: flex; gap: 1rem; align-items: center; }
    .nav-links a { color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; transition: background 0.2s; }
    .nav-links a:hover { background: #16213e; }
    .nav-links a.active { background: #0f3460; }
    .logout-btn { background: #e94560; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-left: 1rem; }
    .logout-btn:hover { background: #c73650; }
    .main-content { padding: 2rem; }
    .logged-in { min-height: calc(100vh - 60px); }
  `]
})
export class App {
  constructor(public auth: AuthService) {}

  protected readonly title = signal('lender-frontend');
}
