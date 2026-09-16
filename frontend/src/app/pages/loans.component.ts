import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Loan } from '../services/api.service';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Loans</h1>
      <p class="text-ink-soft mb-6">All loans loaded from backend APIs.</p>

      <div class="py-8 text-center text-ink-soft" *ngIf="loading()">Loading loans…</div>
      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <div class="table-wrap" *ngIf="!loading()">
        <table class="data-table">
          <thead>
            <tr>
              <th>Loan ID</th><th>Account</th><th>Amount</th><th>Date</th>
              <th>Duration</th><th>Rate</th><th>Outstanding</th><th>Status</th><th>Currency</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of loans()">
              <td>{{ l.loan_id }}</td>
              <td>{{ l.account_reference }}</td>
              <td>{{ l.loan_amount | number:'1.0-0' }}</td>
              <td>{{ l.loan_date | date:'shortDate' }}</td>
              <td>{{ l.loan_duration_months }} months</td>
              <td>{{ l.interest_rate }}%</td>
              <td>{{ l.outstanding_balance | number:'1.0-0' }}</td>
              <td><span class="badge" [class]="statusBadge(l.status)">{{ l.status }}</span></td>
              <td>{{ l.currency }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!loading() && loans().length === 0" class="empty-state">No loans found.</p>
    </div>
  `,
})
export class LoansComponent implements OnInit {
  loans = signal<Loan[]>([]);
  loading = signal(true);
  error = signal('');
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.listLoans().subscribe({
      next: (data) => { this.loans.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load loans.'); this.loading.set(false); },
    });
  }

  statusBadge(status: string): string {
    const m: Record<string, string> = {
      ACTIVE: 'badge-success', PENDING: 'badge-warning',
      REJECTED: 'badge-danger', PAID_OFF: 'badge-info',
      DEFAULTED: 'badge-danger', CLOSED: 'badge-neutral',
    };
    return m[status] ?? 'badge-neutral';
  }
}
