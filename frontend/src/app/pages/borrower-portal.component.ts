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
    <div class="max-w-[1100px]">
      <!-- Loading -->
      <div *ngIf="loading()" class="loading-page">
        <div class="spinner w-8 h-8"></div>
        <p>Loading your account…</p>
      </div>

      <ng-container *ngIf="!loading() && borrower() as b">
        <!-- Welcome Banner -->
        <div class="flex items-center gap-5 bg-linear-to-r from-sidebar to-primary rounded-2xl p-8 mb-6 text-white">
          <div class="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
            {{ initials }}
          </div>
          <div>
            <h1 class="text-white text-2xl mb-0.5">Welcome, {{ b.full_name }}</h1>
            <p class="text-white/70 text-sm mb-0">Customer ID: {{ b.customer_id }} · {{ b.borrower_reference }}</p>
          </div>
          <a routerLink="/portal/apply-loan" class="btn btn-primary ml-auto">Apply for Loan</a>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="card text-center p-5">
            <div class="text-xl font-bold text-primary">{{ b.account_information?.total_accounts || 0 }}</div>
            <div class="text-xs text-ink-soft mt-1">Accounts</div>
          </div>
          <div class="card text-center p-5">
            <div class="text-xl font-bold text-primary">{{ activeLoans }}</div>
            <div class="text-xs text-ink-soft mt-1">Active Loans</div>
          </div>
          <div class="card text-center p-5">
            <div class="text-xl font-bold text-primary">TZS {{ formatNum(b.account_information?.total_balance || 0) }}</div>
            <div class="text-xs text-ink-soft mt-1">Total Balance</div>
          </div>
          <div class="card text-center p-5">
            <div class="text-xl font-bold text-primary">{{ b.employment_status }}</div>
            <div class="text-xs text-ink-soft mt-1">Employment</div>
          </div>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <!-- Personal Information -->
          <div class="card">
            <h2 class="text-base mb-4">Personal Information</h2>
            <div class="flex flex-col">
              <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Full Name</span><span>{{ b.full_name }}</span></div>
              <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Age</span><span>{{ b.age }}</span></div>
              <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Gender</span><span>{{ b.gender }}</span></div>
              <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Employment</span><span>{{ b.employment_status }}</span></div>
              <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Monthly Income</span><span>TZS {{ formatNum(b.income) }}</span></div>
              <div class="flex justify-between text-sm py-1.5"><span class="text-ink-soft font-medium">Currency</span><span>{{ b.currency }}</span></div>
            </div>

            <div *ngIf="b.business_information?.business_name" class="mt-5">
              <h3 class="text-[0.95rem] mb-2 text-ink-soft">Business Information</h3>
              <div class="flex flex-col">
                <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Business Name</span><span>{{ b.business_information.business_name }}</span></div>
                <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Type</span><span>{{ b.business_information.business_type }}</span></div>
                <div class="flex justify-between text-sm py-1.5 border-b border-line"><span class="text-ink-soft font-medium">Industry</span><span>{{ b.business_information.industry }}</span></div>
                <div class="flex justify-between text-sm py-1.5"><span class="text-ink-soft font-medium">Annual Revenue</span><span>TZS {{ formatNum(b.business_information.annual_revenue) }}</span></div>
              </div>
            </div>
          </div>

          <!-- Accounts -->
          <div class="card">
            <h2 class="text-base mb-4">My Accounts</h2>
            <div *ngFor="let acc of b.accounts" class="border border-line rounded-lg p-4 mb-3">
              <div class="flex justify-between items-start mb-3">
                <div>
                  <div class="font-semibold text-[0.9rem]">{{ acc.account_name }}</div>
                  <div class="text-xs text-muted">{{ acc.account_reference }}</div>
                </div>
                <span class="badge" [class]="acc.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'">{{ acc.status }}</span>
              </div>
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs text-ink-soft">Balance</span>
                <span class="text-lg font-bold text-primary">TZS {{ formatNum(acc.balance) }}</span>
              </div>
              <div class="text-xs text-muted flex gap-1.5">
                <span>{{ acc.account_type }}</span><span>·</span><span>Since {{ acc.customer_since }}</span>
              </div>
            </div>
            <div *ngIf="!b.accounts?.length" class="empty-state">
              <p>No accounts found</p>
            </div>
          </div>
        </div>

        <!-- Loans Section -->
        <div class="card mt-5">
          <div class="flex items-center justify-between">
            <h2 class="text-base mb-0">My Loans</h2>
            <a routerLink="/portal/apply-loan" class="btn btn-primary btn-sm">Apply for Loan</a>
          </div>

          <div class="table-wrap mt-4" *ngIf="b.loans?.length">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th><th>Amount</th><th>Outstanding</th><th>Duration</th>
                  <th>Interest</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let loan of b.loans">
                  <td><code class="text-xs font-mono">{{ loan.loan_id }}</code></td>
                  <td>TZS {{ formatNum(loan.loan_amount) }}</td>
                  <td>TZS {{ formatNum(loan.outstanding_balance) }}</td>
                  <td>{{ loan.loan_duration_months }} months</td>
                  <td>{{ loan.interest_rate }}%</td>
                  <td>{{ loan.loan_date }}</td>
                  <td><span class="badge" [class]="loanStatusBadge(loan.status)">{{ loan.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="!b.loans?.length" class="empty-state">
            <p>No loans yet. <a routerLink="/portal/apply-loan">Apply for your first loan</a>.</p>
          </div>
        </div>

        <!-- Repayment History -->
        <div class="card mt-5" *ngIf="b.repayments?.length">
          <h2 class="text-base mb-4">Repayment History</h2>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Loan</th><th>Amount Paid</th><th>Date</th><th>Due Date</th><th>Days Overdue</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of b.repayments">
                  <td><code class="text-xs font-mono">{{ r.loan_reference }}</code></td>
                  <td>TZS {{ formatNum(r.repayment_amount) }}</td>
                  <td>{{ r.repayment_date }}</td>
                  <td>{{ r.due_date }}</td>
                  <td [class.text-red-600]="r.days_overdue > 0">
                    {{ r.days_overdue > 0 ? r.days_overdue + ' days' : 'On time' }}
                  </td>
                  <td>
                    <span class="badge" [class]="r.default_status === 'CURRENT' ? 'badge-success' : 'badge-danger'">{{ r.default_status }}</span>
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
      REJECTED: 'badge-danger', PAID_OFF: 'badge-success', DEFAULTED: 'badge-danger',
    };
    return m[status] ?? 'badge-neutral';
  }
}
