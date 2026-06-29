"""Runnable demo of the Legal pack.

    python -m hermes.demo_legal

Planted: a missing required clause (indemnity), two conflicting governing-law
clauses, a used-but-undefined term, and two conflicting payment terms.
"""
from __future__ import annotations

from .core import render_report, run_pack
from .legal import Clause, Contract, Obligation, LEGAL_RULE_PACK


def sample_contract() -> Contract:
    return Contract(
        title="Master Services Agreement",
        parties=["Acme Trading Ltd", "Beta Services Inc"],
        effective_date="2026-01-01",
        term_end="2026-12-31",
        governing_law=["Lagos State", "England and Wales"],   # planted: conflict
        clauses=[
            Clause(type="termination", page=4),
            Clause(type="confidentiality", page=6),
            Clause(type="liability_cap", page=7),
            # planted: no 'indemnity' clause
        ],
        required_clauses=["termination", "confidentiality", "indemnity", "liability_cap"],
        defined_terms=["Services", "Confidential Information"],
        used_terms=["Services", "Deliverables"],               # planted: Deliverables undefined
        payment_terms_days=[30, 45],                           # planted: conflict
        obligations=[Obligation(party="Acme Trading Ltd", description="Deliver phase 1", due_date="2026-02-01")],
    )


def main() -> None:
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    c = sample_contract()
    findings = run_pack(LEGAL_RULE_PACK, c)
    print(f"\nReviewing: {c.title}\n")
    print(render_report(findings))


if __name__ == "__main__":
    main()
