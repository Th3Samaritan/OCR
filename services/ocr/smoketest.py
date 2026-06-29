"""In-process contract test for the OCR service (mock-model mode).

    python -m services.ocr.smoketest
"""
from __future__ import annotations

import base64

from fastapi.testclient import TestClient

from .main import app


def main() -> None:
    client = TestClient(app)

    health = client.get("/health").json()
    assert health["ok"], health

    payload = {
        "file_b64": base64.b64encode(b"%PDF-1.4 fake bytes").decode(),
        "filename": "statement.pdf",
        "grounding": True,
    }
    resp = client.post("/ocr", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["markdown"], "expected markdown"
    assert data["pages"] >= 1, data
    assert isinstance(data["boxes"], list) and len(data["boxes"]) >= 1, "grounding should return boxes"

    print(
        f"markdown chars: {len(data['markdown'])}  pages: {data['pages']}  "
        f"boxes: {len(data['boxes'])}  latency_ms: {data['latency_ms']}"
    )
    print("OCR SERVICE SMOKETEST PASSED")


if __name__ == "__main__":
    main()
