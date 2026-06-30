"""Orchestration: upload bytes -> OCR -> extraction -> hermes audit -> result.

Pack-aware: `doc_type` selects which domain pack runs (financial, bank, insurance,
clinical, legal). Returns a plain JSON-serializable dict for the API.
"""
from __future__ import annotations

from .config import settings
from .ocr_client import run_ocr
from .packs import DEFAULT_DOC_TYPE, PACKS
from hermes.core import render_report, run_pack


async def process_document(file_bytes: bytes, filename: str, doc_type: str = DEFAULT_DOC_TYPE) -> dict:
    pack = PACKS.get(doc_type, PACKS[DEFAULT_DOC_TYPE])
    ocr = await run_ocr(file_bytes, filename, grounding=True)

    if settings.mock_extraction:
        doc = pack.sample()
    else:
        from .llm import extract
        doc = extract(pack.prompt + "\n\n" + ocr.markdown, pack.schema)

    findings = run_pack(pack.rule_pack, doc)
    currency = getattr(doc, "currency", "")
    report = render_report(findings, currency=currency)
    flagged = [f for f in findings if not f.passed]

    try:
        title = pack.title(doc)
    except Exception:
        title = pack.label

    return {
        "doc_type": doc_type,
        "doc_label": pack.label,
        "title": title,
        "filename": filename,
        "pages": ocr.pages,
        "ocr_latency_ms": ocr.latency_ms,
        "markdown": ocr.markdown,
        "currency": currency,
        "summary": {
            "checks": len(findings),
            "flagged": len(flagged),
            "passed": len(findings) - len(flagged),
        },
        "findings": [
            {
                "rule": f.rule,
                "passed": f.passed,
                "severity": f.severity.value,
                "message": f.message,
                "expected": f.expected,
                "actual": f.actual,
                "citations": f.citations,
            }
            for f in findings
        ],
        "report_text": report,
    }
