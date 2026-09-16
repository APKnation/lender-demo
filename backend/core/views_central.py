"""
DAIRE Central System integration endpoints.

POST /api/central/pull-borrower-data/   – secure borrower-data pull
POST /api/central/receive-credit-result/ – secure credit-result push
"""
import uuid

from rest_framework import status, views
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

from .constants import AuditAction, AuditStatus, Role
from .models import AuditLog, Borrower, CreditResult, IntegrationCredential
from .permissions import IsAuthenticatedOrKey
from .serializers import NormalizedBorrowerSerializer


def _get_identity(request):
    if request.user.is_authenticated:
        return getattr(request.user, "email", str(request.user))
    if hasattr(request.user, "key_prefix"):
        return f"API key: {request.user.key_prefix}"
    return ""


def _source_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


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


class PullBorrowerDataView(views.APIView):
    """
    Secure data-pull endpoint called by the DAIRE Central System.

    Validates the central-system API key, verifies the borrower reference,
    returns only the requested fields, and creates an audit log.
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
        correlation_id = getattr(request, "correlation_id", "")
        identity = _get_identity(request)
        source_ip = _source_ip(request)

        borrower_reference = request.data.get("borrower_reference")
        request_reference = request.data.get("request_reference")
        requested_fields = request.data.get("requested_fields", [])

        if not borrower_reference:
            AuditLog.record(
                action=AuditAction.BORROWER_DATA_PULL,
                status=AuditStatus.FAILURE,
                borrower_reference="",
                identity=identity,
                source_ip=source_ip,
                request_id=correlation_id,
                error_message="Missing borrower_reference",
                fields_requested=[],
                log_type="pull",
                metadata={"request_reference": str(request_reference) if request_reference else ""},
            )
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
            AuditLog.record(
                action=AuditAction.BORROWER_NOT_FOUND,
                status=AuditStatus.FAILURE,
                borrower_reference=borrower_reference,
                identity=identity,
                source_ip=source_ip,
                request_id=correlation_id,
                error_message="Borrower was not found.",
                fields_requested=requested_fields,
                log_type="pull",
                metadata={"request_reference": str(request_reference) if request_reference else ""},
            )
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only active borrowers
        if not borrower.is_active:
            AuditLog.record(
                action=AuditAction.BORROWER_DATA_PULL,
                status=AuditStatus.FAILURE,
                borrower_reference=borrower_reference,
                identity=identity,
                source_ip=source_ip,
                request_id=correlation_id,
                error_message="Borrower is not active.",
                fields_requested=requested_fields,
                log_type="pull",
            )
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = NormalizedBorrowerSerializer(borrower)
        normalized = serializer.data

        # Filter to requested fields
        filtered = _filter_fields(normalized, requested_fields)

        AuditLog.record(
            action=AuditAction.BORROWER_DATA_PULL,
            status=AuditStatus.SUCCESS,
            borrower_reference=borrower_reference,
            identity=identity,
            source_ip=source_ip,
            request_id=correlation_id,
            request_reference=request_reference if request_reference else None,
            fields_requested=requested_fields,
            fields_returned=list(filtered.keys()),
            log_type="pull",
            metadata={"request_reference": str(request_reference) if request_reference else ""},
        )

        return Response({
            "request_reference": str(request_reference) if request_reference else correlation_id,
            "status": "SUCCESS",
            "data": filtered,
        }, status=status.HTTP_200_OK)


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
        correlation_id = getattr(request, "correlation_id", "")
        identity = _get_identity(request)
        source_ip = _source_ip(request)

        borrower_reference = request.data.get("borrower_reference")
        result_type = request.data.get("result_type", "CREDIT_RESULT")

        if not borrower_reference:
            AuditLog.record(
                action=AuditAction.CREDIT_RESULT_PUSH,
                status=AuditStatus.FAILURE,
                borrower_reference="",
                identity=identity,
                source_ip=source_ip,
                request_id=correlation_id,
                error_message="Missing borrower_reference",
                log_type="push",
                metadata={"request_body": {k: str(v)[:100] for k, v in request.data.items()}},
            )
            return Response(
                {"detail": "borrower_reference is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            borrower = Borrower.objects.get(borrower_reference=borrower_reference)
        except Borrower.DoesNotExist:
            AuditLog.record(
                action=AuditAction.CREDIT_RESULT_PUSH,
                status=AuditStatus.FAILURE,
                borrower_reference=borrower_reference,
                identity=identity,
                source_ip=source_ip,
                request_id=correlation_id,
                error_message="Borrower was not found.",
                log_type="push",
            )
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
            received_at=request.data.get("received_at") or None,
            received_via=request.user if isinstance(request.user, IntegrationCredential) else None,
        )

        AuditLog.record(
            action=AuditAction.CREDIT_RESULT_PUSH,
            status=AuditStatus.SUCCESS,
            borrower_reference=borrower_reference,
            identity=identity,
            source_ip=source_ip,
            request_id=correlation_id,
            log_type="push",
            metadata={"result_id": result.pk, "result_type": result_type},
        )

        return Response({
            "status": "RECEIVED",
            "result_reference": str(result.pk),
            "borrower_reference": borrower_reference,
        }, status=status.HTTP_201_CREATED)
