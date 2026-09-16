"""
JWT authentication endpoints for staff / admin users.
"""
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdmin


class AdminTokenObtainView(TokenObtainPairView):
    """
    Obtain a JWT pair.

    Accepts username + password; returns ``access`` and ``refresh`` tokens.
    """
