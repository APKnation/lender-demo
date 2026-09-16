"""
Borrower Self-Service Portal Views.

Borrowers with role=BORROWER can:
  - GET /api/portal/me/         → their own profile (no credit score)
  - POST /api/portal/loan-apply/ → submit a new loan application
"""
import uuid
from decimal import Decimal

from django.utils import timezone as tz
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import AuditLog, Borrower, Loan
from .permissions import IsBorrower
from .serializers import NormalizedBorrowerSerializer


class BorrowerPortalMeView(APIView):
    """
    Returns the authenticated borrower's own data.
    Credit score fields are intentionally excluded.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsBorrower]

    def get(self, request):
        borrower = request.user.borrower
        data = NormalizedBorrowerSerializer(borrower).data

        # Remove sensitive credit/risk fields from the response
        data.pop("credit_results", None)
        for account in data.get("accounts", []):
            account.pop("risk_score", None)

        AuditLog.record(
            action="BORROWER_LOOKUP",
            status="SUCCESS",
            identity=request.user.email,
            borrower_reference=borrower.borrower_reference,
            log_type="portal",
        )
        return Response(data)


class BorrowerPortalLoanApplyView(APIView):
    """
    Allow a borrower to apply for a new loan.
    Creates a Loan with status=PENDING linked to the borrower's first account.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsBorrower]

    def post(self, request):
        borrower = request.user.borrower
        amount = request.data.get("amount")
        duration_months = request.data.get("duration_months")
        purpose = request.data.get("purpose", "")

        # Validate
        errors = {}
        if not amount:
            errors["amount"] = "Loan amount is required."
        if not duration_months:
            errors["duration_months"] = "Loan duration (months) is required."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            duration_months = int(duration_months)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid amount or duration."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount <= 0 or duration_months <= 0:
            return Response(
                {"detail": "Amount and duration must be positive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the borrower's primary account
        account = borrower.accounts.filter(status="ACTIVE").first()
        if not account:
            return Response(
                {"detail": "No active account found for this borrower."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate loan ID
        loan_id = f"LOAN-APP-{borrower.borrower_reference}-{uuid.uuid4().hex[:6].upper()}"

        loan = Loan.objects.create(
            loan_id=loan_id,
            account=account,
            borrower=borrower,
            loan_amount=amount,
            outstanding_balance=amount,
            loan_date=tz.now().date(),
            loan_duration_months=duration_months,
            interest_rate=Decimal("12.00"),  # Default rate — bank officer will review
            currency=borrower.currency,
            status="PENDING",
        )

        AuditLog.record(
            action="LOAN_CREATED",
            status="SUCCESS",
            identity=request.user.email,
            borrower_reference=borrower.borrower_reference,
            log_type="portal",
            metadata={"loan_id": loan_id, "amount": str(amount), "purpose": purpose},
        )

        return Response(
            {
                "loan_id": loan.loan_id,
                "status": loan.status,
                "amount": str(loan.loan_amount),
                "currency": loan.currency,
                "duration_months": loan.loan_duration_months,
                "message": "Loan application submitted successfully. A bank officer will review it.",
            },
            status=status.HTTP_201_CREATED,
        )
