import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface JwtPayload {
  user_id: string;
  email: string;
  role: string;
  full_name: string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem('access_token'));

  readonly token = this._token.asReadonly();

  readonly currentUser = computed<JwtPayload | null>(() => {
    const t = this._token();
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload as JwtPayload;
    } catch {
      return null;
    }
  });

  readonly userRole = computed(() => this.currentUser()?.role ?? null);
  readonly userEmail = computed(() => this.currentUser()?.email ?? null);
  readonly userFullName = computed(() => this.currentUser()?.full_name ?? null);
  readonly isAdmin = computed(() => this.userRole() === 'ADMIN');
  readonly isBorrower = computed(() => this.userRole() === 'BORROWER');
  readonly isStaff = computed(() =>
    ['ADMIN', 'DATA_OFFICER', 'AUDITOR', 'READ_ONLY'].includes(this.userRole() ?? '')
  );

  constructor(private router: Router) {}

  login(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    this._token.set(accessToken);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    // Check expiry
    if (user.exp && user.exp * 1000 < Date.now()) {
      this.logout();
      return false;
    }
    return true;
  }

  getToken(): string | null {
    return this._token();
  }
}
