"""
Admin-only operations.

  GET  /api/admin/loans/pending/           – list pending loan applications
  POST /api/admin/loans/<loan_id>/review/  – approve or reject a loan (manual decision)
  POST /api/admin/daire/request-data/      – pull: send a data request to the DAIRE Central
                                             System and receive the response
  POST /api/admin/daire/push-data/         – push: send institution borrower data to the
                                             DAIRE Central System for merging
  GET  /api/admin/daire/credit-results/    – credit results received from DAIRE
  GET  /api/admin/daire/exchange-log/      – history of pushes and pulls
"""
import json
from urllib import error as urlerror
from urllib import request as urlrequest

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers as drf_serializers

from .constants import LoanStatus
from .models import Borrower, CreditResult, DataExchangeLog, Loan
from .permissions import IsAdmin
from .serializers import CreditResultSerializer, LoanSerializer


class AdminPendingLoanListView(generics.ListAPIView):
    """All loan applications awaiting an admin decision."""
    serializer_class = LoanSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return (
            Loan.objects.filter(status=LoanStatus.PENDING)
            .select_related("borrower", "account")
        )


class AdminLoanReviewView(APIView):
    """
    Admin decision on a pending loan application.

    POST /api/admin/loans/<loan_id>/review/
    {
      "action": "approve" | "reject",
      "notes": "optional decision note / rejection reason"
    }

    The decision itself is manual – no automatic eligibility rules are
    applied; the admin approves or disallows the loan per bank requirements.
    """
    permission_classes = [IsAdmin]

    def post(self, request, loan_id):
        action = request.data.get("action")
        notes = request.data.get("notes", "")

        if action not in ("approve", "reject"):
            return Response(
                {"detail": "action must be 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            loan = Loan.objects.select_related("borrower", "account").get(loan_id=loan_id)
        except Loan.DoesNotExist:
            return Response(
                {"detail": "Loan was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if loan.status != LoanStatus.PENDING:
            return Response(
                {"detail": f"Loan has already been reviewed (status: {loan.status})."},
                status=status.HTTP_409_CONFLICT,
            )

        loan.status = LoanStatus.ACTIVE if action == "approve" else LoanStatus.REJECTED
        loan.reviewed_by = request.user
        loan.reviewed_at = timezone.now()
        loan.review_notes = notes
        loan.save(update_fields=[
            "status", "reviewed_by", "reviewed_at", "review_notes", "updated_at",
        ])

        serializer = LoanSerializer(loan)
        message = (
            "Loan approved and disbursed to the borrower's account."
            if action == "approve"
            else "Loan application rejected."
        )
        return Response({"detail": message, "loan": serializer.data})


class _PushLogSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = DataExchangeLog
        fields = [
            "id", "direction", "status", "borrower_references",
            "record_count", "detail", "created_at",
        ]


def _log_exchange(direction: str, ok: bool, *, refs=None, count: int = 0,
                  detail: str = "", user=None) -> None:
    """Record a DAIRE exchange attempt for the admin UI history."""
    DataExchangeLog.objects.create(
        direction=direction,
        status=DataExchangeLog.Status.SUCCESS if ok else DataExchangeLog.Status.FAILED,
        borrower_references=list(refs) or None,
        record_count=count,
        detail=detail[:2000],
        triggered_by=user if getattr(user, "is_authenticated", False) else None,
    )


def _central_post(path: str, payload: dict, timeout: int = 30):
    """
    POST a JSON payload to the DAIRE Central System.

    Returns (ok, body, error_detail).
    """
    central_url = _central_url()
    api_key = getattr(settings, "CENTRAL_API_KEY", "")

    if not central_url:
        return False, None, "DAIRE Central System URL is not configured."

    req = urlrequest.Request(
        f"{central_url}{path}",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=timeout) as resp:
            return True, json.loads(resp.read().decode("utf-8")), ""
    except urlerror.HTTPError as exc:
        try:
            body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return False, None, f"DAIRE Central System returned HTTP {exc.code}: {body[:300]}"
    except (urlerror.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return False, None, f"Could not reach the DAIRE Central System: {exc}"


def _central_url() -> str:
    """
    Resolve the DAIRE Central System URL.

    Priority: Institution.central_system_url (editable from the admin UI)
    → settings.CENTRAL_SYSTEM_URL (.env) → empty string.
    """
    from .models import Institution

    inst = Institution.objects.filter(is_active=True).first()
    if inst and inst.central_system_url:
        return inst.central_system_url.rstrip("/")
    return getattr(settings, "CENTRAL_SYSTEM_URL", "").rstrip("/")


class AdminDaireRequestDataView(APIView):
    """
    Pull – send information request to (and receive it from) the DAIRE Central System.

    POST /api/admin/daire/request-data/
    {
      "borrower_reference": "BRW-TZ-1001",
      "requested_fields": ["income", "accounts", "loans"]
    }

    Forwards a borrower-data request to the configured central system URL
    using the institution's integration key and relays the response.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        borrower_reference = request.data.get("borrower_reference")
        requested_fields = request.data.get("requested_fields", [])
        request_reference = request.data.get("request_reference", "")

        if not borrower_reference:
            return Response(
                {"detail": "borrower_reference is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not Borrower.objects.filter(
            borrower_reference=borrower_reference, is_active=True
        ).exists():
            return Response(
                {"detail": "Borrower was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ok, body, err = _central_post("/api/central/pull-borrower-data/", {
            "borrower_reference": borrower_reference,
            "request_reference": request_reference,
            "requested_fields": requested_fields,
        }, timeout=15)

        _log_exchange(
            "PULL", ok,
            refs=[borrower_reference],
            count=1 if ok else 0,
            detail=err or f"Pulled borrower data for {borrower_reference}",
            user=request.user,
        )

        if not ok:
            return Response(
                {"detail": err},
                status=status.HTTP_502_BAD_GATEWAY if body is None and "not configured" not in err else status.HTTP_400_BAD_REQUEST,
            )
        return Response(body, status=status.HTTP_200_OK)


class AdminDairePushDataView(APIView):
    """
    Push – send institution data to the DAIRE Central System for merging.

    POST /api/admin/daire/push-data/
    {
      "borrower_references": ["BRW-TZ-1001", ...]   # omit to push ALL active borrowers
    }

    Serializes each borrower through the same normalized DAIRE contract
    used by the central-system pull endpoint, then POSTs them in one batch
    to <CENTRAL_SYSTEM_URL>/api/central/receive-borrower-data/.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        refs = request.data.get("borrower_references") or []

        borrowers = Borrower.objects.filter(is_active=True)
        if refs:
            borrowers = borrowers.filter(borrower_reference__in=refs)

        if not borrowers.exists():
            return Response(
                {"detail": "No active borrowers matched the given references."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .serializers import NormalizedBorrowerSerializer

        batch = [
            NormalizedBorrowerSerializer(b).data for b in borrowers.prefetch_related(
                "accounts", "accounts__transactions", "accounts__balance_history",
                "accounts__loans", "loans", "loans__repayments",
                "business_info", "profile",
            )
        ]

        ok, body, err = _central_post("/api/central/receive-borrower-data/", {
            "institution": getattr(settings, "LENDER_ID", "NMB-001"),
            "request_reference": f"push-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            "borrowers": batch,
        })

        _log_exchange(
            "PUSH", ok,
            refs=refs or [b.borrower_reference for b in borrowers],
            count=len(batch) if ok else 0,
            detail=err or f"Pushed {len(batch)} borrower record(s) to DAIRE for merging",
            user=request.user,
        )

        if not ok:
            code = (
                status.HTTP_400_BAD_REQUEST
                if "not configured" in err
                else status.HTTP_502_BAD_GATEWAY
            )
            return Response({"detail": err}, status=code)

        return Response(body, status=status.HTTP_200_OK)


class _ConnectionPayloadSerializer(drf_serializers.Serializer):
    central_system_url = drf_serializers.URLField(max_length=200)


class AdminDaireConnectionView(APIView):
    """
    DAIRE connection configuration (editable from the Integration Settings UI).

    GET  /api/admin/daire/connection/  – current URL + source (db/env)
    PUT  /api/admin/daire/connection/  – {"central_system_url": "https://..."}
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        inst = _institution()
        return Response({
            "central_system_url": inst.central_system_url if inst else getattr(settings, "CENTRAL_SYSTEM_URL", ""),
            "source": "db" if inst and inst.central_system_url else "env",
            "institution_name": inst.name if inst else "",
            "lender_id": inst.lender_id if inst else getattr(settings, "LENDER_ID", ""),
        })

    def put(self, request):
        serializer = _ConnectionPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        url = serializer.validated_data["central_system_url"].rstrip("/")

        inst = _institution()
        if inst is None:
            from .models import Institution
            from .constants import InstitutionType, Currency
            inst = Institution.objects.create(
                lender_id=getattr(settings, "LENDER_ID", "NMB-001"),
                name=getattr(settings, "INSTITUTION_NAME", "NMB Bank"),
                institution_type=InstitutionType.COMMERCIAL_BANK,
                country_code="TZ",
                currency=Currency.TZS,
                central_system_url=url,
            )
        else:
            inst.central_system_url = url
            inst.save(update_fields=["central_system_url"])

        return Response({
            "detail": "DAIRE Central System URL saved.",
            "central_system_url": inst.central_system_url,
            "source": "db",
        })


class AdminDaireConnectionTestView(APIView):
    """
    POST /api/admin/daire/connection/test/ – ping the configured central system.

    Sends a lightweight request so the admin can verify the URL, network path,
    and API key before doing real exchanges. Never raises – always returns a
    structured result.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        from django.db import connection as db_connection

        url = _central_url()
        if not url:
            return Response({"ok": False, "detail": "No central system URL configured."})

        started = timezone.now()
        ok, body, err = _central_post("/api/central/ping/", {
            "sender": getattr(settings, "LENDER_ID", "NMB-001"),
            "sent_at": started.isoformat(),
        }, timeout=10)
        latency_ms = int((timezone.now() - started).total_seconds() * 1000)

        _log_exchange(
            "PULL", ok,
            refs=None,
            count=0,
            detail=("Connection test: " + (err or f"reachable in {latency_ms}ms")),
            user=request.user,
        )

        return Response({
            "ok": ok,
            "url": url,
            "latency_ms": latency_ms,
            "detail": err or "Connection successful.",
            "response": body,
        })


def _institution():
    from .models import Institution
    return Institution.objects.filter(is_active=True).first()


class AdminDaireExchangeLogView(generics.ListAPIView):
    """History of PUSH/PULL exchanges with the DAIRE Central System."""
    serializer_class = _PushLogSerializer
    permission_classes = [IsAdmin]
    queryset = DataExchangeLog.objects.all()[:200]


class AdminDaireCreditResultsView(generics.ListAPIView):
    """Credit results received from the DAIRE Central System (admin view)."""
    serializer_class = CreditResultSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        ref = self.request.query_params.get("borrower_reference")
        if ref:
            return CreditResult.objects.filter(borrower__borrower_reference=ref)
        return CreditResult.objects.all()
