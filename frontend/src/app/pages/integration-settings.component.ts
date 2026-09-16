import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, IntegrationCredential } from '../services/api.service';

@Component({
  selector: 'app-integration-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1>Integration Settings</h1>
      <p class="subtitle">Manage API keys for DAIRE Central System and other integrations.</p>

      <div class="card">
        <h2>Create New API Key</h2>
        <form (ngSubmit)="createKey()" #form>
          <div class="form-row">
            <input type="text" placeholder="Key name" [(ngModel)]="newKey.name" name="name" required />
            <select [(ngModel)]="newKey.role" name="role">
              <option value="CENTRAL_SYSTEM">DAIRE Central System</option>
              <option value="DATA_OFFICER">Data Officer</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>
          <div class="form-row">
            <input type="text" placeholder="Lender ID" [(ngModel)]="newKey.lender_id" name="lender_id" />
            <button type="submit" [disabled]="!newKey.name">Create Key</button>
          </div>
        </form>
      </div>

      <div class="card" *ngIf="createdKey">
        <h2>New Key Created (show once)</h2>
        <code class="key">{{ createdKey }}</code>
        <p class="warning">Store this key securely. It will not be shown again.</p>
      </div>

      <div class="card">
        <h2>Existing Credentials</h2>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Lender ID</th><th>Role</th><th>Prefix</th><th>Status</th><th>Created</th><th>Last Used</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of credentials">
              <td>{{ c.name }}</td>
              <td>{{ c.lender_id }}</td>
              <td>{{ c.role }}</td>
              <td>{{ c.key_prefix }}…</td>
              <td>{{ c.is_active ? 'Active' : 'Inactive' }}</td>
              <td>{{ c.created_at | date:'short' }}</td>
              <td>{{ c.last_used_at ? (c.last_used_at | date:'short') : 'Never' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    .subtitle { color: #666; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 1.5rem; }
    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .form-row input, .form-row select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
    .form-row input { flex: 1; }
    .form-row button { padding: 0.5rem 1.5rem; background: #0f3460; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; }
    .key { display: block; background: #f8f9fa; padding: 0.5rem; border-radius: 4px; font-family: monospace; font-size: 1rem; }
    .warning { color: #e94560; font-size: 0.8rem; margin-top: 0.5rem; }
  `]
})
export class IntegrationSettingsComponent implements OnInit {
  credentials: IntegrationCredential[] = [];
  createdKey: string | null = null;
  newKey = { name: '', role: 'CENTRAL_SYSTEM', lender_id: '' };
  private api = inject(ApiService);

  ngOnInit(): void {
    this.api.getCredentials().subscribe({
      next: (data) => { this.credentials = data; },
    });
  }

  createKey(): void {
    this.api.createCredential(this.newKey.name, this.newKey.role, ['pull', 'push'], 1, this.newKey.lender_id).subscribe({
      next: (resp: any) => {
        this.createdKey = resp.plaintext_key;
        this.credentials = [...this.credentials, {
          name: this.newKey.name, lender_id: this.newKey.lender_id,
          role: this.newKey.role, key_prefix: '', is_active: true,
          created_at: new Date().toISOString(), last_used_at: null,
        }];
        this.newKey = { name: '', role: 'CENTRAL_SYSTEM', lender_id: '' };
      },
      error: () => { /* show error */ },
    });
  }
}
