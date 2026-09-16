"""
Test configuration and base test case.

Uses Django's TestCase for transactional test isolation (fast).
Migration tests use TransactionTestCase separately.
"""
import hashlib
import json
import uuid
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from core.constants import (
    AccountStatus,
    AccountType,
    AuditAction,
    AuditStatus,
    Currency,
    DefaultStatus,
    EmploymentStatus,
    FrequencyType,
    Gender,
    LoanStatus,
    Role,
    TransactionDirection,
    TransactionStatus,
    TransactionType,
)
from core.models import (
    Account,
    AccountBalanceHistory,
    AuditLog,
    Borrower,
    BusinessInformation,
    Consent,
    ConsentStatus,
    CreditResult,
    CustomUser,
    IntegrationCredential,
    Institution,
    Loan,
    LoanRepayment,
    Transaction,
    hash_api_key,
    hash_sensitive,
)

User = get_user_model()


class LenderTestCase(TestCase):
    """
     Base test case using Django's TestCase (transactional rollback).
    """

    serialized_rollback = True

    @classmethod
    def setUpTestData(cls):
        # Institution
        cls.institution = Institution.objects.create(
            lender_id="NMB-001",
            name="NMB Bank",
            institution_type="COMMERCIAL_BANK",
            country_code="TZ",
            currency=Currency.TZS,
            central_system_url="http://localhost:8000",
        )

        # Staff users
        cls.admin = User.objects.create_superuser(
            email="admin@test.local", password="TestPass123!",
            full_name="Admin", role=Role.ADMIN,
        )
        cls.data_officer = User.objects.create_user(
            email="officer@test.local", password="TestPass123!",
            full_name="Officer", role=Role.DATA_OFFICER,
        )
        cls.auditor = User.objects.create_user(
            email="auditor@test.local", password="TestPass123!",
            full_name="Auditor", role=Role.AUDITOR,
        )
        cls.read_only = User.objects.create_user(
            email="ro@test.local", password="TestPass123!",
            full_name="RO", role=Role.READ_ONLY,
        )

        # Integration credential (API key)
        cls.credential, cls.api_key_plaintext = IntegrationCredential.create_key(
            name="DAIRE Central Test",
            role=Role.CENTRAL_SYSTEM,
            institution=cls.institution,
            permissions=["pull", "push"],
            lender_id="NMB-001",
        )

    def setUp(self):
        # Create borrowers used across tests
        self.borrower1 = self._create_borrower(
            "BRW-TZ-1001", "NMB-CUST-0001", "Amina Juma",
            age=29, gender=Gender.FEMALE,
            employment_status=EmploymentStatus.EMPLOYED,
            income=Decimal("1200000.00"),
        )
        self.borrower2 = self._create_borrower(
            "BRW-TZ-1002", "NMB-CUST-0002", "David Mrema",
            age=42, gender=Gender.MALE,
            employment_status=EmploymentStatus.SELF_EMPLOYED,
            income=Decimal("2500000.00"),
        )
        # Inactive borrower
        self.borrower3 = self._create_borrower(
            "BRW-TZ-1003", "NMB-CUST-0003", "Fatuma Hassan",
            age=35, gender=Gender.FEMALE,
            employment_status=EmploymentStatus.EMPLOYED,
            income=Decimal("850000.00"),
            is_active=False,
        )

        # Accounts
        self.account1 = Account.objects.create(
            account_reference="ACC-NMB-0001",
            borrower=self.borrower1,
            account_name="Amina Savings",
            account_type=AccountType.SAVINGS,
            currency=Currency.TZS,
            customer_since="2024-01-01",
            status=AccountStatus.ACTIVE,
            balance=Decimal("500000.00"),
            savings=Decimal("150000.00"),
            transaction_frequency=FrequencyType.MONTHLY,
            income_frequency=FrequencyType.MONTHLY,
            balance_stability="STABLE",
        )
        self.account2 = Account.objects.create(
            account_reference="ACC-NMB-0002",
            borrower=self.borrower2,
            account_name="David Checking",
            account_type=AccountType.CHECKING,
            currency=Currency.TZS,
            customer_since="2024-01-01",
            status=AccountStatus.ACTIVE,
            balance=Decimal("1000000.00"),
            savings=Decimal("300000.00"),
            transaction_frequency=FrequencyType.WEEKLY,
            income_frequency=FrequencyType.MONTHLY,
            balance_stability="VOLATILE",
        )

        # Transactions
        Transaction.objects.create(
            transaction_id="TXN-001",
            account=self.account1,
            transaction_date="2026-01-15T10:00:00Z",
            value_date="2026-01-15",
            type=TransactionType.DEPOSIT,
            category="SALARY",
            description="Monthly salary deposit",
            amount=Decimal("500000.00"),
            currency=Currency.TZS,
            direction=TransactionDirection.CREDIT,
            balance_after=Decimal("500000.00"),
            counterparty="Employer Ltd",
            status=TransactionStatus.POSTED,
        )
        Transaction.objects.create(
            transaction_id="TXN-002",
            account=self.account1,
            transaction_date="2026-01-16T09:00:00Z",
            value_date="2026-01-16",
            type=TransactionType.WITHDRAWAL,
            category="CASH",
            description="ATM withdrawal",
            amount=Decimal("50000.00"),
            currency=Currency.TZS,
            direction=TransactionDirection.DEBIT,
            balance_after=Decimal("450000.00"),
            counterparty="ATM",
            status=TransactionStatus.POSTED,
        )

        # Balance history
        AccountBalanceHistory.objects.create(
            account=self.account1,
            recorded_at="2026-01-01",
            balance=Decimal("200000.00"),
        )
        AccountBalanceHistory.objects.create(
            account=self.account1,
            recorded_at="2026-01-15",
            balance=Decimal("500000.00"),
        )

        # Loan + repayment
        self.loan1 = Loan.objects.create(
            loan_id="LOAN-NMB-001",
            account=self.account1,
            borrower=self.borrower1,
            loan_amount=Decimal("2000000.00"),
            loan_date="2026-01-01",
            loan_duration_months=24,
            interest_rate=Decimal("8.50"),
            outstanding_balance=Decimal("1200000.00"),
            currency=Currency.TZS,
            status=LoanStatus.ACTIVE,
        )
        self.repayment1 = LoanRepayment.objects.create(
            loan=self.loan1,
            borrower=self.borrower1,
            repayment_amount=Decimal("90000.00"),
            repayment_date="2026-01-01",
            due_date="2026-01-01",
            days_overdue=0,
            missed_payments=0,
            late_payments=0,
            default_status=DefaultStatus.CURRENT,
            currency=Currency.TZS,
        )

        # Business information
        self.business_info = BusinessInformation.objects.create(
            borrower=self.borrower2,
            business_name="David Mrema General Trading",
            registration_number="REG-12345",
            business_type="Sole Proprietorship",
            industry="Retail",
            year_established=2020,
            annual_revenue=Decimal("6000000.00"),
            currency=Currency.TZS,
        )

        # Consent
        self.consent = Consent.objects.create(
            borrower=self.borrower1,
            consent_id="CON-NMB-001",
            scope=["income", "accounts", "loans", "repayments"],
            granted_at="2026-01-01T00:00:00Z",
            expires_at="2027-01-01T00:00:00Z",
            status=ConsentStatus.GRANTED,
            granted_by=self.admin,
        )

    # ---------------------------------------------------------------- #
    #  Helpers
    # ---------------------------------------------------------------- #
    def _create_borrower(self, ref, cust_id, name, age=30, gender=Gender.MALE,
                         employment_status=EmploymentStatus.EMPLOYED,
                         income=Decimal("500000.00"), currency=Currency.TZS,
                         is_active=True, phone="+255 700 000 000",
                         email="test@example.com"):
        return Borrower.objects.create(
            borrower_reference=ref,
            customer_id=cust_id,
            full_name=name,
            age=age,
            gender=gender,
            phone=phone,
            email=email,
            national_id_hash=hash_sensitive("123-456-789"),
            employment_status=employment_status,
            income=income,
            currency=currency,
            is_active=is_active,
            institution=self.institution,
        )

    def _api_key_headers(self):
        return {"Authorization": f"Bearer {self.api_key_plaintext}"}

    def _jwt_headers(self, user=None):
        if user is None:
            user = self.admin
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return {"Authorization": f"Bearer {refresh.access_token}"}
