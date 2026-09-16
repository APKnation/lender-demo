"""
Serializers for the Lender Subsystem API.

All serializers exclude internal PKs and sensitive fields (national_id_hash,
passwords, API key hashes) by default.
"""
from rest_framework import serializers

from .constants import (
    AccountStatus,
    AccountType,
    DefaultStatus,
    LoanStatus,
    TransactionDirection,
    TransactionStatus,
    TransactionType,
)
from .models import (
    Account,
    AccountBalanceHistory,
    AuditLog,
    Borrower,
    BusinessInformation,
    Consent,
    CreditResult,
    CustomerProfile,
    IntegrationCredential,
    Institution,
    Loan,
    LoanRepayment,
    Transaction,
)

# Fields that can be selectively returned via the pull endpoint.
BORROWER_BASE_FIELDS = [
    "borrower_reference", "customer_id", "full_name", "age", "gender",
    "employment_status", "income", "currency",
]
SELECTABLE_FIELDS = BORROWER_BASE_FIELDS + [
    "business_information", "account_information", "accounts",
    "transactions", "balance_history", "loans", "repayments",
]
# Fields that are never exposed unless explicitly in requested_fields.
SENSITIVE_FIELDS = ["national_id_hash"]


# =========================================================================== #
#  Account-level serializers
# =========================================================================== #
class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "account_reference", "account_name", "account_type", "currency",
            "customer_since", "status", "balance", "savings",
            "transaction_frequency", "income_frequency", "balance_stability",
            "opened_at", "closed_at",
        ]


class AccountBalanceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountBalanceHistory
        fields = ["account_reference", "recorded_at", "balance"]

    account_reference = serializers.CharField(
        source="account.account_reference"
    )


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "transaction_id", "account_reference", "transaction_date",
            "value_date", "type", "category", "description", "amount",
            "currency", "direction", "balance_after", "counterparty",
            "status", "created_at",
        ]

    account_reference = serializers.CharField(source="account.account_reference")


class LoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = [
            "loan_id", "account_reference", "loan_amount", "loan_date",
            "loan_duration_months", "interest_rate", "outstanding_balance",
            "currency", "status", "opened_at", "closed_at",
            "created_at", "updated_at",
        ]

    account_reference = serializers.CharField(source="account.account_reference")


class LoanRepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanRepayment
        fields = [
            "loan_reference", "repayment_amount", "repayment_date", "due_date",
            "days_overdue", "missed_payments", "late_payments", "default_status",
            "currency", "created_at", "updated_at",
        ]

    loan_reference = serializers.CharField(source="loan.loan_id")


class BusinessInformationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessInformation
        fields = [
            "business_name", "registration_number", "business_type", "industry",
            "year_established", "entity_size", "annual_revenue", "currency",
        ]


