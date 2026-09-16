import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, AuditLog } from '../services/api.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1>Audit Logs</h1>
      <p class="subtitle">Complete audit trail of all security-relevant events.</p>

      <div class="filters">
        <input type="text" placeholder="Borrower reference…" [(ngModel)]="filters.borrower_reference" />
        <input type="text" placeholder="Action…" [(ngModel)]="filters.action" />
        <input type="text" placeholder="Status…" [(ngModel)]="filters.status" />
        <button (click)="load()">Filter</button>
      </div>

      <div class="loading" *ngIf="loading">Loading audit logs…</div>
      <table class="data-table" *ngIf="!loading">
        <thead>
          <tr><th>Timestamp</th><th>Action</th><th>Status</th><th>Borrower</th>
              <th>Identity</th><th>IP</th><th>Request ID</th><th>Correlation ID</th><th>Error</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let log of logs">
            <td>{{ log.timestamp | date:'short' }}</td>
            <td>{{ log.action }}</td>
            <td><span class="badge" [class.success]="log.status==='SUCCESS'" [class.danger]="log.status==='FAILURE'">{{ log.status }}</span></td>
            <td>{{ log.borrower_reference || '–' }}</td>
            <td>{{ log.identity || '–' }}</td>
            <td>{{ log.source_ip || '–' }}</td>
            <td>{{ log.request_id || '–' }}</td>
            <td>{{ log.correlation_id || '–' }}</td>
            <td>{{ log.error_message || '' }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading && logs.length === 0" class="no-results">No audit logs found.</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .subtitle { color: #666; }
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .filters input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 180px; }
    .filters button { padding: 0.5rem 1rem; background: #0f3460; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
    .data-table th, .data-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; }
    .badge.success { background: #d4edda; color: #155724; }
    .badge.danger { background: #f8d7da; color: #721c24; }
    .loading { color: #666; padding: 2rem; }
    .no-results { color: #999; text-align: center; }
  `]
})
export class AuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  loading = true;
  filters: Record<string, string> = {};
  private api = inject(ApiService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getAuditLogs(this.filters).subscribe({
      next: (data) => { this.logs = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
