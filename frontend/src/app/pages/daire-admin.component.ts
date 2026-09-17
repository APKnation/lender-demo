import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CreditResult, DataExchangeLogEntry } from '../services/api.service';

@Component({
  selector: 'app-daire-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-8">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-ink mb-1">DAIRE Central System</h1>
          <p class="text-sm text-ink-soft max-w-[640px]">
            Push institution data to DAIRE for merging, and pull data or credit results from it.
            Access is restricted to ADMIN users.
          </p>
        </div>
        <span class="badge badge-info w-fit">ADMIN only</span>
      </div>

      <div class="stagger space-y-6">
        <!-- Push / Pull cards -->
        <div class="grid gap-5 grid-cols-1 lg:grid-cols-2">
          <!-- PUSH -->
          <div class="card border-l-4 border-l-emerald-500">
            <div class="flex items-center gap-2.5 mb-1">
              <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">Pu</span>
              <h2 class="text-base mb-0">Push Data to DAIRE</h2>
            </div>
            <p class="text-ink-soft text-xs mb-4">
              Sends borrower records (accounts, transactions, loans, repayments) to the central
              system in the normalized DAIRE contract for merging.
            </p>

            <label class="form-label">Borrower References <span class="text-muted">(comma-separated — leave empty to push ALL active borrowers)</span></label>
            <input type="text" class="form-control" [(ngModel)]="pushRefs" placeholder="e.g. BRW-TZ-1001, BRW-TZ-1003" />

            <div class="flex flex-wrap gap-2 mt-4">
              <button class="btn btn-success" (click)="pushData(false)" [disabled]="pushing()">
                {{ pushing() && !pushingAll() ? 'Pushing…' : 'Push Selected' }}
              </button>
              <button class="btn btn-primary" (click)="pushData(true)" [disabled]="pushing()">
                {{ pushing() && pushingAll() ? 'Pushing all…' : 'Push All Borrowers' }}
              </button>
            </div>

            <div class="alert alert-success mt-4 mb-0 anim-fade" *ngIf="pushOk()">
              {{ pushOk() }}
            </div>
            <div class="alert alert-error mt-4 mb-0 anim-fade" *ngIf="pushError()">
              {{ pushError() }}
            </div>
          </div>

          <!-- PULL -->
          <div class="card border-l-4 border-l-blue-500">
            <div class="flex items-center gap-2.5 mb-1">
              <span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">Pl</span>
              <h2 class="text-base mb-0">Request Borrower Data</h2>
            </div>
            <p class="text-ink-soft text-xs mb-4">
              Sends a borrower-data request to the central system and displays the received response.
            </p>

            <label class="form-label">Borrower Reference</label>
            <input type="text" class="form-control" [(ngModel)]="borrowerRef" placeholder="e.g. BRW-TZ-1001" />

            <label class="form-label mt-3">
              Requested Fields <span class="text-muted">(comma-separated, optional)</span>
            </label>
            <input type="text" class="form-control" [(ngModel)]="fieldsInput" placeholder="e.g. accounts, loans, repayments" />

            <button class="btn btn-primary mt-4" (click)="requestData()" [disabled]="!borrowerRef().trim() || sending()">
              {{ sending() ? 'Requesting…' : 'Send Pull Request' }}
            </button>

            <div class="alert alert-error mt-4 mb-0 anim-fade" *ngIf="requestError()">{{ requestError() }}</div>

            <div class="mt-5" *ngIf="response()">
              <h3 class="text-sm text-ink-soft mb-2">Received Response</h3>
              <pre class="bg-surface-3 border border-line rounded-lg p-3.5 text-xs overflow-auto max-h-[380px] font-mono">{{ responseJson() }}</pre>
            </div>
          </div>
        </div>

        <!-- Exchange log -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center">Lg</span>
              <h2 class="text-base mb-0">Exchange History</h2>
              <span class="badge badge-neutral">{{ log().length }}</span>
            </div>
            <button class="btn btn-outline btn-sm" (click)="loadLog()">Refresh</button>
          </div>

          <div class="table-wrap" *ngIf="log().length > 0">
            <table class="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>When</th><th>Direction</th><th>Status</th><th>Records</th><th>Borrowers</th><th>Detail</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let e of log()">
                  <td class="whitespace-nowrap">{{ e.created_at | date:'dd MMM, HH:mm' }}</td>
                  <td>
                    <span class="badge" [class]="e.direction === 'PUSH' ? 'badge-success' : 'badge-info'">{{ e.direction }}</span>
                  </td>
                  <td>
                    <span class="badge" [class]="e.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'">{{ e.status }}</span>
                  </td>
                  <td class="font-semibold">{{ e.record_count }}</td>
                  <td class="text-xs text-muted max-w-[220px] truncate">
                    {{ e.borrower_references?.length ? e.borrower_references!.join(', ') : 'All active' }}
                  </td>
                  <td class="text-xs text-muted max-w-[280px] truncate" [title]="e.detail">{{ e.detail || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-state !py-8" *ngIf="log().length === 0">
            <p>No exchanges yet — push or pull to see history here.</p>
          </div>
        </div>

        <!-- Received credit results -->
        <div class="card">
          <div class="flex items-center gap-2.5 mb-4">
            <span class="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">Cr</span>
            <h2 class="text-base mb-0">Received Credit Results</h2>
          </div>

          <div class="py-8 text-center text-ink-soft" *ngIf="loadingResults()">Loading…</div>

          <div class="table-wrap" *ngIf="!loadingResults() && results().length > 0">
            <table class="data-table min-w-[640px]">
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

          <div class="empty-state !py-8" *ngIf="!loadingResults() && results().length === 0">
            No credit results received yet.
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DaireAdminComponent implements OnInit {
  private api = inject(ApiService);

  // Push
  pushRefs = signal('');
  pushing = signal(false);
  pushingAll = signal(false);
  pushOk = signal('');
  pushError = signal('');

  // Pull
  borrowerRef = signal('');
  fieldsInput = signal('');
  sending = signal(false);
  requestError = signal('');
  response = signal<any>(null);

  // Log + results
  log = signal<DataExchangeLogEntry[]>([]);
  results = signal<CreditResult[]>([]);
  loadingResults = signal(true);

  ngOnInit(): void {
    this.loadLog();
    this.loadResults();
  }

  loadLog(): void {
    this.api.daireExchangeLog().subscribe({
      next: data => this.log.set(Array.isArray(data) ? data : []),
      error: () => this.log.set([]),
    });
  }

  loadResults(): void {
    this.api.getCreditResults().subscribe({
      next: data => { this.results.set(Array.isArray(data) ? data : []); this.loadingResults.set(false); },
      error: () => this.loadingResults.set(false),
    });
  }

  pushData(all: boolean): void {
    const refs = all
      ? []
      : this.pushRefs().split(',').map(s => s.trim()).filter(Boolean);

    if (!all && refs.length === 0) {
      this.pushError.set('Enter at least one borrower reference, or use "Push All Borrowers".');
      return;
    }

    this.pushing.set(true);
    this.pushingAll.set(all);
    this.pushOk.set('');
    this.pushError.set('');

    this.api.dairePushData(refs).subscribe({
      next: (res: any) => {
        this.pushing.set(false);
        const n = res?.merged ?? res?.received ?? (refs.length || 0);
        this.pushOk.set(`Pushed ${n} borrower record(s) to the DAIRE Central System for merging.`);
        this.loadLog();
      },
      error: err => {
        this.pushing.set(false);
        this.pushError.set(err.error?.detail || 'Could not reach the DAIRE Central System.');
        this.loadLog();
      },
    });
  }

  requestData(): void {
    const fields = this.fieldsInput().split(',').map(s => s.trim()).filter(Boolean);

    this.sending.set(true);
    this.requestError.set('');
    this.response.set(null);

    this.api.daireRequestData(this.borrowerRef().trim(), fields).subscribe({
      next: data => { this.response.set(data); this.sending.set(false); this.loadLog(); },
      error: err => {
        this.sending.set(false);
        this.requestError.set(err.error?.detail || 'Request to the DAIRE Central System failed.');
        this.loadLog();
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
