"""
Compliance & integration viewing endpoints.

The audit-log endpoints were removed from the project; only credit
results (received from DAIRE) and integration credentials remain here.
"""
from rest_framework import generics

from .models import CreditResult, IntegrationCredential
from .permissions import IsAdmin, IsCentralSystemOrAdmin
from .serializers import CreditResultSerializer, IntegrationCredentialSerializer


class CreditResultListView(generics.ListAPIView):
    """Credit results received from the DAIRE Central System."""
    serializer_class = CreditResultSerializer
    permission_classes = [IsCentralSystemOrAdmin]

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

        from .models import IntegrationCredential

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

        # Return the created object plus the one-time plaintext key
        data = self.get_serializer(obj).data
        data["plaintext_key"] = plaintext
        return Response(data, status=status.HTTP_201_CREATED)
