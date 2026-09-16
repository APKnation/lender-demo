import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Loan } from '../services/api.service';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Loans</h1>
      <p class="subtitle">All loans loaded from backend APIs.</p>

      <div class="loading" *ngIf="loading()">Loading loans…</div>
      <div class="error" *ngIf="error()">{{ error() }}</div>

      <table class="data-table" *ngIf="!loading()">
        <thead>
          <tr><th>Loan ID</th><th>Account</th><th>Amount</th><th>Date</th>
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
            <td>{{ l.status }}</td>
            <td>{{ l.currency }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading() && loans().length === 0" class="no-results">No loans found.</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .subtitle { color: #666; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; font-size: 0.85rem; }
    .data-table th { background: #f8f9fa; }
    .loading, .error, .no-results { padding: 2rem; text-align: center; }
    .error { color: #e94560; }
    .no-results { color: #999; }
  `]
})
export class LoansComponent implements OnInit {  loans = signal<Loan[]>([]);
  loading = signal(true);
  error = signal('');
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.listLoans().subscribe({
      next: (data) => { this.loans.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load loans.'); this.loading.set(false); },
    });
  }
}
