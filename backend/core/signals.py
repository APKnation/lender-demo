"""
Signal handlers – borrower reference generation and profile provisioning.

Note: the audit trail was removed from this project; signals no longer
write audit entries.
"""
from django.conf import settings
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Borrower


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
                num = 1001
        else:
            num = 1001
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
