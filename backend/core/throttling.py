"""
Rate-limiting throttles for the Lender Subsystem API.
"""
from rest_framework.throttling import SimpleRateThrottle


class BurstRateThrottle(SimpleRateThrottle):
    """Short-window burst protection for all endpoints."""

    scope = "burst"

    def get_cache_key(self, request, view):
        if request.user and getattr(request.user, "is_authenticated", False):
            return f"burst_user_{request.user.pk}"
        return self.get_ident(request)


class SustainedRateThrottle(SimpleRateThrottle):
    """Longer-window sustained-rate protection."""

    scope = "sustained"

    def get_cache_key(self, request, view):
        if request.user and getattr(request.user, "is_authenticated", False):
            return f"sustained_user_{request.user.pk}"
        return self.get_ident(request)


class CentralSystemPullThrottle(SimpleRateThrottle):
    """
    Stricter throttling for the central-system pull endpoint
    to protect against enumeration attacks.
    """

    scope = "central_pull"

    def get_cache_key(self, request, view):
        ident = getattr(request, "correlation_id", self.get_ident(request))
        return f"central_pull_{ident}"
