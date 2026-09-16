"""
Borrower lookup and details views.

GET /api/borrowers/?borrower_reference=BRW-TZ-1001
"""
from rest_framework import generics, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .constants import AuditAction, AuditStatus
from .models import AuditLog, Borrower
from .permissions import IsAuthenticatedOrKey, IsReadOnly
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

    borrower_reference = None

    def get(self, request):
        reference = request.query_params.get("borrower_reference")
        if not reference:
            AuditLog.record(
                action=AuditAction.BORROWER_LOOKUP,
                status=AuditStatus.FAILURE,
                borrower_reference="",
                error_message="Missing borrower_reference parameter",
                source_ip=request.META.get("REMOTE_ADDR"),
                request_id=getattr(request, "correlation_id", ""),
                fields_requested=[],
                log_type="lookup",
            )
            return Response(
                {"detail": "borrower_reference query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        self.borrower_reference = reference

        try:
            borrower = self.get_queryset().get()
        except Borrower.DoesNotExist:
            AuditLog.record(
                action=AuditAction.BORROWER_NOT_FOUND,
                status=AuditStatus.FAILURE,
                borrower_reference=reference,
                error_message="Borrower was not found.",
                source_ip=request.META.get("REMOTE_ADDR"),
                request_id=getattr(request, "correlation_id", ""),
                fields_requested=[],
                log_type="lookup",
            )
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Determine caller identity
        identity = ""
        if request.user.is_authenticated:
            identity = getattr(request.user, "email", str(request.user))
        elif hasattr(request.user, "key_prefix"):
            identity = f"API key: {request.user.key_prefix}"

        AuditLog.record(
            action=AuditAction.BORROWER_DATA_PULL,
            status=AuditStatus.SUCCESS,
            borrower_reference=reference,
            identity=identity,
            source_ip=request.META.get("REMOTE_ADDR"),
            request_id=getattr(request, "correlation_id", ""),
            fields_requested=list(request.query_params.keys()),
            log_type="pull",
        )

        serializer = self.get_serializer(borrower)
        return Response(serializer.data, status=status.HTTP_200_OK)
