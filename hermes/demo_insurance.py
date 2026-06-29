"""Runnable demo of the Insurance pack.

    python -m hermes.demo_insurance

Planted problems: claim exceeds the payable limit, line items don't sum to the
claimed amount, and a required document is missing.
"""
from __future__ import annotations

from .core import render_report, run_pack
from .insurance import (
    Claim,
    ClaimLineItem,
    Coverage,
    InsuranceCase,
    Policy,
    INSURANCE_RULE_PACK,
)


def sample_case() -> InsuranceCase:
    return InsuranceCase(
        currency="₦",
        policy=Policy(
            insured="Acme Trading Ltd", policy_no="P-001",
            period_start="2026-01-01", period_end="2026-12-31",
            coverages=[
                Coverage(peril="Fire", limit=10_000_000, deductible=500_000),
                Coverage(peril="Theft", limit=5_000_000, deductible=250_000),
            ],
            exclusions=["Flood"],
        ),
        claim=Claim(
            claimant="Acme Trading Ltd", claim_no="C-77",
            date_of_loss="2026-03-15", peril="Fire",
            claimed_amount=9_800_000,                      # planted: > 9,500,000 payable
            line_items=[
                ClaimLineItem(description="Building repair", amount=7_000_000),
                ClaimLineItem(description="Equipment", amount=2_500_000),  # sums to 9,500,000 ≠ claimed
            ],
            supporting_docs=["photos", "invoice"],          # planted: missing police_report
            required_docs=["police_report", "photos", "invoice"],
        ),
    )


def main() -> None:
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    case = sample_case()
    findings = run_pack(INSURANCE_RULE_PACK, case)
    print(f"\nAuditing claim {case.claim.claim_no} on policy {case.policy.policy_no}\n")
    print(render_report(findings, currency=case.currency))


if __name__ == "__main__":
    main()
