from hermes.registry import (
    IssuerRecord,
    PresentedDocument,
    RecordStore,
    VerifyStatus,
    verify,
)


def _store() -> RecordStore:
    s = RecordStore()
    s.add(IssuerRecord(
        issuer_id="UNILAG", doc_type="degree", key="CSC/2019/0413",
        fields={"holder": "Ada Obi", "classification": "First Class", "year": "2019"},
    ))
    return s


def _doc(**overrides):
    base = dict(
        issuer_id="UNILAG", doc_type="degree", key="CSC/2019/0413",
        fields={"holder": "Ada Obi", "classification": "First Class", "year": "2019"},
    )
    base.update(overrides)
    return PresentedDocument(**base)


def test_genuine_is_confirmed():
    assert verify(_store(), _doc()).status is VerifyStatus.CONFIRMED


def test_canonicalisation_tolerates_case_and_spacing():
    doc = _doc(fields={"holder": "  ada   OBI ", "classification": "first class"})
    assert verify(_store(), doc).status is VerifyStatus.CONFIRMED


def test_altered_field_is_flagged():
    doc = _doc(fields={"holder": "Ada Obi", "classification": "Second Class Upper"})
    result = verify(_store(), doc)
    assert result.status is VerifyStatus.ALTERED
    assert any(m[0] == "classification" for m in result.mismatches)


def test_unknown_key_is_not_issued():
    assert verify(_store(), _doc(key="CSC/2019/9999")).status is VerifyStatus.NOT_ISSUED


def test_unknown_issuer_is_unverified():
    assert verify(_store(), _doc(issuer_id="UNKNOWN")).status is VerifyStatus.UNVERIFIED


def test_genuine_property():
    assert verify(_store(), _doc()).genuine is True
    assert verify(_store(), _doc(key="nope")).genuine is False


def test_fabricated_key_for_real_holder_is_flagged():
    # holder Ada Obi exists under CSC/2019/0413; a different key for the same person = fabricated
    r = verify(_store(), _doc(key="CSC/2099/9999"))
    assert r.status is VerifyStatus.NOT_ISSUED
    assert r.confidence >= 0.9
    assert any("fabricated" in reason for reason in r.reasons)


def test_confirmed_carries_confidence_and_reasons():
    r = verify(_store(), _doc())
    assert r.confidence == 1.0
    assert r.reasons
