import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, LoanApplicationResponse } from '../services/api.service';

@Component({
  selector: 'app-borrower-apply-loan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-[760px]">
      <div class="mb-6">
        <a routerLink="/portal" class="btn btn-ghost btn-sm">Back to My Account</a>
        <h1 class="text-2xl mt-3 mb-1">Apply for a Loan</h1>
        <p class="text-ink-soft">Fill in the details below to submit your loan application. A bank officer will review and approve it.</p>
      </div>

      <!-- Success State -->
      <div *ngIf="result() as res" class="card text-center py-12 px-8 shadow-lg">
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold mb-4">OK</div>
        <h2 class="text-xl mb-2">Application Submitted!</h2>
        <p class="text-ink-soft mb-6">{{ res.message }}</p>
        <div class="bg-surface-2 rounded-xl p-5 max-w-[360px] mx-auto">
          <div class="flex justify-between py-2 border-b border-line text-[0.9rem]"><span>Loan ID</span><strong>{{ res.loan_id }}</strong></div>
          <div class="flex justify-between py-2 border-b border-line text-[0.9rem]"><span>Amount</span><strong>TZS {{ formatNum(res.amount) }}</strong></div>
          <div class="flex justify-between py-2 border-b border-line text-[0.9rem]"><span>Duration</span><strong>{{ res.duration_months }} months</strong></div>
          <div class="flex justify-between py-2 text-[0.9rem]"><span>Status</span><span class="badge badge-warning">{{ res.status }}</span></div>
        </div>
        <a routerLink="/portal" class="btn btn-primary mt-6">Return to My Account</a>
      </div>

      <!-- Application Form -->
      <div *ngIf="!result()" class="card p-8">
        <div *ngIf="error()" class="alert alert-danger">{{ error() }}</div>

        <form (ngSubmit)="onSubmit()" #f="ngForm">
          <div class="grid gap-5 md:grid-cols-2">
            <div class="form-group">
              <label class="form-label" for="amount">Loan Amount (TZS) *</label>
              <input
                id="amount" type="number" name="amount" [(ngModel)]="form.amount"
                class="form-control" placeholder="e.g. 500000" min="10000" max="50000000" required
              />
              <div class="form-hint text-xs text-muted mt-1">Minimum: TZS 10,000 · Maximum: TZS 50,000,000</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="duration">Loan Duration *</label>
              <select id="duration" name="duration" [(ngModel)]="form.duration_months" class="form-control" required>
                <option value="">Select duration…</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="36">36 months</option>
                <option value="48">48 months</option>
                <option value="60">60 months</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Loan Purpose *</label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                *ngFor="let p of purposes"
                class="border-2 rounded-lg py-3 text-center cursor-pointer text-[0.85rem] text-ink-soft transition"
                [class]="form.purpose === p.value
                  ? 'border-primary bg-primary-light text-primary font-semibold'
                  : 'border-line hover:border-primary hover:text-primary'"
                (click)="form.purpose = p.value"
              >
                {{ p.label }}
              </div>
            </div>
          </div>

          <!-- Indicative Summary -->
          <div *ngIf="form.amount && form.duration_months" class="bg-surface-2 border border-line rounded-xl p-5 my-5">
            <h3 class="text-[0.9rem] mb-3 text-ink-soft">Indicative Summary</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><div class="text-[0.72rem] text-muted uppercase mb-0.5">Loan Amount</div><div class="font-bold text-primary">TZS {{ formatNum(form.amount) }}</div></div>
              <div><div class="text-[0.72rem] text-muted uppercase mb-0.5">Est. Interest Rate</div><div class="font-bold text-primary">12% p.a.</div></div>
              <div><div class="text-[0.72rem] text-muted uppercase mb-0.5">Monthly Payment</div><div class="font-bold text-primary">TZS {{ formatNum(monthlyPayment) }}</div></div>
              <div><div class="text-[0.72rem] text-muted uppercase mb-0.5">Total Repayment</div><div class="font-bold text-primary">TZS {{ formatNum(totalRepayment) }}</div></div>
            </div>
            <p class="text-xs text-muted mt-3 mb-0">* These are indicative figures. Final terms will be confirmed upon approval.</p>
          </div>

          <div class="form-group">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" [(ngModel)]="agreeTerms" name="agreeTerms" required />
              I agree to the terms and conditions, and confirm the information provided is accurate.
            </label>
          </div>

          <button
            id="submit-loan-btn" type="submit"
            class="btn btn-primary btn-lg"
            [disabled]="loading() || !form.amount || !form.duration_months || !form.purpose || !agreeTerms"
          >
            <span *ngIf="loading()" class="spinner"></span>
            {{ loading() ? 'Submitting…' : 'Submit Loan Application' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class BorrowerApplyLoanComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  result = signal<LoanApplicationResponse | null>(null);
  agreeTerms = false;

  form = { amount: null as number | null, duration_months: '', purpose: '' };

  purposes = [
    { label: 'Home Improvement', value: 'HOME_IMPROVEMENT' },
    { label: 'Medical', value: 'MEDICAL' },
    { label: 'Education', value: 'EDUCATION' },
    { label: 'Business', value: 'BUSINESS' },
    { label: 'Vehicle', value: 'VEHICLE' },
    { label: 'Other', value: 'OTHER' },
  ];

  get monthlyPayment(): number {
    if (!this.form.amount || !this.form.duration_months) return 0;
    const r = 0.12 / 12;
    const n = Number(this.form.duration_months);
    const pmt = this.form.amount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return Math.round(pmt);
  }

  get totalRepayment(): number {
    return this.monthlyPayment * Number(this.form.duration_months);
  }

  formatNum(n: any): string {
    return Number(n).toLocaleString('en-TZ', { maximumFractionDigits: 0 });
  }

  onSubmit(): void {
    if (!this.form.amount || !this.form.duration_months || !this.form.purpose) return;
    this.loading.set(true);
    this.error.set('');

    this.api.portalApplyLoan({
      amount: this.form.amount,
      duration_months: Number(this.form.duration_months),
      purpose: this.form.purpose,
    }).subscribe({
      next: res => { this.result.set(res); this.loading.set(false); },
      error: err => {
        this.error.set(err.error?.detail || 'Application failed. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
