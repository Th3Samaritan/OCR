"""Insurance domain pack: policy + claim schema and deterministic rule pack.

Checks a single claim against its policy: peril covered, amount within the limit,
loss inside the policy period, line items reconcile, and required docs present.
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel

from .core import Finding, RulePack, Severity, fmt, money_equal


def _norm(s: str) -> str:
    return s.strip().lower()


# --------------------------------------------------------------------------- #
# Schema Pack
# --------------------------------------------------------------------------- #
class Coverage(BaseModel):
    peril: str
    limit: float
    deductible: float = 0.0


class ClaimLineItem(BaseModel):
    description: str
    amount: float


class Policy(BaseModel):
    insured: str
    policy_no: str
    period_start: str                  # ISO
    period_end: str                   # ISO
    coverages: list[Coverage] = []
    exclusions: list[str] = []         # excluded perils
    premium: Optional[float] = None


class Claim(BaseModel):
    claimant: str
    claim_no: str
    date_of_loss: str                  # ISO
    peril: str
    claimed_amount: float
    line_items: list[ClaimLineItem] = []
    supporting_docs: list[str] = []    # docs actually provided
    required_docs: list[str] = []      # docs the policy/process requires


class InsuranceCase(BaseModel):
    policy: Policy
    claim: Claim
    currency: str = "NGN"


# --------------------------------------------------------------------------- #
# Rule Pack
# --------------------------------------------------------------------------- #
def _matching_coverage(case: InsuranceCase) -> Optional[Coverage]:
    return next((c for c in case.policy.coverages if _norm(c.peril) == _norm(case.claim.peril)), None)


def check_peril_covered(case: InsuranceCase) -> list[Finding]:
    peril = case.claim.peril
    if any(_norm(peril) == _norm(e) for e in case.policy.exclusions):
        return [Finding("peril_covered", False, Severity.ERROR,
                        f"peril '{peril}' is explicitly excluded by the policy")]
    if _matching_coverage(case) is None:
        return [Finding("peril_covered", False, Severity.ERROR,
                        f"peril '{peril}' is not a covered peril on this policy")]
    return [Finding("peril_covered", True, Severity.INFO, f"peril '{peril}' is covered")]


def check_claim_within_limit(case: InsuranceCase) -> list[Finding]:
    cov = _matching_coverage(case)
    if cov is None:
        return []  # peril_covered already flags this
    cap = cov.limit - cov.deductible
    claimed = case.claim.claimed_amount
    passed = claimed <= cap + 1.0
    msg = (f"claim {fmt(claimed, case.currency)} within payable limit "
           f"{fmt(cap, case.currency)} (limit − deductible)" if passed
           else f"claim {fmt(claimed, case.currency)} exceeds payable limit {fmt(cap, case.currency)} "
                f"(limit {fmt(cov.limit, case.currency)} − deductible {fmt(cov.deductible, case.currency)}) "
                f"by {fmt(claimed - cap, case.currency)}")
    return [Finding("claim_within_limit", passed, Severity.INFO if passed else Severity.ERROR,
                    msg, expected=cap, actual=claimed)]


def check_date_of_loss_in_period(case: InsuranceCase) -> list[Finding]:
    try:
        start = date.fromisoformat(case.policy.period_start)
        end = date.fromisoformat(case.policy.period_end)
        loss = date.fromisoformat(case.claim.date_of_loss)
    except ValueError:
        return [Finding("date_of_loss_in_period", False, Severity.ERROR,
                        "unparseable policy period or date of loss")]
    passed = start <= loss <= end
    return [Finding("date_of_loss_in_period", passed, Severity.INFO if passed else Severity.ERROR,
                    f"date of loss {case.claim.date_of_loss} "
                    + ("is within" if passed else "is OUTSIDE")
                    + f" the policy period {case.policy.period_start}..{case.policy.period_end}")]


def check_claim_lines_sum(case: InsuranceCase) -> list[Finding]:
    if not case.claim.line_items:
        return [Finding("claim_lines_sum", True, Severity.INFO, "no line items to cross-check")]
    total = sum(li.amount for li in case.claim.line_items)
    passed = money_equal(total, case.claim.claimed_amount)
    msg = (f"line items sum to the claimed amount {fmt(total, case.currency)}" if passed
           else f"line items sum to {fmt(total, case.currency)} but claimed amount is "
                f"{fmt(case.claim.claimed_amount, case.currency)} "
                f"(gap {fmt(case.claim.claimed_amount - total, case.currency)})")
    return [Finding("claim_lines_sum", passed, Severity.INFO if passed else Severity.WARNING,
                    msg, expected=total, actual=case.claim.claimed_amount)]


def check_completeness(case: InsuranceCase) -> list[Finding]:
    provided = {_norm(d) for d in case.claim.supporting_docs}
    missing = [d for d in case.claim.required_docs if _norm(d) not in provided]
    if missing:
        return [Finding("completeness", False, Severity.WARNING,
                        f"missing required document(s): {', '.join(missing)}")]
    return [Finding("completeness", True, Severity.INFO, "all required documents present")]


INSURANCE_RULE_PACK: RulePack = [
    check_peril_covered,
    check_claim_within_limit,
    check_date_of_loss_in_period,
    check_claim_lines_sum,
    check_completeness,
]
