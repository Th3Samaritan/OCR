from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def test_verify_result_has_confidence_reasons_alerts():
    doc = {"issuer_id": "UNILAG", "doc_type": "degree", "key": "CSC/2019/0413",
           "fields": {"holder": "Ada Obi", "classification": "First Class"}}
    b = client.post("/verify/presented", json=doc).json()
    assert b["status"] == "confirmed"
    assert b["confidence"] > 0
    assert isinstance(b["reasons"], list) and b["reasons"]
    assert "alerts" in b


def test_cross_submission_flags_reused_key():
    key = "CROSS/UNIQUE/42"
    first = {"issuer_id": "UNILAG", "doc_type": "degree", "key": key, "fields": {"holder": "Alice One"}}
    second = {"issuer_id": "UNILAG", "doc_type": "degree", "key": key, "fields": {"holder": "Bob Two"}}

    r1 = client.post("/verify/presented", json=first).json()
    assert r1["alerts"] == []  # first time seen — no prior

    r2 = client.post("/verify/presented", json=second).json()
    assert r2["alerts"], "reusing a key under a different name should raise an alert"
    assert "different name" in r2["alerts"][0]
