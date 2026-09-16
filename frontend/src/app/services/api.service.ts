import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Borrower {
  borrower_reference: string;
  customer_id: string;
  full_name: string;
  age: number;
  gender: string;
  is_active?: boolean;
  employment_status: string;
  income: number;
  currency: string;
  business_information: any;
  account_information: {
    total_accounts: number;
    total_balance: number;
    currency: string;
    active_accounts: number;
  };
  accounts: Account[];
  transactions: Transaction[];
  balance_history: BalanceHistory[];
  loans: Loan[];
  repayments: Repayment[];
}

export interface Account {
  account_reference: string;
  account_name: string;
  account_type: string;
  currency: string;
  customer_since: string;
  status: string;
  balance: number;
  savings: number;
  transaction_frequency: string;
  income_frequency: string;
  balance_stability: string;
}

export interface Transaction {
  transaction_id: string;
  account_reference: string;
  transaction_date: string;
  value_date: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  direction: string;
  balance_after: number;
  counterparty: string;
  status: string;
}

export interface Loan {
  loan_id: string;
  account_reference: string;
  loan_amount: number;
  loan_date: string;
  loan_duration_months: number;
  interest_rate: number;
  outstanding_balance: number;
  currency: string;
  status: string;
  purpose?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string;
}

export interface Repayment {
  loan_reference: string;
  repayment_amount: number;
  repayment_date: string;
  due_date: string;
  days_overdue: number;
  missed_payments: number;
  late_payments: number;
  default_status: string;
  currency: string;
}

export interface BalanceHistory {
  account_reference: string;
  recorded_at: string;
  balance: number;
}

export interface CreditResult {
  borrower_reference: string;
  result_type: string;
  credit_score: number | null;
  reputation: string;
  risk_level: string;
  ruleset_version: string;
  model_version: string;
  transaction_hash: string;
  received_at: string;
  created_at: string;
}

export interface LoanReviewResponse {
  detail: string;
  loan: Loan;
}

export interface IntegrationCredential {
  name: string;
  lender_id: string;
  role: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface PullResponse {
  request_reference: string;
  status: string;
  data: Borrower;
}

export interface LoanApplicationPayload {
  amount: number;
  duration_months: number;
  purpose?: string;
}

export interface LoanApplicationResponse {
  loan_id: string;
  status: string;
  amount: string;
  currency: string;
  duration_months: number;
  message: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  // Auth
  login(email: string, password: string): Observable<{ access: string; refresh: string }> {
    return this.http.post<{ access: string; refresh: string }>(
      `${this.base}/auth/token/`, { email, password }
    );
  }

  // Health
  health(): Observable<{ status: string; database: string }> {
    return this.http.get<{ status: string; database: string }>('/health/');
  }

  // Borrowers
  listBorrowers(): Observable<Borrower[]> {
    return this.http.get<Borrower[]>(`${this.base}/borrowers/list/`);
  }

  getBorrower(reference: string): Observable<Borrower> {
    return this.http.get<Borrower>(
      `${this.base}/borrowers/?borrower_reference=${encodeURIComponent(reference)}`
    );
  }

  // Credit Results
  getCreditResults(borrowerReference?: string): Observable<CreditResult[]> {
    const params = borrowerReference
      ? `?borrower_reference=${encodeURIComponent(borrowerReference)}`
      : '';
    return this.http.get<CreditResult[]>(`${this.base}/audit/credit-results/${params}`);
  }

  // Integration Credentials
  getCredentials(): Observable<IntegrationCredential[]> {
    return this.http.get<IntegrationCredential[]>(`${this.base}/audit/credentials/`);
  }

  createCredential(name: string, role: string, permissions: string[], institution: number, lender_id = ''): Observable<any> {
    return this.http.post(`${this.base}/audit/credentials/`, { name, role, permissions, institution, lender_id });
  }

  // Loans / Accounts / Transactions
  listLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.base}/loans/`);
  }

  listAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.base}/accounts/`);
  }

  listTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.base}/transactions/`);
  }

  listRepayments(): Observable<Repayment[]> {
    return this.http.get<Repayment[]>(`${this.base}/repayments/`);
  }

  // Central
  pullBorrowerData(payload: { borrower_reference: string; request_reference?: string; requested_fields?: string[] }): Observable<PullResponse> {
    return this.http.post<PullResponse>(`${this.base}/central/pull-borrower-data/`, payload);
  }

  // Admin: loan review (manual approve / reject)
  listPendingLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.base}/admin/loans/pending/`);
  }

  reviewLoan(loanId: string, action: 'approve' | 'reject', notes = ''): Observable<LoanReviewResponse> {
    return this.http.post<LoanReviewResponse>(
      `${this.base}/admin/loans/${encodeURIComponent(loanId)}/review/`,
      { action, notes }
    );
  }

  // Admin: DAIRE data exchange
  daireRequestData(borrowerReference: string, requestedFields: string[] = []): Observable<any> {
    return this.http.post(`${this.base}/admin/daire/request-data/`, {
      borrower_reference: borrowerReference,
      requested_fields: requestedFields,
    });
  }

  // Borrower Portal
  portalMe(): Observable<Borrower> {
    return this.http.get<Borrower>(`${this.base}/portal/me/`);
  }

  portalApplyLoan(payload: LoanApplicationPayload): Observable<LoanApplicationResponse> {
    return this.http.post<LoanApplicationResponse>(`${this.base}/portal/loan-apply/`, payload);
  }
}
