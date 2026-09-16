import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, IntegrationCredential } from '../services/api.service';

@Component({
  selector: 'app-integration-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl mb-1">Integration Settings</h1>
      <p class="text-ink-soft mb-6">Manage API keys for DAIRE Central System and other integrations.</p>

      <div class="card mb-6">
        <h2 class="text-base mb-4">Create New API Key</h2>
        <form (ngSubmit)="createKey()" #form="ngForm">
          <div class="grid gap-4 md:grid-cols-2 mb-4">
            <input type="text" class="form-control" placeholder="Key name" [(ngModel)]="newKey.name" name="name" required />
            <select class="form-control" [(ngModel)]="newKey.role" name="role">
              <option value="CENTRAL_SYSTEM">DAIRE Central System</option>
              <option value="DATA_OFFICER">Data Officer</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>
          <div class="flex gap-4 mb-4">
            <input type="text" class="form-control flex-1" placeholder="Lender ID" [(ngModel)]="newKey.lender_id" name="lender_id" />
            <button type="submit" class="btn btn-primary" [disabled]="!newKey.name">Create Key</button>
          </div>
        </form>
      </div>

      <div class="card mb-6 border-l-4 border-l-amber-500" *ngIf="createdKey()">
        <h2 class="text-base mb-2">New Key Created (show once)</h2>
        <code class="block bg-surface-3 px-3 py-2 rounded font-mono text-sm break-all">{{ createdKey() }}</code>
        <p class="text-danger text-xs mt-2">Store this key securely. It will not be shown again.</p>
      </div>

      <div class="card">
        <h2 class="text-base mb-4">Existing Credentials</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Lender ID</th><th>Role</th><th>Prefix</th>
                <th>Status</th><th>Created</th><th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of credentials()">
                <td>{{ c.name }}</td>
                <td>{{ c.lender_id }}</td>
                <td>{{ c.role }}</td>
                <td class="font-mono text-xs">{{ c.key_prefix }}…</td>
                <td><span class="badge" [class]="c.is_active ? 'badge-success' : 'badge-neutral'">{{ c.is_active ? 'Active' : 'Inactive' }}</span></td>
                <td>{{ c.created_at | date:'short' }}</td>
                <td>{{ c.last_used_at ? (c.last_used_at | date:'short') : 'Never' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p *ngIf="credentials().length === 0" class="empty-state">No credentials yet.</p>
      </div>
    </div>
  `,
})
export class IntegrationSettingsComponent implements OnInit {
  credentials = signal<IntegrationCredential[]>([]);
  createdKey = signal<string | null>(null);
  newKey = { name: '', role: 'CENTRAL_SYSTEM', lender_id: '' };
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.getCredentials().subscribe({
      next: (data) => { this.credentials.set(data); },
    });
  }

  createKey(): void {
    this.api.createCredential(this.newKey.name, this.newKey.role, ['pull', 'push'], 1, this.newKey.lender_id).subscribe({
      next: (resp: any) => {
        this.createdKey.set(resp.plaintext_key);
        this.credentials.update(list => [...list, {
          name: this.newKey.name, lender_id: this.newKey.lender_id,
          role: this.newKey.role, key_prefix: '', is_active: true,
          created_at: new Date().toISOString(), last_used_at: null,
        }]);
        this.newKey = { name: '', role: 'CENTRAL_SYSTEM', lender_id: '' };
      },
      error: () => { /* show error */ },
    });
  }
}
