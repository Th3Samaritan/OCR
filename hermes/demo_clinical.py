"""Runnable demo of the Clinical pack.

    python -m hermes.demo_clinical

Planted: an unsupported billed code, a procedure with no diagnosis, a missing
documentation element, and a duplicate billed code.
"""
from __future__ import annotations

from .clinical import (
    BilledItem,
    ClinicalRecord,
    Diagnosis,
    Procedure,
    CLINICAL_RULE_PACK,
)
from .core import render_report, run_pack


def sample_record() -> ClinicalRecord:
    return ClinicalRecord(
        patient_ref="pt_8842",
        encounter_date="2026-04-10",
        diagnoses=[
            Diagnosis(code="E11.9", description="Type 2 diabetes"),
            Diagnosis(code="I10", description="Hypertension"),
        ],
        procedures=[
            Procedure(code="99214", description="Office visit", linked_diagnosis="I10"),
            Procedure(code="93000", description="EKG", linked_diagnosis=None),  # planted: no dx
        ],
        billed=[
            BilledItem(code="99214", charge=180),
            BilledItem(code="93000", charge=90),
            BilledItem(code="80053", charge=60),   # planted: not documented
            BilledItem(code="99214", charge=180),  # planted: duplicate
        ],
        note="Patient seen for diabetes and hypertension follow-up.",
        required_elements=["history", "exam", "mdm"],
        documented_elements=["history", "exam"],     # planted: missing mdm
    )


def main() -> None:
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    r = sample_record()
    findings = run_pack(CLINICAL_RULE_PACK, r)
    print(f"\nAuditing encounter {r.patient_ref} — {r.encounter_date}\n")
    print(render_report(findings))


if __name__ == "__main__":
    main()
