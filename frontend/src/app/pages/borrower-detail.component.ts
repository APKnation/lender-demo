import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Borrower } from '../services/api.service';

@Component({
  selector: 'app-borrower-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page" *ngIf="borrower && !loading">
      <h1>Borrower: {{ borrower.full_name }}</h1>
      <span class="badge" [class.success]="borrower.is_active" [class.danger]="!borrower.is_active">
        {{ borrower.is_active ? 'ACTIVE' : 'INACTIVE' }}
      </span>

      <div class="grid-2">
        <div class="card">
          <h2>Personal Information</h2>
          <table class="info-table">
            <tr><th>Borrower Reference</th><td>{{ borrower.borrower_reference }}</td></tr>
            <tr><th>Customer ID</th><td>{{ borrower.customer_id }}</td></tr>
            <tr><th>Age</th><td>{{ borrower.age }}</td></tr>
            <tr><th>Gender</th><td>{{ borrower.gender }}</td></tr>
            <tr><th>Employment</th><td>{{ borrower.employment_status }}</td></tr>
            <tr><th>Annual Income</th><td>{{ borrower.income | number:'1.0-0' }} {{ borrower.currency }}</td></tr>
            <tr><th>Currency</th><td>{{ borrower.currency }}</td></tr>
          </table>
        </div>

        <div class="card" *ngIf="borrower.business_information && hasData(borrower.business_information)">
          <h2>Business Information</h2>
          <table class="info-table">
            <tr><th>Business Name</th><td>{{ borrower.business_information.business_name }}</td></tr>
            <tr><th>Registration</th><td>{{ borrower.business_information.registration_number }}</td></tr>
            <tr><th>Type</th><td>{{ borrower.business_information.business_type }}</td></tr>
            <tr><th>Industry</th><td>{{ borrower.business_information.industry }}</td></tr>
            <tr><th>Established</th><td>{{ borrower.business_information.year_established }}</td></tr>
            <tr><th>Annual Revenue</th><td>{{ borrower.business_information.annual_revenue | number:'1.0-0' }}</td></tr>
          </table>
        </div>
      </div>

      <div class="card">
        <h2>Account Summary</h2>
        <p>Total accounts: {{ borrower.account_information?.total_accounts || 0 }}</p>
        <p>Total balance: {{ borrower.account_information?.total_balance | number:'1.0-0' }} {{ borrower.currency }}</p>
        <p>Active accounts: {{ borrower.account_information?.active_accounts || 0 }}</p>
      </div>

      <div class="sections-grid">
        <div class="card">
          <h2>Accounts ({{ borrower.accounts.length }})</h2>
          <table class="data-table">
            <thead><tr><th>Reference</th><th>Name</th><th>Type</th><th>Status</th><th>Balance</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of borrower.accounts">
                <td>{{ a.account_reference }}</td>
                <td>{{ a.account_name }}</td>
                <td>{{ a.account_type }}</td>
                <td>{{ a.status }}</td>
                <td>{{ a.balance | number:'1.0-0' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <h2>Loans ({{ borrower.loans.length }})</h2>
          <table class="data-table">
            <thead><tr><th>Loan ID</th><th>Amount</th><th>Rate</th><th>Outstanding</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of borrower.loans">
                <td>{{ l.loan_id }}</td>
                <td>{{ l.loan_amount | number:'1.0-0' }}</td>
                <td>{{ l.interest_rate }}%</td>
                <td>{{ l.outstanding_balance | number:'1.0-0' }}</td>
                <td>{{ l.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <h2>Transactions ({{ borrower.transactions.length }})</h2>
          <table class="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Direction</th><th>Amount</th><th>Balance After</th><th>Description</th></tr></thead>
            <tbody>
              <tr *ngFor="let t of borrower.transactions">
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

        <div class="card" *ngIf="borrower.repayments.length">
          <h2>Repayments ({{ borrower.repayments.length }})</h2>
          <table class="data-table">
            <thead><tr><th>Loan</th><th>Date</th><th>Amount</th><th>Days Overdue</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of borrower.repayments">
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

    <div *ngIf="loading" class="loading">Loading borrower data…</div>
    <div *ngIf="error" class="error">{{ error }}</div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .badge { padding: 0.3rem 0.8rem; border-radius: 12px; font-weight: bold; }
    .badge.success { background: #d4edda; color: #155724; }
    .badge.danger { background: #f8d7da; color: #721c24; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 1rem; }
    .info-table { width: 100%; }
    .info-table tr { border-bottom: 1px solid #eee; }
    .info-table th, .info-table td { padding: 0.5rem; text-align: left; }
    .sections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1rem; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; font-size: 0.85rem; }
    .loading { color: #666; padding: 2rem; }
    .error { color: #e94560; padding: 1rem; }
  `]
})
export class BorrowerDetailComponent implements OnInit {
  borrower: Borrower | null = null;
  loading = true;
  error = '';
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  ngOnInit(): void {
    const ref = this.route.snapshot.paramMap.get('reference');
    if (ref) {
      this.api.getBorrower(ref).subscribe({
        next: (data) => { this.borrower = data; this.loading = false; },
        error: (err) => { this.error = 'Borrower not found.'; this.loading = false; },
      });
    }
  }

  hasData(obj: any): boolean {
    return obj && Object.values(obj).some(v => v !== null && v !== undefined && v !== '');
  }
}
