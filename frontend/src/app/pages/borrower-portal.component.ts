import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Borrower } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-borrower-portal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="portal-page">
      <!-- Loading -->
      <div *ngIf="loading()" class="loading-page">
        <div class="spinner" style="width:32px;height:32px;border-width:3px"></div>
        <p>Loading your account…</p>
      </div>

      <ng-container *ngIf="!loading() && borrower() as b">
        <!-- Welcome Banner -->
        <div class="welcome-banner">
          <div class="welcome-avatar">{{ initials }}</div>
          <div>
            <h1>Welcome, {{ b.full_name }}</h1>
            <p class="text-muted">Customer ID: {{ b.customer_id }} · {{ b.borrower_reference }}</p>
          </div>
          <a routerLink="/portal/apply-loan" class="btn btn-primary" style="margin-left:auto">
            + Apply for Loan
          </a>
        </div>

        <!-- Quick Stats -->
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-val">{{ b.account_information?.total_accounts || 0 }}</div>
            <div class="stat-lbl">Accounts</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">{{ activeLoans }}</div>
            <div class="stat-lbl">Active Loans</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">TZS {{ formatNum(b.account_information?.total_balance || 0) }}</div>
            <div class="stat-lbl">Total Balance</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">{{ b.employment_status }}</div>
            <div class="stat-lbl">Employment</div>
          </div>
        </div>

        <div class="two-col">
          <!-- Personal Information -->
          <div class="card">
            <h2 class="section-title">Personal Information</h2>
            <div class="info-grid">
              <div class="info-row"><span class="info-label">Full Name</span><span>{{ b.full_name }}</span></div>
              <div class="info-row"><span class="info-label">Age</span><span>{{ b.age }}</span></div>
              <div class="info-row"><span class="info-label">Gender</span><span>{{ b.gender }}</span></div>
              <div class="info-row"><span class="info-label">Employment</span><span>{{ b.employment_status }}</span></div>
              <div class="info-row"><span class="info-label">Monthly Income</span><span>TZS {{ formatNum(b.income) }}</span></div>
              <div class="info-row"><span class="info-label">Currency</span><span>{{ b.currency }}</span></div>
            </div>

            <div *ngIf="b.business_information?.business_name" style="margin-top:1.25rem">
              <h3 style="font-size:0.95rem;margin-bottom:0.75rem;color:var(--text-secondary)">Business Information</h3>
              <div class="info-grid">
                <div class="info-row"><span class="info-label">Business Name</span><span>{{ b.business_information.business_name }}</span></div>
                <div class="info-row"><span class="info-label">Type</span><span>{{ b.business_information.business_type }}</span></div>
                <div class="info-row"><span class="info-label">Industry</span><span>{{ b.business_information.industry }}</span></div>
                <div class="info-row"><span class="info-label">Annual Revenue</span><span>TZS {{ formatNum(b.business_information.annual_revenue) }}</span></div>
              </div>
            </div>
          </div>

          <!-- Accounts -->
          <div class="card">
            <h2 class="section-title">My Accounts</h2>
            <div *ngFor="let acc of b.accounts" class="account-card">
              <div class="account-header">
                <div>
                  <div class="account-name">{{ acc.account_name }}</div>
                  <div class="account-ref text-muted">{{ acc.account_reference }}</div>
                </div>
                <span class="badge" [class]="acc.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'">
                  {{ acc.status }}
                </span>
              </div>
              <div class="account-balance">
                <span class="bal-label">Balance</span>
                <span class="bal-value">TZS {{ formatNum(acc.balance) }}</span>
              </div>
              <div class="account-meta">
                <span>{{ acc.account_type }}</span>
                <span>·</span>
                <span>Since {{ acc.customer_since }}</span>
              </div>
            </div>
            <div *ngIf="!b.accounts?.length" class="empty-state">
              <div class="empty-icon">Ac</div><p>No accounts found</p>
            </div>
          </div>
        </div>

        <!-- Loans Section -->
        <div class="card" style="margin-top:1.25rem">
          <div class="section-header">
            <h2 class="section-title" style="margin-bottom:0">My Loans</h2>
            <a routerLink="/portal/apply-loan" class="btn btn-primary btn-sm">+ Apply for Loan</a>
          </div>

          <div *ngIf="b.loans?.length" class="table-wrap" style="margin-top:1rem">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Amount</th>
                  <th>Outstanding</th>
                  <th>Duration</th>
                  <th>Interest</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let loan of b.loans">
                  <td><code style="font-size:0.75rem">{{ loan.loan_id }}</code></td>
                  <td>TZS {{ formatNum(loan.loan_amount) }}</td>
                  <td>TZS {{ formatNum(loan.outstanding_balance) }}</td>
                  <td>{{ loan.loan_duration_months }} months</td>
                  <td>{{ loan.interest_rate }}%</td>
                  <td>{{ loan.loan_date }}</td>
                  <td>
                    <span class="badge" [class]="loanStatusBadge(loan.status)">{{ loan.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="!b.loans?.length" class="empty-state">
            <div class="empty-icon">Ln</div>
            <p>No loans yet. <a routerLink="/portal/apply-loan">Apply for your first loan</a>.</p>
          </div>
        </div>

        <!-- Repayment History -->
        <div class="card" style="margin-top:1.25rem" *ngIf="b.repayments?.length">
          <h2 class="section-title">Repayment History</h2>
          <div class="table-wrap" style="margin-top:1rem">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Loan</th>
                  <th>Amount Paid</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of b.repayments">
                  <td><code style="font-size:0.75rem">{{ r.loan_reference }}</code></td>
                  <td>TZS {{ formatNum(r.repayment_amount) }}</td>
                  <td>{{ r.repayment_date }}</td>
                  <td>{{ r.due_date }}</td>
                  <td [class]="r.days_overdue > 0 ? 'text-danger' : ''">
                    {{ r.days_overdue > 0 ? r.days_overdue + ' days' : 'On time' }}
                  </td>
                  <td>
                    <span class="badge" [class]="r.default_status === 'CURRENT' ? 'badge-success' : 'badge-danger'">
                      {{ r.default_status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <div *ngIf="!loading() && !borrower()" class="alert alert-danger">
        Could not load your account data. Please try again or contact support.
      </div>
    </div>
  `,
  styles: [`
    .portal-page { max-width: 1100px; }

    .welcome-banner {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      background: linear-gradient(135deg, #1e2235, #1a56db);
      border-radius: var(--radius-lg);
      padding: 1.75rem 2rem;
      margin-bottom: 1.5rem;
      color: #fff;
    }
    .welcome-avatar {
      width: 60px; height: 60px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }
    .welcome-banner h1 { color: #fff; font-size: 1.4rem; margin-bottom: 0.25rem; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .stat-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      text-align: center;
      box-shadow: var(--shadow-sm);
    }
    .stat-val { font-size: 1.3rem; font-weight: 700; color: var(--primary); }
    .stat-lbl { font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

    .section-title { font-size: 1rem; margin-bottom: 1rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; }

    .info-grid { display: flex; flex-direction: column; gap: 0.6rem; }
    .info-row { display: flex; justify-content: space-between; font-size: 0.875rem; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: var(--text-secondary); font-weight: 500; }

    .account-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    .account-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .account-name { font-weight: 600; font-size: 0.9rem; }
    .account-ref { font-size: 0.75rem; }
    .account-balance { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .bal-label { font-size: 0.78rem; color: var(--text-secondary); }
    .bal-value { font-size: 1.1rem; font-weight: 700; color: var(--primary); }
    .account-meta { font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.4rem; }

    @media (max-width: 768px) {
      .two-col { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: 1fr 1fr; }
      .welcome-banner { flex-direction: column; text-align: center; }
    }
  `]
})
export class BorrowerPortalComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  borrower = signal<Borrower | null>(null);
  loading = signal(true);

  get initials(): string {
    const name = this.auth.userFullName() || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  }

  get activeLoans(): number {
    return this.borrower()?.loans?.filter(l => l.status === 'ACTIVE').length ?? 0;
  }

  ngOnInit(): void {
    this.api.portalMe().subscribe({
      next: data => { this.borrower.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  formatNum(n: any): string {
    const num = Number(n);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-TZ', { maximumFractionDigits: 0 });
  }

  loanStatusBadge(status: string): string {
    const m: Record<string, string> = {
      ACTIVE: 'badge-info', PENDING: 'badge-warning',
      PAID_OFF: 'badge-success', DEFAULTED: 'badge-danger',
    };
    return m[status] ?? 'badge-neutral';
  }
}
