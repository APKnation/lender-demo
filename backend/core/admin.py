"""
Django Admin configuration for the Lender Subsystem.

Features:
  * Search by borrower_reference across all related models
  * Filter by status and date
  * De-activate / archive instead of delete for borrowers with financial history
  * Dedicated action views for activate / deactivate
"""
from django.contrib import admin
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect, render
from django.utils import timezone

from .constants import (
    AuditAction,
    AuditStatus,
    InstitutionType,
)
from .models import (
    Account,
    AccountBalanceHistory,
    AuditLog,
    Borrower,
    BusinessInformation,
    Consent,
    CreditResult,
    IntegrationCredential,
    Institution,
    Loan,
    LoanRepayment,
    Transaction,
)


# ------------------------------------------------------------------ #
#  Institution
# ------------------------------------------------------------------ #
@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ["lender_id", "name", "institution_type", "country_code", "is_active", "created_at"]
    list_filter = ["institution_type", "is_active"]
    search_fields = ["lender_id", "name"]


# ------------------------------------------------------------------ #
#  Borrower
# ------------------------------------------------------------------ #
@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = [
        "borrower_reference", "customer_id", "full_name", "age", "gender",
        "phone", "employment_status", "income", "currency",
        "is_active", "created_at", "updated_at",
    ]
    list_filter = ["is_active", "gender", "employment_status", "currency", "created_at"]
    search_fields = ["borrower_reference", "customer_id", "full_name", "phone", "email"]
    readonly_fields = ["borrower_reference", "created_at", "updated_at", "national_id_hash"]
    actions = ["deactivate_borrowers", "activate_borrowers"]

    # Disable delete for borrowers with financial history
    def has_delete_permission(self, request, obj=None):
        if obj and self._has_financial_history(obj):
            return False
        return super().has_delete_permission(request, obj)

    def _has_financial_history(self, borrower):
        return (
            borrower.accounts.exists()
            or borrower.loans.exists()
            or borrower.repayments.exists()
        )

    def get_actions(self, request):
        """Remove delete action when it would be unsafe; keep deactivate."""
        actions = super().get_actions(request)
        return actions

    @admin.action(description="Deactivate selected borrowers (archive)")
    def deactivate_borrowers(self, request, queryset):
        count = 0
        for borrower in queryset:
            if borrower.is_active:
                borrower.is_active = False
                borrower.save(update_fields=["is_active"])
                count += 1
                AuditLog.record(
                    action=AuditAction.BORROWER_DEACTIVATED,
                    status=AuditStatus.SUCCESS,
                    borrower_reference=borrower.borrower_reference,
                    identity=getattr(request.user, "email", str(request.user)),
                    log_type="model_change",
                )
        self.message_user(
            request,
            f"{count} borrower(s) deactivated.",
            messages.SUCCESS,
        )

    @admin.action(description="Activate selected borrowers")
    def activate_borrowers(self, request, queryset):
        count = queryset.filter(is_active=False).update(
            is_active=True, updated_at=timezone.now()
        )
        self.message_user(
            request,
            f"{count} borrower(s) activated.",
            messages.SUCCESS,
        )

    def response_change(self, request, obj):
        """Show a confirmation message on borrower change."""
        self.message_user(
            request,
            f"Borrower {obj.borrower_reference} updated.",
            messages.INFO,
        )
        return super().response_change(request, obj)

    # Custom deactivate button on the change page
    change_form_template = "admin/core/borrower_change.html"

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["title"] = "Search & filter borrowers"
        return super().changelist_view(request, extra_context)


# ------------------------------------------------------------------ #
#  Customer Profile
# ------------------------------------------------------------------ #
@admin.register(BusinessInformation)
class BusinessInformationInline(admin.StackedInline):
    model = BusinessInformation
    extra = 0
    can_delete = False


# ------------------------------------------------------------------ #
#  Account
# ------------------------------------------------------------------ #
class AccountBalanceHistoryInline(admin.TabularInline):
    model = AccountBalanceHistory
    extra = 0
    can_delete = False
    readonly_fields = ["created_at"]


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = [
        "account_reference", "borrower_link", "account_type", "currency",
        "status", "balance", "savings", "created_at",
    ]
    list_filter = ["account_type", "status", "currency", "created_at"]
    search_fields = ["account_reference", "account_name", "borrower__borrower_reference",
                     "borrower__customer_id"]
    readonly_fields = ["created_at", "updated_at"]

    def borrower_link(self, obj):
        return obj.borrower.borrower_reference
    borrower_link.admin_order_field = "borrower"
    borrower_link.short_description = "Borrower"


