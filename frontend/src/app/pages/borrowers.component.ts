import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Borrower } from '../services/api.service';

@Component({
  selector: 'app-borrowers',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Borrowers</h1>
      <p class="subtitle">All borrowers loaded from backend APIs.</p>

      <div class="loading" *ngIf="loading()">Loading borrowers…</div>
      <div class="error" *ngIf="error()">{{ error() }}</div>

      <table class="data-table" *ngIf="!loading()">
        <thead>
          <tr>
            <th>Borrower Ref</th><th>Customer ID</th><th>Name</th><th>Age</th>
            <th>Status</th><th>Employment</th><th>Income</th><th>Currency</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let b of borrowers()">
            <td><a [routerLink]="['/borrowers', b.borrower_reference]">{{ b.borrower_reference }}</a></td>
            <td>{{ b.customer_id }}</td>
            <td>{{ b.full_name }}</td>
            <td>{{ b.age }}</td>
            <td>
              <span class="badge" [class.success]="b.is_active" [class.danger]="!b.is_active">
                {{ b.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>{{ b.employment_status }}</td>
            <td>{{ b.income | number:'1.0-0' }}</td>
            <td>{{ b.currency }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading() && borrowers().length === 0" class="no-results">No borrowers found.</p>
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
    .badge.danger { background: #f8d7da; color: #721c24; }
    .loading, .error, .no-results { padding: 2rem; text-align: center; }
    .error { color: #e94560; }
    .no-results { color: #999; }
    a { color: #0f3460; }
  `]
})
export class BorrowersComponent implements OnInit {
  borrowers = signal<Borrower[]>([]);
  loading = signal(true);
  error = signal('');
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.listBorrowers().subscribe({
      next: (data) => { this.borrowers.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load borrowers.'); this.loading.set(false); },
    });
  }
}
