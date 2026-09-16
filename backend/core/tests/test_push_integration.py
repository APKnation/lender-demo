"""
Tests: data push integration (POST /api/central/receive-credit-result/).
"""
from rest_framework import status
from rest_framework.test import APIClient

from core.constants import AuditAction, AuditStatus
from core.models import AuditLog, CreditResult
from core.tests.base import LenderTestCase


class PushDataTests(LenderTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.api_key_plaintext}")
        self.push_url = "/api/central/receive-credit-result/"

    def test_successful_push_returns_201(self):
        """A valid credit result push returns 201."""
        response = self.client.post(self.push_url, {
            "borrower_reference": "BRW-TZ-1001",
            "result_type": "CREDIT_RESULT",
            "credit_score": 720,
            "reputation": "GOOD",
            "risk_level": "LOW",
            "ruleset_version": "daire-rules-v2.1",
            "model_version": "daire-ai-v3",
            "transaction_hash": "0xabc123def456",
            "received_at": "2026-01-01T10:00:00Z",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["status"], "RECEIVED")

    def test_push_creates_credit_result(self):
        """A successful push creates a CreditResult record."""
        self.client.post(self.push_url, {
            "borrower_reference": "BRW-TZ-1001",
            "result_type": "CREDIT_RESULT",
            "credit_score": 720,
            "reputation": "GOOD",
            "risk_level": "LOW",
            "ruleset_version": "daire-rules-v2.1",
            "model_version": "daire-ai-v3",
            "transaction_hash": "0xabc123",
            "received_at": "2026-01-01T10:00:00Z",
        })
        result = CreditResult.objects.get(borrower=self.borrower1)
        self.assertEqual(result.credit_score, 720)
        self.assertEqual(result.reputation, "GOOD")
        self.assertEqual(result.risk_level, "LOW")
        self.assertTrue(result.transaction_hash.startswith("0x"))

    def test_push_borrower_not_found(self):
        """Push for non-existent borrower returns 404."""
        response = self.client.post(self.push_url, {
            "borrower_reference": "BRW-TZ-9999",
            "result_type": "CREDIT_RESULT",
            "credit_score": 720,
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_push_missing_borrower_reference(self):
        """Push without borrower_reference returns 400."""
        response = self.client.post(self.push_url, {
            "credit_score": 720,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_push_without_auth_fails(self):
        """Push without API key fails."""
        self.client.credentials()
        response = self.client.post(self.push_url, {
            "borrower_reference": "BRW-TZ-1001",
            "credit_score": 720,
        })
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_push_creates_audit_log(self):
        """A successful push creates an audit log entry."""
        self.client.post(self.push_url, {
            "borrower_reference": "BRW-TZ-1001",
            "result_type": "CREDIT_RESULT",
            "credit_score": 720,
            "reputation": "GOOD",
            "risk_level": "LOW",
        })
        log = AuditLog.objects.filter(
            action=AuditAction.CREDIT_RESULT_PUSH,
            borrower_reference="BRW-TZ-1001",
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, AuditStatus.SUCCESS)

    def test_push_failed_creates_audit_log(self):
        """A failed push (borrower not found) creates an audit log."""
        self.client.post(self.push_url, {
            "borrower_reference": "BRW-TZ-9999",
            "result_type": "CREDIT_RESULT",
            "credit_score": 720,
        })
        log = AuditLog.objects.filter(
            action=AuditAction.CREDIT_RESULT_PUSH,
            borrower_reference="BRW-TZ-9999",
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, AuditStatus.FAILURE)

    def test_push_never_exposes_internal_ids(self):
        """Push response must not expose internal database IDs."""
        response = self.client.post(self.push_url, {
            "borrower_reference": "BRW-TZ-1001",
            "result_type": "CREDIT_RESULT",
            "credit_score": 720,
        })
        data = response.json()
        self.assertNotIn("id", data)
        self.assertNotIn("internal_id", data)
