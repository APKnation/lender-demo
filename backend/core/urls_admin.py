"""Admin operation URLs (loan review + DAIRE data exchange)."""
from django.urls import path

from .views_admin import (
    AdminDaireCreditResultsView,
    AdminDaireRequestDataView,
    AdminLoanReviewView,
    AdminPendingLoanListView,
)

urlpatterns = [
    path("loans/pending/", AdminPendingLoanListView.as_view(), name="admin-pending-loans"),
    path("loans/<str:loan_id>/review/", AdminLoanReviewView.as_view(), name="admin-loan-review"),
    path("daire/request-data/", AdminDaireRequestDataView.as_view(), name="admin-daire-request"),
    path("daire/credit-results/", AdminDaireCreditResultsView.as_view(), name="admin-daire-results"),
]
