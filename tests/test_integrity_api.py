import io

from fastapi.testclient import TestClient

from apps.api.integrity import analyze
from apps.api.main import app

client = TestClient(app)


def _canva_pdf() -> bytes:
    import fitz

    doc = fitz.open()
    doc.new_page()
    doc.set_metadata({"producer": "Canva", "creator": "Canva"})
    data = doc.tobytes()
    doc.close()
    return data


def _plain_png() -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "white").save(buf, "PNG")
    return buf.getvalue()


def test_design_tool_pdf_is_high_risk():
    rep = analyze(_canva_pdf(), "cert.pdf")
    assert rep.risk == "high"
    assert any(s.check == "design_tool" for s in rep.signals)


def test_image_without_camera_metadata_warns():
    rep = analyze(_plain_png(), "photo.png")
    assert any(s.check == "no_camera" for s in rep.signals)
    assert rep.risk in ("medium", "high")


def test_integrity_endpoint():
    r = client.post("/integrity", files={"file": ("c.pdf", _canva_pdf(), "application/pdf")}).json()
    assert r["risk"] == "high"
    assert r["file_kind"] == "pdf"
    assert any(s["check"] == "design_tool" for s in r["signals"])


def test_verify_upload_includes_integrity():
    r = client.post("/verify", files={"file": ("c.pdf", _canva_pdf(), "application/pdf")},
                    data={"issuer_id": "UNILAG", "doc_type": "degree"}).json()
    assert "integrity" in r and r["integrity"]["risk"] == "high"
