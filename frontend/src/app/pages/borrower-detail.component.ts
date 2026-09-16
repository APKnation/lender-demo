import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Borrower } from '../services/api.service';

@Component({
  selector: 'app-borrower-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8" *ngIf="borrower() as b">
      <div *ngIf="!loading()">
        <div class="flex items-center gap-4 mb-6">
          <h1 class="text-2xl mb-0">Borrower: {{ b.full_name }}</h1>
          <span class="badge" [class]="b.is_active ? 'badge-success' : 'badge-danger'">
            {{ b.is_active ? 'ACTIVE' : 'INACTIVE' }}
          </span>
        </div>

        <div class="grid gap-4 md:grid-cols-2 mb-4">
          <div class="card">
            <h2 class="text-base mb-4">Personal Information</h2>
            <table class="w-full text-sm">
              <tbody>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium w-48">Borrower Reference</th><td class="py-2">{{ b.borrower_reference }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Customer ID</th><td class="py-2">{{ b.customer_id }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Age</th><td class="py-2">{{ b.age }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Gender</th><td class="py-2">{{ b.gender }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Employment</th><td class="py-2">{{ b.employment_status }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Annual Income</th><td class="py-2">{{ b.income | number:'1.0-0' }} {{ b.currency }}</td></tr>
                <tr><th class="text-left py-2 pr-4 text-ink-soft font-medium">Currency</th><td class="py-2">{{ b.currency }}</td></tr>
              </tbody>
            </table>
          </div>

          <div class="card" *ngIf="b.business_information && hasData(b.business_information)">
            <h2 class="text-base mb-4">Business Information</h2>
            <table class="w-full text-sm">
              <tbody>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium w-48">Business Name</th><td class="py-2">{{ b.business_information.business_name }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Registration</th><td class="py-2">{{ b.business_information.registration_number }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Type</th><td class="py-2">{{ b.business_information.business_type }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Industry</th><td class="py-2">{{ b.business_information.industry }}</td></tr>
                <tr class="border-b border-line"><th class="text-left py-2 pr-4 text-ink-soft font-medium">Established</th><td class="py-2">{{ b.business_information.year_established }}</td></tr>
                <tr><th class="text-left py-2 pr-4 text-ink-soft font-medium">Annual Revenue</th><td class="py-2">{{ b.business_information.annual_revenue | number:'1.0-0' }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card mb-4">
          <h2 class="text-base mb-3">Account Summary</h2>
          <div class="grid gap-2 sm:grid-cols-3 text-sm">
            <p class="m-0">Total accounts: <strong>{{ b.account_information?.total_accounts || 0 }}</strong></p>
            <p class="m-0">Total balance: <strong>{{ b.account_information?.total_balance | number:'1.0-0' }} {{ b.currency }}</strong></p>
            <p class="m-0">Active accounts: <strong>{{ b.account_information?.active_accounts || 0 }}</strong></p>
          </div>
        </div>

        <div class="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <div class="card">
            <h2 class="text-base mb-4">Accounts ({{ b.accounts.length }})</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Reference</th><th>Name</th><th>Type</th><th>Status</th><th>Balance</th></tr></thead>
                <tbody>
                  <tr *ngFor="let a of b.accounts">
                    <td>{{ a.account_reference }}</td>
                    <td>{{ a.account_name }}</td>
                    <td>{{ a.account_type }}</td>
                    <td>{{ a.status }}</td>
                    <td>{{ a.balance | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <h2 class="text-base mb-4">Loans ({{ b.loans.length }})</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Loan ID</th><th>Amount</th><th>Rate</th><th>Outstanding</th><th>Status</th></tr></thead>
                <tbody>
                  <tr *ngFor="let l of b.loans">
                    <td>{{ l.loan_id }}</td>
                    <td>{{ l.loan_amount | number:'1.0-0' }}</td>
                    <td>{{ l.interest_rate }}%</td>
                    <td>{{ l.outstanding_balance | number:'1.0-0' }}</td>
                    <td>{{ l.status }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <h2 class="text-base mb-4">Transactions ({{ b.transactions.length }})</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Direction</th><th>Amount</th><th>Balance After</th><th>Description</th></tr></thead>
                <tbody>
                  <tr *ngFor="let t of b.transactions">
                    <td>{{ t.transaction_date | date:'short' }}</td>
                    <td>{{ t.type }}</td>
                    <td>{{ t.direction }}</td>
                    <td>{{ t.amount | number:'1.0-0' }}</td>
                    <td>{{ t.balance_after | number:'1.0-0' }}</td>
                    <td>{{ t.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card" *ngIf="b.repayments.length">
            <h2 class="text-base mb-4">Repayments ({{ b.repayments.length }})</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Loan</th><th>Date</th><th>Amount</th><th>Days Overdue</th><th>Status</th></tr></thead>
                <tbody>
                  <tr *ngFor="let r of b.repayments">
                    <td>{{ r.loan_reference }}</td>
                    <td>{{ r.repayment_date | date:'shortDate' }}</td>
                    <td>{{ r.repayment_amount | number:'1.0-0' }}</td>
                    <td>{{ r.days_overdue }}</td>
                    <td>{{ r.default_status }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="loading()" class="loading-page">Loading borrower data…</div>
    <div *ngIf="error()" class="alert alert-danger m-8">{{ error() }}</div>
  `,
})
export class BorrowerDetailComponent implements OnInit {
  borrower = signal<Borrower | null>(null);
  loading = signal(true);
  error = signal('');
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  ngOnInit(): void {
    const ref = this.route.snapshot.paramMap.get('reference');
    if (ref) {
      this.api.getBorrower(ref).subscribe({
        next: (data) => { this.borrower.set(data); this.loading.set(false); },
        error: () => { this.error.set('Borrower not found.'); this.loading.set(false); },
      });
    } else {
      this.loading.set(false);
    }
  }

  hasData(obj: any): boolean {
    return obj && Object.values(obj).some(v => v !== null && v !== undefined && v !== '');
  }
}
