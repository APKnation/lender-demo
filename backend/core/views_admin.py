"""
Admin-only operations.

  GET  /api/admin/loans/pending/          – list pending loan applications
  POST /api/admin/loans/<loan_id>/review/ – approve or reject a loan (manual decision)
  POST /api/admin/daire/request-data/     – send a data request to the DAIRE Central
                                            System and receive the response
  GET  /api/admin/daire/credit-results/   – credit results received from DAIRE
"""
import json
from urllib import error as urlerror
from urllib import request as urlrequest

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .constants import LoanStatus
from .models import Borrower, CreditResult, Loan
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


class AdminDaireRequestDataView(APIView):
    """
    Send information to (and receive it from) the DAIRE Central System.

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

        central_url = getattr(settings, "CENTRAL_SYSTEM_URL", "").rstrip("/")
        api_key = getattr(settings, "CENTRAL_API_KEY", "")
        if not central_url:
            return Response(
                {"detail": "DAIRE Central System URL is not configured (CENTRAL_SYSTEM_URL)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = json.dumps({
            "borrower_reference": borrower_reference,
            "request_reference": request_reference,
            "requested_fields": requested_fields,
        }).encode("utf-8")

        req = urlrequest.Request(
            f"{central_url}/api/central/pull-borrower-data/",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )

        try:
            with urlrequest.urlopen(req, timeout=15) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            return Response(body, status=status.HTTP_200_OK)
        except urlerror.HTTPError as exc:
            return Response(
                {"detail": f"DAIRE Central System returned HTTP {exc.code}.", "data": None},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except (urlerror.URLError, TimeoutError, json.JSONDecodeError) as exc:
            return Response(
                {"detail": f"Could not reach the DAIRE Central System: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class AdminDaireCreditResultsView(generics.ListAPIView):
    """Credit results received from the DAIRE Central System (admin view)."""
    serializer_class = CreditResultSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        ref = self.request.query_params.get("borrower_reference")
        if ref:
            return CreditResult.objects.filter(borrower__borrower_reference=ref)
        return CreditResult.objects.all()
