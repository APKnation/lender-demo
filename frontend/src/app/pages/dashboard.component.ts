import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Borrower, Loan, CreditResult } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">

      <!-- Loading -->
      <div *ngIf="loading()" class="loading-page">
        <div class="spinner" style="width:36px;height:36px;border-width:3px"></div>
        <p>Loading dashboard data…</p>
      </div>
      <!-- Loan Approvals -->
      <div class="card section-card approvals-card">
        <div class="section-header">
          <h2>Pending Loan Approvals</h2>
          <a routerLink="/loan-approvals" class="btn btn-outline btn-sm">Review All</a>
        </div>
        <div class="credit-list" *ngIf="pendingLoans().length > 0">
          <div *ngFor="let l of pendingLoans().slice(0, 5)" class="credit-item">
            <div class="credit-ref">{{ l.loan_id }}</div>
            <div><strong>TZS {{ formatBalance(l.loan_amount) }}</strong></div>
            <div class="text-muted" style="font-size:0.75rem">{{ l.loan_duration_months }} months</div>
            <a routerLink="/loan-approvals" class="btn btn-ghost btn-sm">Review</a>
          </div>
        </div>
        <div *ngIf="pendingLoans().length === 0" class="empty-state">
          <p>No pending loan applications</p>
        </div>
      </div>

      <ng-container *ngIf="!loading()">
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon-blue">T</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ borrowers().length }}</div>
              <div class="kpi-label">Total Borrowers</div>
            </div>
            <a routerLink="/borrowers" class="kpi-link">View &rsaquo;</a>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon-green">A</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ totalAccounts() }}</div>
              <div class="kpi-label">Active Accounts</div>
            </div>
            <a routerLink="/accounts" class="kpi-link">View &rsaquo;</a>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon-amber">L</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ totalLoans() }}</div>
              <div class="kpi-label">Active Loans</div>
            </div>
            <a routerLink="/loans" class="kpi-link">View &rsaquo;</a>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon-violet">P</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ formatBalance(totalBalance()) }}</div>
              <div class="kpi-label">Total Portfolio Balance</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon-red">R</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ highRiskCount() }}</div>
              <div class="kpi-label">High Risk Borrowers</div>
            </div>
            <a routerLink="/credit-results" class="kpi-link">View &rsaquo;</a>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon-teal">C</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ recentCreditResults().length }}</div>
              <div class="kpi-label">Credit Results</div>
            </div>
            <a routerLink="/credit-results" class="kpi-link">View &rsaquo;</a>
          </div>
        </div>

        <!-- Main content grid -->
        <div class="content-grid">

          <!-- Borrower Summary Table -->
          <div class="card section-card span-2">
            <div class="section-header">
              <h2>Borrower Portfolio</h2>
              <a routerLink="/borrowers" class="btn btn-outline btn-sm">View All</a>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Name</th>
                    <th>Employment</th>
                    <th>Income</th>
                    <th>Accounts</th>
                    <th>Loans</th>
                    <th>Balance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let b of borrowers().slice(0, 8)">
                    <td><code class="ref">{{ b.borrower_reference }}</code></td>
                    <td><strong>{{ b.full_name }}</strong><br><small class="text-muted">{{ b.gender }}</small></td>
                    <td>{{ formatEmployment(b.employment_status) }}</td>
                    <td>{{ formatBalance(+b.income) }}</td>
                    <td>{{ b.account_information?.total_accounts || 0 }}</td>
                    <td>{{ b.loans?.length || 0 }}</td>
                    <td>{{ formatBalance(b.account_information?.total_balance || 0) }}</td>
                    <td><a [routerLink]="['/borrowers', b.borrower_reference]" class="btn btn-ghost btn-sm">Detail</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Credit Results -->
          <div class="card section-card">
            <div class="section-header">
              <h2>Credit Results</h2>
              <a routerLink="/credit-results" class="btn btn-outline btn-sm">View All</a>
            </div>
            <div class="credit-list">
              <div *ngFor="let r of recentCreditResults()" class="credit-item">
                <div class="credit-ref">{{ r.borrower_reference }}</div>
                <div class="credit-score" [class]="scoreClass(r.credit_score)">
                  {{ r.credit_score || 'N/A' }}
                </div>
                <div>
                  <span class="badge" [class]="riskBadge(r.risk_level)">{{ r.risk_level || '–' }}</span>
                </div>
                <div class="text-muted" style="font-size:0.75rem">{{ r.received_at | date:'dd MMM' }}</div>
              </div>
              <div *ngIf="recentCreditResults().length === 0" class="empty-state">
                <div class="empty-icon">Cr</div>
                <p>No credit results yet</p>
              </div>
            </div>
          </div>

          <!-- Loan Status Distribution -->
          <div class="card section-card">
            <div class="section-header">
              <h2>Loan Status</h2>
              <a routerLink="/loans" class="btn btn-outline btn-sm">View All</a>
            </div>
            <div class="loan-status-list">
              <div *ngFor="let s of loanStats()" class="loan-stat">
                <div class="loan-stat-bar-wrap">
                  <div class="loan-stat-label">{{ s.label }}</div>
                  <div class="loan-stat-count">{{ s.count }}</div>
                </div>
                <div class="loan-bar-bg">
                  <div class="loan-bar" [style.width.%]="s.pct" [style.background]="s.color"></div>
                </div>
              </div>
            </div>
          </div>

        </div><!-- /content-grid -->
      </ng-container>
    </div>
  `,
  styles: [`
    .dashboard { }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      position: relative;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .kpi-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
    .kpi-icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-value { font-size: 1.6rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
    .kpi-label { font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; }
    .kpi-link {
      position: absolute;
      bottom: 10px; right: 12px;
      font-size: 0.75rem;
      color: var(--primary);
      text-decoration: none;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .kpi-card:hover .kpi-link { opacity: 1; }

    /* Content grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1.25rem;
    }
    .section-card { padding: 1.25rem; }
    .span-2 { grid-column: span 2; }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .section-header h2 { font-size: 1rem; }

    /* Borrower table specifics */
    .ref { font-size: 0.75rem; background: var(--surface-3); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .action-code { font-size: 0.72rem; background: var(--surface-3); padding: 2px 5px; border-radius: 4px; font-family: monospace; }

    /* Pending approvals card */
    .approvals-card { margin-bottom: 1.25rem; }
    .approvals-card .credit-item { align-items: center; }

    /* KPI icon letter tiles */
    .kpi-icon-blue { background:#dbeafe; color:#1e40af; }
    .kpi-icon-green { background:#d1fae5; color:#065f46; }
    .kpi-icon-amber { background:#fef3c7; color:#92400e; }
    .kpi-icon-violet { background:#ede9fe; color:#5b21b6; }
    .kpi-icon-red { background:#fee2e2; color:#991b1b; }
    .kpi-icon-teal { background:#ccfbf1; color:#115e59; }

    /* Credit results */
    .credit-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .credit-item {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid var(--border);
    }
    .credit-item:last-child { border-bottom: none; }
    .credit-ref { font-size: 0.82rem; font-weight: 600; }
    .credit-score { font-size: 1.1rem; font-weight: 700; }
    .score-low { color: #059669; }
    .score-medium { color: #d97706; }
    .score-high { color: #dc2626; }
    .score-na { color: var(--text-muted); }

    /* Loan stats */
    .loan-status-list { display: flex; flex-direction: column; gap: 1rem; }
    .loan-stat-bar-wrap { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.82rem; }
    .loan-stat-label { color: var(--text-secondary); }
    .loan-stat-count { font-weight: 600; }
    .loan-bar-bg { background: var(--surface-3); border-radius: 99px; height: 8px; overflow: hidden; }
    .loan-bar { height: 100%; border-radius: 99px; transition: width 1s ease; }

    @media (max-width: 1100px) {
      .content-grid { grid-template-columns: 1fr 1fr; }
      .span-2 { grid-column: span 2; }
    }
    @media (max-width: 700px) {
      .content-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      .kpi-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  borrowers = signal<Borrower[]>([]);
  pendingLoans = signal<Loan[]>([]);
  recentCreditResults = signal<CreditResult[]>([]);
  loading = signal(true);

  readonly totalAccounts = computed(() =>
    this.borrowers().reduce((s, b) => s + (b.account_information?.active_accounts || 0), 0)
  );
  readonly totalLoans = computed(() =>
    this.borrowers().reduce((s, b) => s + (b.loans?.filter(l => l.status === 'ACTIVE').length || 0), 0)
  );
  readonly totalBalance = computed(() =>
    this.borrowers().reduce((s, b) => s + (Number(b.account_information?.total_balance) || 0), 0)
  );
  readonly highRiskCount = computed(() =>
    this.recentCreditResults().filter(r => r.risk_level === 'HIGH').length
  );

  readonly loanStats = computed(() => {
    const allLoans = this.borrowers().flatMap(b => b.loans || []);
    const total = allLoans.length || 1;
    const statuses = ['ACTIVE', 'PENDING', 'PAID_OFF', 'DEFAULTED'];
    const colors = ['#1a56db', '#f59e0b', '#059669', '#dc2626'];
    return statuses.map((s, i) => {
      const count = allLoans.filter(l => l.status === s).length;
      return { label: s.replace('_', ' '), count, pct: Math.round(count / total * 100), color: colors[i] };
    }).filter(s => s.count > 0);
  });

  ngOnInit(): void {
    let done = 0;
    const total = 3;
    const checkDone = () => { if (++done === total) this.loading.set(false); };

    this.api.listBorrowers().subscribe({
      next: data => { this.borrowers.set(Array.isArray(data) ? data : []); checkDone(); },
      error: () => checkDone(),
    });

    this.api.listPendingLoans().subscribe({
      next: data => { this.pendingLoans.set(Array.isArray(data) ? data : []); checkDone(); },
      error: () => checkDone(),
    });

    this.api.getCreditResults().subscribe({
      next: data => { this.recentCreditResults.set(Array.isArray(data) ? data : []); checkDone(); },
      error: () => checkDone(),
    });
  }

  formatBalance(n: number): string {
    if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`;
    return `TZS ${n.toLocaleString()}`;
  }

  formatEmployment(s: string): string {
    const m: Record<string, string> = {
      EMPLOYED: 'Employed', SELF_EMPLOYED: 'Self-Employed',
      UNEMPLOYED: 'Unemployed', STUDENT: 'Student', RETIRED: 'Retired',
    };
    return m[s] ?? s;
  }

  scoreClass(score: number | null): string {
    if (!score) return 'score-na';
    if (score >= 700) return 'score-low';
    if (score >= 600) return 'score-medium';
    return 'score-high';
  }

  riskBadge(risk: string): string {
    const m: Record<string, string> = { LOW: 'badge-success', MEDIUM: 'badge-warning', HIGH: 'badge-danger' };
    return m[risk] ?? 'badge-neutral';
  }
}
