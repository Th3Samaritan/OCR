"""Client for the OCR service — the swappable GPU seam.

The same contract is served by the dev GPU box (uvicorn) or Modal serverless;
the orchestrator only knows this HTTP shape. In mock mode it returns a fixture
so the rest of the pipeline runs with no GPU.
"""
from __future__ import annotations

import base64
import time
from dataclasses import dataclass, field

from .config import settings

# A small representative parse so the UI has something to render in mock mode.
FIXTURE_MARKDOWN = """# Acme Trading Ltd — FY2025

## Income Statement (p.11–12)

| Line | Amount (₦) |
|---|---|
| Revenue | 10,000,000 |
| COGS | 6,000,000 |
| Gross profit | 4,000,000 |
| Salaries | 1,200,000 |
| Rent | 600,000 |
| Marketing | 300,000 |
| Rent | 600,000 |
| Operating income | 1,500,000 |
| Net income | 1,100,000 |

## Balance Sheet (p.28–29)

| Line | Amount (₦) |
|---|---|
| Cash | 8,000,000 |
| Total assets | 15,000,000 |
| Total liabilities | 5,800,000 |
| Total equity | 7,000,000 |
"""


@dataclass
class OcrResult:
    markdown: str
    pages: int
    latency_ms: int
    boxes: list = field(default_factory=list)


async def run_ocr(file_bytes: bytes, filename: str, grounding: bool = False) -> OcrResult:
    if settings.mock_ocr:
        return OcrResult(markdown=FIXTURE_MARKDOWN, pages=1, latency_ms=0)

    import httpx  # lazy import — only needed when calling a real service

    payload = {
        "filename": filename,
        "grounding": grounding,
        "file_b64": base64.b64encode(file_bytes).decode(),
    }
    t0 = time.time()
    async with httpx.AsyncClient(timeout=1200) as client:
        resp = await client.post(settings.ocr_service_url.rstrip("/") + "/ocr", json=payload)
        resp.raise_for_status()
        data = resp.json()
    return OcrResult(
        markdown=data["markdown"],
        pages=int(data.get("pages", 1)),
        latency_ms=int((time.time() - t0) * 1000),
        boxes=data.get("boxes", []),
    )
