import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Repayment } from '../services/api.service';

@Component({
  selector: 'app-repayments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Repayments</h1>
      <p class="text-ink-soft mb-6">All loan repayments loaded from backend APIs.</p>

      <div class="py-8 text-center text-ink-soft" *ngIf="loading()">Loading repayments…</div>
      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <div class="table-wrap" *ngIf="!loading()">
        <table class="data-table">
          <thead>
            <tr>
              <th>Loan</th><th>Date</th><th>Due Date</th><th>Amount</th>
              <th>Days Overdue</th><th>Missed</th><th>Late</th><th>Status</th><th>Currency</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of repayments()">
              <td>{{ r.loan_reference }}</td>
              <td>{{ r.repayment_date | date:'shortDate' }}</td>
              <td>{{ r.due_date | date:'shortDate' }}</td>
              <td>{{ r.repayment_amount | number:'1.0-0' }}</td>
              <td [class.text-red-600]="r.days_overdue > 0">{{ r.days_overdue }}</td>
              <td>{{ r.missed_payments }}</td>
              <td>{{ r.late_payments }}</td>
              <td><span class="badge" [class]="r.default_status === 'CURRENT' ? 'badge-success' : 'badge-danger'">{{ r.default_status }}</span></td>
              <td>{{ r.currency }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!loading() && repayments().length === 0" class="empty-state">No repayments found.</p>
    </div>
  `,
})
export class RepaymentsComponent implements OnInit {
  repayments = signal<Repayment[]>([]);
  loading = signal(true);
  error = signal('');
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.listRepayments().subscribe({
      next: (data) => { this.repayments.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load repayments.'); this.loading.set(false); },
    });
  }
}
