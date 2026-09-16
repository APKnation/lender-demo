"""
Custom JWT token serializer that includes role and email in the token payload.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdmin


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        token['role'] = getattr(user, 'role', 'READ_ONLY')
        token['full_name'] = getattr(user, 'full_name', user.email)
        return token


class AdminTokenObtainView(TokenObtainPairView):
    """
    Obtain a JWT pair.
    Accepts email + password; returns ``access`` and ``refresh`` tokens
    with role and email embedded in the payload.
    """
    serializer_class = CustomTokenObtainPairSerializer
