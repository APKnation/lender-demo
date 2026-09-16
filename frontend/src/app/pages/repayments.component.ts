import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Repayment } from '../services/api.service';

@Component({
  selector: 'app-repayments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Repayments</h1>
      <p class="subtitle">All loan repayments loaded from backend APIs.</p>

      <div class="loading" *ngIf="loading">Loading repayments…</div>
      <div class="error" *ngIf="error">{{ error }}</div>

      <table class="data-table" *ngIf="!loading">
        <thead>
          <tr><th>Loan</th><th>Date</th><th>Due Date</th><th>Amount</th>
              <th>Days Overdue</th><th>Missed</th><th>Late</th><th>Status</th><th>Currency</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of repayments">
            <td>{{ r.loan_reference }}</td>
            <td>{{ r.repayment_date | date:'shortDate' }}</td>
            <td>{{ r.due_date | date:'shortDate' }}</td>
            <td>{{ r.repayment_amount | number:'1.0-0' }}</td>
            <td>{{ r.days_overdue }}</td>
            <td>{{ r.missed_payments }}</td>
            <td>{{ r.late_payments }}</td>
            <td>{{ r.default_status }}</td>
            <td>{{ r.currency }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading && repayments.length === 0" class="no-results">No repayments found.</p>
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
export class RepaymentsComponent implements OnInit {
  repayments: Repayment[] = [];
  loading = true;
  error = '';
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.listRepayments().subscribe({
      next: (data) => { this.repayments = data; this.loading = false; },
      error: () => { this.error = 'Failed to load repayments.'; this.loading = false; },
    });
  }
}
