"""Registry of audit domain packs, so the pipeline is pack-aware (not just financial).

Each entry bundles everything the pipeline needs for one document type: the rule
pack, the schema (for real extraction), a mock sample (planted-error demo), an
extraction prompt, and a title function.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from hermes.bank import BANK_RULE_PACK, BankStatement
from hermes.clinical import CLINICAL_RULE_PACK, ClinicalRecord
from hermes.core import RulePack
from hermes.demo_bank import sample_statement as bank_sample
from hermes.demo_clinical import sample_record as clinical_sample
from hermes.demo_financial import sample_statement as financial_sample
from hermes.demo_insurance import sample_case as insurance_sample
from hermes.demo_legal import sample_contract as legal_sample
from hermes.financial import FINANCIAL_RULE_PACK, FinancialStatement
from hermes.insurance import INSURANCE_RULE_PACK, InsuranceCase
from hermes.legal import LEGAL_RULE_PACK, Contract


@dataclass
class Pack:
    label: str
    rule_pack: RulePack
    schema: type
    sample: Callable[[], object]
    prompt: str
    title: Callable[[object], str]


PACKS: dict[str, Pack] = {
    "financial": Pack(
        "Financial audit", FINANCIAL_RULE_PACK, FinancialStatement, financial_sample,
        "Extract the financial statement (income statement, balance sheet, cash flow) into the "
        "schema. Use the page numbers shown; do not invent values.",
        lambda d: f"{d.entity} — {d.period}",
    ),
    "bank": Pack(
        "Bank statement", BANK_RULE_PACK, BankStatement, bank_sample,
        "Extract the bank statement: account holder, period, opening/closing balance, and every "
        "transaction (date, description, debit, credit, running balance).",
        lambda d: f"{d.account_holder} — {d.period_start} to {d.period_end}",
    ),
    "insurance": Pack(
        "Insurance claim", INSURANCE_RULE_PACK, InsuranceCase, insurance_sample,
        "Extract the insurance policy (coverages: peril, limit, deductible; exclusions; period) "
        "and the claim (peril, claimed amount, line items, supporting docs).",
        lambda d: f"Claim {d.claim.claim_no} · policy {d.policy.policy_no}",
    ),
    "clinical": Pack(
        "Clinical / coding", CLINICAL_RULE_PACK, ClinicalRecord, clinical_sample,
        "Extract the clinical encounter: diagnoses (ICD-10), procedures (CPT, with linked "
        "diagnosis), billed codes, documented elements, and the note.",
        lambda d: f"Encounter {d.patient_ref} — {d.encounter_date}",
    ),
    "legal": Pack(
        "Legal contract", LEGAL_RULE_PACK, Contract, legal_sample,
        "Extract the contract: parties, dates, governing law, clauses (by type), obligations, "
        "defined terms, used terms, payment terms.",
        lambda d: d.title,
    ),
}

DEFAULT_DOC_TYPE = "financial"
