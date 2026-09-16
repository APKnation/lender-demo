"""
Role-based permissions for the Lender Subsystem.
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Full access – institution admins only."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            getattr(request.user, "role", None) == "ADMIN"
            or request.user.is_superuser
        )


class IsDataOfficer(permissions.BasePermission):
    """Can create / edit borrowers, accounts, transactions, loans, repayments."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return getattr(user, "role", None) == "DATA_OFFICER"


class IsAuditor(permissions.BasePermission):
    """Read-only access to audit logs, credit results, borrower lookups."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return getattr(user, "role", None) == "AUDITOR"


class IsReadOnly(permissions.BasePermission):
    """Read-only access to borrower data endpoints."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return getattr(user, "role", None) in ("READ_ONLY", "DATA_OFFICER", "AUDITOR")


class IsCentralSystem(permissions.BasePermission):
    """Access granted to IntegrationCredential with CENTRAL_SYSTEM role."""

    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, "role"):
            return False
        return getattr(request.user, "role", None) == "CENTRAL_SYSTEM"


class IsAuthenticatedOrKey(permissions.BasePermission):
    """
    Allow access if the user is authenticated via JWT (staff)
    OR via an API key credential (integration).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.auth)


class IsBorrower(permissions.BasePermission):
    """Allow access only to users with the BORROWER role who have a linked Borrower record."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "role", None) == "BORROWER" and user.borrower is not None
