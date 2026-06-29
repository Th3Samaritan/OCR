import base64

from fastapi.testclient import TestClient

from services.ocr.main import app

client = TestClient(app)


def _ocr(grounding: bool):
    payload = {
        "file_b64": base64.b64encode(b"%PDF-1.4 x").decode(),
        "filename": "x.pdf",
        "grounding": grounding,
    }
    r = client.post("/ocr", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def test_health():
    assert client.get("/health").json()["ok"]


def test_ocr_returns_markdown_no_boxes_without_grounding():
    d = _ocr(False)
    assert d["markdown"] and d["pages"] >= 1
    assert d["boxes"] == []


def test_ocr_returns_boxes_with_grounding():
    d = _ocr(True)
    assert len(d["boxes"]) >= 1
    assert all("bbox" in b for b in d["boxes"])
