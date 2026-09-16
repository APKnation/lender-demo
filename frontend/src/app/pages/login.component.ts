import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-shell">
      <div class="login-left">
        <div class="branding">
          <div class="logo">N</div>
          <h1>DAIRE Lender Subsystem</h1>
          <p>Secure access to NMB Bank's credit intelligence platform powered by the DAIRE Central System.</p>
        </div>
        <div class="features">
          <div class="feature">
            <span class="feat-icon">Cr</span>
            <div>
              <strong>Real-time Credit Intelligence</strong>
              <p>Access live credit scoring and risk assessment for all borrowers.</p>
            </div>
          </div>
          <div class="feature">
            <span class="feat-icon">Rb</span>
            <div>
              <strong>Role-Based Access</strong>
              <p>Staff, auditor, and borrower portal with granular permissions.</p>
            </div>
          </div>
          <div class="feature">
            <span class="feat-icon">Au</span>
            <div>
              <strong>Full Audit Trail</strong>
              <p>Every action is logged for compliance and transparency.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="login-right">
        <div class="login-card">
          <div class="card-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                [(ngModel)]="email"
                class="form-control"
                placeholder="you@nmb.co.tz"
                required
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="password-wrapper">
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  name="password"
                  [(ngModel)]="password"
                  class="form-control"
                  placeholder="••••••••"
                  required
                  autocomplete="current-password"
                />
                <button type="button" class="pw-toggle" (click)="showPassword = !showPassword">
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <div *ngIf="error()" class="alert alert-danger">{{ error() }}</div>

            <button
              id="login-btn"
              type="submit"
              class="btn btn-primary btn-lg submit-btn"
              [disabled]="!email || !password || loading()"
            >
              <span *ngIf="loading()" class="spinner"></span>
              <span>{{ loading() ? 'Signing in…' : 'Sign In' }}</span>
            </button>
          </form>

          <div class="hint-box">
            <p><strong>Admin:</strong> admin&#64;lender.local / admin-pass-123</p>
            <p><strong>Borrower:</strong> amina.juma&#64;portal.nmb.co.tz / borrower-pass-123</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-shell {
      display: flex;
      min-height: 100vh;
    }

    /* Left panel */
    .login-left {
      flex: 1;
      background: linear-gradient(145deg, #1e2235 0%, #1a56db 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3rem;
      color: #fff;
    }

    .logo { font-size: 3rem; margin-bottom: 1rem; }

    .login-left h1 {
      font-size: 1.8rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.75rem;
    }

    .login-left > .branding > p {
      color: rgba(255,255,255,0.7);
      font-size: 0.95rem;
      line-height: 1.7;
      max-width: 380px;
      margin-bottom: 3rem;
    }

    .features { display: flex; flex-direction: column; gap: 1.5rem; }

    .feature {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .feat-icon { font-size: 1.5rem; flex-shrink: 0; }

    .feature strong { color: #fff; font-size: 0.9rem; display: block; margin-bottom: 0.25rem; }
    .feature p { color: rgba(255,255,255,0.6); font-size: 0.82rem; margin: 0; line-height: 1.5; }

    /* Right panel */
    .login-right {
      width: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9fafb;
      padding: 2rem;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: #fff;
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    }

    .card-header { margin-bottom: 2rem; }
    .card-header h2 { font-size: 1.5rem; margin-bottom: 0.35rem; color: #111827; }
    .card-header p { color: #6b7280; font-size: 0.875rem; }

    .password-wrapper { position: relative; }
    .pw-toggle {
      position: absolute;
      right: 10px; top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 4px;
    }

    .submit-btn { width: 100%; justify-content: center; margin-top: 0.5rem; }

    .hint-box {
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: 0.78rem;
      color: #6b7280;
      line-height: 1.8;
    }
    .hint-box strong { color: #374151; }

    @media (max-width: 768px) {
      .login-left { display: none; }
      .login-right { width: 100%; padding: 1rem; }
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = false;

  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.api.login(this.email, this.password).subscribe({
      next: (tokens) => {
        this.auth.login(tokens.access, tokens.refresh);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        // Route based on role
        if (this.auth.isBorrower()) {
          this.router.navigate(['/portal']);
        } else {
          this.router.navigate([returnUrl || '/']);
        }
      },
      error: (err) => {
        this.error.set(err.status === 401
          ? 'Invalid email or password.'
          : 'Login failed. Please check your connection.');
        this.loading.set(false);
      },
    });
  }
}
