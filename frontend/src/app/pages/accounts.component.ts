import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Account } from '../services/api.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Accounts</h1>
      <p class="text-ink-soft mb-6">All accounts loaded from backend APIs.</p>

      <div class="py-8 text-center text-ink-soft" *ngIf="loading()">Loading accounts…</div>
      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <div class="table-wrap" *ngIf="!loading()">
        <table class="data-table">
          <thead>
            <tr>
              <th>Reference</th><th>Name</th><th>Type</th><th>Status</th>
              <th>Balance</th><th>Savings</th><th>Currency</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of accounts()">
              <td>{{ a.account_reference }}</td>
              <td>{{ a.account_name }}</td>
              <td>{{ a.account_type }}</td>
              <td><span class="badge" [class]="a.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'">{{ a.status }}</span></td>
              <td>{{ a.balance | number:'1.0-0' }}</td>
              <td>{{ a.savings | number:'1.0-0' }}</td>
              <td>{{ a.currency }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!loading() && accounts().length === 0" class="empty-state">No accounts found.</p>
    </div>
  `,
})
export class AccountsComponent implements OnInit {
  accounts = signal<Account[]>([]);
  loading = signal(true);
  error = signal('');
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.listAccounts().subscribe({
      next: (data) => { this.accounts.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load accounts.'); this.loading.set(false); },
    });
  }
}