class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consent
        fields = ["consent_id", "scope", "granted_at", "expires_at",
                  "status", "created_at"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["risk_score", "kyc_status", "date_of_birth", "address",
                  "city", "postal_code", "branch", "occupation", "employer",
                  "updated_at"]


# =========================================================================== #
#  Normalized borrower contract
# =========================================================================== #
class NormalizedBorrowerSerializer(serializers.ModelSerializer):
    """
    Serialiser that produces the canonical DAIRE normalised contract.

    Every nested list is pre‑fetched to avoid N+1 queries.
    The ``requested_fields`` mechanism is handled in the view – here we
    always serialise all branches and the caller strips unwanted ones.
    """

    business_information = serializers.SerializerMethodField()
    account_information = serializers.SerializerMethodField()
    accounts = AccountSerializer(many=True, read_only=True)
    transactions = TransactionSerializer(many=True, read_only=True)
    balance_history = serializers.SerializerMethodField()
    loans = LoanSerializer(many=True, read_only=True)
    repayments = LoanRepaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Borrower
        fields = BORROWER_BASE_FIELDS + [
            "business_information", "account_information", "accounts",
            "transactions", "balance_history", "loans", "repayments",
        ]

    def get_business_information(self, obj):
        try:
            biz = obj.business_info
        except BusinessInformation.DoesNotExist:
            return {}
        return BusinessInformationSerializer(biz).data

    def get_account_information(self, obj):
        accounts = obj.accounts.all()
        total_balance = sum((a.balance for a in accounts), 0)
        return {
            "total_accounts": accounts.count(),
            "total_balance": total_balance,
            "currency": obj.currency,
            "active_accounts": accounts.filter(status=AccountStatus.ACTIVE).count(),
        }

    def get_balance_history(self, obj):
        histories = AccountBalanceHistory.objects.filter(
            account__borrower=obj
        ).select_related("account")[:100]
        return AccountBalanceHistorySerializer(histories, many=True).data


# =========================================================================== #
#  Write serializers for admin / internal use
# =========================================================================== #
class BorrowerWriteSerializer(serializers.ModelSerializer):
    national_id_hash = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Borrower
        fields = [
            "borrower_reference", "customer_id", "full_name", "age", "gender",
            "phone", "email", "national_id_hash", "employment_status",
            "income", "currency", "is_active", "institution",
        ]
        read_only_fields = ["borrower_reference", "institution"]
        extra_kwargs = {
            "phone": {"required": False, "allow_blank": True},
            "email": {"required": False, "allow_blank": True},
            "borrower_reference": {"required": False},
        }

    def create(self, validated_data):
        from django.conf import settings as _s
        inst = validated_data.pop("institution", None)
        if inst is None:
            inst = Institution.objects.get(lender_id=_s.LENDER_ID)
        validated_data["institution"] = inst
        if not validated_data.get("borrower_reference"):
            validated_data["borrower_reference"] = self._generate_reference(inst)
        return super().create(validated_data)

    @staticmethod
    def _generate_reference(inst):
        prefix = getattr(__import__("django.conf", fromlist=["settings"]).settings,
                         "BORROWER_REF_PREFIX", "BRW-TZ")
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
        return f"{prefix}-{num:04d}"

    def to_representation(self, instance):
        return NormalizedBorrowerSerializer(instance).data


class AccountWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "account_reference", "account_name", "account_type", "currency",
            "customer_since", "status", "balance", "savings",
            "transaction_frequency", "income_frequency", "balance_stability",
        ]


class TransactionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "transaction_id", "account", "transaction_date", "value_date",
            "type", "category", "description", "amount", "currency",
            "direction", "balance_after", "counterparty", "status",
        ]


class LoanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = [
            "loan_id", "account", "borrower", "loan_amount", "loan_date",
            "loan_duration_months", "interest_rate", "outstanding_balance",
            "currency", "status",
        ]


class LoanRepaymentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanRepayment
        fields = [
            "loan", "repayment_amount", "repayment_date", "due_date",
            "days_overdue", "missed_payments", "late_payments",
            "default_status", "currency",
        ]


class ConsentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consent
        fields = ["borrower", "consent_id", "scope", "expires_at", "status"]


# =========================================================================== #
#  Integration credentials
# =========================================================================== #
class IntegrationCredentialCreateSerializer(serializers.ModelSerializer):
    plaintext_key = serializers.CharField(read_only=True)

    class Meta:
        model = IntegrationCredential
        fields = ["id", "name", "lender_id", "role", "permissions",
                  "institution", "expires_at", "is_active", "plaintext_key"]
        read_only_fields = ["id", "plaintext_key"]
        extra_kwargs = {
            "name": {"required": True},
            "role": {"required": True},
            "institution": {"required": True},
        }

    def create(self, validated_data):
        obj, plaintext = IntegrationCredential.create_key(**validated_data)
        obj.plaintext_key = plaintext
        return obj


class IntegrationCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationCredential
        fields = ["name", "lender_id", "role", "permissions",
                  "key_prefix", "is_active", "created_at", "last_used_at"]


# =========================================================================== #
#  Audit & credit result
# =========================================================================== #
class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "action", "status", "log_type", "borrower_reference",
            "request_reference", "identity", "source_ip", "request_id",
            "correlation_id", "timestamp", "error_message",
            "fields_requested", "fields_returned", "metadata",
        ]


class CreditResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditResult
        fields = [
            "borrower_reference", "result_type", "credit_score", "reputation",
            "risk_level", "ruleset_version", "model_version", "transaction_hash",
            "received_at", "created_at",
        ]

    borrower_reference = serializers.CharField(source="borrower.borrower_reference")
