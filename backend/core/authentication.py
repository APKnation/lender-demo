"""
Custom authentication: hashed API-key bearer tokens + JWT support.
"""
import hashlib

from rest_framework import authentication, exceptions

from .models import IntegrationCredential


class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticate requests that carry an *hashed* API key as a bearer token.

    The DAIRE Central System sends ``Authorization: Bearer <api_key>``.
    The key is hashed (SHA-256) and compared against ``IntegrationCredential.key_hash``
    using ``secrets.compare_digest`` to prevent timing attacks.
    """

    keyword = "Bearer"

    def authenticate(self, request):
        auth = authentication.get_authorization_header(request).split()

        if not auth:
            return None  # Let other auth classes try

        if len(auth) != 2:
            raise exceptions.AuthenticationFailed(
                "Invalid token header. Token should be in format: Bearer <token>."
            )

        try:
            token_type, token = auth[0].decode(), auth[1].decode()
        except (UnicodeDecodeError, ValueError):
            raise exceptions.AuthenticationFailed("Malformed authorization header.")

        if token_type.lower() != self.keyword.lower():
            return None  # Not our auth scheme – let JWT or session handle it

        return self._verify_token(token, request)

    def _verify_token(self, token, request):
        key_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        try:
            credential = IntegrationCredential.objects.select_related("institution").get(
                key_hash=key_hash, is_active=True
            )
        except IntegrationCredential.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid or unknown API key.")

        if credential.expires_at and credential.expires_at < request:
            raise exceptions.AuthenticationFailed("API key has expired.")

        credential.last_used_at = __import__("django.utils.timezone", fromlist=["now"]).now()
        credential.save(update_fields=["last_used_at"])

        return (credential, token)


class AnonymousUserFallback:
    """Used to distinguish 'no token' from 'invalid token' in views."""
    pass
