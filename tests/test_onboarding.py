import io

from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def test_bulk_records_then_verify():
    rows = [
        {"cert_no": "REG/2021/1", "holder": "Ada Obi", "classification": "First Class"},
        {"cert_no": "REG/2021/2", "holder": "Bola Ade", "classification": "Second Class Upper"},
        {"cert_no": "", "holder": "No Key"},  # skipped (no key)
    ]
    res = client.post(
        "/issuers/ROWU/bulk-records",
        json={"doc_type": "degree", "key_field": "cert_no", "rows": rows},
    ).json()
    assert res["ingested"] == 2 and res["skipped"] == 1

    # a genuine match against an ingested record
    good = {"issuer_id": "ROWU", "doc_type": "degree", "key": "REG/2021/1",
            "fields": {"holder": "Ada Obi", "classification": "First Class"}}
    assert client.post("/verify/presented", json=good).json()["status"] == "confirmed"

    # an altered copy of the same record
    bad = {"issuer_id": "ROWU", "doc_type": "degree", "key": "REG/2021/1",
           "fields": {"holder": "Ada Obi", "classification": "First Class (Distinction)"}}
    assert client.post("/verify/presented", json=bad).json()["status"] == "altered"


def test_bulk_scans_then_verify():
    files = [
        ("CERT-100.png", io.BytesIO(b"\x89PNG fake1")),
        ("CERT-101.pdf", io.BytesIO(b"%PDF-1.4 fake2")),
    ]
    multipart = [("files", (name, buf, "application/octet-stream")) for name, buf in files]
    res = client.post("/issuers/SCANU/bulk-scans", data={"doc_type": "degree"}, files=multipart).json()
    assert res["ingested"] == 2
    assert set(res["keys"]) == {"CERT-100", "CERT-101"}  # mock keys derived from filenames

    # the key now exists at the issuer → not a fake
    presented = {"issuer_id": "SCANU", "doc_type": "degree", "key": "CERT-100", "fields": {}}
    assert client.post("/verify/presented", json=presented).json()["status"] == "confirmed"


def test_ingest_rows_unit():
    from hermes.registry import RecordStore, PresentedDocument, verify, VerifyStatus
    from apps.api.onboarding import ingest_rows

    s = RecordStore()
    out = ingest_rows("U", "degree", "id", [{"id": "A1", "holder": "X"}], store=s)
    assert out["ingested"] == 1
    r = verify(s, PresentedDocument(issuer_id="U", doc_type="degree", key="A1", fields={"holder": "X"}))
    assert r.status is VerifyStatus.CONFIRMED
