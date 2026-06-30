import io

from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def test_mark_returns_draft_with_score_and_transcription():
    files = {"file": ("answer.png", io.BytesIO(b"\x89PNG fake"), "image/png")}
    data = {"question": "Solve x^2 - 5x + 6 = 0", "marking_scheme": "roots 2 and 3", "max_score": "10"}
    r = client.post("/mark", files=files, data=data)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["transcription"]
    assert 0 <= b["score"] <= b["max_score"] == 10
    assert b["needs_review"] is True
    assert isinstance(b["criteria"], list) and b["criteria"]
    assert 0.0 <= b["transcription_confidence"] <= 1.0


def test_mark_empty_file_is_400():
    files = {"file": ("a.png", io.BytesIO(b""), "image/png")}
    assert client.post("/mark", files=files, data={"question": "q"}).status_code == 400
