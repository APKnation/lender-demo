"""Compliance & integration URLs (audit-log endpoints removed)."""
from django.urls import path

from .views_audit import CreditResultListView, IntegrationCredentialListView

urlpatterns = [
    path("credit-results/", CreditResultListView.as_view(), name="credit-results"),
    path("credentials/", IntegrationCredentialListView.as_view(), name="credentials"),
]
