import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Borrower } from '../services/api.service';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <h1>Dashboard – {{ institutionName }}</h1>
      <p class="subtitle">DAIRE Lender Subsystem</p>

      <div class="cards" *ngIf="!loading">
        <div class="card">
          <h3>Borrowers</h3>
          <p class="big">{{ borrowers.length }}</p>
        </div>
        <div class="card">
          <h3>Active Accounts</h3>
          <p class="big">{{ totalAccounts }}</p>
        </div>
        <div class="card">
          <h3>Loans (Active)</h3>
          <p class="big">{{ totalLoans }}</p>
        </div>
        <div class="card">
          <h3>Total Balance</h3>
          <p class="big">{{ totalBalance | currency:'TZS':'TZS ':1:"1.0-0" }}</p>
        </div>
        <div class="card">
          <h3>Pull Requests (today)</h3>
          <p class="big">{{ todaysPulls }}</p>
        </div>
        <div class="card">
          <h3>Push Results (today)</h3>
          <p class="big">{{ todaysPushes }}</p>
        </div>
      </div>

      <div *ngIf="loading" class="loading">Loading dashboard data…</div>

      <div class="sections" *ngIf="!loading">
        <div class="section">
          <h2>Recent Audit Logs</h2>
          <table class="data-table">
            <thead><tr><th>Time</th><th>Action</th><th>Borrower</th><th>Status</th><th>Identity</th></tr></thead>
            <tbody>
              <tr *ngFor="let log of recentLogs">
                <td>{{ log.timestamp | date:'short' }}</td>
                <td>{{ log.action }}</td>
                <td>{{ log.borrower_reference || '–' }}</td>
                <td><span class="badge" [class.success]="log.status==='SUCCESS'" [class.danger]="log.status==='FAILURE'">{{ log.status }}</span></td>
                <td>{{ log.identity || '–' }}</td>
              </tr>
            </tbody>
          </table>
          <a routerLink="/audit-logs">View all audit logs →</a>
        </div>

        <div class="section">
          <h2>Recent Credit Results</h2>
          <table class="data-table">
            <thead><tr><th>Time</th><th>Borrower</th><th>Score</th><th>Rep</th><th>Risk</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of recentCreditResults">
                <td>{{ r.received_at | date:'short' }}</td>
                <td>{{ r.borrower_reference }}</td>
                <td>{{ r.credit_score || '–' }}</td>
                <td>{{ r.reputation || '–' }}</td>
                <td>{{ r.risk_level || '–' }}</td>
              </tr>
            </tbody>
          </table>
          <a routerLink="/credit-results">View all credit results →</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard h1 { color: #16213e; }
    .subtitle { color: #666; margin-top: 0; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); border-left: 4px solid #0f3460; }
    .card h3 { margin: 0 0 0.5rem 0; color: #333; font-size: 0.9rem; text-transform: uppercase; }
    .card .big { font-size: 2rem; font-weight: bold; color: #1a1a2e; margin: 0; }
    .section { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 2rem; }
    .section h2 { margin-top: 0; color: #16213e; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .badge.success { background: #d4edda; color: #155724; }
    .badge.danger { background: #f8d7da; color: #721c24; }
    .loading { color: #666; padding: 2rem; }
    a { color: #0f3460; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `]
})
export class DashboardComponent implements OnInit {
  institutionName = 'NMB Bank';
  borrowers: Borrower[] = [];
  loading = true;
  recentLogs: any[] = [];
  recentCreditResults: any[] = [];

  private api = inject(ApiService);

  get totalAccounts(): number {
    return this.borrowers.reduce((sum, b) => sum + (b.account_information?.total_accounts || 0), 0);
  }
  get totalLoans(): number {
    return this.borrowers.reduce((sum, b) => sum + b.loans.length, 0);
  }
  get totalBalance(): number {
    return this.borrowers.reduce((sum, b) => sum + (b.account_information?.total_balance || 0), 0);
  }

  ngOnInit(): void {
    this.api.health().subscribe({
      next: () => {
        this.api.getAuditLogs({ limit: '10' }).subscribe({
          next: (logs) => { this.recentLogs = logs; },
        });
        this.api.getCreditResults().subscribe({
          next: (results) => { this.recentCreditResults = results.slice(0, 5); },
        });
      },
    });
  }

  get todaysPulls(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.recentLogs.filter(l => l.action === 'BORROWER_DATA_PULL' && l.timestamp.startsWith(today)).length;
  }
  get todaysPushes(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.recentLogs.filter(l => l.action === 'CREDIT_RESULT_PUSH' && l.timestamp.startsWith(today)).length;
  }
}
