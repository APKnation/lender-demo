import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Transaction } from '../services/api.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Transactions</h1>
      <p class="text-ink-soft mb-6">All transactions loaded from backend APIs.</p>

      <div class="py-8 text-center text-ink-soft" *ngIf="loading()">Loading transactions…</div>
      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <div class="table-wrap" *ngIf="!loading()">
        <table class="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th><th>Date</th><th>Type</th><th>Direction</th>
              <th>Amount</th><th>Balance After</th><th>Currency</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of transactions()">
              <td>{{ t.transaction_id }}</td>
              <td>{{ t.transaction_date | date:'short' }}</td>
              <td>{{ t.type }}</td>
              <td>
                <span class="badge" [class]="t.direction === 'CREDIT' ? 'badge-success' : 'badge-neutral'">{{ t.direction }}</span>
              </td>
              <td [class]="t.direction === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'">
                {{ t.amount | number:'1.0-0' }}
              </td>
              <td>{{ t.balance_after | number:'1.0-0' }}</td>
              <td>{{ t.currency }}</td>
              <td>{{ t.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!loading() && transactions().length === 0" class="empty-state">No transactions found.</p>
    </div>
  `,
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
