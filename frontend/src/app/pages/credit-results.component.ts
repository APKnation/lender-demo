import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, CreditResult } from '../services/api.service';

@Component({
  selector: 'app-credit-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Credit Results</h1>
      <p class="text-ink-soft mb-6">Credit score results received from the DAIRE Central System.</p>

      <div class="py-8 text-center text-ink-soft" *ngIf="loading()">Loading credit results…</div>

      <div class="table-wrap" *ngIf="!loading()">
        <table class="data-table">
          <thead>
            <tr>
              <th>Time</th><th>Borrower</th><th>Score</th><th>Reputation</th>
              <th>Risk</th><th>Ruleset</th><th>Model</th><th>Hash</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of results()">
              <td>{{ r.received_at | date:'short' }}</td>
              <td><code class="text-xs bg-surface-3 px-1.5 py-0.5 rounded font-mono">{{ r.borrower_reference }}</code></td>
              <td class="font-bold">{{ r.credit_score ?? 'N/A' }}</td>
              <td>{{ r.reputation }}</td>
              <td><span class="badge" [class]="riskBadge(r.risk_level)">{{ r.risk_level || '–' }}</span></td>
              <td>{{ r.ruleset_version }}</td>
              <td>{{ r.model_version }}</td>
              <td class="font-mono text-xs">{{ r.transaction_hash }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!loading() && results().length === 0" class="empty-state">No credit results found.</p>
    </div>
  `,
})
export class CreditResultsComponent implements OnInit {
  results = signal<CreditResult[]>([]);
  loading = signal(true);
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.getCreditResults().subscribe({
      next: (data) => { this.results.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  riskBadge(risk: string): string {
    const m: Record<string, string> = { LOW: 'badge-success', MEDIUM: 'badge-warning', HIGH: 'badge-danger' };
    return m[risk] ?? 'badge-neutral';
  }
}
