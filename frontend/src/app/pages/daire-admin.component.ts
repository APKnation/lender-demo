import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CreditResult } from '../services/api.service';

@Component({
  selector: 'app-daire-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1>DAIRE Central System</h1>
      <p class="subtitle">
        Send information to and receive information from the DAIRE Central System.
        Access is restricted to ADMIN users.
      </p>

      <div class="cards">
        <!-- Send / receive request -->
        <div class="card">
          <h2>Request Borrower Data</h2>
          <p class="hint">Sends a borrower-data request to the central system and displays the received response.</p>

          <label class="form-label">Borrower Reference</label>
          <input
            type="text"
            [(ngModel)]="borrowerRef"
            placeholder="e.g. BRW-TZ-1001"
            class="form-control"
          />

          <label class="form-label">Requested Fields <span class="text-muted">(comma-separated, optional)</span></label>
          <input
            type="text"
            [(ngModel)]="fieldsInput"
            placeholder="e.g. accounts, loans, repayments"
            class="form-control"
          />

          <button
            class="btn btn-primary"
            (click)="requestData()"
            [disabled]="!borrowerRef().trim() || sending()"
          >
            {{ sending() ? 'Requesting…' : 'Send Request' }}
          </button>

          <div class="error" *ngIf="requestError()">{{ requestError() }}</div>

          <div class="response" *ngIf="response()">
            <h3>Received Response</h3>
            <pre>{{ responseJson() }}</pre>
          </div>
        </div>

        <!-- Received credit results -->
        <div class="card">
          <h2>Received Credit Results</h2>
          <p class="hint">Credit results pushed to this subsystem by the DAIRE Central System.</p>

          <div class="loading" *ngIf="loadingResults()">Loading…</div>

          <table class="data-table" *ngIf="!loadingResults() && results().length > 0">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Score</th>
                <th>Reputation</th>
                <th>Risk</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of results()">
                <td><code class="ref">{{ r.borrower_reference }}</code></td>
                <td class="score">{{ r.credit_score ?? 'N/A' }}</td>
                <td>{{ r.reputation || '—' }}</td>
                <td>
                  <span class="badge" [class.badge-success]="r.risk_level === 'LOW'"
                        [class.badge-warning]="r.risk_level === 'MEDIUM'"
                        [class.badge-danger]="r.risk_level === 'HIGH'">
                    {{ r.risk_level || '—' }}
                  </span>
                </td>
                <td>{{ r.received_at | date:'dd MMM, HH:mm' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="empty" *ngIf="!loadingResults() && results().length === 0">
            No credit results received yet.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .subtitle { color: var(--text-secondary); margin-bottom: 1.25rem; max-width: 640px; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .card {
      background: var(--surface, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
      padding: 1.5rem;
    }
    .card h2 { font-size: 1rem; margin-bottom: 0.3rem; }
    .hint { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; }
    .form-label { display: block; font-size: 0.8rem; color: var(--text-secondary); margin: 0.75rem 0 0.3rem; }
    .form-control {
      width: 100%; padding: 0.55rem 0.75rem;
      border: 1px solid var(--border, #ddd); border-radius: 8px;
      font: inherit;
    }
    .btn { margin-top: 1rem; }
    .error { color: #dc2626; font-size: 0.85rem; margin-top: 0.75rem; }

    .response { margin-top: 1.25rem; }
    .response h3 { font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--text-secondary); }
    .response pre {
      background: var(--surface-3, #f6f8fa);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      padding: 0.9rem;
      font-size: 0.75rem;
      overflow: auto;
      max-height: 380px;
    }

    .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .data-table th, .data-table td { padding: 0.5rem 0.6rem; text-align: left; border-bottom: 1px solid var(--border, #eee); }
    .data-table th { background: var(--surface-3, #f8f9fa); }
    .ref { font-size: 0.72rem; background: var(--surface-3, #f1f3f5); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .score { font-weight: 700; }
    .badge { padding: 0.15rem 0.55rem; border-radius: 12px; font-size: 0.72rem; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .empty, .loading { padding: 2rem 0; color: var(--text-secondary); text-align: center; }

    @media (max-width: 1000px) { .cards { grid-template-columns: 1fr; } }
  `]
})
export class DaireAdminComponent implements OnInit {
  private api = inject(ApiService);

  borrowerRef = signal('');
  fieldsInput = signal('');
  sending = signal(false);
  requestError = signal('');
  response = signal<any>(null);

  results = signal<CreditResult[]>([]);
  loadingResults = signal(true);

  ngOnInit(): void {
    this.loadResults();
  }

  loadResults(): void {
    this.loadingResults.set(true);
    this.api.getCreditResults().subscribe({
      next: data => { this.results.set(Array.isArray(data) ? data : []); this.loadingResults.set(false); },
      error: () => { this.loadingResults.set(false); },
    });
  }

  requestData(): void {
    const fields = this.fieldsInput()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    this.sending.set(true);
    this.requestError.set('');
    this.response.set(null);

    this.api.daireRequestData(this.borrowerRef().trim(), fields).subscribe({
      next: data => { this.response.set(data); this.sending.set(false); this.loadResults(); },
      error: err => {
        this.sending.set(false);
        this.requestError.set(err.error?.detail || 'Request to the DAIRE Central System failed.');
      },
    });
  }

  responseJson(): string {
    return JSON.stringify(this.response(), null, 2);
  }
}
