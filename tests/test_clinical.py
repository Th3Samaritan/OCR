from hermes.clinical import (
    BilledItem,
    ClinicalRecord,
    Diagnosis,
    Procedure,
    CLINICAL_RULE_PACK,
)
from hermes.core import run_pack
from hermes.demo_clinical import sample_record


def _flagged(findings):
    return {f.rule for f in findings if not f.passed}


def test_planted_sample_flags_expected():
    flagged = _flagged(run_pack(CLINICAL_RULE_PACK, sample_record()))
    assert flagged == {
        "coding_support",
        "medical_necessity",
        "documentation_completeness",
        "duplicate_billing",
    }


def clean_record() -> ClinicalRecord:
    return ClinicalRecord(
        patient_ref="pt_1", encounter_date="2026-04-10",
        diagnoses=[Diagnosis(code="I10")],
        procedures=[Procedure(code="99214", linked_diagnosis="I10")],
        billed=[BilledItem(code="99214", charge=180)],
        note="Seen for hypertension.",
        required_elements=["history", "exam"],
        documented_elements=["history", "exam"],
    )


def test_clean_record_has_zero_false_positives():
    assert _flagged(run_pack(CLINICAL_RULE_PACK, clean_record())) == set()


def test_unsupported_billed_code_isolated():
    r = clean_record()
    r.billed.append(BilledItem(code="80053", charge=60))  # not documented
    assert _flagged(run_pack(CLINICAL_RULE_PACK, r)) == {"coding_support"}


def test_ncci_conflict_flagged():
    r = clean_record()
    # document + bill both members of the illustrative NCCI pair
    r.procedures.append(Procedure(code="99213", linked_diagnosis="I10"))
    r.billed.append(BilledItem(code="99213", charge=120))
    assert "ncci_conflict" in _flagged(run_pack(CLINICAL_RULE_PACK, r))
