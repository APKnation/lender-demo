import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>DAIRE Lender Subsystem</h1>
        <p>Staff login</p>
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label>Username (email)</label>
            <input type="email" name="username" [(ngModel)]="username" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" [(ngModel)]="password" required />
          </div>
          <button type="submit" [disabled]="!username || !password || loading">
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
          <div class="error" *ngIf="error">{{ error }}</div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; }
    .login-card { background: white; padding: 3rem; border-radius: 8px; width: 100%; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,.3); }
    h1 { margin-top: 0; color: #16213e; }
    .form-group { margin-bottom: 1.5rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
    input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; }
    button { width: 100%; padding: 0.75rem; background: #0f3460; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:disabled { background: #ccc; }
    .error { color: #e94560; margin-top: 1rem; }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  onSubmit(): void {
    if (!this.username || !this.password) return;
    this.loading = true;
    this.error = '';
    this.api.login(this.username, this.password).subscribe({
      next: (tokens) => {
        this.auth.login(tokens.access, tokens.refresh);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = err.status === 401 ? 'Invalid credentials.' : 'Login failed. Please try again.';
        this.loading = false;
      },
    });
  }
}
