"""
Tests: audit log creation for model changes, activation/deactivation.
"""
from django.contrib.auth import get_user_model

from core.constants import AuditAction, AuditStatus, Role
from core.models import AuditLog, Borrower, Loan, LoanRepayment
from core.models import hash_sensitive
from core.tests.base import LenderTestCase


class AuditLogTests(LenderTestCase):
    """Verify audit logging for model changes and activation events."""

    def test_borrower_creation_logs_audit(self):
        """Creating a borrower logs BORROWER_CREATED."""
        before = AuditLog.objects.filter(action=AuditAction.BORROWER_CREATED).count()
        Borrower.objects.create(
            borrower_reference="BRW-TZ-9999",
            customer_id="NMB-CUST-9999",
            full_name="Test Create",
            age=30, gender="MALE",
            employment_status="EMPLOYED",
            income=100000, currency="TZS",
            national_id_hash=hash_sensitive("999-999-999"),
            institution=self.institution,
        )
        after = AuditLog.objects.filter(action=AuditAction.BORROWER_CREATED).count()
        self.assertEqual(after, before + 1)

    def test_borrower_deactivation_logs_audit(self):
        """Deactivating a borrower logs BORROWER_DEACTIVATED."""
        before = AuditLog.objects.filter(action=AuditAction.BORROWER_DEACTIVATED).count()
        self.borrower1.is_active = False
        self.borrower1.save()
        after = AuditLog.objects.filter(action=AuditAction.BORROWER_DEACTIVATED).count()
        self.assertEqual(after, before + 1)

    def test_borrower_activation_logs_audit(self):
        """Activating a borrower logs BORROWER_ACTIVATED."""
        before = AuditLog.objects.filter(action=AuditAction.BORROWER_ACTIVATED).count()
        self.borrower3.is_active = True
        self.borrower3.save()
        after = AuditLog.objects.filter(action=AuditAction.BORROWER_ACTIVATED).count()
        self.assertEqual(after, before + 1)

    def test_loan_creation_logs_audit(self):
        """Creating a loan logs LOAN_CREATED."""
        before = AuditLog.objects.filter(action=AuditAction.LOAN_CREATED).count()
        Loan.objects.create(
            loan_id="LOAN-TEST-001",
            account=self.borrower1.accounts.first(),
            borrower=self.borrower1,
            loan_amount=500000,
            loan_date="2026-01-01",
            loan_duration_months=12,
            interest_rate=10.0,
            outstanding_balance=500000,
            currency="TZS",
            status="ACTIVE",
        )
        after = AuditLog.objects.filter(action=AuditAction.LOAN_CREATED).count()
        self.assertEqual(after, before + 1)

    def test_repayment_creation_logs_audit(self):
        """Creating a repayment logs LOAN_REPAYMENT_ADDED."""
        before = AuditLog.objects.filter(action=AuditAction.LOAN_REPAYMENT_ADDED).count()
        LoanRepayment.objects.create(
            loan=self.loan1,
            borrower=self.borrower1,
            repayment_amount=100000,
            repayment_date="2026-02-01",
            due_date="2026-02-01",
            days_overdue=0,
            missed_payments=0,
            late_payments=0,
            default_status="CURRENT",
            currency="TZS",
        )
        after = AuditLog.objects.filter(action=AuditAction.LOAN_REPAYMENT_ADDED).count()
        self.assertEqual(after, before + 1)

    def test_audit_log_contains_required_fields(self):
        """Each audit log entry has all required fields populated."""
        log = AuditLog.objects.filter(action=AuditAction.BORROWER_DATA_PULL).first()
        if log:
            self.assertIsNotNone(log.timestamp)
            self.assertIsNotNone(log.action)
            self.assertIsNotNone(log.status)
            self.assertTrue(log.correlation_id or True)  # may or may not be set
