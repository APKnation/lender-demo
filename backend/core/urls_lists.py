"""List API URLs."""
from django.urls import path

from .views_lists import (
    AccountListView,
    BorrowerListView,
    LoanListView,
    LoanRepaymentListView,
    TransactionListView,
)

urlpatterns = [
    path("borrowers/list/", BorrowerListView.as_view(), name="borrower-list"),
    path("accounts/", AccountListView.as_view(), name="account-list"),
    path("transactions/", TransactionListView.as_view(), name="transaction-list"),
    path("loans/", LoanListView.as_view(), name="loan-list"),
    path("repayments/", LoanRepaymentListView.as_view(), name="repayment-list"),
]
