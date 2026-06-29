import io

from fastapi.testclient import TestClient

from apps.api.config import settings
from apps.api.main import app
from apps.api.ratelimit import RateGuard

client = TestClient(app)


def _upload_and_wait():
    files = {"file": ("s.pdf", io.BytesIO(b"%PDF-1.4 x"), "application/pdf")}
    r = client.post("/documents", files=files)
    assert r.status_code == 200, r.text
    job_id = r.json()["job_id"]
    for _ in range(50):
        body = client.get(f"/documents/{job_id}").json()
        if body["status"] in ("done", "error"):
            return body
    raise AssertionError("job never finished")


def test_health_reports_mock_modes():
    h = client.get("/health").json()
    assert h["ok"] and h["mock_ocr"] and h["mock_extraction"]


def test_upload_flow_returns_audit():
    body = _upload_and_wait()
    assert body["status"] == "done"
    assert body["result"]["summary"]["flagged"] == 4


def test_unknown_job_is_404():
    assert client.get("/documents/does-not-exist").status_code == 404


def test_empty_file_is_400():
    files = {"file": ("e.pdf", io.BytesIO(b""), "application/pdf")}
    assert client.post("/documents", files=files).status_code == 400


def test_rate_guard_blocks_after_limit():
    old = settings.rate_limit_per_min
    settings.rate_limit_per_min = 2
    try:
        g = RateGuard()
        assert g.check("ip1")[0] is True
        assert g.check("ip1")[0] is True
        assert g.check("ip1")[0] is False     # third within the minute → blocked
        assert g.check("ip2")[0] is True       # a different IP is unaffected
    finally:
        settings.rate_limit_per_min = old
