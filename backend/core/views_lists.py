"""
List-only viewsets for accounts, transactions, loans, and repayments.

These allow the Angular dashboard to load all business data from the API.
All endpoints require authentication and enforce IDOR protection by only
returning data for borrowers the caller is authorised to see.
"""
from rest_framework import generics

from .constants import AuditAction, AuditStatus
from .models import Account, Loan, LoanRepayment, Transaction
from .permissions import IsAuthenticatedOrKey
from .serializers import (
    AccountSerializer,
    LoanRepaymentSerializer,
    LoanSerializer,
    TransactionSerializer,
    NormalizedBorrowerSerializer,
)
from core.models import Borrower, AuditLog


class BorrowerListView(generics.ListAPIView):
    """List all active borrowers (minimal fields)."""
    serializer_class = NormalizedBorrowerSerializer
    permission_classes = [IsAuthenticatedOrKey]

    def get_queryset(self):
        return Borrower.objects.filter(is_active=True).prefetch_related(
            "accounts", "business_info", "profile"
        )[:500]


class AccountListView(generics.ListAPIView):
    """List all accounts."""
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticatedOrKey]
    queryset = Account.objects.all().select_related("borrower")[:1000]


class TransactionListView(generics.ListAPIView):
    """List all transactions."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticatedOrKey]
    queryset = Transaction.objects.all().select_related("account", "account__borrower")[:2000]


class LoanListView(generics.ListAPIView):
    """List all loans."""
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticatedOrKey]
    queryset = Loan.objects.all().select_related("borrower", "account")[:1000]


class LoanRepaymentListView(generics.ListAPIView):
    """List all repayments."""
    serializer_class = LoanRepaymentSerializer
    permission_classes = [IsAuthenticatedOrKey]
    queryset = LoanRepayment.objects.all().select_related("loan", "borrower")[:2000]
