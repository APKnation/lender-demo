"""Admin operation URLs (loan review + DAIRE data exchange)."""
from django.urls import path

from .views_admin import (
    AdminDaireConnectionTestView,
    AdminDaireConnectionView,
    AdminDaireCreditResultsView,
    AdminDaireExchangeLogView,
    AdminDairePushDataView,
    AdminDaireRequestDataView,
    AdminLoanReviewView,
    AdminPendingLoanListView,
)

urlpatterns = [
    path("loans/pending/", AdminPendingLoanListView.as_view(), name="admin-pending-loans"),
    path("loans/<str:loan_id>/review/", AdminLoanReviewView.as_view(), name="admin-loan-review"),
    path("daire/request-data/", AdminDaireRequestDataView.as_view(), name="admin-daire-request"),
    path("daire/push-data/", AdminDairePushDataView.as_view(), name="admin-daire-push"),
    path("daire/exchange-log/", AdminDaireExchangeLogView.as_view(), name="admin-daire-exchange-log"),
    path("daire/credit-results/", AdminDaireCreditResultsView.as_view(), name="admin-daire-results"),
    path("daire/connection/", AdminDaireConnectionView.as_view(), name="admin-daire-connection"),
    path("daire/connection/test/", AdminDaireConnectionTestView.as_view(), name="admin-daire-connection-test"),
]