# ------------------------------------------------------------------ #
#  Transaction
# ------------------------------------------------------------------ #
@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "transaction_id", "account_link", "transaction_date", "type",
        "direction", "amount", "currency", "status", "created_at",
    ]
    list_filter = ["type", "direction", "status", "currency", "transaction_date"]
    search_fields = ["transaction_id", "account__account_reference",
                     "account__borrower__borrower_reference", "counterparty"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "transaction_date"

    def account_link(self, obj):
        return obj.account.account_reference
    account_link.admin_order_field = "account"
    account_link.short_description = "Account"


# ------------------------------------------------------------------ #
#  Loan
# ------------------------------------------------------------------ #
@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = [
        "loan_id", "borrower_link", "account_link", "loan_amount",
        "interest_rate", "outstanding_balance", "status", "loan_date",
    ]
    list_filter = ["status", "currency", "loan_date"]
    search_fields = ["loan_id", "borrower__borrower_reference",
                     "borrower__customer_id", "account__account_reference"]
    readonly_fields = ["created_at", "updated_at"]

    def borrower_link(self, obj):
        return obj.borrower.borrower_reference
    borrower_link.admin_order_field = "borrower"
    borrower_link.short_description = "Borrower"

    def account_link(self, obj):
        return obj.account.account_reference
    account_link.admin_order_field = "account"
    account_link.short_description = "Account"


# ------------------------------------------------------------------ #
#  Loan Repayment
# ------------------------------------------------------------------ #
@admin.register(LoanRepayment)
class LoanRepaymentAdmin(admin.ModelAdmin):
    list_display = [
        "id", "loan_link", "borrower_link", "repayment_amount",
        "repayment_date", "due_date", "days_overdue", "default_status",
    ]
    list_filter = ["default_status", "repayment_date", "currency"]
    search_fields = ["loan__loan_id", "borrower__borrower_reference"]

    def loan_link(self, obj):
        return obj.loan.loan_id
    loan_link.admin_order_field = "loan"
    loan_link.short_description = "Loan"

    def borrower_link(self, obj):
        return obj.borrower.borrower_reference
    borrower_link.admin_order_field = "borrower"
    borrower_link.short_description = "Borrower"


# ------------------------------------------------------------------ #
#  Consent
# ------------------------------------------------------------------ #
@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ["consent_id", "borrower", "status", "granted_at", "expires_at"]
    list_filter = ["status", "granted_at", "expires_at"]
    search_fields = ["consent_id", "borrower__borrower_reference"]
    readonly_fields = ["created_at"]


# ------------------------------------------------------------------ #
#  Credit Result
# ------------------------------------------------------------------ #
@admin.register(CreditResult)
class CreditResultAdmin(admin.ModelAdmin):
    list_display = [
        "id", "borrower_link", "credit_score", "reputation", "risk_level",
        "received_at", "created_at",
    ]
    list_filter = ["risk_level", "reputation", "received_at"]
    search_fields = ["borrower__borrower_reference"]
    readonly_fields = ["created_at", "borrower"]

    def borrower_link(self, obj):
        return obj.borrower.borrower_reference
    borrower_link.admin_order_field = "borrower"
    borrower_link.short_description = "Borrower"


# ------------------------------------------------------------------ #
#  Integration Credentials
# ------------------------------------------------------------------ #
@admin.register(IntegrationCredential)
class IntegrationCredentialAdmin(admin.ModelAdmin):
    list_display = [
        "name", "lender_id", "role", "key_prefix", "is_active",
        "institution", "created_at", "last_used_at",
    ]
    list_filter = ["role", "is_active", "institution"]
    search_fields = ["name", "lender_id", "key_prefix"]
    readonly_fields = [
        "key_hash", "key_prefix", "created_at", "last_used_at",
    ]
    exclude = ["key_hash"]  # Never expose the hash in forms

    def save_model(self, request, obj, form, change):
        if not change:
            # New credential – generate plaintext key
            obj, plaintext = IntegrationCredential.create_key(
                name=obj.name,
                role=obj.role,
                institution=obj.institution,
                permissions=obj.permissions,
                lender_id=obj.lender_id,
            )
            self.message_user(
                request,
                f"API key created (plaintext, show once): {plaintext}",
                messages.WARNING,
            )
        else:
            super().save_model(request, obj, form, change)


# ------------------------------------------------------------------ #
#  Audit Log – read-only
# ------------------------------------------------------------------ #
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "action", "status", "borrower_reference", "identity",
        "source_ip", "request_id", "timestamp", "log_type",
    ]
    list_filter = ["action", "status", "log_type", "timestamp"]
    search_fields = ["borrower_reference", "identity", "request_id", "correlation_id"]
    readonly_fields = [
        "action", "status", "log_type", "borrower_reference", "request_reference",
        "identity", "source_ip", "request_id", "correlation_id", "timestamp",
        "error_message", "fields_requested", "fields_returned", "metadata",
    ]
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# ------------------------------------------------------------------ #
#  Custom admin site header
# ------------------------------------------------------------------ #
admin.site.site_header = "DAIRE Lender Subsystem – Admin"
admin.site.site_title = "Lender Admin"
admin.site.index_title = "Lender Administration"
