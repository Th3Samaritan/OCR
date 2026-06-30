"""Labeled benchmark corpus.

Each :class:`Case` pairs a document with the *set of rule ids that should fire*
on it. Those labels are authored here by hand — independently of what the packs
actually do at runtime — which is what makes scoring meaningful rather than
circular: we assert "this statement's books don't balance" and the harness
checks whether ``balance_sheet_identity`` is among the flags.

Two kinds of case per pack:

* a **clean** document — every check should pass (expected flags = ``set()``),
  which exercises the packs' false-positive rate; and
* a **defective** document (the pack's own planted-error demo sample) — whose
  expected flags are the verified planted defects.

Plus a couple of **isolated single-defect** financial cases (the lead vertical),
each mutating one field that exactly one rule reads, to show a defect is caught
without spilling false positives onto neighbouring checks.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from hermes.bank import BankStatement, Transaction
from hermes.clinical import BilledItem, ClinicalRecord, Diagnosis, Procedure
from hermes.financial import (
    BalanceSheet,
    Figure,
    FinancialStatement,
    IncomeStatement,
    LineItem,
)
from hermes.insurance import Claim, ClaimLineItem, Coverage, InsuranceCase, Policy
from hermes.legal import Clause, Contract, Obligation

# Defective documents reuse the packs' existing planted-error demos, so the
# benchmark and the demos can never drift apart.
from hermes.demo_bank import sample_statement as bank_defective
from hermes.demo_clinical import sample_record as clinical_defective
from hermes.demo_financial import sample_statement as financial_defective
from hermes.demo_insurance import sample_case as insurance_defective
from hermes.demo_legal import sample_contract as legal_defective


@dataclass
class Case:
    """One labeled benchmark document."""
    doc_type: str
    name: str
    build: Callable[[], object]
    expected_flags: set[str]
    note: str = ""


# --------------------------------------------------------------------------- #
# Clean documents — hand-built so every deterministic check passes.
# --------------------------------------------------------------------------- #
def clean_financial() -> FinancialStatement:
    # opex Σ = 2,100,000 → OI = 4,000,000 − 2,100,000 = 1,900,000
    # net = 1,900,000 − 100,000 − 300,000 = 1,500,000
    # assets Σ = 12,800,000 = liabilities 5,800,000 + equity 7,000,000
    # cash 6,300,000 == bank closing 6,300,000
    return FinancialStatement(
        entity="Clean Books Ltd",
        period="FY2025",
        currency="₦",
        income_statement=IncomeStatement(
            revenue=Figure(label="Revenue", value=10_000_000, page=11),
            cogs=Figure(label="COGS", value=6_000_000, page=11),
            gross_profit=Figure(label="Gross profit", value=4_000_000, page=11),
            opex=[
                LineItem(label="Salaries", amount=1_200_000, page=12),
                LineItem(label="Rent", amount=600_000, page=12),
                LineItem(label="Marketing", amount=300_000, page=12),
            ],
            operating_income=Figure(label="Operating income", value=1_900_000, page=12),
            interest=Figure(label="Interest", value=100_000, page=12),
            tax=Figure(label="Tax", value=300_000, page=12),
            net_income=Figure(label="Net income", value=1_500_000, page=12),
        ),
        balance_sheet=BalanceSheet(
            assets=[
                LineItem(label="Cash", amount=6_300_000, page=28),
                LineItem(label="Receivables", amount=2_000_000, page=28),
                LineItem(label="Equipment", amount=4_500_000, page=28),
            ],
            total_assets=Figure(label="Total assets", value=12_800_000, page=28),
            liabilities=[
                LineItem(label="Payables", amount=1_800_000, page=29),
                LineItem(label="Loan", amount=4_000_000, page=29),
            ],
            total_liabilities=Figure(label="Total liabilities", value=5_800_000, page=29),
            equity=[
                LineItem(label="Share capital", amount=5_000_000, page=29),
                LineItem(label="Retained earnings", amount=2_000_000, page=29),
            ],
            total_equity=Figure(label="Total equity", value=7_000_000, page=29),
        ),
        bank_closing_balance=Figure(label="Bank closing balance", value=6_300_000, page=40),
    )


def clean_bank() -> BankStatement:
    # opening 100,000 + credits 1,000,000 − debits 260,000 = closing 840,000
    return BankStatement(
        account_holder="Clean Books Ltd",
        bank="First Bank",
        account_masked="****3920",
        period_start="2026-01-01",
        period_end="2026-01-31",
        currency="₦",
        opening_balance=100_000,
        closing_balance=840_000,
        stated_total_credits=1_000_000,
        stated_total_debits=260_000,
        transactions=[
            Transaction(date="2026-01-03", description="Salary", credit=500_000, balance=600_000, page=1),
            Transaction(date="2026-01-05", description="Rent", debit=200_000, balance=400_000, page=1),
            Transaction(date="2026-01-09", description="Transfer", debit=50_000, balance=350_000, page=1),
            Transaction(date="2026-01-10", description="POS", debit=10_000, balance=340_000, page=1),
            Transaction(date="2026-01-15", description="Refund", credit=300_000, balance=640_000, page=2),
            Transaction(date="2026-01-20", description="Rebate", credit=200_000, balance=840_000, page=2),
        ],
    )


def clean_insurance() -> InsuranceCase:
    # payable = limit 10,000,000 − deductible 500,000 = 9,500,000; claim 9,000,000 within.
    # line items sum to 9,000,000; all required docs present; loss in period.
    return InsuranceCase(
        currency="₦",
        policy=Policy(
            insured="Clean Books Ltd", policy_no="P-001",
            period_start="2026-01-01", period_end="2026-12-31",
            coverages=[
                Coverage(peril="Fire", limit=10_000_000, deductible=500_000),
                Coverage(peril="Theft", limit=5_000_000, deductible=250_000),
            ],
            exclusions=["Flood"],
        ),
        claim=Claim(
            claimant="Clean Books Ltd", claim_no="C-77",
            date_of_loss="2026-03-15", peril="Fire",
            claimed_amount=9_000_000,
            line_items=[
                ClaimLineItem(description="Building repair", amount=6_500_000),
                ClaimLineItem(description="Equipment", amount=2_500_000),
            ],
            supporting_docs=["police_report", "photos", "invoice"],
            required_docs=["police_report", "photos", "invoice"],
        ),
    )


def clean_clinical() -> ClinicalRecord:
    # every billed code maps to a documented procedure; every procedure has a dx;
    # all required elements documented; no duplicate billing.
    return ClinicalRecord(
        patient_ref="pt_8842",
        encounter_date="2026-04-10",
        diagnoses=[
            Diagnosis(code="E11.9", description="Type 2 diabetes"),
            Diagnosis(code="I10", description="Hypertension"),
        ],
        procedures=[
            Procedure(code="99214", description="Office visit", linked_diagnosis="I10"),
            Procedure(code="93000", description="EKG", linked_diagnosis="E11.9"),
        ],
        billed=[
            BilledItem(code="99214", charge=180),
            BilledItem(code="93000", charge=90),
        ],
        note="Patient seen for diabetes and hypertension follow-up.",
        required_elements=["history", "exam", "mdm"],
        documented_elements=["history", "exam", "mdm"],
    )


def clean_legal() -> Contract:
    # single governing law; all required clauses present; every used term defined;
    # single payment term; dates ordered; obligation within term.
    return Contract(
        title="Master Services Agreement",
        parties=["Clean Books Ltd", "Beta Services Inc"],
        effective_date="2026-01-01",
        term_end="2026-12-31",
        governing_law=["Lagos State"],
        clauses=[
            Clause(type="termination", page=4),
            Clause(type="confidentiality", page=6),
            Clause(type="indemnity", page=7),
            Clause(type="liability_cap", page=8),
        ],
        required_clauses=["termination", "confidentiality", "indemnity", "liability_cap"],
        defined_terms=["Services", "Confidential Information"],
        used_terms=["Services"],
        payment_terms_days=[30],
        obligations=[Obligation(party="Clean Books Ltd", description="Deliver phase 1", due_date="2026-02-01")],
    )


# --------------------------------------------------------------------------- #
# Isolated single-defect financial cases — mutate one field that exactly one
# rule reads, proving the defect is caught without collateral false positives.
# --------------------------------------------------------------------------- #
def financial_bad_net_income() -> FinancialStatement:
    s = clean_financial()
    # OI − interest − tax = 1,500,000, but state it as 1,234,000. Only the
    # net_income rule reads net_income, so nothing else should move.
    s.income_statement.net_income.value = 1_234_000
    return s


def financial_bad_bank_reconciliation() -> FinancialStatement:
    s = clean_financial()
    # Balance-sheet Cash (6,300,000) no longer matches the bank closing balance.
    # Only the bank_reconciliation rule reads bank_closing_balance.
    s.bank_closing_balance.value = 5_900_000
    return s


# --------------------------------------------------------------------------- #
# The corpus.
# --------------------------------------------------------------------------- #
CORPUS: list[Case] = [
    # Financial (lead vertical) ------------------------------------------------
    Case("financial", "financial/clean", clean_financial, set(),
         "internally consistent statement — nothing should flag"),
    Case("financial", "financial/planted", financial_defective,
         {"operating_income", "balance_sheet_identity", "bank_reconciliation", "duplicate_line_item"},
         "the demo statement: bad OI, books don't balance, cash≠bank, duplicate opex"),
    Case("financial", "financial/net_income_only", financial_bad_net_income,
         {"net_income"}, "isolated: net income mis-stated, no other check affected"),
    Case("financial", "financial/bank_recon_only", financial_bad_bank_reconciliation,
         {"bank_reconciliation"}, "isolated: cash ≠ bank closing balance"),

    # Bank ---------------------------------------------------------------------
    Case("bank", "bank/clean", clean_bank, set(),
         "reconciling statement — nothing should flag"),
    Case("bank", "bank/planted", bank_defective,
         {"running_balance_continuity", "opening_closing_reconciliation",
          "duplicate_transaction", "structuring_aml"},
         "broken running balance, non-reconciling close, duplicate deposit, structuring"),

    # Insurance ----------------------------------------------------------------
    Case("insurance", "insurance/clean", clean_insurance, set(),
         "payable claim, lines sum, docs complete — nothing should flag"),
    Case("insurance", "insurance/planted", insurance_defective,
         {"claim_within_limit", "claim_lines_sum", "completeness"},
         "claim over limit, lines don't sum, missing police report"),

    # Clinical -----------------------------------------------------------------
    Case("clinical", "clinical/clean", clean_clinical, set(),
         "supported codes, linked procedures, complete docs — nothing should flag"),
    Case("clinical", "clinical/planted", clinical_defective,
         {"coding_support", "medical_necessity", "documentation_completeness", "duplicate_billing"},
         "unsupported code, unlinked procedure, missing element, duplicate bill"),

    # Legal --------------------------------------------------------------------
    Case("legal", "legal/clean", clean_legal, set(),
         "single law, all clauses, defined terms, one payment term — nothing should flag"),
    Case("legal", "legal/planted", legal_defective,
         {"required_clauses", "single_governing_law", "defined_terms", "payment_terms"},
         "missing indemnity, conflicting law, undefined term, conflicting payment terms"),
]
