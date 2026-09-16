"""
Audit & compliance viewing endpoints.
"""
from rest_framework import generics

from .constants import AuditAction, Role
from .models import AuditLog, CreditResult, IntegrationCredential
from .permissions import IsAdmin, IsAuditor, IsReadOnly
from .serializers import AuditLogSerializer, CreditResultSerializer, IntegrationCredentialSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin | IsAuditor]

    def get_queryset(self):
        qs = AuditLog.objects.all()
        ref = self.request.query_params.get("borrower_reference")
        action = self.request.query_params.get("action")
        status = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if ref:
            qs = qs.filter(borrower_reference__iexact=ref)
        if action:
            qs = qs.filter(action=action)
        if status:
            qs = qs.filter(status=status)
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)

        return qs[:500]


class AuditLogDetailView(generics.RetrieveAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin | IsAuditor]
    queryset = AuditLog.objects.all()
    lookup_field = "pk"


class CreditResultListView(generics.ListAPIView):
    serializer_class = CreditResultSerializer
    permission_classes = [IsAdmin | IsAuditor]

    def get_queryset(self):
        ref = self.request.query_params.get("borrower_reference")
        if ref:
            return CreditResult.objects.filter(borrower__borrower_reference=ref)
        return CreditResult.objects.all()


class IntegrationCredentialListView(generics.ListAPIView):
    serializer_class = IntegrationCredentialSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return IntegrationCredential.objects.all()
