import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Loan } from '../services/api.service';

@Component({
  selector: 'app-loan-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <h1>Loan Approvals</h1>
      <p class="subtitle">Review pending loan applications — approve or disallow according to bank requirements.</p>

      <div class="loading" *ngIf="loading()">Loading pending applications…</div>
      <div class="error" *ngIf="error()">{{ error() }}</div>

      <ng-container *ngIf="!loading()">
        <table class="data-table" *ngIf="loans().length > 0">
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Borrower</th>
              <th>Amount</th>
              <th>Duration</th>
              <th>Rate</th>
              <th>Purpose</th>
              <th>Applied</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of loans()">
              <td><code class="ref">{{ l.loan_id }}</code></td>
              <td>
                <a [routerLink]="['/borrowers', l.account_reference ? borrowerRefOf(l) : '']">{{ borrowerName(l) }}</a><br>
                <small class="text-muted">{{ borrowerRefOf(l) }}</small>
              </td>
              <td>{{ formatNum(l.loan_amount) }} {{ l.currency }}</td>
              <td>{{ l.loan_duration_months }} months</td>
              <td>{{ l.interest_rate }}%</td>
              <td>{{ l.purpose || '—' }}</td>
              <td>{{ l.loan_date | date:'dd MMM yyyy' }}</td>
              <td class="actions">
                <button class="btn btn-approve btn-sm" (click)="openReview(l, 'approve')">Approve</button>
                <button class="btn btn-reject btn-sm" (click)="openReview(l, 'reject')">Reject</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="loans().length === 0" class="empty-state">
          <p>No pending loan applications.</p>
        </div>
      </ng-container>

      <!-- Decision modal -->
      <div class="modal-backdrop" *ngIf="reviewing()">
        <div class="modal">
          <h2>{{ action() === 'approve' ? 'Approve Loan' : 'Reject Loan' }}</h2>
          <p class="modal-sub">
            <strong>{{ current()?.loan_id }}</strong> —
            TZS {{ formatNum(current()?.loan_amount || 0) }} over
            {{ current()?.loan_duration_months }} months
          </p>

          <label class="form-label">Decision note {{ action() === 'reject' ? '(reason required)' : '(optional)' }}</label>
          <textarea
            [(ngModel)]="notes"
            rows="3"
            placeholder="e.g. Meets bank requirements — income verified / Insufficient collateral"
          ></textarea>

          <div class="error" *ngIf="submitError()">{{ submitError() }}</div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="closeReview()">Cancel</button>
            <button
              class="btn btn-lg"
              [class.btn-approve]="action() === 'approve'"
              [class.btn-reject]="action() === 'reject'"
              (click)="submitReview()"
              [disabled]="submitting() || (action() === 'reject' && !notes().trim())"
            >
              {{ submitting() ? 'Submitting…' : (action() === 'approve' ? 'Confirm Approval' : 'Confirm Rejection') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Result banner -->
      <div class="toast" *ngIf="resultMessage()" [class.toast-error]="isError()">
        {{ resultMessage() }}
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .subtitle { color: var(--text-secondary); margin-bottom: 1.25rem; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .data-table th, .data-table td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    .data-table th { background: var(--surface-3, #f8f9fa); }
    .ref { font-size: 0.75rem; background: var(--surface-3, #f1f3f5); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .actions { display: flex; gap: 0.4rem; }
    .btn-approve { background: #059669; color: #fff; }
    .btn-approve:hover { background: #047857; }
    .btn-reject { background: #dc2626; color: #fff; }
    .btn-reject:hover { background: #b91c1c; }
    .loading, .error { padding: 1rem 0; }
    .error { color: #dc2626; }
    .empty-state { padding: 3rem; text-align: center; color: var(--text-secondary); }

    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--surface, #fff);
      border-radius: 12px;
      padding: 1.75rem;
      width: 92%; max-width: 460px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal h2 { font-size: 1.15rem; margin-bottom: 0.4rem; }
    .modal-sub { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem; }
    textarea {
      width: 100%; border: 1px solid var(--border, #ddd); border-radius: 8px;
      padding: 0.6rem; font: inherit; resize: vertical;
    }
    .form-label { display: block; font-size: 0.8rem; color: var(--text-secondary); margin: 0.75rem 0 0.3rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1.1rem; }

    .toast {
      position: fixed; bottom: 1.5rem; right: 1.5rem;
      background: #059669; color: #fff;
      padding: 0.8rem 1.2rem; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      font-size: 0.85rem;
      z-index: 1100;
    }
    .toast-error { background: #dc2626; }
  `]
})
export class LoanApprovalsComponent implements OnInit {
  private api = inject(ApiService);

  loans = signal<Loan[]>([]);
  loading = signal(true);
  error = signal('');

  reviewing = signal(false);
  current = signal<Loan | null>(null);
  action = signal<'approve' | 'reject'>('approve');
  notes = signal('');
  submitting = signal(false);
  submitError = signal('');

  resultMessage = signal('');
  isError = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listPendingLoans().subscribe({
      next: data => { this.loans.set(Array.isArray(data) ? data : []); this.loading.set(false); },
      error: () => { this.error.set('Failed to load pending loan applications.'); this.loading.set(false); },
    });
  }

  openReview(loan: Loan, action: 'approve' | 'reject'): void {
    this.current.set(loan);
    this.action.set(action);
    this.notes.set('');
    this.submitError.set('');
    this.reviewing.set(true);
  }

  closeReview(): void {
    this.reviewing.set(false);
    this.current.set(null);
  }

  submitReview(): void {
    const loan = this.current();
    if (!loan) return;

    if (this.action() === 'reject' && !this.notes().trim()) {
      this.submitError.set('A rejection reason is required.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');

    this.api.reviewLoan(loan.loan_id, this.action(), this.notes()).subscribe({
      next: resp => {
        this.submitting.set(false);
        this.reviewing.set(false);
        this.showToast(resp.detail, false);
        this.loans.update(list => list.filter(l => l.loan_id !== loan.loan_id));
      },
      error: err => {
        this.submitting.set(false);
        this.submitError.set(err.error?.detail || 'Review failed. Please try again.');
      },
    });
  }

  showToast(message: string, isError: boolean): void {
    this.resultMessage.set(message);
    this.isError.set(isError);
    setTimeout(() => this.resultMessage.set(''), 4000);
  }

  borrowerName(loan: Loan): string {
    return (loan as any).borrower_name || 'Borrower';
  }

  borrowerRefOf(loan: Loan): string {
    return (loan as any).borrower_reference || '';
  }

  formatNum(n: any): string {
    return Number(n).toLocaleString('en-TZ', { maximumFractionDigits: 0 });
  }
}
