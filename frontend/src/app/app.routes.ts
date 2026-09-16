import { Routes } from '@angular/router';
import { authGuard, adminGuard, borrowerGuard } from './guards/auth.guard';

// Lazy-load all pages
const Dashboard = () => import('./pages/dashboard.component').then(m => m.DashboardComponent);
const Borrowers = () => import('./pages/borrowers.component').then(m => m.BorrowersComponent);
const BorrowerDetail = () => import('./pages/borrower-detail.component').then(m => m.BorrowerDetailComponent);
const Accounts = () => import('./pages/accounts.component').then(m => m.AccountsComponent);
const Transactions = () => import('./pages/transactions.component').then(m => m.TransactionsComponent);
const Loans = () => import('./pages/loans.component').then(m => m.LoansComponent);
const Repayments = () => import('./pages/repayments.component').then(m => m.RepaymentsComponent);
const PullHistory = () => import('./pages/pull-history.component').then(m => m.PullHistoryComponent);
const CreditResults = () => import('./pages/credit-results.component').then(m => m.CreditResultsComponent);
const AuditLogs = () => import('./pages/audit-logs.component').then(m => m.AuditLogsComponent);
const IntegrationSettings = () => import('./pages/integration-settings.component').then(m => m.IntegrationSettingsComponent);
const Login = () => import('./pages/login.component').then(m => m.LoginComponent);
const BorrowerPortal = () => import('./pages/borrower-portal.component').then(m => m.BorrowerPortalComponent);
const BorrowerApplyLoan = () => import('./pages/borrower-apply-loan.component').then(m => m.BorrowerApplyLoanComponent);

export const routes: Routes = [
  { path: 'login', loadComponent: Login },

  // Staff / Admin routes
  { path: '', loadComponent: Dashboard, canActivate: [adminGuard] },
  { path: 'borrowers', loadComponent: Borrowers, canActivate: [adminGuard] },
  { path: 'borrowers/:reference', loadComponent: BorrowerDetail, canActivate: [adminGuard] },
  { path: 'accounts', loadComponent: Accounts, canActivate: [adminGuard] },
  { path: 'transactions', loadComponent: Transactions, canActivate: [adminGuard] },
  { path: 'loans', loadComponent: Loans, canActivate: [adminGuard] },
  { path: 'repayments', loadComponent: Repayments, canActivate: [adminGuard] },
  { path: 'pull-history', loadComponent: PullHistory, canActivate: [adminGuard] },
  { path: 'credit-results', loadComponent: CreditResults, canActivate: [adminGuard] },
  { path: 'audit-logs', loadComponent: AuditLogs, canActivate: [adminGuard] },
  { path: 'integration-settings', loadComponent: IntegrationSettings, canActivate: [adminGuard] },

  // Borrower portal routes
  { path: 'portal', loadComponent: BorrowerPortal, canActivate: [borrowerGuard] },
  { path: 'portal/apply-loan', loadComponent: BorrowerApplyLoan, canActivate: [borrowerGuard] },

  { path: '**', redirectTo: '' },
];
