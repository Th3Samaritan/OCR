"""Issuer onboarding — bulk-ingest an archive into the source of truth.

Two real-world inputs:
  - rows  : a register the issuer already has (CSV/Excel exported to dicts).
  - scans : the paper archive itself (images/PDFs) → OCR → extract.

Both produce IssuerRecords in the shared record store. This is "the business":
turning an issuer's records into something verifiable.
"""
from __future__ import annotations

from .config import settings
from .ocr_client import run_ocr
from .verification import store as record_store
from hermes.registry import IssuerRecord, RecordStore


def ingest_rows(
    issuer_id: str,
    doc_type: str,
    key_field: str,
    rows: list[dict],
    store: RecordStore | None = None,
) -> dict:
    """Ingest a register: each row → one IssuerRecord, keyed by row[key_field]."""
    store = store or record_store
    keys: list[str] = []
    skipped = 0
    for raw in rows:
        row = {str(k): ("" if v is None else str(v)) for k, v in raw.items()}
        key = row.get(key_field, "").strip()
        if not key:
            skipped += 1
            continue
        fields = {k: v for k, v in row.items() if k != key_field}
        store.add(IssuerRecord(
            issuer_id=issuer_id, doc_type=doc_type, key=key,
            holder_name=fields.get("holder", ""), issued_date=fields.get("issued_date", ""),
            fields=fields,
        ))
        keys.append(key)
    return {"ingested": len(keys), "skipped": skipped, "keys": keys}


def load_csv(path: str) -> list[dict]:
    """Convenience: read a CSV register into row dicts (utf-8-sig handles Excel BOM)."""
    import csv

    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


async def ingest_scans(
    issuer_id: str,
    doc_type: str,
    files: list[tuple[str, bytes]],
    store: RecordStore | None = None,
) -> dict:
    """Ingest scanned documents: each file → OCR → extract → one IssuerRecord."""
    store = store or record_store
    keys: list[str] = []
    for filename, data in files:
        ocr = await run_ocr(data, filename, grounding=False)
        record = _extract_issuer_record(ocr.markdown, issuer_id, doc_type, filename)
        store.add(record)
        keys.append(record.key)
    return {"ingested": len(keys), "keys": keys}


def _extract_issuer_record(markdown: str, issuer_id: str, doc_type: str, filename: str) -> IssuerRecord:
    if settings.mock_extraction:
        import os
        # derive a unique key per file so a batch doesn't collide on one mock key
        key = os.path.splitext(os.path.basename(filename))[0]
        return IssuerRecord(issuer_id=issuer_id, doc_type=doc_type, key=key,
                            fields={"source_file": filename})

    # Real path: the configured provider (Gemini by default) fills key + fields;
    # issuer_id/doc_type are forced to our values afterwards.
    from .llm import extract

    prompt = (
        "Extract this issued document into a record: the unique key (certificate/"
        "reference number), holder name, issued date, and key fields.\n\n" + markdown
    )
    record = extract(prompt, IssuerRecord)
    record.issuer_id = issuer_id
    record.doc_type = doc_type
    return record
