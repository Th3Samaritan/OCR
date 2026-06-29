"""OCR logic, shared by the local uvicorn server and the Modal deployment.

Two paths:
  - mock  : returns fixture markdown (and fake boxes) — runs anywhere, no GPU.
  - real  : Unlimited-OCR via transformers, lazy-loaded — GPU box / Modal only.
"""
from __future__ import annotations

import base64
import time

from .config import MOCK_MODEL, MODEL_NAME

FIXTURE_MD = """# Acme Trading Ltd — FY2025

## Income Statement (p.11–12)

| Line | Amount (NGN) |
|---|---|
| Revenue | 10,000,000 |
| COGS | 6,000,000 |
| Gross profit | 4,000,000 |
| Operating income | 1,500,000 |
| Net income | 1,100,000 |

## Balance Sheet (p.28–29)

| Line | Amount (NGN) |
|---|---|
| Cash | 8,000,000 |
| Total assets | 15,000,000 |
| Total liabilities | 5,800,000 |
| Total equity | 7,000,000 |
"""

# Lazily-initialised real model (kept module-global so it loads once per process).
_model = None
_tokenizer = None


def parse(file_b64: str, filename: str = "upload", grounding: bool = False) -> dict:
    t0 = time.time()
    if MOCK_MODEL:
        markdown, boxes, pages = _mock(grounding)
    else:
        markdown, boxes, pages = _real(file_b64, filename, grounding)
    return {
        "markdown": markdown,
        "boxes": boxes,
        "pages": pages,
        "latency_ms": int((time.time() - t0) * 1000),
    }


def _mock(grounding: bool):
    boxes = []
    if grounding:
        boxes = [
            {"text": "Operating income", "bbox": [120, 340, 410, 372], "page": 12},
            {"text": "Total assets", "bbox": [88, 512, 300, 540], "page": 28},
        ]
    return FIXTURE_MD, boxes, 1


# --------------------------------------------------------------------------- #
# Real path — GPU only. Untested off-GPU; grounding prompt/box format must be
# confirmed on first run (plan Phase 0).
# --------------------------------------------------------------------------- #
def _ensure_model():
    global _model, _tokenizer
    if _model is not None:
        return
    import torch
    from transformers import AutoModel, AutoTokenizer

    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    for dtype in (torch.bfloat16, torch.float16):
        try:
            _model = AutoModel.from_pretrained(
                MODEL_NAME, trust_remote_code=True, use_safetensors=True, torch_dtype=dtype,
            ).eval().cuda()
            return
        except Exception:
            continue
    raise RuntimeError("Could not load Unlimited-OCR in bf16 or fp16.")


def _to_image_paths(raw: bytes, filename: str) -> list[str]:
    import os
    import tempfile

    tmp = tempfile.mkdtemp(prefix="ocr_in_")
    if filename.lower().endswith(".pdf") or raw[:5] == b"%PDF-":
        import fitz  # PyMuPDF

        doc = fitz.open(stream=raw, filetype="pdf")
        mat = fitz.Matrix(200 / 72, 200 / 72)
        paths = []
        for i, page in enumerate(doc):
            p = os.path.join(tmp, f"page_{i + 1:04d}.png")
            page.get_pixmap(matrix=mat).save(p)
            paths.append(p)
        doc.close()
        return paths
    ext = os.path.splitext(filename)[1] or ".png"
    p = os.path.join(tmp, f"image{ext}")
    with open(p, "wb") as f:
        f.write(raw)
    return [p]


def _parse_boxes(text: str) -> list[dict]:
    """Best-effort extraction of <|det|> [x1,y1,x2,y2] spans. Confirm format on GPU."""
    import re

    boxes = []
    for m in re.finditer(r"\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]", text):
        boxes.append({"text": "", "bbox": [int(g) for g in m.groups()], "page": None})
    return boxes


def _real(file_b64: str, filename: str, grounding: bool):
    import contextlib
    import io

    raw = base64.b64decode(file_b64)
    _ensure_model()
    images = _to_image_paths(raw, filename)
    prompt = "<image>\n" + ("<|grounding|>" if grounding else "") + "Convert the document to markdown."

    parts = []
    for img in images:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            ret = _model.infer(
                _tokenizer, prompt=prompt, image_file=img, output_path="ocr_out",
                base_size=1024, image_size=1024, crop_mode=False,
                max_length=8192, no_repeat_ngram_size=35, ngram_window=1024,
                save_results=False,
            )
        text = ret.strip() if isinstance(ret, str) and ret.strip() else buf.getvalue().strip()
        parts.append(text)

    markdown = "\n\n".join(parts)
    boxes = _parse_boxes(markdown) if grounding else []
    return markdown, boxes, len(images)
