"""
Database models for the Lender Subsystem.

All models use PostgreSQL features where appropriate.
API keys are hashed; national IDs are hashed; internal PKs are
never exposed in API output.
"""
import hashlib
import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone

from .constants import (
    AccountStatus,
    AccountType,
    BalanceStability,
    BusinessEntitySize,
    ConsentStatus,
    Currency,
    DefaultStatus,
    EmploymentStatus,
    FrequencyType,
    Gender,
    InstitutionType,
    LoanStatus,
    Role,
    TransactionDirection,
    TransactionStatus,
    TransactionType,
)


# =========================================================================== #
#  Utilities
# =========================================================================== #
def hash_sensitive(value: str) -> str:
    """Hash a sensitive identifier (national ID, etc.) with SHA-256."""
    if not value:
        return ""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def hash_api_key(key: str) -> str:
    """Hash an API key for secure storage (never store plaintext)."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def generate_api_key() -> str:
    """Generate a cryptographically-secure API key prefix.secret format."""
    return f"daire_{secrets.token_urlsafe(40)}"


# =========================================================================== #
#  Institution configuration
# =========================================================================== #
class Institution(models.Model):
    """Static configuration for the financial institution running this subsystem."""

    lender_id = models.CharField(max_length=50, unique=True, help_text="e.g. NMB-001")
    name = models.CharField(max_length=200)
    institution_type = models.CharField(
        max_length=50,
        choices=InstitutionType.choices,
        default=InstitutionType.COMMERCIAL_BANK,
    )
    country_code = models.CharField(max_length=3, default="TZ")
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.TZS)
    central_system_url = models.URLField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Institution"
        verbose_name_plural = "Institutions"

    def __str__(self):
        return f"{self.name} ({self.lender_id})"


# =========================================================================== #
#  Borrower hierarchy
# =========================================================================== #
class Borrower(models.Model):
    """
    Canonical borrower – the single source of truth for an individual's identity
    across all DAIRE-connected institutions.
    """

    borrower_reference = models.CharField(
        max_length=100,
        unique=True,
        help_text="e.g. BRW-TZ-1001 – shared canonical identifier",
    )
    customer_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="Institution-local customer identifier",
    )
    full_name = models.CharField(max_length=255)
    age = models.PositiveSmallIntegerField()
    gender = models.CharField(max_length=20, choices=Gender.choices)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    national_id_hash = models.CharField(
        max_length=128,
        blank=True,
        help_text="SHA-256 hash of the national ID – never the raw value",
    )
    employment_status = models.CharField(max_length=30, choices=EmploymentStatus.choices)
    income = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.TZS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    institution = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name="borrowers",
    )

    class Meta:
        ordering = ["borrower_reference"]
        verbose_name = "Borrower"
        verbose_name_plural = "Borrowers"
        indexes = [
            models.Index(fields=["borrower_reference"]),
            models.Index(fields=["customer_id"]),
            models.Index(fields=["national_id_hash"]),
        ]

    def __str__(self):
        return f"{self.borrower_reference} – {self.full_name}"


class CustomerProfile(models.Model):
    """Extended customer profile (KYC, address, risk info)."""

    borrower = models.OneToOneField(
        Borrower, on_delete=models.CASCADE, related_name="profile"
    )
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    kyc_status = models.CharField(
        max_length=20,
        choices=ConsentStatus.choices,
        default=ConsentStatus.GRANTED,
    )
    date_of_birth = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    branch = models.CharField(max_length=100, blank=True)
    occupation = models.CharField(max_length=100, blank=True)
    employer = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Customer Profile"
        verbose_name_plural = "Customer Profiles"

    def __str__(self):
        return f"Profile for {self.borrower.borrower_reference}"


class BusinessInformation(models.Model):
    """Business registration details for self-employed or business borrowers."""

    borrower = models.OneToOneField(
        Borrower, on_delete=models.CASCADE, related_name="business_info", null=True, blank=True
    )
    business_name = models.CharField(max_length=255, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    business_type = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    year_established = models.PositiveSmallIntegerField(blank=True, null=True)
    entity_size = models.CharField(
        max_length=20,
        choices=BusinessEntitySize.choices,
        default=BusinessEntitySize.MEDIUM,
    )
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.TZS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Information"
        verbose_name_plural = "Business Information"

    def __str__(self):
        return f"Business: {self.business_name or self.borrower.full_name}"


# =========================================================================== #
#  Account hierarchy
# =========================================================================== #
class Account(models.Model):
    """A deposit / transactional account held by a borrower."""

    account_reference = models.CharField(
        max_length=100,
        unique=True,
        help_text="e.g. ACC-NMB-0001",
    )
    borrower = models.ForeignKey(
        Borrower, on_delete=models.CASCADE, related_name="accounts"
    )
    account_name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.TZS)
    customer_since = models.DateField()
    status = models.CharField(
        max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE
    )
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    savings = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    transaction_frequency = models.CharField(
        max_length=20, choices=FrequencyType.choices, default=FrequencyType.MONTHLY
    )
    income_frequency = models.CharField(
        max_length=20, choices=FrequencyType.choices, default=FrequencyType.MONTHLY
    )
    balance_stability = models.CharField(
        max_length=20, choices=BalanceStability.choices,
        default=BalanceStability.STABLE,
    )
    opened_at = models.DateTimeField(blank=True, null=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["borrower__borrower_reference", "account_type"]
        verbose_name = "Account"
        verbose_name_plural = "Accounts"
        indexes = [
            models.Index(fields=["account_reference"]),
            models.Index(fields=["borrower", "status"]),
        ]

    def __str__(self):
        return f"{self.account_reference} – {self.account_name}"


class AccountBalanceHistory(models.Model):
    """Snapshot of an account balance at a point in time."""

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="balance_history"
    )
    recorded_at = models.DateField()
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        verbose_name = "Account Balance History"
        verbose_name_plural = "Account Balance Histories"
        constraints = [
            models.UniqueConstraint(
                fields=["account", "recorded_at"],
                name="unique_account_date_balance",
            ),
        ]

    def __str__(self):
        return f"{self.account.account_reference} @ {self.recorded_at}: {self.balance}"


class Transaction(models.Model):
    """A single debit/credit transaction on an account."""

    transaction_id = models.CharField(max_length=120, unique=True)
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="transactions"
    )
    transaction_date = models.DateTimeField()
    value_date = models.DateField()
    type = models.CharField(max_length=30, choices=TransactionType.choices)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.TZS)
    direction = models.CharField(
        max_length=10, choices=TransactionDirection.choices
    )
    balance_after = models.DecimalField(max_digits=15, decimal_places=2)
    counterparty = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20, choices=TransactionStatus.choices,
        default=TransactionStatus.POSTED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-transaction_date"]
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        indexes = [
            models.Index(fields=["transaction_id"]),
            models.Index(fields=["account", "transaction_date"]),
        ]

    def __str__(self):
        return f"{self.transaction_id} – {self.direction} {self.amount}"


# =========================================================================== #
#  Loan hierarchy
# =========================================================================== #
class Loan(models.Model):
    """A loan disbursed to a borrower (linked to an account)."""

    loan_id = models.CharField(max_length=120, unique=True)
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="loans"
    )
    borrower = models.ForeignKey(
        Borrower, on_delete=models.CASCADE, related_name="loans"
    )
    loan_amount = models.DecimalField(max_digits=15, decimal_places=2)
    loan_date = models.DateField()
    loan_duration_months = models.PositiveSmallIntegerField()
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    outstanding_balance = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.TZS)
    status = models.CharField(
        max_length=20, choices=LoanStatus.choices, default=LoanStatus.PENDING
    )
    # Review workflow (bank-requirement decisions on portal applications)
    purpose = models.CharField(max_length=50, blank=True, help_text="Loan purpose code")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True, null=True,
        related_name="reviewed_loans",
        help_text="Admin who approved or rejected this loan",
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    review_notes = models.TextField(blank=True, help_text="Admin's decision note / rejection reason")
    opened_at = models.DateTimeField(blank=True, null=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["borrower__borrower_reference", "-loan_date"]
        verbose_name = "Loan"
        verbose_name_plural = "Loans"
        indexes = [
            models.Index(fields=["loan_id"]),
            models.Index(fields=["borrower", "status"]),
        ]

    def __str__(self):
        return f"{self.loan_id} – {self.loan_amount} {self.currency}"


class LoanRepayment(models.Model):
    """A single repayment against a loan."""

    loan = models.ForeignKey(
        Loan, on_delete=models.CASCADE, related_name="repayments"
    )
    borrower = models.ForeignKey(
        Borrower, on_delete=models.CASCADE, related_name="repayments"
    )
    repayment_amount = models.DecimalField(max_digits=15, decimal_places=2)
    repayment_date = models.DateField()
    due_date = models.DateField()
    days_overdue = models.PositiveSmallIntegerField(default=0)
    missed_payments = models.PositiveSmallIntegerField(default=0)
    late_payments = models.PositiveSmallIntegerField(default=0)
    default_status = models.CharField(
        max_length=20, choices=DefaultStatus.choices,
        default=DefaultStatus.CURRENT,
    )
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.TZS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["loan", "-repayment_date"]
        verbose_name = "Loan Repayment"
        verbose_name_plural = "Loan Repayments"
        indexes = [
            models.Index(fields=["borrower", "repayment_date"]),
            models.Index(fields=["loan", "repayment_date"]),
        ]

    def __str__(self):
        return f"Repayment {self.repayment_amount} for {self.loan.loan_id}"


# =========================================================================== #
#  Consent & Legal
# =========================================================================== #
class Consent(models.Model):
    """
    Legal data-access authorization granted by a borrower.
    Records what scope of data the central system may pull.
    """

    borrower = models.ForeignKey(
        Borrower, on_delete=models.CASCADE, related_name="consents"
    )
    consent_id = models.CharField(max_length=120, unique=True)
    scope = models.JSONField(
        default=list,
        help_text="List of permitted data-field scopes",
    )
    granted_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=ConsentStatus.choices,
        default=ConsentStatus.GRANTED,
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-granted_at"]
        verbose_name = "Consent"
        verbose_name_plural = "Consents"
        indexes = [
            models.Index(fields=["borrower", "status"]),
            models.Index(fields=["consent_id"]),
        ]

    def __str__(self):
        return f"Consent {self.consent_id} – {self.borrower.borrower_reference}"


# =========================================================================== #
#  Integration credentials (API keys – hashed)
# =========================================================================== #
class IntegrationCredential(models.Model):
    """
    An API key used by the DAIRE Central System (or other integration)
    to authenticate against this lender subsystem.

    Only the *hash* of the key is stored – the plaintext is shown once
    at creation time and never persisted.
    """

    name = models.CharField(max_length=200, help_text="Human-readable name")
    lender_id = models.CharField(max_length=50, blank=True, help_text="Owning institution")
    key_hash = models.CharField(max_length=128, unique=True, editable=False)
    key_prefix = models.CharField(max_length=20, help_text="First 12 chars – for display")
    role = models.CharField(max_length=30, choices=Role.choices)
    permissions = models.JSONField(
        default=list,
        help_text="Granular permission scopes, e.g. ['pull', 'push']",
    )
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, related_name="credentials"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Integration Credential"
        verbose_name_plural = "Integration Credentials"
        indexes = [
            models.Index(fields=["key_hash"]),
            models.Index(fields=["key_prefix"]),
            models.Index(fields=["lender_id"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.key_prefix}…)"

    @property
    def is_authenticated(self):
        """Django auth compatibility – API key credentials are authenticated."""
        return True

    @classmethod
    def create_key(cls, name, role, institution, permissions=None, **extra):
        """Create a credential and return the *plaintext* key (once)."""
        plaintext = generate_api_key()
        obj = cls(
            name=name,
            key_hash=hash_api_key(plaintext),
            key_prefix=plaintext[:12],
            role=role,
            permissions=permissions or [],
            institution=institution,
            **extra,
        )
        obj.save()
        return obj, plaintext

    def verify(self, key: str) -> bool:
        """Verify a plaintext key against the stored hash."""
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return secrets.compare_digest(self.key_hash, hash_api_key(key))


# =========================================================================== #
#  Credit results (pushed by central system)
# =========================================================================== #
class CreditResult(models.Model):
    """A credit score / reputation result received from the DAIRE Central System."""

    borrower = models.ForeignKey(
        Borrower, on_delete=models.CASCADE, related_name="credit_results"
    )
    result_type = models.CharField(max_length=50, default="CREDIT_RESULT")
    credit_score = models.IntegerField(blank=True, null=True)
    reputation = models.CharField(max_length=50, blank=True)
    risk_level = models.CharField(max_length=50, blank=True)
    ruleset_version = models.CharField(max_length=100, blank=True)
    model_version = models.CharField(max_length=100, blank=True)
    transaction_hash = models.CharField(max_length=200, blank=True)
    received_at = models.DateTimeField(default=timezone.now)
    received_via = models.ForeignKey(
        IntegrationCredential, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="credit_results",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]
        verbose_name = "Credit Result"
        verbose_name_plural = "Credit Results"
        indexes = [
            models.Index(fields=["borrower", "received_at"]),
        ]

    def __str__(self):
        return f"CreditResult for {self.borrower.borrower_reference} – {self.credit_score}"


# =========================================================================== #
#  Custom user
# =========================================================================== #
from django.contrib.auth.models import (  # noqa: E402
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.contrib.postgres.fields import ArrayField  # noqa: E402


class CustomUserManager(BaseUserManager):
    """Manager for the custom user model (email-based)."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_active", True)
        return self._create_user(email, password, **extra)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model with role-based access control.

    Roles: ADMIN, DATA_OFFICER, AUDITOR, READ_ONLY, BORROWER
    For BORROWER role, the `borrower` FK links to the user's Borrower record.
    """

    email = models.EmailField(unique=True, max_length=255)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.READ_ONLY)
    # For BORROWER-role users: link to their Borrower record
    borrower = models.OneToOneField(
        "Borrower",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="portal_user",
        help_text="Linked borrower record (for self-service portal users only)",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def institution(self):
        try:
            return Institution.objects.get(lender_id=getattr(settings, "LENDER_ID", ""))
        except (Institution.DoesNotExist, Exception):
            return None
