"""
Borrower lookup and details views.

GET /api/borrowers/?borrower_reference=BRW-TZ-1001
"""
from rest_framework import generics, status
from rest_framework.response import Response

from .models import Borrower
from .permissions import IsAuthenticatedOrKey
from .serializers import NormalizedBorrowerSerializer


class BorrowerLookupView(generics.GenericAPIView):
    """
    Single-borrower lookup by canonical ``borrower_reference``.

    Only the exact reference is accepted – cross-customer leakage is
    structurally impossible because the queryset is always filtered by
    ``borrower_reference``.
    """

    serializer_class = NormalizedBorrowerSerializer
    permission_classes = [IsAuthenticatedOrKey]

    borrower_reference = None

    def get_queryset(self):
        return Borrower.objects.filter(
            borrower_reference=self.borrower_reference,
            is_active=True,
        ).prefetch_related(
            "accounts",
            "accounts__transactions",
            "accounts__balance_history",
            "loans",
            "loans__repayments",
            "business_info",
            "profile",
        )

    def get(self, request):
        reference = request.query_params.get("borrower_reference")
        if not reference:
            return Response(
                {"detail": "borrower_reference query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        self.borrower_reference = reference

        try:
            borrower = self.get_queryset().get()
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(borrower)
        return Response(serializer.data, status=status.HTTP_200_OK)
