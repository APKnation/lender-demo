"""
Signal handlers – borrower reference generation, audit trail on changes.
"""
from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .constants import AuditAction, AuditStatus
from .models import (
    AuditLog,
    Borrower,
    Institution,
    Loan,
    LoanRepayment,
)


def _get_request():
    """Best-effort retrieval of the current request object."""
    from .middleware import get_current_request

    return get_current_request()


# ------------------------------------------------------------------ #
# Borrower: auto-generate reference & hash national ID
# ------------------------------------------------------------------ #
@receiver(pre_save, sender=Borrower)
def borrower_pre_save(sender, instance, **kwargs):
    # Hash national ID before saving
    raw_nid = getattr(instance, "_raw_national_id", None)
    if raw_nid:
        from .models import hash_sensitive
        instance.national_id_hash = hash_sensitive(raw_nid)

    if not instance.borrower_reference:
        prefix = getattr(settings, "BORROWER_REF_PREFIX", "BRW-TZ")
        last = Borrower.objects.filter(
            borrower_reference__startswith=f"{prefix}-"
        ).order_by("borrower_reference").last()
        if last:
            try:
                num = int(last.borrower_reference.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        instance.borrower_reference = f"{prefix}-{num:04d}"


@receiver(post_save, sender=Borrower)
def borrower_post_save(sender, instance, created, **kwargs):
    # Ensure CustomerProfile exists
    if created:
        try:
            instance.profile  # noqa: B018 – checks related object existence
        except Exception:
            from .models import CustomerProfile
            CustomerProfile.objects.get_or_create(borrower=instance)

    req = _get_request()
    action = AuditAction.BORROWER_CREATED if created else AuditAction.BORROWER_UPDATED
    identity = ""
    if req and hasattr(req, "user"):
        identity = getattr(req.user, "email", str(req.user)) if req.user.is_authenticated else ""
    AuditLog.record(
        action=action,
        status=AuditStatus.SUCCESS,
        identity=identity,
        borrower_reference=instance.borrower_reference,
        source_ip=req.META.get("REMOTE_ADDR") if req else None,
        request_id=getattr(req, "correlation_id", "") if req else "",
        fields_returned=["full_name", "customer_id"] if created else ["updated_fields"],
        log_type="model_change",
    )


# ------------------------------------------------------------------ #
# Activate / deactivate tracking
# ------------------------------------------------------------------ #
@receiver(pre_save, sender=Borrower)
def borrower_activation_change(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Borrower.objects.get(pk=instance.pk)
        except Borrower.DoesNotExist:
            return
        if old.is_active and not instance.is_active:
            AuditLog.record(
                action=AuditAction.BORROWER_DEACTIVATED,
                status=AuditStatus.SUCCESS,
                borrower_reference=instance.borrower_reference,
                identity=getattr(_get_request() and _get_request().user, "email", ""),
            )
        elif not old.is_active and instance.is_active:
            AuditLog.record(
                action=AuditAction.BORROWER_ACTIVATED,
                status=AuditStatus.SUCCESS,
                borrower_reference=instance.borrower_reference,
                identity=getattr(_get_request() and _get_request().user, "email", ""),
            )


# ------------------------------------------------------------------ #
# Loan / Repayment change audit
# ------------------------------------------------------------------ #
@receiver(post_save, sender=Loan)
def loan_post_save(sender, instance, created, **kwargs):
    action = AuditAction.LOAN_CREATED if created else AuditAction.LOAN_UPDATED
    req = _get_request()
    AuditLog.record(
        action=action,
        status=AuditStatus.SUCCESS,
        borrower_reference=instance.borrower.borrower_reference,
        source_ip=req.META.get("REMOTE_ADDR") if req else None,
        request_id=getattr(req, "correlation_id", "") if req else "",
        log_type="model_change",
    )


@receiver(post_save, sender=LoanRepayment)
def repayment_post_save(sender, instance, created, **kwargs):
    if created:
        req = _get_request()
        AuditLog.record(
            action=AuditAction.LOAN_REPAYMENT_ADDED,
            status=AuditStatus.SUCCESS,
            borrower_reference=instance.borrower.borrower_reference,
            source_ip=req.META.get("REMOTE_ADDR") if req else None,
            request_id=getattr(req, "correlation_id", "") if req else "",
            log_type="model_change",
        )
