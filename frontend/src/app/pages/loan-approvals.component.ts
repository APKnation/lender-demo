import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Loan } from '../services/api.service';

@Component({
  selector: 'app-loan-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Loan Approvals</h1>
      <p class="text-ink-soft mb-6">Review pending loan applications — approve or disallow according to bank requirements.</p>

      <div class="py-8 text-center text-ink-soft" *ngIf="loading()">Loading pending applications…</div>
      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <ng-container *ngIf="!loading()">
        <div class="table-wrap" *ngIf="loans().length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Loan ID</th><th>Borrower</th><th>Amount</th><th>Duration</th>
                <th>Rate</th><th>Purpose</th><th>Applied</th><th>Decision</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let l of loans()">
                <td><code class="text-xs bg-surface-3 px-1.5 py-0.5 rounded font-mono">{{ l.loan_id }}</code></td>
                <td>
                  {{ borrowerName(l) }}<br>
                  <small class="text-muted">{{ borrowerRefOf(l) }}</small>
                </td>
                <td>{{ formatNum(l.loan_amount) }} {{ l.currency }}</td>
                <td>{{ l.loan_duration_months }} months</td>
                <td>{{ l.interest_rate }}%</td>
                <td>{{ l.purpose || '—' }}</td>
                <td>{{ l.loan_date | date:'dd MMM yyyy' }}</td>
                <td class="flex gap-2">
                  <button class="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white" (click)="openReview(l, 'approve')">Approve</button>
                  <button class="btn btn-sm bg-red-600 hover:bg-red-700 text-white" (click)="openReview(l, 'reject')">Reject</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="loans().length === 0" class="empty-state">
          <p>No pending loan applications.</p>
        </div>
      </ng-container>

      <!-- Decision modal -->
      <div class="fixed inset-0 bg-black/45 flex items-center justify-center z-50" *ngIf="reviewing()">
        <div class="bg-surface rounded-2xl p-7 w-[92%] max-w-[460px] shadow-2xl">
          <h2 class="text-lg mb-1">{{ action() === 'approve' ? 'Approve Loan' : 'Reject Loan' }}</h2>
          <p class="text-ink-soft text-sm mb-4">
            <strong>{{ current()?.loan_id }}</strong> —
            TZS {{ formatNum(current()?.loan_amount || 0) }} over
            {{ current()?.loan_duration_months }} months
          </p>

          <label class="form-label">Decision note {{ action() === 'reject' ? '(reason required)' : '(optional)' }}</label>
          <textarea
            class="form-control resize-y"
            [(ngModel)]="notes"
            rows="3"
            placeholder="e.g. Meets bank requirements — income verified / Insufficient collateral"
          ></textarea>

          <div class="alert alert-danger mt-3" *ngIf="submitError()">{{ submitError() }}</div>

          <div class="flex justify-end gap-3 mt-5">
            <button class="btn btn-outline" (click)="closeReview()">Cancel</button>
            <button
              class="btn btn-lg text-white"
              [class.bg-emerald-600]="action() === 'approve'"
              [class.hover:bg-emerald-700]="action() === 'approve'"
              [class.bg-red-600]="action() === 'reject'"
              [class.hover:bg-red-700]="action() === 'reject'"
              (click)="submitReview()"
              [disabled]="submitting() || (action() === 'reject' && !notes().trim())"
            >
              {{ submitting() ? 'Submitting…' : (action() === 'approve' ? 'Confirm Approval' : 'Confirm Rejection') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Result toast -->
      <div
        *ngIf="resultMessage()"
        class="fixed bottom-6 right-6 px-5 py-3 rounded-lg text-sm text-white shadow-xl z-50"
        [class.bg-emerald-600]="!isError()"
        [class.bg-red-600]="isError()"
      >
        {{ resultMessage() }}
      </div>
    </div>
  `,
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
