import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Borrower } from '../services/api.service';

@Component({
  selector: 'app-borrowers',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Borrowers</h1>
      <p class="text-ink-soft mb-6">All borrowers loaded from backend APIs.</p>

      <div class="py-8 text-center text-ink-soft" *ngIf="loading()">Loading borrowers…</div>
      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <div class="table-wrap" *ngIf="!loading()">
        <table class="data-table">
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
                <span class="badge" [class]="b.is_active ? 'badge-success' : 'badge-danger'">
                  {{ b.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>{{ b.employment_status }}</td>
              <td>{{ b.income | number:'1.0-0' }}</td>
              <td>{{ b.currency }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!loading() && borrowers().length === 0" class="empty-state">No borrowers found.</p>
    </div>
  `,
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
