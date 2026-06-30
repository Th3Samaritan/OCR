import io

from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def _audit_job() -> str:
    files = {"file": ("d.pdf", io.BytesIO(b"%PDF-1.4 x"), "application/pdf")}
    job_id = client.post("/documents", files=files).json()["job_id"]
    for _ in range(50):
        if client.get(f"/documents/{job_id}").json()["status"] in ("done", "error"):
            break
    return job_id


def test_tables_endpoint_returns_tables():
    t = client.get(f"/documents/{_audit_job()}/tables").json()["tables"]
    assert len(t) >= 1
    assert t[0]["headers"] and t[0]["rows"]


def test_export_xlsx_is_a_real_workbook():
    r = client.get(f"/documents/{_audit_job()}/export.xlsx")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/vnd.openxmlformats")
    assert r.content[:2] == b"PK"  # .xlsx is a zip container


def test_tables_404_for_unknown_job():
    assert client.get("/documents/nope/tables").status_code == 404


def test_extract_tables_unit():
    from apps.api.tables import extract_tables, tables_as_json

    md = "| A | B |\n|---|---|\n| 1 | 2 |\n\nsome text\n\n| X |\n|---|\n| 9 |"
    assert len(extract_tables(md)) == 2
    j = tables_as_json(md)
    assert j[0]["headers"] == ["A", "B"]
    assert j[0]["rows"] == [["1", "2"]]
