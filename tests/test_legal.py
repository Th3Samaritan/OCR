from hermes.core import run_pack
from hermes.demo_legal import sample_contract
from hermes.legal import Clause, Contract, Obligation, LEGAL_RULE_PACK


def _flagged(findings):
    return {f.rule for f in findings if not f.passed}


def test_planted_sample_flags_expected():
    flagged = _flagged(run_pack(LEGAL_RULE_PACK, sample_contract()))
    assert flagged == {
        "required_clauses",
        "single_governing_law",
        "defined_terms",
        "payment_terms",
    }


def clean_contract() -> Contract:
    return Contract(
        title="MSA", parties=["A", "B"],
        effective_date="2026-01-01", term_end="2026-12-31",
        governing_law=["Lagos State"],
        clauses=[Clause(type="termination"), Clause(type="confidentiality"),
                 Clause(type="indemnity"), Clause(type="liability_cap")],
        required_clauses=["termination", "confidentiality", "indemnity", "liability_cap"],
        defined_terms=["Services"],
        used_terms=["Services"],
        payment_terms_days=[30],
        obligations=[Obligation(party="A", description="Deliver", due_date="2026-02-01")],
    )


def test_clean_contract_has_zero_false_positives():
    assert _flagged(run_pack(LEGAL_RULE_PACK, clean_contract())) == set()


def test_conflicting_governing_law_isolated():
    c = clean_contract()
    c.governing_law = ["Lagos State", "Delaware"]
    assert _flagged(run_pack(LEGAL_RULE_PACK, c)) == {"single_governing_law"}


def test_term_end_before_effective_flagged():
    c = clean_contract()
    c.term_end = "2025-06-01"  # before effective
    assert "date_order" in _flagged(run_pack(LEGAL_RULE_PACK, c))
