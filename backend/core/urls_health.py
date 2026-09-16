"""Health check URL."""
from django.urls import path

from .views_health import HealthCheckView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health"),
]
