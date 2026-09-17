import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, IntegrationCredential, DaireConnection } from '../services/api.service';

@Component({
  selector: 'app-integration-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-8 space-y-6">
      <!-- Page header -->
      <div>
        <h1 class="text-2xl font-bold text-ink mb-1">Integration Settings</h1>
        <p class="text-sm text-ink-soft">
          Configure the DAIRE Central System connection and manage API keys for data exchange.
        </p>
      </div>

      <!-- DAIRE connection card -->
      <div class="card border-l-4 border-l-primary">
        <div class="flex items-center gap-2.5 mb-1">
          <span class="w-8 h-8 rounded-lg bg-primary-light text-primary-dark font-bold text-xs flex items-center justify-center">DC</span>
          <h2 class="text-base mb-0">DAIRE Central System Connection</h2>
          <span class="badge" [class]="connection()?.source === 'db' ? 'badge-info' : 'badge-neutral'">
            {{ connection()?.source === 'db' ? 'saved in database' : 'from .env' }}
          </span>
        </div>
        <p class="text-ink-soft text-xs mb-4">
          Address of the DAIRE Central System this lender subsystem exchanges data with
          (used for both push and pull). Changing it takes effect immediately — no restart needed.
        </p>

        <div class="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <label class="form-label">Central System URL (or IP address)</label>
            <input
              type="url"
              class="form-control"
              [(ngModel)]="urlInput"
              name="centralUrl"
              placeholder="e.g. https://central.daire.go.tz or http://196.13.240.55:8000"
            />
          </div>
          <button class="btn btn-primary" (click)="saveConnection()" [disabled]="savingConn() || !urlInput().trim()">
            {{ savingConn() ? 'Saving…' : 'Save URL' }}
          </button>
          <button class="btn btn-outline" (click)="testConnection()" [disabled]="testingConn()">
            {{ testingConn() ? 'Testing…' : 'Test Connection' }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs text-muted">
          <span>Institution: <strong class="text-ink">{{ connection()?.institution_name || '—' }}</strong></span>
          <span>Lender ID: <code class="bg-surface-3 px-1.5 py-0.5 rounded">{{ connection()?.lender_id || '—' }}</code></span>
        </div>

        <!-- Test result -->
        <div class="alert anim-fade mt-4 mb-0 flex flex-col sm:flex-row sm:items-center gap-2"
             *ngIf="testResult()"
             [class.alert-success]="testResult()!.ok"
             [class.alert-error]="!testResult()!.ok">
          <div class="flex-1">
            <strong>{{ testResult()!.ok ? 'Reachable' : 'Unreachable' }}</strong>
            <span class="ml-2">{{ testResult()!.detail }}</span>
          </div>
          <span class="text-xs opacity-75">
            {{ testResult()!.url }} · {{ testResult()!.latency_ms }}ms
          </span>
        </div>

        <div class="alert alert-success mt-4 mb-0 anim-fade" *ngIf="connSaved()">
          {{ connSaved() }}
        </div>
        <div class="alert alert-error mt-4 mb-0 anim-fade" *ngIf="connError()">
          {{ connError() }}
        </div>
      </div>

      <!-- Create API key -->
      <div class="card">
        <h2 class="text-base mb-4">Create New API Key</h2>
        <form (ngSubmit)="createKey()" #form="ngForm">
          <div class="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label class="form-label">Key name</label>
              <input type="text" class="form-control" placeholder="e.g. DAIRE Central System" [(ngModel)]="newKey.name" name="name" required />
            </div>
            <div>
              <label class="form-label">Role</label>
              <select class="form-control" [(ngModel)]="newKey.role" name="role">
                <option value="CENTRAL_SYSTEM">DAIRE Central System</option>
                <option value="DATA_OFFICER">Data Officer</option>
                <option value="AUDITOR">Auditor</option>
              </select>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div class="flex-1 w-full">
              <label class="form-label">Lender ID <span class="text-muted">(optional)</span></label>
              <input type="text" class="form-control" placeholder="e.g. NMB-001" [(ngModel)]="newKey.lender_id" name="lender_id" />
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="!newKey.name || creatingKey()">
              {{ creatingKey() ? 'Creating…' : 'Create Key' }}
            </button>
          </div>
        </form>

        <div class="card mt-4 !bg-amber-50 !border-amber-200 border-l-4 border-l-amber-500" *ngIf="createdKey()">
          <h3 class="text-sm font-semibold mb-2 text-amber-900">New key created — shown only once</h3>
          <code class="block bg-white border border-amber-200 px-3 py-2 rounded font-mono text-sm break-all">{{ createdKey() }}</code>
          <p class="text-amber-800 text-xs mt-2">Copy and store this key securely now. It will not be shown again.</p>
        </div>
      </div>

      <!-- Existing credentials -->
      <div class="card">
        <h2 class="text-base mb-4">Existing Credentials</h2>
        <div class="table-wrap" *ngIf="credentials().length > 0">
          <table class="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>Name</th><th>Lender ID</th><th>Role</th><th>Prefix</th>
                <th>Status</th><th>Created</th><th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of credentials()">
                <td class="font-medium">{{ c.name }}</td>
                <td>{{ c.lender_id || '—' }}</td>
                <td><span class="badge" [class]="c.role === 'CENTRAL_SYSTEM' ? 'badge-info' : 'badge-neutral'">{{ c.role }}</span></td>
                <td class="font-mono text-xs">{{ c.key_prefix ? c.key_prefix + '…' : '—' }}</td>
                <td><span class="badge" [class]="c.is_active ? 'badge-success' : 'badge-neutral'">{{ c.is_active ? 'Active' : 'Inactive' }}</span></td>
                <td class="whitespace-nowrap">{{ c.created_at | date:'dd MMM, yyyy' }}</td>
                <td class="whitespace-nowrap">{{ c.last_used_at ? (c.last_used_at | date:'dd MMM, HH:mm') : 'Never' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="empty-state !py-8" *ngIf="credentials().length === 0">
          <p>No credentials yet.</p>
        </div>
      </div>
    </div>
  `,
})
export class IntegrationSettingsComponent implements OnInit {
  private api = inject(ApiService);

  credentials = signal<IntegrationCredential[]>([]);
  createdKey = signal<string | null>(null);
  creatingKey = signal(false);
  newKey = { name: '', role: 'CENTRAL_SYSTEM', lender_id: '' };

  connection = signal<DaireConnection | null>(null);
  urlInput = signal('');
  savingConn = signal(false);
  testingConn = signal(false);
  connSaved = signal('');
  connError = signal('');
  testResult = signal<{ ok: boolean; detail: string; url: string; latency_ms: number } | null>(null);

  ngOnInit(): void {
    this.api.getCredentials().subscribe({
      next: data => this.credentials.set(Array.isArray(data) ? data : []),
    });
    this.api.getDaireConnection().subscribe({
      next: conn => {
        this.connection.set(conn);
        this.urlInput.set(conn.central_system_url);
      },
      error: () => { /* card simply stays unconfigured */ },
    });
  }

  saveConnection(): void {
    const url = this.urlInput().trim();
    if (!url) return;

    this.savingConn.set(true);
    this.connSaved.set('');
    this.connError.set('');

    this.api.saveDaireConnection(url).subscribe({
      next: resp => {
        this.savingConn.set(false);
        this.connSaved.set(resp.detail || 'URL saved.');
        this.connection.set({ ...this.connection()!, central_system_url: resp.central_system_url, source: 'db' });
      },
      error: err => {
        this.savingConn.set(false);
        this.connError.set(err.error?.central_system_url?.[0] || err.error?.detail || 'Could not save the URL.');
      },
    });
  }

  testConnection(): void {
    this.testingConn.set(true);
    this.testResult.set(null);

    this.api.testDaireConnection().subscribe({
      next: res => {
        this.testingConn.set(false);
        this.testResult.set(res);
      },
      error: err => {
        this.testingConn.set(false);
        this.testResult.set({
          ok: false,
          url: this.urlInput(),
          latency_ms: 0,
          detail: err.error?.detail || 'Test request failed.',
        });
      },
    });
  }

  createKey(): void {
    this.creatingKey.set(true);
    this.api.createCredential(this.newKey.name, this.newKey.role, ['pull', 'push'], 1, this.newKey.lender_id).subscribe({
      next: (resp: any) => {
        this.creatingKey.set(false);
        this.createdKey.set(resp.plaintext_key);
        this.credentials.update(list => [...list, {
          name: this.newKey.name, lender_id: this.newKey.lender_id,
          role: this.newKey.role, key_prefix: resp.key_prefix || '', is_active: true,
          created_at: new Date().toISOString(), last_used_at: null,
        }]);
        this.newKey = { name: '', role: 'CENTRAL_SYSTEM', lender_id: '' };
      },
      error: () => {
        this.creatingKey.set(false);
      },
    });
  }
}
