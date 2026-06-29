from hermes.core import run_pack
from hermes.demo_insurance import sample_case
from hermes.insurance import (
    Claim,
    ClaimLineItem,
    Coverage,
    InsuranceCase,
    Policy,
    INSURANCE_RULE_PACK,
)


def _flagged(findings):
    return {f.rule for f in findings if not f.passed}


def test_planted_sample_flags_expected():
    flagged = _flagged(run_pack(INSURANCE_RULE_PACK, sample_case()))
    assert flagged == {"claim_within_limit", "claim_lines_sum", "completeness"}


def clean_case() -> InsuranceCase:
    return InsuranceCase(
        currency="₦",
        policy=Policy(
            insured="Clean Co", policy_no="P-9", period_start="2026-01-01", period_end="2026-12-31",
            coverages=[Coverage(peril="Fire", limit=10_000_000, deductible=500_000)],
            exclusions=["Flood"],
        ),
        claim=Claim(
            claimant="Clean Co", claim_no="C-1", date_of_loss="2026-03-15", peril="Fire",
            claimed_amount=9_000_000,
            line_items=[ClaimLineItem(description="Repair", amount=9_000_000)],
            supporting_docs=["police_report", "photos", "invoice"],
            required_docs=["police_report", "photos", "invoice"],
        ),
    )


def test_clean_case_has_zero_false_positives():
    assert _flagged(run_pack(INSURANCE_RULE_PACK, clean_case())) == set()


def test_excluded_peril_flagged():
    c = clean_case()
    c.claim.peril = "Flood"  # excluded
    assert "peril_covered" in _flagged(run_pack(INSURANCE_RULE_PACK, c))


def test_over_limit_isolated():
    c = clean_case()
    c.claim.claimed_amount = 9_600_000  # cap is 9,500,000
    c.claim.line_items = [ClaimLineItem(description="Repair", amount=9_600_000)]  # keep lines consistent
    assert _flagged(run_pack(INSURANCE_RULE_PACK, c)) == {"claim_within_limit"}


def test_loss_outside_period_flagged():
    c = clean_case()
    c.claim.date_of_loss = "2025-12-31"  # before period start
    assert "date_of_loss_in_period" in _flagged(run_pack(INSURANCE_RULE_PACK, c))
