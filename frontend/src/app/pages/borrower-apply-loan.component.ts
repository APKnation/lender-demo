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
    <div class="apply-page">
      <div class="apply-header">
        <a routerLink="/portal" class="btn btn-ghost btn-sm">← Back to My Account</a>
        <h1>Apply for a Loan</h1>
        <p class="text-muted">Fill in the details below to submit your loan application. A bank officer will review and approve it.</p>
      </div>

      <!-- Success State -->
      <div *ngIf="result() as res" class="result-card">
        <div class="result-icon">✅</div>
        <h2>Application Submitted!</h2>
        <p>{{ res.message }}</p>
        <div class="result-details">
          <div class="result-row"><span>Loan ID</span><strong>{{ res.loan_id }}</strong></div>
          <div class="result-row"><span>Amount</span><strong>TZS {{ formatNum(res.amount) }}</strong></div>
          <div class="result-row"><span>Duration</span><strong>{{ res.duration_months }} months</strong></div>
          <div class="result-row"><span>Status</span><span class="badge badge-warning">{{ res.status }}</span></div>
        </div>
        <a routerLink="/portal" class="btn btn-primary" style="margin-top:1.5rem">Return to My Account</a>
      </div>

      <!-- Application Form -->
      <div *ngIf="!result()" class="apply-card card">
        <div *ngIf="error()" class="alert alert-danger">{{ error() }}</div>

        <form (ngSubmit)="onSubmit()" #f="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Loan Amount (TZS) *</label>
              <input
                id="amount"
                type="number"
                name="amount"
                [(ngModel)]="form.amount"
                class="form-control"
                placeholder="e.g. 500000"
                min="10000"
                max="50000000"
                required
              />
              <div class="form-hint">Minimum: TZS 10,000 · Maximum: TZS 50,000,000</div>
            </div>

            <div class="form-group">
              <label class="form-label">Loan Duration *</label>
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
            <div class="purpose-grid">
              <div
                *ngFor="let p of purposes"
                class="purpose-option"
                [class.selected]="form.purpose === p.value"
                (click)="form.purpose = p.value"
              >
                <span class="purpose-icon">{{ p.icon }}</span>
                <span>{{ p.label }}</span>
              </div>
            </div>
          </div>

          <!-- Indicative Summary -->
          <div *ngIf="form.amount && form.duration_months" class="loan-summary">
            <h3>Indicative Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="s-label">Loan Amount</div>
                <div class="s-val">TZS {{ formatNum(form.amount) }}</div>
              </div>
              <div class="summary-item">
                <div class="s-label">Est. Interest Rate</div>
                <div class="s-val">12% p.a.</div>
              </div>
              <div class="summary-item">
                <div class="s-label">Monthly Payment</div>
                <div class="s-val">TZS {{ formatNum(monthlyPayment) }}</div>
              </div>
              <div class="summary-item">
                <div class="s-label">Total Repayment</div>
                <div class="s-val">TZS {{ formatNum(totalRepayment) }}</div>
              </div>
            </div>
            <p class="summary-note">* These are indicative figures. Final terms will be confirmed upon approval.</p>
          </div>

          <div class="form-group">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.875rem">
              <input type="checkbox" [(ngModel)]="agreeTerms" name="agreeTerms" required />
              I agree to the terms and conditions, and confirm the information provided is accurate.
            </label>
          </div>

          <button
            id="submit-loan-btn"
            type="submit"
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
  styles: [`
    .apply-page { max-width: 760px; }

    .apply-header { margin-bottom: 1.5rem; }
    .apply-header h1 { font-size: 1.5rem; margin: 0.75rem 0 0.5rem; }

    .apply-card { padding: 2rem; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .form-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

    .purpose-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }
    .purpose-option {
      border: 2px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.75rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .purpose-option:hover { border-color: var(--primary); color: var(--primary); }
    .purpose-option.selected { border-color: var(--primary); background: var(--primary-light); color: var(--primary); font-weight: 600; }
    .purpose-icon { display: block; font-size: 1.5rem; margin-bottom: 0.4rem; }

    .loan-summary {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin: 1.25rem 0;
    }
    .loan-summary h3 { font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-secondary); }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .s-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
    .s-val { font-size: 1rem; font-weight: 700; color: var(--primary); }
    .summary-note { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.75rem; margin-bottom: 0; }

    /* Result Card */
    .result-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 3rem 2rem;
      text-align: center;
      box-shadow: var(--shadow);
    }
    .result-icon { font-size: 4rem; margin-bottom: 1rem; }
    .result-card h2 { margin-bottom: 0.5rem; }
    .result-card > p { color: var(--text-secondary); margin-bottom: 1.5rem; }
    .result-details { background: var(--surface-2); border-radius: var(--radius); padding: 1.25rem; max-width: 360px; margin: 0 auto; }
    .result-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    .result-row:last-child { border-bottom: none; }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .purpose-grid { grid-template-columns: repeat(2, 1fr); }
      .summary-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
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
    { icon: '🏠', label: 'Home Improvement', value: 'HOME_IMPROVEMENT' },
    { icon: '🏥', label: 'Medical', value: 'MEDICAL' },
    { icon: '📚', label: 'Education', value: 'EDUCATION' },
    { icon: '💼', label: 'Business', value: 'BUSINESS' },
    { icon: '🚗', label: 'Vehicle', value: 'VEHICLE' },
    { icon: '📦', label: 'Other', value: 'OTHER' },
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
