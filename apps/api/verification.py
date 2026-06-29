"""Verification wiring for the orchestrator (the Push flow).

Holds the issuer record store (the 🟢 source of truth), extracts a presented
document from OCR markdown, and runs the verify operation. In-memory + seeded
for the MVP; swap the store for Postgres later.
"""
from __future__ import annotations

from .config import settings
from .ocr_client import run_ocr
from hermes.registry import (
    IssuerRecord,
    PresentedDocument,
    RecordStore,
    VerifyResult,
    verify,
)

# Module-level store, seeded so the API has something to verify against out of the box.
store = RecordStore()
store.add(IssuerRecord(
    issuer_id="UNILAG", doc_type="degree", key="CSC/2019/0413",
    holder_name="Ada Obi", issued_date="2019-07-15",
    fields={"holder": "Ada Obi", "classification": "First Class",
            "year": "2019", "programme": "Computer Science"},
    source_ref="archive/box12/p221.png",
))


def extract_presented(markdown: str, issuer_id: str, doc_type: str) -> PresentedDocument:
    """OCR markdown → the structured PresentedDocument to verify.

    Mock mode returns the seeded certificate so the Push flow runs with no key.
    """
    if settings.mock_extraction:
        return PresentedDocument(
            issuer_id=issuer_id or "UNILAG",
            doc_type=doc_type or "degree",
            key="CSC/2019/0413",
            fields={"holder": "Ada Obi", "classification": "First Class", "year": "2019"},
        )

    import anthropic  # lazy — only for the real path

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.parse(
        model=settings.model,
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": (
                "Extract this document as a presented record: the issuer, the document type, "
                "the unique record key (certificate/reference number), and the key fields. "
                f"Hints — issuer_id: {issuer_id!r}, doc_type: {doc_type!r}.\n\n" + markdown
            ),
        }],
        output_format=PresentedDocument,
    )
    return resp.parsed_output


async def verify_file(file_bytes: bytes, filename: str, issuer_id: str, doc_type: str) -> VerifyResult:
    ocr = await run_ocr(file_bytes, filename, grounding=False)
    doc = extract_presented(ocr.markdown, issuer_id, doc_type)
    return verify(store, doc)


def result_to_dict(r: VerifyResult) -> dict:
    return {
        "status": r.status.value,
        "genuine": r.genuine,
        "issuer_id": r.issuer_id,
        "doc_type": r.doc_type,
        "key": r.key,
        "message": r.message,
        "mismatches": [{"field": f, "presented": p, "issued": s} for f, p, s in r.mismatches],
    }
