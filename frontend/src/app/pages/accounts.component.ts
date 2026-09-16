import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Account } from '../services/api.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Accounts</h1>
      <p class="subtitle">All accounts loaded from backend APIs.</p>

      <div class="loading" *ngIf="loading()">Loading accounts…</div>
      <div class="error" *ngIf="error()">{{ error() }}</div>

      <table class="data-table" *ngIf="!loading()">
        <thead>
          <tr><th>Reference</th><th>Name</th><th>Type</th><th>Status</th>
              <th>Balance</th><th>Savings</th><th>Currency</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let a of accounts()">
            <td>{{ a.account_reference }}</td>
            <td>{{ a.account_name }}</td>
            <td>{{ a.account_type }}</td>
            <td><span class="badge" [class.success]="a.status==='ACTIVE'">{{ a.status }}</span></td>
            <td>{{ a.balance | number:'1.0-0' }}</td>
            <td>{{ a.savings | number:'1.0-0' }}</td>
            <td>{{ a.currency }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading() && accounts().length === 0" class="no-results">No accounts found.</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .subtitle { color: #666; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; }
    .badge.success { background: #d4edda; color: #155724; }
    .loading, .error, .no-results { padding: 2rem; text-align: center; }
    .error { color: #e94560; }
    .no-results { color: #999; }
  `]
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
