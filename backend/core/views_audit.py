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


class IntegrationCredentialListView(generics.ListCreateAPIView):
    serializer_class = IntegrationCredentialSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return IntegrationCredential.objects.all()

    def create(self, request, *args, **kwargs):
        from rest_framework.response import Response
        from rest_framework import status
        
        name = request.data.get("name")
        role = request.data.get("role")
        permissions = request.data.get("permissions", [])
        
        # Get the institution of the current user
        institution = request.user.institution
        if not institution:
            return Response(
                {"detail": "User has no linked institution."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        if not name or not role:
            return Response(
                {"detail": "Name and role are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj, plaintext = IntegrationCredential.create_key(
            name=name,
            role=role,
            institution=institution,
            permissions=permissions,
            created_by=request.user
        )
        
        AuditLog.record(
            action="API_KEY_CREATED",
            status="SUCCESS",
            identity=request.user.email,
            log_type="system",
            metadata={"key_name": name, "role": role},
        )

        # Return the created object plus the one-time plaintext key
        data = self.get_serializer(obj).data
        data["plaintext_key"] = plaintext
        return Response(data, status=status.HTTP_201_CREATED)

