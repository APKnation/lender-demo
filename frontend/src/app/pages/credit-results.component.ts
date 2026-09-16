import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, CreditResult } from '../services/api.service';

@Component({
  selector: 'app-credit-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Credit Results</h1>
      <p class="subtitle">Credit score results received from the DAIRE Central System.</p>

      <div class="loading" *ngIf="loading">Loading credit results…</div>
      <table class="data-table" *ngIf="!loading">
        <thead>
          <tr><th>Time</th><th>Borrower</th><th>Score</th><th>Reputation</th>
              <th>Risk</th><th>Ruleset</th><th>Model</th><th>Hash</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of results">
            <td>{{ r.received_at | date:'short' }}</td>
            <td>{{ r.borrower_reference }}</td>
            <td>{{ r.credit_score }}</td>
            <td>{{ r.reputation }}</td>
            <td>{{ r.risk_level }}</td>
            <td>{{ r.ruleset_version }}</td>
            <td>{{ r.model_version }}</td>
            <td>{{ r.transaction_hash }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading && results.length === 0" class="no-results">No credit results found.</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .subtitle { color: #666; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
    .data-table th, .data-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; }
    .data-table td { font-family: monospace; font-size: 0.8rem; }
    .loading { color: #666; padding: 2rem; }
    .no-results { color: #999; padding: 1rem; text-align: center; }
  `]
})
export class CreditResultsComponent implements OnInit {
  results: CreditResult[] = [];
  loading = true;
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.getCreditResults().subscribe({
      next: (data) => { this.results = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
