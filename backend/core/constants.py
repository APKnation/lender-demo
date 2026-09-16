"""
Constants, enumerations and choices shared across the Lender Subsystem.
"""
from django.db import models


class Currency(models.TextChoices):
    TZS = "TZS", "Tanzanian Shilling"
    KES = "KES", "Kenyan Shilling"
    USD = "USD", "US Dollar"
    EUR = "EUR", "Euro"
    UGX = "UGX", "Ugandan Shilling"


class Gender(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    OTHER = "OTHER", "Other"
    NOT_DISCLOSED = "NOT_DISCLOSED", "Prefer not to say"


class EmploymentStatus(models.TextChoices):
    EMPLOYED = "EMPLOYED", "Employed"
    SELF_EMPLOYED = "SELF_EMPLOYED", "Self-employed"
    UNEMPLOYED = "UNEMPLOYED", "Unemployed"
    STUDENT = "STUDENT", "Student"
    RETIRED = "RETIRED", "Retired"
    OTHER = "OTHER", "Other"


class InstitutionType(models.TextChoices):
    COMMERCIAL_BANK = "COMMERCIAL_BANK", "Commercial Bank"
    MICROFINANCE = "MICROFINANCE", "Microfinance Institution"
    SACCO = "SACCO", "Savings & Credit Cooperative"
    MOBILE_MONEY = "MOBILE_MONEY", "Mobile Money Provider"
    CRDB = "CRDB", "CRDB"
    NMB = "NMB", "NMB"
    MPESA = "M_PESA", "M-Pesa"
    MIXX_BY_YAS = "MIXX_BY_YAS", "Mixx By Yas"


class AccountType(models.TextChoices):
    SAVINGS = "SAVINGS", "Savings"
    CHECKING = "CHECKING", "Checking"
    BUSINESS = "BUSINESS", "Business"
    FIXED_DEPOSIT = "FIXED_DEPOSIT", "Fixed Deposit"


class AccountStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    CLOSED = "CLOSED", "Closed"
    FROZEN = "FROZEN", "Frozen"


class TransactionType(models.TextChoices):
    DEPOSIT = "DEPOSIT", "Deposit"
    WITHDRAWAL = "WITHDRAWAL", "Withdrawal"
    TRANSFER_IN = "TRANSFER_IN", "Transfer In"
    TRANSFER_OUT = "TRANSFER_OUT", "Transfer Out"
    LOAN_DISBURSED = "LOAN_DISBURSED", "Loan Disbursed"
    LOAN_REPAID = "LOAN_REPAID", "Loan Repaid"
    INTEREST = "INTEREST", "Interest"
    FEE = "FEE", "Fee"
    OTHER = "OTHER", "Other"


class TransactionDirection(models.TextChoices):
    CREDIT = "CREDIT", "Credit"
    DEBIT = "DEBIT", "Debit"


class TransactionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    POSTED = "POSTED", "Posted"
    REVERSED = "REVERSED", "Reversed"
    FAILED = "FAILED", "Failed"


class LoanStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PAID_OFF = "PAID_OFF", "Paid Off"
    DEFAULTED = "DEFAULTED", "Defaulted"
    CLOSED = "CLOSED", "Closed"
    PENDING = "PENDING", "Pending Disbursement"


class DefaultStatus(models.TextChoices):
    CURRENT = "CURRENT", "Current"
    DELINQUENT = "DELINQUENT", "Delinquent"
    DEFAULTED = "DEFAULTED", "Defaulted"
    WRITTEN_OFF = "WRITTEN_OFF", "Written Off"


class BalanceStability(models.TextChoices):
    STABLE = "STABLE", "Stable"
    VOLATILE = "VOLATILE", "Volatile"
    DECLINING = "DECLINING", "Declining"
    INCREASING = "INCREASING", "Increasing"


class FrequencyType(models.TextChoices):
    DAILY = "DAILY", "Daily"
    WEEKLY = "WEEKLY", "Weekly"
    BI_WEEKLY = "BI_WEEKLY", "Bi-weekly"
    MONTHLY = "MONTHLY", "Monthly"
    QUARTERLY = "QUARTERLY", "Quarterly"
    YEARLY = "YEARLY", "Yearly"
    IRREGULAR = "IRREGULAR", "Irregular"


class BusinessEntitySize(models.TextChoices):
    MICRO = "MICRO", "Micro"
    SMALL = "SMALL", "Small"
    MEDIUM = "MEDIUM", "Medium"
    LARGE = "LARGE", "Large"


class AuditStatus(models.TextChoices):
    SUCCESS = "SUCCESS", "Success"
    FAILURE = "FAILURE", "Failure"
    PARTIAL = "PARTIAL", "Partial"


class AuditAction(models.TextChoices):
    # Pull / push
    BORROWER_DATA_PULL = "BORROWER_DATA_PULL", "Borrower Data Pull"
    CREDIT_RESULT_PUSH = "CREDIT_RESULT_PUSH", "Credit Result Push"
    # Auth
    AUTH_FAILURE = "AUTH_FAILURE", "Authentication Failure"
    AUTH_SUCCESS = "AUTH_SUCCESS", "Authentication Success"
    # Lookups
    BORROWER_LOOKUP = "BORROWER_LOOKUP", "Borrower Lookup"
    BORROWER_NOT_FOUND = "BORROWER_NOT_FOUND", "Borrower Not Found"
    # Changes
    BORROWER_CREATED = "BORROWER_CREATED", "Borrower Created"
    BORROWER_UPDATED = "BORROWER_UPDATED", "Borrower Updated"
    BORROWER_ACTIVATED = "BORROWER_ACTIVATED", "Borrower Activated"
    BORROWER_DEACTIVATED = "BORROWER_DEACTIVATED", "Borrower Deactivated"
    LOAN_CREATED = "LOAN_CREATED", "Loan Created"
    LOAN_UPDATED = "LOAN_UPDATED", "Loan Updated"
    LOAN_REPAYMENT_ADDED = "LOAN_REPAYMENT_ADDED", "Loan Repayment Added"
    # System
    API_KEY_CREATED = "API_KEY_CREATED", "API Key Created"
    API_KEY_USED = "API_KEY_USED", "API Key Used"
    API_KEY_REVOKED = "API_KEY_REVOKED", "API Key Revoked"


class ConsentStatus(models.TextChoices):
    GRANTED = "GRANTED", "Granted"
    REVOKED = "REVOKED", "Revoked"
    EXPIRED = "EXPIRED", "Expired"


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrator"
    DATA_OFFICER = "DATA_OFFICER", "Data Officer"
    AUDITOR = "AUDITOR", "Auditor"
    READ_ONLY = "READ_ONLY", "Read-only User"
    CENTRAL_SYSTEM = "CENTRAL_SYSTEM", "DAIRE Central System"
    BORROWER = "BORROWER", "Borrower (Self-Service Portal)"
