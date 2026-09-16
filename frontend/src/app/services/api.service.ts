import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Borrower {
  borrower_reference: string;
  customer_id: string;
  full_name: string;
  age: number;
  gender: string;
  is_active: boolean;
  employment_status: string;
  income: number;
  currency: string;
  business_information: any;
  account_information: any;
  accounts: Account[];
  transactions: Transaction[];
  balance_history: any[];
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

export interface AuditLog {
  action: string;
  status: string;
  log_type: string;
  borrower_reference: string;
  request_reference: string | null;
  identity: string;
  source_ip: string | null;
  request_id: string;
  correlation_id: string;
  timestamp: string;
  error_message: string;
  fields_requested: string[];
  fields_returned: string[];
  metadata: any;
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

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // --- Auth ---
  login(username: string, password: string): Observable<{ access: string; refresh: string }> {
    return this.http.post<{ access: string; refresh: string }>(
      `${this.baseUrl}/auth/token/`, { username, password }
    );
  }

  // --- Health ---
  health(): Observable<{ status: string; database: string }> {
    return this.http.get<{ status: string; database: string }>('/health/');
  }

  // --- Borrower (single lookup) ---
  getBorrower(reference: string): Observable<Borrower> {
    return this.http.get<Borrower>(
      `${this.baseUrl}/borrowers/?borrower_reference=${encodeURIComponent(reference)}`
    );
  }

  // --- Borrower list ---
  listBorrowers(): Observable<Borrower[]> {
    return this.http.get<Borrower[]>(`${this.baseUrl}/borrowers/list/`);
  }

  // --- Account list ---
  listAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/accounts/`);
  }

  // --- Transaction list ---
  listTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.baseUrl}/transactions/`);
  }

  // --- Loan list ---
  listLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.baseUrl}/loans/`);
  }

  // --- Repayment list ---
  listRepayments(): Observable<Repayment[]> {
    return this.http.get<Repayment[]>(`${this.baseUrl}/repayments/`);
  }

  // --- Central: Pull ---
  pullBorrowerData(payload: { borrower_reference: string; request_reference?: string; requested_fields?: string[] }): Observable<PullResponse> {
    return this.http.post<PullResponse>(`${this.baseUrl}/central/pull-borrower-data/`, payload);
  }

  // --- Central: Push ---
  pushCreditResult(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/central/receive-credit-result/`, payload);
  }

  // --- Credit Results ---
  getCreditResults(borrowerReference?: string): Observable<CreditResult[]> {
    const params = borrowerReference
      ? `?borrower_reference=${encodeURIComponent(borrowerReference)}`
      : '';
    return this.http.get<CreditResult[]>(`${this.baseUrl}/audit/credit-results/${params}`);
  }

  // --- Audit Logs ---
  getAuditLogs(params: Record<string, string> = {}): Observable<AuditLog[]> {
    const query = new URLSearchParams(params).toString();
    return this.http.get<AuditLog[]>(`${this.baseUrl}/audit/logs/?${query}`);
  }

  // --- Integration Credentials ---
  getCredentials(): Observable<IntegrationCredential[]> {
    return this.http.get<IntegrationCredential[]>(`${this.baseUrl}/audit/credentials/`);
  }
}
