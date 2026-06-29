"""The orchestration: upload bytes -> OCR -> extraction -> hermes audit -> result.

This is the heart of the backend and the part that runs with no GPU. It returns
a plain JSON-serializable dict (no Pydantic/dataclass objects) for the API.
"""
from __future__ import annotations

from .extraction import extract_financial
from .ocr_client import run_ocr
from hermes.core import render_report, run_pack
from hermes.financial import FINANCIAL_RULE_PACK


async def process_document(file_bytes: bytes, filename: str) -> dict:
    ocr = await run_ocr(file_bytes, filename, grounding=True)
    statement = extract_financial(ocr.markdown)
    findings = run_pack(FINANCIAL_RULE_PACK, statement)
    report = render_report(findings, currency=statement.currency)

    flagged = [f for f in findings if not f.passed]
    return {
        "filename": filename,
        "pages": ocr.pages,
        "ocr_latency_ms": ocr.latency_ms,
        "markdown": ocr.markdown,
        "entity": statement.entity,
        "period": statement.period,
        "currency": statement.currency,
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
