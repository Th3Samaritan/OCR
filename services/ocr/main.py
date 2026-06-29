"""Hermes OCR service — the swappable GPU tier.

    # local / GPU box:
    uvicorn services.ocr.main:app --host 0.0.0.0 --port 8011
    # on the GPU box set OCR_MOCK_MODEL=0 to load the real model.

Contract (the orchestrator's only view of the GPU tier):
    POST /ocr  {filename, grounding, file_b64}
            -> {markdown, boxes:[{text,bbox,page}], pages, latency_ms}
"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from .config import MOCK_MODEL, MODEL_NAME
from .handler import parse

app = FastAPI(title="Hermes OCR Service", version="0.1.0")


class OcrRequest(BaseModel):
    file_b64: str
    filename: str = "upload"
    grounding: bool = False


@app.get("/health")
def health() -> dict:
    return {"ok": True, "mock_model": MOCK_MODEL, "model": MODEL_NAME}


@app.post("/ocr")
def ocr(req: OcrRequest) -> dict:
    return parse(req.file_b64, req.filename, req.grounding)
