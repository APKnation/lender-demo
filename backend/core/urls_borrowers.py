"""Borrower lookup URLs."""
from django.urls import path

from .views_borrowers import BorrowerLookupView

urlpatterns = [
    path("borrowers/", BorrowerLookupView.as_view(), name="borrower-lookup"),
]
