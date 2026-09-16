import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CreditResult } from '../services/api.service';

@Component({
  selector: 'app-daire-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">DAIRE Central System</h1>
      <p class="text-ink-soft mb-6 max-w-[640px]">
        Send information to and receive information from the DAIRE Central System.
        Access is restricted to ADMIN users.
      </p>

      <div class="grid gap-5 grid-cols-1 lg:grid-cols-2">
        <!-- Send / receive request -->
        <div class="card">
          <h2 class="text-base mb-1">Request Borrower Data</h2>
          <p class="text-ink-soft text-xs mb-4">Sends a borrower-data request to the central system and displays the received response.</p>

          <label class="form-label">Borrower Reference</label>
          <input type="text" class="form-control" [(ngModel)]="borrowerRef" placeholder="e.g. BRW-TZ-1001" />

          <label class="form-label mt-3">
            Requested Fields <span class="text-muted">(comma-separated, optional)</span>
          </label>
          <input type="text" class="form-control" [(ngModel)]="fieldsInput" placeholder="e.g. accounts, loans, repayments" />

          <button class="btn btn-primary mt-4" (click)="requestData()" [disabled]="!borrowerRef().trim() || sending()">
            {{ sending() ? 'Requesting…' : 'Send Request' }}
          </button>

          <div class="alert alert-danger mt-4 mb-0" *ngIf="requestError()">{{ requestError() }}</div>

          <div class="mt-5" *ngIf="response()">
            <h3 class="text-sm text-ink-soft mb-2">Received Response</h3>
            <pre class="bg-surface-3 border border-line rounded-lg p-3.5 text-xs overflow-auto max-h-[380px] font-mono">{{ responseJson() }}</pre>
          </div>
        </div>

        <!-- Received credit results -->
        <div class="card">
          <h2 class="text-base mb-1">Received Credit Results</h2>
          <p class="text-ink-soft text-xs mb-4">Credit results pushed to this subsystem by the DAIRE Central System.</p>

          <div class="py-8 text-center text-ink-soft" *ngIf="loadingResults()">Loading…</div>

          <div class="table-wrap" *ngIf="!loadingResults() && results().length > 0">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Borrower</th><th>Score</th><th>Reputation</th><th>Risk</th><th>Received</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of results()">
                  <td><code class="text-xs bg-surface-3 px-1.5 py-0.5 rounded font-mono">{{ r.borrower_reference }}</code></td>
                  <td class="font-bold">{{ r.credit_score ?? 'N/A' }}</td>
                  <td>{{ r.reputation || '—' }}</td>
                  <td><span class="badge" [class]="riskBadge(r.risk_level)">{{ r.risk_level || '—' }}</span></td>
                  <td>{{ r.received_at | date:'dd MMM, HH:mm' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="py-8 text-center text-ink-soft" *ngIf="!loadingResults() && results().length === 0">
            No credit results received yet.
          </div>
        </div>
      </div>
    </div>
  `,
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
    const fields = this.fieldsInput().split(',').map(s => s.trim()).filter(Boolean);

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

  riskBadge(risk: string): string {
    const m: Record<string, string> = { LOW: 'badge-success', MEDIUM: 'badge-warning', HIGH: 'badge-danger' };
    return m[risk] ?? 'badge-neutral';
  }
}
