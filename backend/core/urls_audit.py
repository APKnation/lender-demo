"""Audit & compliance URLs."""
from django.urls import path

from .views_audit import (
    AuditLogDetailView,
    AuditLogListView,
    CreditResultListView,
    IntegrationCredentialListView,
)

urlpatterns = [
    path("logs/", AuditLogListView.as_view(), name="audit-logs"),
    path("logs/<int:pk>/", AuditLogDetailView.as_view(), name="audit-log-detail"),
    path("credit-results/", CreditResultListView.as_view(), name="credit-results"),
    path("credentials/", IntegrationCredentialListView.as_view(), name="credentials"),
]
