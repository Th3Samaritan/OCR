import io

from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def _file():
    return {"file": ("cert.pdf", io.BytesIO(b"%PDF-1.4 x"), "application/pdf")}


def test_verify_upload_confirmed_against_seed():
    # mock extraction returns the seeded UNILAG certificate → CONFIRMED
    r = client.post("/verify", files=_file(), data={"issuer_id": "UNILAG", "doc_type": "degree"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "confirmed" and body["genuine"] is True


def test_verify_upload_unknown_issuer_is_unverified():
    r = client.post("/verify", files=_file(), data={"issuer_id": "UNKNOWN_POLY", "doc_type": "degree"})
    assert r.json()["status"] == "unverified"


def test_verify_presented_altered():
    doc = {
        "issuer_id": "UNILAG", "doc_type": "degree", "key": "CSC/2019/0413",
        "fields": {"holder": "Ada Obi", "classification": "Second Class Upper"},
    }
    body = client.post("/verify/presented", json=doc).json()
    assert body["status"] == "altered"
    assert any(m["field"] == "classification" for m in body["mismatches"])


def test_verify_presented_fake_key():
    doc = {"issuer_id": "UNILAG", "doc_type": "degree", "key": "CSC/2019/9999", "fields": {}}
    assert client.post("/verify/presented", json=doc).json()["status"] == "not_issued"


def test_onboard_then_verify():
    rec = {
        "issuer_id": "ABU", "doc_type": "degree", "key": "ENG/2020/77",
        "fields": {"holder": "Bala Musa", "classification": "Second Class Upper"},
    }
    assert client.post("/issuers/records", json=rec).json()["ok"] is True

    good = {"issuer_id": "ABU", "doc_type": "degree", "key": "ENG/2020/77",
            "fields": {"holder": "Bala Musa", "classification": "Second Class Upper"}}
    assert client.post("/verify/presented", json=good).json()["status"] == "confirmed"
