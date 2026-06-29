"""Legal contracts domain pack.

Operates on the structured contract the extraction layer produces (clauses,
parties, dates, defined terms, obligations). The deterministic layer is a
playbook checklist + consistency/logic checks; the heavier AI work (clause
classification, risk narrative, redlines) sits upstream/around it.
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel

from .core import Finding, RulePack, Severity


# --------------------------------------------------------------------------- #
# Schema Pack
# --------------------------------------------------------------------------- #
class Clause(BaseModel):
    type: str                          # termination | liability_cap | indemnity | ...
    text: str = ""
    page: Optional[int] = None


class Obligation(BaseModel):
    party: str
    description: str
    due_date: Optional[str] = None     # ISO


class Contract(BaseModel):
    title: str
    parties: list[str] = []
    effective_date: Optional[str] = None
    term_end: Optional[str] = None
    governing_law: list[str] = []      # >1 distinct → conflict
    clauses: list[Clause] = []
    obligations: list[Obligation] = []
    defined_terms: list[str] = []
    used_terms: list[str] = []         # defined-style terms referenced in the body
    required_clauses: list[str] = []   # playbook checklist
    payment_terms_days: list[int] = []  # >1 distinct → conflict


# --------------------------------------------------------------------------- #
# Rule Pack
# --------------------------------------------------------------------------- #
def check_required_clauses(c: Contract) -> list[Finding]:
    present = {cl.type for cl in c.clauses}
    missing = [t for t in c.required_clauses if t not in present]
    if missing:
        return [Finding("required_clauses", False, Severity.ERROR,
                        f"missing required clause(s): {', '.join(missing)}")]
    return [Finding("required_clauses", True, Severity.INFO, "all required clauses present")]


def check_single_governing_law(c: Contract) -> list[Finding]:
    laws = {g.strip().lower() for g in c.governing_law if g.strip()}
    if len(laws) > 1:
        return [Finding("single_governing_law", False, Severity.ERROR,
                        f"conflicting governing-law clauses: {', '.join(sorted(set(c.governing_law)))}")]
    return [Finding("single_governing_law", True, Severity.INFO, "governing law is consistent")]


def check_defined_terms(c: Contract) -> list[Finding]:
    defined = {t.strip().lower() for t in c.defined_terms}
    undefined = sorted({t for t in c.used_terms if t.strip().lower() not in defined})
    if undefined:
        return [Finding("defined_terms", False, Severity.WARNING,
                        f"term(s) used but not defined: {', '.join(undefined)}")]
    return [Finding("defined_terms", True, Severity.INFO, "all referenced terms are defined")]


def check_payment_terms(c: Contract) -> list[Finding]:
    vals = set(c.payment_terms_days)
    if len(vals) > 1:
        return [Finding("payment_terms", False, Severity.ERROR,
                        f"conflicting payment terms: {', '.join(str(v) for v in sorted(vals))} days")]
    return [Finding("payment_terms", True, Severity.INFO, "payment terms are consistent")]


def check_date_order(c: Contract) -> list[Finding]:
    if not (c.effective_date and c.term_end):
        return [Finding("date_order", True, Severity.INFO, "term dates not both present — skipped")]
    try:
        eff = date.fromisoformat(c.effective_date)
        end = date.fromisoformat(c.term_end)
    except ValueError:
        return [Finding("date_order", False, Severity.ERROR, "unparseable effective/term date")]
    if end < eff:
        return [Finding("date_order", False, Severity.ERROR,
                        f"term end {c.term_end} precedes effective date {c.effective_date}")]
    return [Finding("date_order", True, Severity.INFO, "effective date precedes term end")]


def check_obligation_dates(c: Contract) -> list[Finding]:
    eff = None
    if c.effective_date:
        try:
            eff = date.fromisoformat(c.effective_date)
        except ValueError:
            eff = None
    bad = []
    for o in c.obligations:
        if not o.due_date:
            continue
        try:
            d = date.fromisoformat(o.due_date)
        except ValueError:
            bad.append(f"{o.party}: bad date {o.due_date!r}")
            continue
        if eff and d < eff:
            bad.append(f"{o.party}: due {o.due_date} is before the effective date")
    if bad:
        return [Finding("obligation_dates", False, Severity.WARNING, "; ".join(bad))]
    return [Finding("obligation_dates", True, Severity.INFO, "obligation dates are valid")]


LEGAL_RULE_PACK: RulePack = [
    check_required_clauses,
    check_single_governing_law,
    check_defined_terms,
    check_payment_terms,
    check_date_order,
    check_obligation_dates,
]
