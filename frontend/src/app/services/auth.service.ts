import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem('access_token'));

  readonly token = this._token.asReadonly();

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
    return !!this._token();
  }

  getToken(): string | null {
    return this._token();
  }

  // Decode JWT payload (no crypto libs needed – base64 decode)
  getUserRole(): string | null {
    const token = this._token();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || payload['role'] || 'READ_ONLY';
    } catch {
      return null;
    }
  }

  constructor(private router: Router) {}
}
