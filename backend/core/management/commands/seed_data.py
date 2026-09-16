"""
Management command: seed_data

Populates the database with sample data for development and testing:
  * 6 borrowers (5 active, 1 inactive)
  * accounts, balance history, transactions, loans, repayments
  * integration credentials (API keys)
  * consent records
  * credit results

Usage:
    python manage.py seed_data
"""
import random
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.constants import (
    AccountStatus,
    AccountType,
    BalanceStability,
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
from core.models import (
    Account,
    AccountBalanceHistory,
    Borrower,
    BusinessInformation,
    Consent,
    CreditResult,
    CustomUser,
    IntegrationCredential,
    Institution,
    Loan,
    LoanRepayment,
    Transaction,
    hash_sensitive,
)


SAMPLE_BORROWERS = [
    {
        "customer_id": "NMB-CUST-0001",
        "full_name": "Amina Juma",
        "age": 29, "gender": Gender.FEMALE,
        "phone": "+255 712 345 678",
        "email": "amina.juma@example.com",
        "national_id": "746-382-193",
        "employment_status": EmploymentStatus.EMPLOYED,
        "income": Decimal("1200000.00"), "currency": Currency.TZS, "is_active": True,
    },
    {
        "customer_id": "NMB-CUST-0002",
        "full_name": "David Mrema",
        "age": 42, "gender": Gender.MALE,
        "phone": "+255 754 987 654",
        "email": "david.mrema@example.com",
        "national_id": "451-876-230",
        "employment_status": EmploymentStatus.SELF_EMPLOYED,
        "income": Decimal("2500000.00"), "currency": Currency.TZS, "is_active": True,
    },
    {
        "customer_id": "NMB-CUST-0003",
        "full_name": "Fatuma Hassan",
        "age": 35, "gender": Gender.FEMALE,
        "phone": "+255 789 111 222",
        "email": "fatuma.hassan@example.com",
        "national_id": "634-567-890",
        "employment_status": EmploymentStatus.EMPLOYED,
        "income": Decimal("850000.00"), "currency": Currency.TZS, "is_active": True,
    },
    {
        "customer_id": "NMB-CUST-0004",
        "full_name": "John Mwakalinga",
        "age": 55, "gender": Gender.MALE,
        "phone": "+255 744 333 444",
        "email": "john.mwakalinga@example.com",
        "national_id": "123-456-789",
        "employment_status": EmploymentStatus.RETIRED,
        "income": Decimal("450000.00"), "currency": Currency.TZS, "is_active": True,
    },
    {
        "customer_id": "NMB-CUST-0005",
        "full_name": "Sarah Mwangude",
        "age": 27, "gender": Gender.FEMALE,
        "phone": "+255 777 555 888",
        "email": "sarah.mwangude@example.com",
        "national_id": "987-654-321",
        "employment_status": EmploymentStatus.STUDENT,
        "income": Decimal("300000.00"), "currency": Currency.TZS, "is_active": True,
    },
    {
        "customer_id": "NMB-CUST-0006",
        "full_name": "Rajabu Kimweri",
        "age": 48, "gender": Gender.MALE,
        "phone": "+255 733 222 111",
        "email": "rajabu.kimweri@example.com",
        "national_id": "555-666-777",
        "employment_status": EmploymentStatus.UNEMPLOYED,
        "income": Decimal("0.00"), "currency": Currency.TZS, "is_active": False,
    },
]

ACCOUNTS_PER_BORROWER = [
    {"suffix": "001", "type": AccountType.SAVINGS, "initial": Decimal("500000.00")},
    {"suffix": "002", "type": AccountType.CHECKING, "initial": Decimal("150000.00")},
]

TRANSACTION_TYPES = [
    (TransactionType.DEPOSIT, TransactionDirection.CREDIT, Decimal("50000")),
    (TransactionType.WITHDRAWAL, TransactionDirection.DEBIT, Decimal("20000")),
    (TransactionType.TRANSFER_IN, TransactionDirection.CREDIT, Decimal("30000")),
    (TransactionType.TRANSFER_OUT, TransactionDirection.DEBIT, Decimal("25000")),
    (TransactionType.INTEREST, TransactionDirection.CREDIT, Decimal("5000")),
]


class Command(BaseCommand):
    help = "Seed the database with sample lender data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing data before seeding",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            self._clear_data()

        institution, _ = Institution.objects.get_or_create(
            lender_id="NMB-001",
            defaults={
                "name": "NMB Bank",
                "institution_type": InstitutionType.COMMERCIAL_BANK,
                "country_code": "TZ",
                "currency": Currency.TZS,
                "central_system_url": "http://localhost:8000",
            },
        )

        admin_user = CustomUser.objects.filter(email="admin@lender.local").first()
        if not admin_user:
            admin_user = CustomUser.objects.create_superuser(
                email="admin@lender.local",
                password="admin-pass-123",
                full_name="Admin User",
                role=Role.ADMIN,
            )
            self.stdout.write(f"  Created super-admin: {admin_user.email}")

        for email, role, name in [
            ("data.officer@lender.local", Role.DATA_OFFICER, "Data Officer"),
            ("auditor@lender.local", Role.AUDITOR, "Auditor"),
            ("readonly@lender.local", Role.READ_ONLY, "Read Only User"),
        ]:
            if not CustomUser.objects.filter(email=email).exists():
                CustomUser.objects.create_user(
                    email=email, password="Staff-Password-123!",
                    full_name=name, role=role,
                )
                self.stdout.write(f"  Created {role} user: {email}")

        cred, plaintext_key = IntegrationCredential.create_key(
            name="DAIRE Central System",
            role=Role.CENTRAL_SYSTEM,
            institution=institution,
            permissions=["pull", "push"],
            lender_id="NMB-001",
        )
        self.stdout.write(f"  Created integration API key: {plaintext_key}")

        borrowers = []
        today = date.today()

        for bdata in SAMPLE_BORROWERS:
            national_id = bdata.pop("national_id")
            nid_hash = hash_sensitive(national_id)
            borrower, created = Borrower.objects.get_or_create(
                customer_id=bdata["customer_id"],
                defaults={**bdata, "national_id_hash": nid_hash, "institution": institution},
            )
            borrowers.append(borrower)
            if created:
                self.stdout.write(f"  Created borrower: {borrower.borrower_reference}")

        ref_counter = 1001
        for borrower in borrowers:
            for acct_info in ACCOUNTS_PER_BORROWER:
                acct_ref = f"ACC-NMB-{ref_counter:04d}"
                account = Account.objects.create(
                    account_reference=acct_ref,
                    borrower=borrower,
                    account_name=f"{borrower.full_name} {acct_info['type'].title()}",
                    account_type=acct_info["type"],
                    currency=borrower.currency,
                    customer_since=today - timedelta(days=random.randint(365, 730)),
                    status=AccountStatus.ACTIVE if borrower.is_active else AccountStatus.CLOSED,
                    balance=acct_info["initial"],
                    savings=acct_info["initial"] * Decimal("0.3"),
                    transaction_frequency=FrequencyType.MONTHLY,
                    income_frequency=FrequencyType.MONTHLY,
                    balance_stability=BalanceStability.STABLE,
                    opened_at=timezone.make_aware(__import__("datetime").datetime.combine(
                        today - timedelta(days=365), __import__("datetime").time.min
                    )),
                )

                for j in range(3):
                    hist_date = today - timedelta(days=30 * (3 - j))
                    AccountBalanceHistory.objects.create(
                        account=account, recorded_at=hist_date,
                        balance=account.balance - Decimal(str(j * 5000)),
                    )

                for k in range(5):
                    t_type, direction, base_amount = random.choice(TRANSACTION_TYPES)
                    amount = max(Decimal("1000"), base_amount + Decimal(str(random.randint(-5000, 5000))))
                    if direction == TransactionDirection.DEBIT:
                        balance_after = account.balance - amount
                    else:
                        balance_after = account.balance + amount
                    txn_tz = timezone.make_aware(__import__("datetime").datetime.combine(
                        today - timedelta(days=20 - k), __import__("datetime").time.min
                    ))
                    Transaction.objects.create(
                        transaction_id=f"TXN-NMB-{ref_counter:04d}-{k:02d}",
                        account=account,
                        transaction_date=txn_tz,
                        value_date=today - timedelta(days=20 - k),
                        type=t_type,
                        category="TRANSFER" if "TRANSFER" in t_type else "CASH",
                        description=f"Sample {t_type.lower()} transaction #{k}",
                        amount=amount,
                        currency=borrower.currency,
                        direction=direction,
                        balance_after=balance_after,
                        counterparty="Counterparty ABC" if "TRANSFER" in t_type else "",
                        status=TransactionStatus.POSTED,
                    )

                ref_counter += 1

            if borrower.is_active:
                loan_count = random.randint(1, 2)
                for l_idx in range(loan_count):
                    loan_amount = Decimal(str(random.randint(500000, 5000000)))
                    bnum = borrower.borrower_reference.split("-")[-1]
                    loan_id = f"LOAN-NMB-{bnum}-{l_idx + 1}"
                    loan = Loan.objects.create(
                        loan_id=loan_id,
                        account=borrower.accounts.first(),
                        borrower=borrower,
                        loan_amount=loan_amount,
                        loan_date=today - timedelta(days=random.randint(180, 365)),
                        loan_duration_months=random.choice([6, 12, 24, 36]),
                        interest_rate=Decimal(str(random.choice([5.5, 8.0, 12.5, 15.0]))),
                        outstanding_balance=loan_amount * Decimal("0.6"),
                        currency=borrower.currency,
                        status=random.choice([LoanStatus.ACTIVE, LoanStatus.ACTIVE, LoanStatus.PAID_OFF]),
                    )

                    num_repayments = random.randint(3, 8)
                    monthly_repayment = loan_amount / loan.loan_duration_months
                    for r_idx in range(num_repayments):
                        repayment_date = loan.loan_date + timedelta(days=30 * (r_idx + 1))
                        days_overdue = random.randint(0, 5) if random.random() > 0.3 else 0
                        LoanRepayment.objects.create(
                            loan=loan,
                            borrower=borrower,
                            repayment_amount=round(monthly_repayment, 2),
                            repayment_date=repayment_date,
                            due_date=repayment_date,
                            days_overdue=days_overdue,
                            missed_payments=1 if days_overdue > 10 else 0,
                            late_payments=1 if days_overdue > 0 else 0,
                            default_status=DefaultStatus.CURRENT if days_overdue < 30 else DefaultStatus.DELINQUENT,
                            currency=borrower.currency,
                        )

            if borrower.employment_status == EmploymentStatus.SELF_EMPLOYED:
                BusinessInformation.objects.create(
                    borrower=borrower,
                    business_name=f"{borrower.full_name} General Trading",
                    registration_number=f"REG-{random.randint(10000, 99999)}",
                    business_type="Sole Proprietorship",
                    industry="Retail",
                    year_established=today.year - random.randint(2, 10),
                    annual_revenue=borrower.income * Decimal("2.5"),
                    currency=borrower.currency,
                )

            Consent.objects.create(
                borrower=borrower,
                consent_id=f"CON-NMB-{borrower.borrower_reference.split('-')[-1]}",
                scope=["income", "accounts", "loans", "repayments", "transactions"],
                granted_at=timezone.now() - timedelta(days=30),
                expires_at=timezone.now() + timedelta(days=365),
                status=ConsentStatus.GRANTED,
                granted_by=admin_user,
            )

        # Sample credit results
        for borrower in borrowers[:3]:
            CreditResult.objects.create(
                borrower=borrower,
                result_type="CREDIT_RESULT",
                credit_score=random.randint(650, 850),
                reputation=random.choice(["GOOD", "EXCELLENT", "FAIR"]),
                risk_level=random.choice(["LOW", "MEDIUM", "HIGH"]),
                ruleset_version="daire-rules-v2.1",
                model_version="daire-ai-v3",
                transaction_hash=f"0x{''.join(random.choices('0123456789abcdef', k=32))}",
                received_at=timezone.now() - timedelta(days=random.randint(1, 30)),
                received_via=cred,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSeeding complete!\n"
                f"  Borrowers: {Borrower.objects.count()}\n"
                f"  Accounts:  {Account.objects.count()}\n"
                f"  Transactions: {Transaction.objects.count()}\n"
                f"  Loans: {Loan.objects.count()}\n"
                f"  Repayments: {LoanRepayment.objects.count()}\n"
                f"  Credit results: {CreditResult.objects.count()}\n\n"
                f"  Central-system API key (for testing):\n  {plaintext_key}"
            )
        )

    def _clear_data(self):
        models = [
            CreditResult, LoanRepayment, Loan, Transaction,
            AccountBalanceHistory, Consent, BusinessInformation,
            IntegrationCredential, Borrower, Institution,
        ]
        for model in reversed(models):
            model.objects.all().delete()
        CustomUser.objects.filter(email__in=[
            "admin@lender.local", "data.officer@lender.local",
            "auditor@lender.local", "readonly@lender.local",
        ]).delete()
        self.stdout.write("  Cleared all data.")
