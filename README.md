# DAIRE Lender Subsystem

A production-ready **Lender Subsystem** for the DAIRE Central System, built with
**Django 5 + Django REST Framework** (backend), **Angular 22** (dashboard),
and **PostgreSQL** (database).

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [Manual Setup](#manual-setup)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Data Model](#data-model)
- [Audit & Compliance](#audit--compliance)
- [Seed Data](#seed-data)
- [Tests](#tests)
- [Frontend](#frontend)
- [Security](#security)
- [curl Examples](#curl-examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Lender Subsystem is a single financial institution's connector to the
**DAIRE Central System**. It exposes standardised borrower data (accounts,
transactions, loans, repayments) and receives credit-score results back.

### Key Design Principles

1. **One canonical borrower reference** (`BRW-TZ-1001`) shared across all
   DAIRE-connected institutions.
2. **Never leak cross-customer data** – every query filters by exact
   `borrower_reference`.
3. **Configurable per institution** – set environment variables, no code changes.
4. **Full audit trail** – every pull, push, auth failure, and model change
   is logged with source IP, correlation ID, and timestamp.
5. **Secure by default** – hashed API keys, no raw sensitive data in API output,
   HTTPS-ready, rate limiting, CORS.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│           Docker Compose (docker-compose.yml)     │
├──────────────────────────────────────────────────┤
│  ┌─────────┐   ┌────────┐   ┌────────┐   ┌───────┐  │
│  │  Frontend│   │ Backend│   │   DB   │   │ Cache │  │
│  │  (Nginx)│──▶│ (Django)│──▶│ (Postgres) │ │ (Redis)│  │
│  │ Angular │   │   API  │   │          │   │        │  │
│  └─────────┘   └────────┘   └────────┘   └───────┘  │
└──────────────────────────────────────────────────┘
```

### Components

| Component | Technology | Description |
|-----------|-----------|-------------|
| API Server | Django 5 + DRF | REST API, auth, serialisers, throttling |
| Database | PostgreSQL | All persistent data |
| Cache | Redis | Rate-limit counters, session cache |
| Admin | Django Admin | Staff interface for data management |
| Dashboard | Angular 22 | Operations dashboard with 10+ pages |
| API Docs | drf-spectacular | Swagger/OpenAPI at `/api/docs/` |

---

## Quick Start (Docker Compose)

```bash
# 1. Copy the example environment file
cp .env.example .env

# 2. Edit .env and set your SECRET_KEY, DATABASE_URL, CENTRAL_API_KEY, etc.
#    (Defaults work out-of-the-box for local development.)

# 3. Build and start all services
docker compose up --build

# 4. Open your browser:
#    - API:      http://localhost:8000/health/
#    - Swagger:  http://localhost:8000/api/docs/swagger/
#    - Admin:    http://localhost:8000/admin/
#    - Dashboard: http://localhost:4200/
```

The backend entry point runs:
1. `python manage.py migrate`
2. `python manage.py seed_data --clear`
3. `gunicorn lender.wsgi:application`

---

## Manual Setup

### Prerequisites

- Python 3.12+
- PostgreSQL 16+
- Redis (optional, for caching)
- Node.js 22+ (for frontend development)

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit ../.env with your PostgreSQL credentials

# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Seed sample data
python manage.py seed_data

# Start development server
python manage.py runserver
```

---

## Configuration

All configuration is via **environment variables** — no code changes needed
to switch institutions.

| Variable | Default | Description |
|----------|---------|-------------|
| `LENDER_ID` | `NMB-001` | Unique institution identifier |
| `INSTITUTION_NAME` | `NMB Bank` | Display name for the institution |
| `INSTITUTION_TYPE` | `COMMERCIAL_BANK` | `COMMERCIAL_BANK`, `MICROFINANCE`, `SACCO`, `MOBILE_MONEY`, etc. |
| `BORROWER_REF_PREFIX` | `BRW-TZ` | Prefix for borrower references |
| `CENTRAL_API_KEY` | `replace-me` | API key shared with DAIRE Central System |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `SECRET_KEY` | `replace-me` | Django secret key (use a long random string in prod) |
| `DEBUG` | `False` | Django debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed host headers |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | CORS origins |
| `DJANGO_SUPERUSER_*` | — | Initial admin credentials |

### Switching Institutions

To configure for a different institution, simply change the environment
variables:

```bash
# CRDB
LENDER_ID=CRDB-001
INSTITUTION_NAME=CRDB Bank
INSTITUTION_TYPE=COMMERCIAL_BANK

# M-Pesa
LENDER_ID=MPESA-001
INSTITUTION_NAME=M-Pesa
INSTITUTION_TYPE=MOBILE_MONEY

# Microfinance
LENDER_ID=MF-001
INSTITUTION_NAME=Cooperative Microfinance
INSTITUTION_TYPE=MICROFINANCE
```

No core code changes are required.

---

## API Endpoints

### Health Check

```
GET /health/
```

```json
{
  "status": "ok",
  "database": "connected"
}
```

### Borrower Lookup

```
GET /api/borrowers/?borrower_reference=BRW-TZ-1001
```

**Headers:**
```
Authorization: Bearer <api-key>
Accept: application/json
```

**Response (200):**
```json
{
  "borrower_reference": "BRW-TZ-1001",
  "customer_id": "NMB-CUST-0001",
  "full_name": "Amina Juma",
  "age": 29,
  "gender": "FEMALE",
  "employment_status": "EMPLOYED",
  "income": 1200000.00,
  "currency": "TZS",
  "business_information": {},
  "account_information": {},
  "accounts": [ ... ],
  "transactions": [ ... ],
  "balance_history": [ ... ],
  "loans": [ ... ],
  "repayments": [ ... ]
}
```

**Not Found (404):**
```json
{
  "detail": "Borrower was not found."
}
```

### Data Pull (Central System → Lender)

```
POST /api/central/pull-borrower-data/
```

**Request:**
```json
{
  "borrower_reference": "BRW-TZ-1001",
  "request_reference": "uuid-here",
  "requested_fields": ["income", "accounts", "loans", "repayments"]
}
```

**Response (200):**
```json
{
  "request_reference": "uuid-here",
  "status": "SUCCESS",
  "data": { ... normalised borrower contract ... }
}
```

### Data Push (Lender → Central System)

```
POST /api/central/receive-credit-result/
```

**Request:**
```json
{
  "borrower_reference": "BRW-TZ-1001",
  "result_type": "CREDIT_RESULT",
  "credit_score": 720,
  "reputation": "GOOD",
  "risk_level": "LOW",
  "ruleset_version": "daire-rules-v2.1",
  "model_version": "daire-ai-v3",
  "transaction_hash": "0x...",
  "received_at": "2026-01-01T10:00:00Z"
}
```

**Response (201):**
```json
{
  "status": "RECEIVED",
  "result_reference": "42",
  "borrower_reference": "BRW-TZ-1001"
}
```

### Audit Log

```
GET /api/audit/logs/
```

Supports filters: `?borrower_reference=`, `?action=`, `?status=`,
`?date_from=`, `?date_to=`

### API Documentation

- **Swagger UI:**  http://localhost:8000/api/docs/swagger/
- **ReDoc:**        http://localhost:8000/api/docs/redoc/
- **Schema:**       http://localhost:8000/api/docs/

---

## Authentication

### API Key (Central System Integration)

The DAIRE Central System authenticates using an **API key** sent as a
bearer token:

```
Authorization: Bearer daire_xxxxxxxxxxxxxxxx
```

API keys are **hashed** (SHA-256) before storage — the plaintext key is
shown only once at creation time.

### JWT (Staff Dashboard)

Frontend users authenticate with JWT tokens:

```
POST /api/auth/token/
Content-Type: application/json

{
  "username": "admin@lender.local",
  "password": "admin-pass-123"
}
```

**Response:**
```json
{
  "refresh": "..."
}
```

---

## Data Model

```
Borrower ( borrower_reference, customer_id, full_name, age, gender,
           phone, email, national_id_hash, employment_status, income,
           currency, is_active )
    │
    ├── CustomerProfile (risk_score, kyc_status, date_of_birth, address, ...)
    ├── BusinessInformation (business_name, registration_number, ...)
    ├── Account (account_reference, account_name, account_type, balance, ...)
    │   ├── AccountBalanceHistory (recorded_at, balance)
    │   ├── Transaction (transaction_id, type, amount, direction, ...)
    │   └── Loan (loan_id, loan_amount, interest_rate, status, ...)
    │       └── LoanRepayment (repayment_amount, due_date, days_overdue, ...)
    ├── Consent (consent_id, scope, granted_at, expires_at, status)
    ├── CreditResult (credit_score, reputation, risk_level, ...)
    └── repayments (through Loan → Borrower)

IntegrationCredential ( API key hash, role, permissions )
AuditLog ( action, status, borrower_reference, source_ip, request_id, ... )
```

---

## Audit & Compliance

Every security-relevant action is recorded in the `AuditLog` table:

| Action | When |
|--------|------|
| `BORROWER_DATA_PULL` | Successful borrower data pull |
| `BORROWER_NOT_FOUND` | Borrower lookup failed |
| `CREDIT_RESULT_PUSH` | Credit score pushed by central system |
| `AUTH_FAILURE` | Failed authentication |
| `BORROWER_CREATED` | New borrower created |
| `BORROWER_UPDATED` | Borrower record updated |
| `BORROWER_ACTIVATED` | Borrower activated |
| `BORROWER_DEACTIVATED` | Borrower deactivated |
| `LOAN_CREATED` | New loan created |
| `LOAN_REPAYMENT_ADDED` | Repayment recorded |
| `API_KEY_USED` | API key used for authentication |

Each entry includes: identity, borrower_reference, action, source IP,
request/correlation ID, timestamp, status, error message, and fields
requested/returned.

---

## Seed Data

```bash
python manage.py seed_data
python manage.py seed_data --clear  # clears existing data first
```

Creates:
- 6 borrowers (5 active, 1 inactive)
- 12 accounts
- 60 transactions
- Loans and repayments
- Integration credentials (API keys)
- Consent records
- Audit logs (successful and failed pulls)
- Credit results

---

## Tests

```bash
# Quick test runner script
./run_tests.sh

# Or directly:
DJANGO_SETTINGS_MODULE=lender.test_settings python manage.py test core.tests -v 2

# With coverage
pip install pytest pytest-django pytest-cov
pytest
```

### Test Coverage

| Area | Test File |
|------|-----------|
| Borrower lookup, not found, cross-leakage | `test_borrower_lookup.py` |
| Authentication, permissions | `test_auth_permissions.py` |
| Data pull integration | `test_pull_integration.py` |
| Data push integration | `test_push_integration.py` |
| Audit logs, model changes | `test_audit_logs.py` |
| Serializers, migrations, validation | `test_serializers_migrations.py` |

---

## Frontend

```bash
cd frontend
npm install
ng serve --port 4200
```

Available pages:
- **Dashboard** – summary stats and recent activity
- **Borrowers** – searchable list
- **Borrower Details** – full normalized data view
- **Accounts** – all accounts
- **Transactions** – all transactions
- **Loans** – all loans
- **Repayments** – all loan repayments
- **Pull History** – audit log of pull requests
- **Credit Results** – received credit scores
- **Audit Logs** – full audit trail
- **Integration Settings** – API key management

---

## Security

- **PostgreSQL only** – SQLite is forbidden (enforced at settings load).
- **No hardcoded secrets** – all secrets via environment variables.
- **Hashed API keys** – API keys stored only as SHA-256 hashes.
- **National ID hashed** – stored as SHA-256, never returned in API output.
- **HTTPS ready** – `SECURE_SSL_REDIRECT`, secure cookies, HSTS.
- **Rate limiting** – burst (120/min), sustained (1000/hr), central pull (300/min).
- **COR** configuration – restrictable per institution.
- **IDOR prevention** – every query filters by exact borrower_reference.
- **CORS** – configurable allowed origins.
- **Correlation IDs** – every request gets an `X-Correlation-ID`.
- **Role-based permissions** – ADMIN, DATA_OFFICER, AUDITOR, READ_ONLY, CENTRAL_SYSTEM.
- **No destructive delete** – borrowers with financial history use deactivate/archive.

---

## curl Examples

### Health Check

```bash
curl http://localhost:8000/health/
```

### Borrower Lookup

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/api/borrowers/?borrower_reference=BRW-TZ-1001"
```

### Data Pull

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "borrower_reference": "BRW-TZ-1001",
    "request_reference": "uuid-123",
    "requested_fields": ["income", "accounts", "loans", "repayments"]
  }' \
  http://localhost:8000/api/central/pull-borrower-data/
```

### Data Push

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "borrower_reference": "BRW-TZ-1001",
    "result_type": "CREDIT_RESULT",
    "credit_score": 720,
    "reputation": "GOOD",
    "risk_level": "LOW",
    "ruleset_version": "daire-rules-v2.1",
    "model_version": "daire-ai-v3",
    "transaction_hash": "0xabc123...",
    "received_at": "2026-01-01T10:00:00Z"
  }' \
  http://localhost:8000/api/central/receive-credit-result/
```

### JWT Authentication

```bash
# Obtain token
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@lender.local", "password": "admin-pass-123"}' \
  http://localhost:8000/api/auth/token/

# Use token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/audit/logs/
```

### Swagger Documentation

```bash
# Open in browser
open http://localhost:8000/api/docs/swagger/
```

---

## Troubleshooting

### PostgreSQL connection refused

Make sure PostgreSQL is running and the `DATABASE_URL` environment variable
points to the correct host/port:

```bash
# Check if PostgreSQL is listening
pg_isready -h localhost -p 5432

# In Docker:
docker compose ps
docker compose logs db
```

### API key not accepted

1. Verify the key was copied exactly (it's shown once at creation).
2. Check that the key prefix matches: `daire_...`.
3. Ensure the `IntegrationCredential` is `is_active=True`.
4. Check the auth audit logs: `GET /api/audit/logs/?action=AUTH_FAILURE`

### Migrations fail

```bash
# Recreate from scratch
python manage.py migrate core zero
python manage.py migrate
python manage.py seed_data --clear
```

### CORS errors in frontend

Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL:

```
CORS_ALLOWED_ORIGINS=http://localhost:4200,http://localhost:8000
```

---

## License

Proprietary — developed for the DAIRE Central System integration.
