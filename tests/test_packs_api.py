import io

import pytest
from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def _audit(doc_type: str):
    files = {"file": ("d.pdf", io.BytesIO(b"%PDF-1.4 x"), "application/pdf")}
    r = client.post("/documents", files=files, data={"doc_type": doc_type})
    assert r.status_code == 200, r.text
    job_id = r.json()["job_id"]
    for _ in range(50):
        body = client.get(f"/documents/{job_id}").json()
        if body["status"] in ("done", "error"):
            return body
    raise AssertionError("job never finished")


@pytest.mark.parametrize("doc_type", ["financial", "bank", "insurance", "clinical", "legal"])
def test_each_pack_audits(doc_type):
    body = _audit(doc_type)
    assert body["status"] == "done", body
    assert body["result"]["doc_type"] == doc_type
    assert body["result"]["summary"]["flagged"] >= 1


def test_unknown_doc_type_is_400():
    files = {"file": ("d.pdf", io.BytesIO(b"x"), "application/pdf")}
    assert client.post("/documents", files=files, data={"doc_type": "nope"}).status_code == 400


def test_doc_types_endpoint_lists_all_packs():
    ids = {d["id"] for d in client.get("/doc-types").json()["doc_types"]}
    assert ids == {"financial", "bank", "insurance", "clinical", "legal"}
