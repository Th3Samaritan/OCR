"""End-to-end smoketest of the API in mock mode (no GPU, no Anthropic key).

    python -m apps.api.smoketest

Exercises the real HTTP surface (upload -> job -> poll -> result) and asserts the
audit findings come through, proving the orchestrator + hermes wiring works.
"""
from __future__ import annotations

import io
import sys
import time

from fastapi.testclient import TestClient

from .main import app


def main() -> None:
    client = TestClient(app)

    health = client.get("/health").json()
    assert health["ok"], health
    assert health["mock_ocr"] and health["mock_extraction"], (
        "expected mock modes on with no OCR_SERVICE_URL / ANTHROPIC_API_KEY", health,
    )

    files = {"file": ("statement.pdf", io.BytesIO(b"%PDF-1.4 fake bytes"), "application/pdf")}
    resp = client.post("/documents", files=files)
    assert resp.status_code == 200, resp.text
    job_id = resp.json()["job_id"]

    result = None
    for _ in range(50):
        body = client.get(f"/documents/{job_id}").json()
        if body["status"] in ("done", "error"):
            result = body
            break
        time.sleep(0.05)

    assert result is not None, "job never finished"
    assert result["status"] == "done", result
    res = result["result"]
    summary = res["summary"]
    flagged = [f["rule"] for f in res["findings"] if not f["passed"]]

    print(f"\nentity: {res['entity']} — {res['period']}")
    print(f"checks: {summary['checks']}  passed: {summary['passed']}  flagged: {summary['flagged']}")
    print(f"flagged rules: {flagged}")

    assert summary["flagged"] == 4, summary
    for expected in ("operating_income", "balance_sheet_identity", "bank_reconciliation", "duplicate_line_item"):
        assert expected in flagged, f"expected {expected} to be flagged: {flagged}"

    print("\nSMOKETEST PASSED")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
