"""Verification wiring for the orchestrator (the Push flow).

The issuer record store (the 🟢 source of truth) is DB-backed. `DbRecordStore`
implements the same `has_issuer` / `get` interface that `hermes.registry.verify`
expects, so the verify logic is unchanged.
"""
from __future__ import annotations

import time

from .config import settings
from .db import RecordRow, SessionLocal, VerificationLog, init_db, select
from .llm import extract
from .ocr_client import run_ocr
from hermes.registry import IssuerRecord, PresentedDocument, VerifyResult, _canon, _holder_of, verify

init_db()  # ensure tables exist


class DbRecordStore:
    """Issuer source-of-truth backed by the database (verify() store interface)."""

    def add(self, record: IssuerRecord) -> None:
        kc = _canon(record.key)
        with SessionLocal() as s:
            row = s.scalars(
                select(RecordRow).where(
                    RecordRow.issuer_id == record.issuer_id,
                    RecordRow.doc_type == record.doc_type,
                    RecordRow.key_canon == kc,
                )
            ).first()
            if row is None:
                row = RecordRow(issuer_id=record.issuer_id, doc_type=record.doc_type, key_canon=kc)
                s.add(row)
            row.key = record.key
            row.fields = record.fields
            row.holder_name = record.holder_name
            row.issued_date = record.issued_date
            row.source_ref = record.source_ref
            s.commit()

    def has_issuer(self, issuer_id: str) -> bool:
        with SessionLocal() as s:
            return s.scalars(select(RecordRow.id).where(RecordRow.issuer_id == issuer_id)).first() is not None

    def get(self, issuer_id: str, doc_type: str, key: str) -> IssuerRecord | None:
        kc = _canon(key)
        with SessionLocal() as s:
            row = s.scalars(
                select(RecordRow).where(
                    RecordRow.issuer_id == issuer_id,
                    RecordRow.doc_type == doc_type,
                    RecordRow.key_canon == kc,
                )
            ).first()
            if row is None:
                return None
            return IssuerRecord(
                issuer_id=row.issuer_id, doc_type=row.doc_type, key=row.key,
                fields=row.fields or {}, holder_name=row.holder_name,
                issued_date=row.issued_date, source_ref=row.source_ref,
            )

    def records_for(self, issuer_id: str, doc_type: str) -> list[IssuerRecord]:
        with SessionLocal() as s:
            rows = s.scalars(
                select(RecordRow).where(RecordRow.issuer_id == issuer_id, RecordRow.doc_type == doc_type)
            ).all()
        return [
            IssuerRecord(issuer_id=r.issuer_id, doc_type=r.doc_type, key=r.key, fields=r.fields or {},
                         holder_name=r.holder_name, issued_date=r.issued_date, source_ref=r.source_ref)
            for r in rows
        ]


store = DbRecordStore()

# Seed a sample issuer record (idempotent) so the API has something to verify against.
if not store.has_issuer("UNILAG"):
    store.add(IssuerRecord(
        issuer_id="UNILAG", doc_type="degree", key="CSC/2019/0413",
        holder_name="Ada Obi", issued_date="2019-07-15",
        fields={"holder": "Ada Obi", "classification": "First Class",
                "year": "2019", "programme": "Computer Science"},
        source_ref="archive/box12/p221.png",
    ))


def extract_presented(markdown: str, issuer_id: str, doc_type: str) -> PresentedDocument:
    """OCR markdown → the structured PresentedDocument to verify."""
    if settings.mock_extraction:
        return PresentedDocument(
            issuer_id=issuer_id or "UNILAG",
            doc_type=doc_type or "degree",
            key="CSC/2019/0413",
            fields={"holder": "Ada Obi", "classification": "First Class", "year": "2019"},
        )
    prompt = (
        "Extract this document as a presented record: issuer, document type, the unique "
        f"record key (certificate/reference number), and the key fields. Hints — "
        f"issuer_id: {issuer_id!r}, doc_type: {doc_type!r}.\n\n" + markdown
    )
    return extract(prompt, PresentedDocument)


def result_to_dict(r: VerifyResult) -> dict:
    return {
        "status": r.status.value,
        "genuine": r.genuine,
        "confidence": round(r.confidence, 3),
        "issuer_id": r.issuer_id,
        "doc_type": r.doc_type,
        "key": r.key,
        "message": r.message,
        "reasons": list(r.reasons),
        "mismatches": [{"field": f, "presented": p, "issued": s} for f, p, s in r.mismatches],
    }


def _cross_submission_alerts(doc: PresentedDocument) -> list[str]:
    """Fraud signal: the same certificate key submitted before under a different name."""
    kc, holder = _canon(doc.key), _holder_of(doc)
    with SessionLocal() as s:
        rows = s.scalars(
            select(VerificationLog).where(
                VerificationLog.issuer_id == doc.issuer_id,
                VerificationLog.doc_type == doc.doc_type,
                VerificationLog.key_canon == kc,
            )
        ).all()
    other_names = {r.holder_canon for r in rows if r.holder_canon and r.holder_canon != holder}
    if other_names:
        return [
            f"certificate key {doc.key!r} was previously submitted under "
            f"{len(other_names)} different name(s) — possible shared or fabricated document"
        ]
    return []


def _log_submission(doc: PresentedDocument, status: str) -> None:
    with SessionLocal() as s:
        s.add(VerificationLog(
            issuer_id=doc.issuer_id, doc_type=doc.doc_type, key_canon=_canon(doc.key),
            holder_canon=_holder_of(doc), status=status, created_at=time.time(),
        ))
        s.commit()


def run_verify(doc: PresentedDocument) -> dict:
    """Verify + cross-submission detection + log. Returns the API dict."""
    result = verify(store, doc)
    alerts = _cross_submission_alerts(doc)   # check priors BEFORE logging this one
    _log_submission(doc, result.status.value)
    out = result_to_dict(result)
    out["alerts"] = alerts
    return out


async def verify_file(file_bytes: bytes, filename: str, issuer_id: str, doc_type: str) -> dict:
    from .integrity import analyze as analyze_integrity

    ocr = await run_ocr(file_bytes, filename, grounding=False)
    doc = extract_presented(ocr.markdown, issuer_id, doc_type)
    out = run_verify(doc)
    out["integrity"] = analyze_integrity(file_bytes, filename).to_dict()  # real even in mock mode
    return out
