"""
Tests: exact borrower_reference lookup and not-found scenarios.
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APIClient

from core.constants import AccountStatus, Currency
from core.tests.base import LenderTestCase


class BorrowerLookupTests(LenderTestCase):
    """GET /api/borrowers/?borrower_reference=BRW-TZ-1001"""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.api_key_plaintext}")

    def test_exact_borrower_lookup_returns_200(self):
        """Exact borrower_reference returns 200 with correct data."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-1001")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["borrower_reference"], "BRW-TZ-1001")
        self.assertEqual(data["full_name"], "Amina Juma")
        self.assertEqual(data["customer_id"], "NMB-CUST-0001")
        self.assertEqual(data["income"], "1200000.00")
        self.assertEqual(data["currency"], "TZS")

    def test_borrower_not_found_returns_404(self):
        """Non-existent borrower_reference returns 404."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-9999")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["detail"], "Borrower was not found.")

    def test_missing_borrower_reference_param_returns_400(self):
        """Missing borrower_reference query param returns 400."""
        response = self.client.get("/api/borrowers/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_borrower_not_found(self):
        """Inactive borrower returns 404 (not found, not 410)."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-1003")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_response_contains_normalized_contract(self):
        """Response includes all expected keys from the DAIRE contract."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-1001")
        data = response.json()
        expected_keys = {
            "borrower_reference", "customer_id", "full_name", "age", "gender",
            "employment_status", "income", "currency",
            "business_information", "account_information",
            "accounts", "transactions", "balance_history",
            "loans", "repayments",
        }
        self.assertEqual(set(data.keys()), expected_keys)

    def test_national_id_hash_not_exposed(self):
        """The national_id_hash must never appear in API output."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-1001")
        content = response.json()
        self.assertNotIn("national_id_hash", content)

    def test_internal_ids_not_exposed(self):
        """Internal database PKs must never appear in API output."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-1001")
        content = response.json()
        self.assertNotIn("id", content)
        if content["accounts"]:
            self.assertNotIn("id", content["accounts"][0])
        if content["loans"]:
            self.assertNotIn("id", content["loans"][0])

    def test_cross_borrower_data_leakage_prevention(self):
        """Lookup for borrower 1 must never include borrower 2's data."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-1001")
        data = response.json()
        # Verify all accounts belong to borrower 1 (ACC-NMB-0001), not borrower 2 (ACC-NMB-0002)
        for account in data["accounts"]:
            self.assertNotIn("ACC-NMB-0002", account.get("account_reference", ""))
        # Verify all loans belong to borrower 1 (LOAN-NMB-001 belongs to borrower 1)
        for loan in data["loans"]:
            self.assertEqual(loan.get("loan_id"), "LOAN-NMB-001")

    def test_borrower_reference_with_extra_whitespace(self):
        """Borrower reference with whitespace is not matched (exact match only)."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-1001 ")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_partial_borrower_reference_not_matched(self):
        """Partial borrower_reference must not match."""
        response = self.client.get("/api/borrowers/?borrower_reference=BRW-TZ-10")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
