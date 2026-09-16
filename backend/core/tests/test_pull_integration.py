"""
Tests: data pull integration (POST /api/central/pull-borrower-data/).
"""
from rest_framework import status
from rest_framework.test import APIClient

from core.tests.base import LenderTestCase


class PullDataTests(LenderTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.api_key_plaintext}")
        self.pull_url = "/api/central/pull-borrower-data/"

    def _post(self, payload):
        return self.client.post(self.pull_url, payload, format="json")

    def test_successful_pull_returns_200(self):
        """A valid pull request returns 200 with borrower data."""
        response = self._post({
            "borrower_reference": "BRW-TZ-1001",
            "request_reference": "test-req-001",
            "requested_fields": ["income", "accounts", "loans", "repayments"],
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["data"]["borrower_reference"], "BRW-TZ-1001")
        self.assertIn("income", data["data"])
        self.assertIn("accounts", data["data"])

    def test_pull_returns_only_requested_fields(self):
        """The pull endpoint must only return requested fields."""
        response = self._post({
            "borrower_reference": "BRW-TZ-1001",
            "request_reference": "test-req-002",
            "requested_fields": ["loans"],
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        # Always-present base fields
        self.assertIn("borrower_reference", data)
        self.assertIn("full_name", data)
        self.assertIn("income", data)
        # Requested field
        self.assertIn("loans", data)
        # Non-requested field should be omitted
        self.assertNotIn("accounts", data)
        self.assertNotIn("transactions", data)
        self.assertNotIn("balance_history", data)
        self.assertNotIn("business_information", data)

    def test_pull_borrower_not_found(self):
        """Pull for non-existent borrower returns 404."""
        response = self._post({
            "borrower_reference": "BRW-TZ-9999",
            "request_reference": "test-req-003",
            "requested_fields": ["income"],
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pull_missing_borrower_reference(self):
        """Pull request without borrower_reference returns 400."""
        response = self._post({
            "request_reference": "test-req-004",
            "requested_fields": ["income"],
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pull_without_auth_fails(self):
        """Pull without API key fails."""
        self.client.credentials()
        response = self._post({
            "borrower_reference": "BRW-TZ-1001",
            "requested_fields": ["income"],
        })
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_pull_with_invalid_api_key_fails(self):
        """Pull with invalid API key fails."""
        self.client.credentials(HTTP_AUTHORIZATION="Bearer daire_invalid_key")
        response = self._post({
            "borrower_reference": "BRW-TZ-1001",
            "requested_fields": ["income"],
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pull_never_exposes_national_id_hash(self):
        """Pull response must never contain national_id_hash."""
        response = self._post({
            "borrower_reference": "BRW-TZ-1001",
            "requested_fields": ["income", "accounts"],
        })
        content = response.json()
        content_str = str(content)
        self.assertNotIn("national_id_hash", content_str)

    def test_pull_inactive_borrower_returns_404(self):
        """Pull for inactive borrower returns 404."""
        response = self._post({
            "borrower_reference": "BRW-TZ-1003",
            "requested_fields": ["income"],
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pull_with_request_reference(self):
        """Pull returns the request_reference provided by the caller."""
        response = self._post({
            "borrower_reference": "BRW-TZ-1001",
            "request_reference": "daire-req-uuid-123",
            "requested_fields": ["income"],
        })
        data = response.json()
        self.assertEqual(data["request_reference"], "daire-req-uuid-123")

    def test_admin_jwt_can_pull(self):
        """ADMIN users can send and receive data via the central endpoints."""
        self.client.credentials(HTTP_AUTHORIZATION=self._jwt_headers(self.admin)["Authorization"])
        response = self._post({
            "borrower_reference": "BRW-TZ-1001",
            "requested_fields": ["income"],
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
