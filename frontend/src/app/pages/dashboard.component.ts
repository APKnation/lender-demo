import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Borrower, Loan, CreditResult } from '../services/api.service';
import { CountUpDirective } from '../shared/count-up.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CountUpDirective],
  template: `
    <div class="space-y-6">
      <!-- Page intro -->
      <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-ink">Portfolio Overview</h1>
          <p class="text-sm text-ink-soft">Borrowers, loans and credit signals from the DAIRE subsystem.</p>
        </div>
        <span class="inline-flex items-center gap-2 text-xs text-ink-soft">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live data
        </span>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="loading-page">
        <div class="spinner w-9 h-9"></div>
        <p>Loading dashboard data…</p>
      </div>

      <ng-container *ngIf="!loading()">
        <div class="stagger space-y-6">
        <!-- Pending approvals banner -->
        <div class="card border-l-4 border-l-amber-500">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2.5">
              <h2 class="text-base mb-0">Pending Loan Approvals</h2>
              <span class="badge badge-warning">{{ pendingLoans().length }}</span>
            </div>
            <a routerLink="/loan-approvals" class="btn btn-outline btn-sm shrink-0">Review All</a>
          </div>
          <div class="flex flex-col gap-2" *ngIf="pendingLoans().length > 0">
            <div
              *ngFor="let l of pendingLoans().slice(0, 5)"
              class="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <code class="text-xs bg-surface-3 px-2 py-1 rounded font-mono w-fit">{{ l.loan_id }}</code>
              <div class="flex items-center gap-4 text-sm">
                <strong>TZS {{ formatBalance(l.loan_amount) }}</strong>
                <span class="text-ink-soft text-xs">{{ l.loan_duration_months }} months</span>
                <span class="badge badge-neutral">{{ l.purpose || 'No purpose' }}</span>
              </div>
              <a routerLink="/loan-approvals" class="btn btn-ghost btn-sm w-fit">Review &rsaquo;</a>
            </div>
          </div>
          <div *ngIf="pendingLoans().length === 0" class="empty-state !py-6">
            <p>No pending loan applications — all caught up.</p>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
          <div class="card !p-5 group hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-blue-100 transition">
            <div class="text-[1.55rem] font-extrabold leading-none text-ink" [appCountUp]="borrowers().length">0</div>
            <div class="text-xs text-ink-soft mt-1.5">Total Borrowers</div>
            <a routerLink="/borrowers" class="mt-2.5 inline-block text-xs font-medium text-primary no-underline group-hover:underline">View &rsaquo;</a>
          </div>
          <div class="card !p-5 group hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-emerald-100 transition">
            <div class="text-[1.55rem] font-extrabold leading-none text-ink" [appCountUp]="totalAccounts()">0</div>
            <div class="text-xs text-ink-soft mt-1.5">Active Accounts</div>
            <a routerLink="/accounts" class="mt-2.5 inline-block text-xs font-medium text-primary no-underline group-hover:underline">View &rsaquo;</a>
          </div>
          <div class="card !p-5 group hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-amber-100 transition">
            <div class="text-[1.55rem] font-extrabold leading-none text-ink" [appCountUp]="totalLoans()">0</div>
            <div class="text-xs text-ink-soft mt-1.5">Active Loans</div>
            <a routerLink="/loans" class="mt-2.5 inline-block text-xs font-medium text-primary no-underline group-hover:underline">View &rsaquo;</a>
          </div>
          <div class="card !p-5 group hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-violet-100 transition">
            <div class="text-[1.55rem] font-extrabold leading-none text-ink" [appCountUp]="totalBalance()" [appCountUpPrefix]="'TZS '">0</div>
            <div class="text-xs text-ink-soft mt-1.5">Portfolio Balance</div>
          </div>
          <div class="card !p-5 group hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-rose-100 transition">
            <div class="text-[1.55rem] font-extrabold leading-none text-ink" [appCountUp]="highRiskCount()">0</div>
            <div class="text-xs text-ink-soft mt-1.5">High Risk Borrowers</div>
            <a routerLink="/credit-results" class="mt-2.5 inline-block text-xs font-medium text-primary no-underline group-hover:underline">View &rsaquo;</a>
          </div>
          <div class="card !p-5 group hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-teal-100 transition">
            <div class="text-[1.55rem] font-extrabold leading-none text-ink" [appCountUp]="recentCreditResults().length">0</div>
            <div class="text-xs text-ink-soft mt-1.5">Credit Results</div>
            <a routerLink="/credit-results" class="mt-2.5 inline-block text-xs font-medium text-primary no-underline group-hover:underline">View &rsaquo;</a>
          </div>
        </div>

        <!-- Main content grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          <!-- Borrower Summary Table -->
          <div class="card lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base mb-0">Borrower Portfolio</h2>
              <a routerLink="/borrowers" class="btn btn-outline btn-sm">View All</a>
            </div>
            <div class="table-wrap">
              <table class="data-table min-w-[880px]">
                <thead>
                  <tr>
                    <th>Reference</th><th>Name</th><th>Employment</th><th>Income</th>
                    <th>Accounts</th><th>Loans</th><th>Balance</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let b of borrowers().slice(0, 8)">
                    <td><code class="text-xs bg-surface-3 px-1.5 py-0.5 rounded font-mono">{{ b.borrower_reference }}</code></td>
                    <td>
                      <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-emerald-500 text-white text-[0.65rem] font-bold flex items-center justify-center shrink-0">
                          {{ initialsOf(b.full_name) }}
                        </span>
                        <div class="leading-tight">
                          <div class="font-semibold">{{ b.full_name }}</div>
                          <div class="text-[0.7rem] text-muted">{{ b.gender }}</div>
                        </div>
                      </div>
                    </td>
                    <td>{{ formatEmployment(b.employment_status) }}</td>
                    <td class="font-medium">{{ formatBalance(+b.income) }}</td>
                    <td>{{ b.account_information?.total_accounts || 0 }}</td>
                    <td>{{ b.loans?.length || 0 }}</td>
                    <td class="font-medium">{{ formatBalance(b.account_information?.total_balance || 0) }}</td>
                    <td><a [routerLink]="['/borrowers', b.borrower_reference]" class="btn btn-ghost btn-sm">Detail</a></td>
                  </tr>
                  <tr *ngIf="borrowers().length === 0">
                    <td colspan="8" class="text-center text-ink-soft py-8">No borrowers found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Credit Results -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base mb-0">Credit Results</h2>
              <a routerLink="/credit-results" class="btn btn-outline btn-sm">All</a>
            </div>
            <div class="flex flex-col">
              <div
                *ngFor="let r of recentCreditResults().slice(0, 7)"
                class="flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-b-0"
              >
                <div class="min-w-0">
                  <div class="text-[0.82rem] font-semibold truncate">{{ r.borrower_reference }}</div>
                  <div class="text-[0.72rem] text-muted">{{ r.received_at | date:'dd MMM · HH:mm' }}</div>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                  <span class="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm"
                        [class]="scoreTile(r.credit_score)">
                    {{ r.credit_score ?? '–' }}
                  </span>
                  <span class="badge hidden sm:inline-flex" [class]="riskBadge(r.risk_level)">{{ r.risk_level || '–' }}</span>
                </div>
              </div>
              <div *ngIf="recentCreditResults().length === 0" class="empty-state !py-8">
                <p>No credit results yet</p>
              </div>
            </div>
          </div>

          <!-- Loan Status Distribution -->
          <div class="card xl:col-span-2">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-base mb-0">Loan Status Distribution</h2>
              <a routerLink="/loans" class="btn btn-outline btn-sm">View All</a>
            </div>
            <div class="grid gap-5 sm:grid-cols-2">
              <div *ngFor="let s of loanStats(); let i = index">
                <div class="flex justify-between items-baseline mb-1.5">
                  <span class="text-sm font-medium text-ink">{{ s.label }}</span>
                  <span class="text-sm font-bold">{{ s.count }} <span class="text-xs font-normal text-muted">({{ s.pct }}%)</span></span>
                </div>
                <div class="bg-surface-3 rounded-full h-2.5 overflow-hidden">
                  <div class="h-full rounded-full anim-bar" [style.width.%]="s.pct" [style.background]="s.color" [style.animationDelay]="200 + i * 90 + 'ms'"></div>
                </div>
              </div>
              <div *ngIf="loanStats().length === 0" class="empty-state sm:col-span-2"><p>No loans yet</p></div>
            </div>
          </div>

          <!-- Quick actions -->
          <div class="card">
            <h2 class="text-base mb-4">Quick Actions</h2>
            <div class="grid gap-2.5">
              <a routerLink="/loan-approvals" class="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm no-underline text-ink hover:border-primary hover:bg-primary-light transition">
                <span>Approve pending loans</span>
                <span class="badge badge-warning">{{ pendingLoans().length }}</span>
              </a>
              <a routerLink="/daire" class="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm no-underline text-ink hover:border-primary hover:bg-primary-light transition">
                <span>DAIRE data exchange</span>
                <span class="text-muted">&rsaquo;</span>
              </a>
              <a routerLink="/borrowers" class="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm no-underline text-ink hover:border-primary hover:bg-primary-light transition">
                <span>Browse borrowers</span>
                <span class="text-muted">&rsaquo;</span>
              </a>
              <a routerLink="/integration-settings" class="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm no-underline text-ink hover:border-primary hover:bg-primary-light transition">
                <span>Manage API keys</span>
                <span class="text-muted">&rsaquo;</span>
              </a>
            </div>
          </div>
        </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  borrowers = signal<Borrower[]>([]);
  pendingLoans = signal<Loan[]>([]);
  recentCreditResults = signal<CreditResult[]>([]);
  loading = signal(true);

  readonly totalAccounts = computed(() =>
    this.borrowers().reduce((s, b) => s + (b.account_information?.active_accounts || 0), 0)
  );
  readonly totalLoans = computed(() =>
    this.borrowers().reduce((s, b) => s + (b.loans?.filter(l => l.status === 'ACTIVE').length || 0), 0)
  );
  readonly totalBalance = computed(() =>
    this.borrowers().reduce((s, b) => s + (Number(b.account_information?.total_balance) || 0), 0)
  );
  readonly highRiskCount = computed(() =>
    this.recentCreditResults().filter(r => r.risk_level === 'HIGH').length
  );

  readonly loanStats = computed(() => {
    const allLoans = this.borrowers().flatMap(b => b.loans || []);
    const total = allLoans.length || 1;
    const statuses = ['ACTIVE', 'PENDING', 'PAID_OFF', 'DEFAULTED'];
    const colors = ['#1a56db', '#f59e0b', '#059669', '#dc2626'];
    return statuses.map((s, i) => {
      const count = allLoans.filter(l => l.status === s).length;
      return { label: s.replace('_', ' '), count, pct: Math.round(count / total * 100), color: colors[i] };
    }).filter(s => s.count > 0);
  });

  ngOnInit(): void {
    let done = 0;
    const total = 3;
    const checkDone = () => { if (++done === total) this.loading.set(false); };

    this.api.listBorrowers().subscribe({
      next: data => { this.borrowers.set(Array.isArray(data) ? data : []); checkDone(); },
      error: () => checkDone(),
    });

    this.api.listPendingLoans().subscribe({
      next: data => { this.pendingLoans.set(Array.isArray(data) ? data : []); checkDone(); },
      error: () => checkDone(),
    });

    this.api.getCreditResults().subscribe({
      next: data => { this.recentCreditResults.set(Array.isArray(data) ? data : []); checkDone(); },
      error: () => checkDone(),
    });
  }

  formatBalance(n: number): string {
    if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`;
    return `TZS ${n.toLocaleString()}`;
  }

  formatEmployment(s: string): string {
    const m: Record<string, string> = {
      EMPLOYED: 'Employed', SELF_EMPLOYED: 'Self-Employed',
      UNEMPLOYED: 'Unemployed', STUDENT: 'Student', RETIRED: 'Retired',
    };
    return m[s] ?? s;
  }

  initialsOf(name: string): string {
    return (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  scoreTile(score: number | null): string {
    if (!score) return 'bg-surface-3 text-muted';
    if (score >= 700) return 'bg-emerald-100 text-emerald-700';
    if (score >= 600) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  riskBadge(risk: string): string {
    const m: Record<string, string> = { LOW: 'badge-success', MEDIUM: 'badge-warning', HIGH: 'badge-danger' };
    return m[risk] ?? 'badge-neutral';
  }
}
