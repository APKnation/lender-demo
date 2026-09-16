"""JWT authentication URLs."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views_auth import AdminTokenObtainView

urlpatterns = [
    path("token/", AdminTokenObtainView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
