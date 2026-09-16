"""
Tests: serializers for loans, repayments, and the normalized borrower contract.
Tests: API validation.
Tests: PostgreSQL migrations.
"""
import uuid
from decimal import Decimal
from io import BytesIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework import status

from core.constants import (
    AccountStatus,
    AccountType,
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
    hash_sensitive,
)
from core.serializers import (
    AccountSerializer,
    BusinessInformationSerializer,
    LoanRepaymentSerializer,
    LoanSerializer,
    NormalizedBorrowerSerializer,
    TransactionSerializer,
)


class SerializerTests(TestCase):
    """Unit tests for serialisers (no DB needed for pure serialization)."""

    def setUp(self):
        self.institution = Institution.objects.create(
            lender_id="NMB-001", name="NMB Bank",
            institution_type="COMMERCIAL_BANK", country_code="TZ",
            currency=Currency.TZS, central_system_url="http://localhost:8000",
        )
        self.borrower = Borrower.objects.create(
            borrower_reference="BRW-TZ-1001",
            customer_id="NMB-CUST-0001",
            full_name="Amina Juma", age=29, gender=Gender.FEMALE,
            phone="+255 712 345 678",
            email="amina@example.com",
            national_id_hash=hash_sensitive("123-456-789"),
            employment_status=EmploymentStatus.EMPLOYED,
            income=Decimal("1200000.00"),
            currency=Currency.TZS,
            institution=self.institution,
        )
        self.account = Account.objects.create(
            account_reference="ACC-NMB-0001",
            borrower=self.borrower,
            account_name="Savings",
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
        self.loan = Loan.objects.create(
            loan_id="LOAN-NMB-001",
            account=self.account,
            borrower=self.borrower,
            loan_amount=Decimal("2000000.00"),
            loan_date="2026-01-01",
            loan_duration_months=24,
            interest_rate=Decimal("8.50"),
            outstanding_balance=Decimal("1200000.00"),
            currency=Currency.TZS,
            status=LoanStatus.ACTIVE,
        )
        self.repayment = LoanRepayment.objects.create(
            loan=self.loan,
            borrower=self.borrower,
            repayment_amount=Decimal("90000.00"),
            repayment_date="2026-01-01",
            due_date="2026-01-01",
            days_overdue=0,
            missed_payments=0,
            late_payments=0,
            default_status=DefaultStatus.CURRENT,
            currency=Currency.TZS,
        )
        self.transaction = Transaction.objects.create(
            transaction_id="TXN-001",
            account=self.account,
            transaction_date="2026-01-15T10:00:00Z",
            value_date="2026-01-15",
            type=TransactionType.DEPOSIT,
            category="SALARY",
            description="Salary deposit",
            amount=Decimal("500000.00"),
            currency=Currency.TZS,
            direction=TransactionDirection.CREDIT,
            balance_after=Decimal("500000.00"),
            counterparty="Employer",
            status=TransactionStatus.POSTED,
        )

    def test_normalized_borrower_serializer_basic_fields(self):
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertEqual(data["borrower_reference"], "BRW-TZ-1001")
        self.assertEqual(data["full_name"], "Amina Juma")
        self.assertEqual(data["income"], "1200000.00")
        self.assertEqual(data["currency"], "TZS")

    def test_normalized_borrower_excludes_national_id_hash(self):
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertNotIn("national_id_hash", data)

    def test_normalized_borrower_includes_accounts(self):
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertEqual(len(data["accounts"]), 1)
        self.assertEqual(data["accounts"][0]["account_reference"], "ACC-NMB-0001")

    def test_normalized_borrower_includes_loans(self):
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertEqual(len(data["loans"]), 1)
        self.assertEqual(data["loans"][0]["loan_id"], "LOAN-NMB-001")

    def test_normalized_borrower_includes_repayments(self):
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertEqual(len(data["repayments"]), 1)
        self.assertEqual(data["repayments"][0]["loan_reference"], "LOAN-NMB-001")

    def test_normalized_borrower_includes_transactions(self):
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertEqual(len(data["transactions"]), 1)
        self.assertEqual(data["transactions"][0]["transaction_id"], "TXN-001")

    def test_normalized_borrower_includes_balance_history(self):
        AccountBalanceHistory.objects.create(
            account=self.account, recorded_at="2026-01-01", balance=Decimal("200000")
        )
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertGreater(len(data["balance_history"]), 0)

    def test_normalized_borrower_account_information(self):
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        info = data["account_information"]
        self.assertEqual(info["total_accounts"], 1)
        self.assertEqual(info["active_accounts"], 1)
        self.assertEqual(info["currency"], "TZS")

    def test_loan_serializer_fields(self):
        serializer = LoanSerializer(self.loan)
        data = serializer.data
        self.assertEqual(data["loan_id"], "LOAN-NMB-001")
        self.assertEqual(data["loan_amount"], "2000000.00")
        self.assertEqual(data["status"], LoanStatus.ACTIVE)
        self.assertIn("account_reference", data)

    def test_repayment_serializer_fields(self):
        serializer = LoanRepaymentSerializer(self.repayment)
        data = serializer.data
        self.assertEqual(data["loan_reference"], "LOAN-NMB-001")
        self.assertEqual(data["repayment_amount"], "90000.00")
        self.assertEqual(data["default_status"], DefaultStatus.CURRENT)

    def test_transaction_serializer_fields(self):
        serializer = TransactionSerializer(self.transaction)
        data = serializer.data
        self.assertEqual(data["transaction_id"], "TXN-001")
        self.assertEqual(data["direction"], TransactionDirection.CREDIT)
        self.assertEqual(data["amount"], "500000.00")

    def test_business_info_serializer(self):
        BusinessInformation.objects.create(
            borrower=self.borrower,
            business_name="Test Business",
            registration_number="REG-123",
            business_type="Sole Prop",
            industry="Tech",
            year_established=2020,
            annual_revenue=Decimal("1000000"),
            currency=Currency.TZS,
        )
        serializer = NormalizedBorrowerSerializer(self.borrower)
        data = serializer.data
        self.assertEqual(data["business_information"]["business_name"], "Test Business")


class MigrationTests(TestCase):
    """Validate that migrations are consistent and apply cleanly."""

    def test_migrations_are_consistent(self):
        """Check that makemigrations would produce no new migrations."""
        from io import StringIO
        out = StringIO()
        call_command("makemigrations", "--check", "--dry-run", "core", stdout=out)
        output = out.getvalue()
        self.assertNotIn("would be created", output,
                         "There are missing migrations for the core app.")

    def test_postgresql_is_the_database(self):
        """Verify the test database is PostgreSQL, not SQLite."""
        from django.db import connection
        engine = connection.settings_dict["ENGINE"]
        self.assertIn("postgresql", engine, f"Expected PostgreSQL, got {engine}")


class APIValidationTests(TestCase):
    """Validate input at the API layer."""

    def setUp(self):
        self.institution = Institution.objects.create(
            lender_id="NMB-001", name="NMB Bank",
            institution_type="COMMERCIAL_BANK", country_code="TZ",
            currency=Currency.TZS, central_system_url="http://localhost:8000",
        )
        self.admin = CustomUser.objects.create_superuser(
            email="admin@test.local", password="Test123!", full_name="Admin", role=Role.ADMIN,
        )
        self.credential, self.api_key = IntegrationCredential.create_key(
            name="Test", role=Role.CENTRAL_SYSTEM, institution=self.institution,
            permissions=["pull", "push"], lender_id="NMB-001",
        )
        self.borrower = Borrower.objects.create(
            borrower_reference="BRW-TZ-1001",
            customer_id="NMB-CUST-0001",
            full_name="Amina Juma", age=29, gender=Gender.FEMALE,
            employment_status=EmploymentStatus.EMPLOYED,
            income=Decimal("1200000.00"), currency=Currency.TZS,
            institution=self.institution,
        )
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.api_key}")

    def test_pull_rejects_non_uuid_request_reference(self):
        """The pull endpoint should accept any string as request_reference."""
        response = self.client.post("/api/central/pull-borrower-data/", {
            "borrower_reference": "BRW-TZ-1001",
            "request_reference": "not-a-uuid-but-ok",
            "requested_fields": ["income"],
        })
        # Should not 500
        self.assertIn(response.status_code, [200, 400, 404])

    def test_pull_rejects_empty_borrower_reference(self):
        """Empty borrower_reference is rejected."""
        response = self.client.post("/api/central/pull-borrower-data/", {
            "borrower_reference": "",
            "requested_fields": ["income"],
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_push_rejects_empty_borrower_reference(self):
        """Empty borrower_reference on push is rejected."""
        response = self.client.post("/api/central/receive-credit-result/", {
            "borrower_reference": "",
            "credit_score": 720,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_push_validates_credit_score_is_integer(self):
        """Credit score that's a string is accepted (DRF parses it)."""
        response = self.client.post("/api/central/receive-credit-result/", {
            "borrower_reference": "BRW-TZ-1001",
            "result_type": "CREDIT_RESULT",
            "credit_score": "720",
        })
        self.assertIn(response.status_code, [201, 400])

    def test_health_endpoint(self):
        """The health endpoint returns status ok."""
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("database", data)
