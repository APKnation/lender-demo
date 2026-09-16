import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Transaction } from '../services/api.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Transactions</h1>
      <p class="subtitle">All transactions loaded from backend APIs.</p>

      <div class="loading" *ngIf="loading()">Loading transactions…</div>
      <div class="error" *ngIf="error()">{{ error() }}</div>

      <table class="data-table" *ngIf="!loading()">
        <thead>
          <tr><th>Transaction ID</th><th>Date</th><th>Type</th><th>Direction</th>
              <th>Amount</th><th>Balance After</th><th>Currency</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let t of transactions()">
            <td>{{ t.transaction_id }}</td>
            <td>{{ t.transaction_date | date:'short' }}</td>
            <td>{{ t.type }}</td>
            <td>{{ t.direction }}</td>
            <td>{{ t.amount | number:'1.0-0' }}</td>
            <td>{{ t.balance_after | number:'1.0-0' }}</td>
            <td>{{ t.currency }}</td>
            <td>{{ t.status }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading() && transactions().length === 0" class="no-results">No transactions found.</p>
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
export class TransactionsComponent implements OnInit {
  transactions = signal<Transaction[]>([]);
  loading = signal(true);
  error = signal('');
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.listTransactions().subscribe({
      next: (data) => { this.transactions.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load transactions.'); this.loading.set(false); },
    });
  }
}
