"""DAIRE Central System integration URLs."""
from django.urls import path

from .views_central import PullBorrowerDataView, ReceiveCreditResultView

urlpatterns = [
    path("pull-borrower-data/", PullBorrowerDataView.as_view(), name="central-pull"),
    path("receive-credit-result/", ReceiveCreditResultView.as_view(), name="central-push"),
]
