"""
URL routes for the Borrower Self-Service Portal.
"""
from django.urls import path

from .views_borrower_portal import BorrowerPortalMeView, BorrowerPortalLoanApplyView

urlpatterns = [
    path("me/", BorrowerPortalMeView.as_view(), name="portal-me"),
    path("loan-apply/", BorrowerPortalLoanApplyView.as_view(), name="portal-loan-apply"),
]
