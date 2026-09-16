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
    <div class="flex min-h-screen">
      <!-- Left panel -->
      <div class="hidden md:flex flex-1 flex-col justify-center p-12 bg-linear-145 from-sidebar to-primary text-white">
        <div class="mb-12">
          <div class="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl font-bold mb-4">N</div>
          <h1 class="text-3xl font-bold text-white mb-3">DAIRE Lender Subsystem</h1>
          <p class="text-white/70 text-[0.95rem] leading-relaxed max-w-[380px]">
            Secure access to NMB Bank's credit intelligence platform powered by the DAIRE Central System.
          </p>
        </div>
        <div class="flex flex-col gap-6">
          <div class="flex gap-4 items-start">
            <span class="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-sm font-bold shrink-0">Cr</span>
            <div>
              <strong class="text-white text-[0.9rem] block mb-0.5">Real-time Credit Intelligence</strong>
              <p class="text-white/60 text-[0.82rem] m-0 leading-relaxed">Access live credit scoring and risk assessment for all borrowers.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <span class="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-sm font-bold shrink-0">Rb</span>
            <div>
              <strong class="text-white text-[0.9rem] block mb-0.5">Role-Based Access</strong>
              <p class="text-white/60 text-[0.82rem] m-0 leading-relaxed">Staff, auditor, and borrower portal with granular permissions.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <span class="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-sm font-bold shrink-0">Ac</span>
            <div>
              <strong class="text-white text-[0.9rem] block mb-0.5">Full Accountability</strong>
              <p class="text-white/60 text-[0.82rem] m-0 leading-relaxed">Every data exchange with DAIRE is tracked for compliance.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right panel -->
      <div class="w-full md:w-[480px] flex items-center justify-center bg-surface-2 p-8">
        <div class="w-full max-w-[400px] bg-surface rounded-2xl p-10 shadow-lg">
          <div class="mb-8">
            <h2 class="text-2xl mb-1 text-ink">Sign In</h2>
            <p class="text-ink-soft text-sm">Enter your credentials to access your account</p>
          </div>

          <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
            <div class="form-group">
              <label class="form-label" for="email">Email Address</label>
              <input
                id="email" type="email" name="email" [(ngModel)]="email"
                class="form-control" placeholder="you@nmb.co.tz"
                required autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <div class="relative">
                <input
                  id="password" [type]="showPassword() ? 'text' : 'password'" name="password"
                  [(ngModel)]="password" class="form-control pr-16"
                  placeholder="••••••••" required autocomplete="current-password"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-xs text-ink-soft hover:text-ink"
                  (click)="showPassword.set(!showPassword())"
                >
                  {{ showPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <div *ngIf="error()" class="alert alert-danger">{{ error() }}</div>

            <button
              id="login-btn" type="submit"
              class="btn btn-primary btn-lg w-full justify-center mt-2"
              [disabled]="!email || !password || loading()"
            >
              <span *ngIf="loading()" class="spinner"></span>
              <span>{{ loading() ? 'Signing in…' : 'Sign In' }}</span>
            </button>
          </form>

          <div class="mt-6 p-3 bg-surface-3 rounded-lg text-xs text-ink-soft leading-loose">
            <p class="m-0"><strong class="text-ink">Admin:</strong> admin&#64;lender.local / admin-pass-123</p>
            <p class="m-0"><strong class="text-ink">Borrower:</strong> amina.juma&#64;portal.nmb.co.tz / borrower-pass-123</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

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
