"""Clinical / medical-coding domain pack.

Operates on the structured record the extraction layer produces (diagnoses,
procedures, billed codes, documented elements). The core audit: every billed
code must be supported by the chart, and each procedure must link to a
diagnosis. Deterministic — the AI's job is mapping free-text notes to codes
upstream; here we check the coded result.
"""
from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Optional

from pydantic import BaseModel

from .core import Finding, RulePack, Severity

# Illustrative NCCI mutually-exclusive pairs. Real NCCI edits are a large
# external dataset to load at deploy time; this is a placeholder for the rule.
NCCI_PAIRS = {frozenset({"99213", "99214"})}


# --------------------------------------------------------------------------- #
# Schema Pack
# --------------------------------------------------------------------------- #
class Diagnosis(BaseModel):
    code: str                          # ICD-10
    description: str = ""


class Procedure(BaseModel):
    code: str                          # CPT/HCPCS
    description: str = ""
    linked_diagnosis: Optional[str] = None  # ICD code that justifies it


class BilledItem(BaseModel):
    code: str
    kind: str = "cpt"                  # cpt | icd
    charge: float = 0.0


class ClinicalRecord(BaseModel):
    patient_ref: str                   # de-identified
    encounter_date: str                # ISO
    diagnoses: list[Diagnosis] = []
    procedures: list[Procedure] = []
    billed: list[BilledItem] = []
    note: str = ""
    required_elements: list[str] = []   # e.g. history / exam / mdm
    documented_elements: list[str] = []


# --------------------------------------------------------------------------- #
# Rule Pack
# --------------------------------------------------------------------------- #
def check_coding_support(r: ClinicalRecord) -> list[Finding]:
    documented = {d.code for d in r.diagnoses} | {p.code for p in r.procedures}
    unsupported = sorted({b.code for b in r.billed if b.code not in documented})
    if unsupported:
        return [Finding("coding_support", False, Severity.ERROR,
                        f"billed code(s) not supported by the chart: {', '.join(unsupported)}")]
    return [Finding("coding_support", True, Severity.INFO, "all billed codes are documented")]


def check_medical_necessity(r: ClinicalRecord) -> list[Finding]:
    dx = {d.code for d in r.diagnoses}
    bad = [p.code for p in r.procedures if not p.linked_diagnosis or p.linked_diagnosis not in dx]
    if bad:
        return [Finding("medical_necessity", False, Severity.ERROR,
                        f"procedure(s) with no supporting diagnosis: {', '.join(bad)}")]
    return [Finding("medical_necessity", True, Severity.INFO,
                    "every procedure links to a documented diagnosis")]


def check_documentation_completeness(r: ClinicalRecord) -> list[Finding]:
    problems = []
    if not r.note.strip():
        problems.append("provider note is empty")
    missing = [e for e in r.required_elements if e not in r.documented_elements]
    if missing:
        problems.append("missing documentation element(s): " + ", ".join(missing))
    try:
        date.fromisoformat(r.encounter_date)
    except ValueError:
        problems.append(f"unparseable encounter date {r.encounter_date!r}")
    if problems:
        return [Finding("documentation_completeness", False, Severity.WARNING, "; ".join(problems))]
    return [Finding("documentation_completeness", True, Severity.INFO, "documentation complete")]


def check_duplicate_billing(r: ClinicalRecord) -> list[Finding]:
    codes = [b.code for b in r.billed]
    dupes = sorted({c for c, n in Counter(codes).items() if n > 1})
    if dupes:
        return [Finding("duplicate_billing", False, Severity.WARNING,
                        f"code(s) billed more than once: {', '.join(dupes)}")]
    return [Finding("duplicate_billing", True, Severity.INFO, "no duplicate billed codes")]


def check_ncci(r: ClinicalRecord) -> list[Finding]:
    codes = {b.code for b in r.billed}
    hits = [tuple(sorted(p)) for p in NCCI_PAIRS if p <= codes]
    if hits:
        pairs = "; ".join("+".join(h) for h in hits)
        return [Finding("ncci_conflict", False, Severity.WARNING,
                        f"mutually-exclusive code pair(s) billed together: {pairs}")]
    return [Finding("ncci_conflict", True, Severity.INFO, "no NCCI conflicts in billed codes")]


CLINICAL_RULE_PACK: RulePack = [
    check_coding_support,
    check_medical_necessity,
    check_documentation_completeness,
    check_duplicate_billing,
    check_ncci,
]
