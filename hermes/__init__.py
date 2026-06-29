"""Hermes — long-horizon document intelligence engine (verification layer)."""
from .core import Finding, Severity, run_pack, render_report
from .financial import FinancialStatement, FINANCIAL_RULE_PACK
from .bank import BankStatement, Transaction, BANK_RULE_PACK
from .insurance import InsuranceCase, Policy, Claim, INSURANCE_RULE_PACK
from .clinical import ClinicalRecord, CLINICAL_RULE_PACK
from .legal import Contract, LEGAL_RULE_PACK
from .registry import (
    IssuerRecord,
    PresentedDocument,
    RecordStore,
    VerifyStatus,
    VerifyResult,
    verify,
    render_verify,
)

__all__ = [
    "Finding",
    "Severity",
    "run_pack",
    "render_report",
    "FinancialStatement",
    "FINANCIAL_RULE_PACK",
    "BankStatement",
    "Transaction",
    "BANK_RULE_PACK",
    "InsuranceCase",
    "Policy",
    "Claim",
    "INSURANCE_RULE_PACK",
    "ClinicalRecord",
    "CLINICAL_RULE_PACK",
    "Contract",
    "LEGAL_RULE_PACK",
    "IssuerRecord",
    "PresentedDocument",
    "RecordStore",
    "VerifyStatus",
    "VerifyResult",
    "verify",
    "render_verify",
]
