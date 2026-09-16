"""
DAIRE Central System integration endpoints.

POST /api/central/pull-borrower-data/   – secure borrower-data pull
POST /api/central/receive-credit-result/ – secure credit-result push
"""
from django.utils import timezone
from rest_framework import status, views
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

from .models import Borrower, CreditResult, IntegrationCredential
from .permissions import IsAuthenticatedOrKey
from .serializers import NormalizedBorrowerSerializer


def _get_identity(request):
    if request.user.is_authenticated:
        return getattr(request.user, "email", str(request.user))
    if hasattr(request.user, "key_prefix"):
        return f"API key: {request.user.key_prefix}"
    return ""


class PullBorrowerDataView(views.APIView):
    """
    Secure data-pull endpoint called by the DAIRE Central System.

    Validates the caller (API key or ADMIN user), verifies the borrower
    reference, and returns only the requested fields.
    """

    permission_classes = [IsAuthenticatedOrKey]

    @extend_schema(
        tags=["central"],
        request=OpenApiTypes.OBJECT,
        responses={200: NormalizedBorrowerSerializer},
        examples=[
            OpenApiExample(
                "Pull request",
                value={
                    "borrower_reference": "BRW-TZ-1001",
                    "request_reference": "uuid-string",
                    "requested_fields": ["income", "accounts", "loans", "repayments"],
                },
            ),
        ],
    )
    def post(self, request):
        borrower_reference = request.data.get("borrower_reference")
        request_reference = request.data.get("request_reference")
        requested_fields = request.data.get("requested_fields", [])

        if not borrower_reference:
            return Response(
                {"detail": "borrower_reference is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify borrower exists (exact match)
        try:
            borrower = Borrower.objects.prefetch_related(
                "accounts", "accounts__transactions", "accounts__balance_history",
                "accounts__loans", "loans", "loans__repayments",
                "business_info", "profile",
            ).get(borrower_reference=borrower_reference)
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only active borrowers
        if not borrower.is_active:
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = NormalizedBorrowerSerializer(borrower)
        normalized = serializer.data

        # Filter to requested fields
        filtered = _filter_fields(normalized, requested_fields)

        return Response({
            "request_reference": str(request_reference) if request_reference else "",
            "status": "SUCCESS",
            "data": filtered,
        }, status=status.HTTP_200_OK)


def _filter_fields(data: dict, requested_fields: list) -> dict:
    """Return only the requested and legally permitted fields from the normalised contract."""
    base_fields = [
        "borrower_reference", "customer_id", "full_name", "age",
        "gender", "employment_status", "income", "currency",
    ]
    always_include = set(base_fields)
    requested = set(requested_fields or [])

    result = {}
    for field_name, value in data.items():
        if field_name in always_include or field_name in requested:
            result[field_name] = value

    return result


class ReceiveCreditResultView(views.APIView):
    """
    Secure data-push endpoint for receiving credit-score results.

    POST /api/central/receive-credit-result/
    """

    permission_classes = [IsAuthenticatedOrKey]

    @extend_schema(
        tags=["central"],
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
        examples=[
            OpenApiExample(
                "Credit result push",
                value={
                    "borrower_reference": "BRW-TZ-1001",
                    "result_type": "CREDIT_RESULT",
                    "credit_score": 720,
                    "reputation": "GOOD",
                    "risk_level": "LOW",
                    "ruleset_version": "daire-rules-v2.1",
                    "model_version": "daire-ai-v3",
                    "transaction_hash": "0x1234...",
                    "received_at": "2026-01-01T10:00:00Z",
                },
            ),
        ],
    )
    def post(self, request):
        borrower_reference = request.data.get("borrower_reference")
        result_type = request.data.get("result_type", "CREDIT_RESULT")

        if not borrower_reference:
            return Response(
                {"detail": "borrower_reference is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            borrower = Borrower.objects.get(borrower_reference=borrower_reference)
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        result = CreditResult.objects.create(
            borrower=borrower,
            result_type=result_type,
            credit_score=request.data.get("credit_score"),
            reputation=request.data.get("reputation", ""),
            risk_level=request.data.get("risk_level", ""),
            ruleset_version=request.data.get("ruleset_version", ""),
            model_version=request.data.get("model_version", ""),
            transaction_hash=request.data.get("transaction_hash", ""),
            received_at=request.data.get("received_at") or timezone.now(),
            received_via=request.user if isinstance(request.user, IntegrationCredential) else None,
        )

        return Response({
            "status": "RECEIVED",
            "result_reference": str(result.pk),
            "borrower_reference": borrower_reference,
        }, status=status.HTTP_201_CREATED)
