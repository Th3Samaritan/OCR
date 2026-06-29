"""Verifiable-records core: the issuer source-of-truth + the verify operation.

This is the 🟢 tier (authenticity). It is document-type-agnostic: an issuer
onboards whatever it issues as generic records keyed by a unique id, and
verification is the same for every document type:

    look up by key  →  compare fields

Authenticity (matched against the issuer's record) is fundamentally different
from consistency (the audit packs). Reading a document can prove consistency,
never genuineness — only the issuer record can. Keep the two tiers distinct.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from pydantic import BaseModel


def _canon(value) -> str:
    """Canonicalize a value for tolerant comparison (case/space-insensitive)."""
    return " ".join(str(value).strip().lower().split())


# --------------------------------------------------------------------------- #
# Data model (generic across document types)
# --------------------------------------------------------------------------- #
class IssuerRecord(BaseModel):
    issuer_id: str
    doc_type: str                      # e.g. "degree", "transcript", "license"
    key: str                           # unique per (issuer, doc_type): cert no, etc.
    fields: dict[str, str] = {}        # canonical fields the issuer attests to
    holder_name: str = ""
    issued_date: str = ""
    source_ref: str = ""               # scan/file the record was digitized from


class PresentedDocument(BaseModel):
    """What a verifier submits (extracted from the presented paper/PDF)."""
    issuer_id: str
    doc_type: str
    key: str
    fields: dict[str, str] = {}


class VerifyStatus(str, Enum):
    CONFIRMED = "confirmed"        # key found, fields match
    ALTERED = "altered"           # key found, fields differ
    NOT_ISSUED = "not_issued"     # issuer onboarded, key absent
    UNVERIFIED = "unverified"     # issuer not onboarded → consistency-only


@dataclass
class VerifyResult:
    status: VerifyStatus
    issuer_id: str
    doc_type: str
    key: str
    message: str
    mismatches: list[tuple[str, str, str]] = field(default_factory=list)  # (field, presented, issued)

    @property
    def genuine(self) -> bool:
        return self.status is VerifyStatus.CONFIRMED


# --------------------------------------------------------------------------- #
# The source-of-truth store (in-memory MVP; swap for Postgres later)
# --------------------------------------------------------------------------- #
class RecordStore:
    def __init__(self) -> None:
        self._by_key: dict[tuple[str, str, str], IssuerRecord] = {}
        self._issuers: set[str] = set()

    def add(self, record: IssuerRecord) -> None:
        self._by_key[(record.issuer_id, record.doc_type, _canon(record.key))] = record
        self._issuers.add(record.issuer_id)

    def has_issuer(self, issuer_id: str) -> bool:
        return issuer_id in self._issuers

    def get(self, issuer_id: str, doc_type: str, key: str) -> IssuerRecord | None:
        return self._by_key.get((issuer_id, doc_type, _canon(key)))


# --------------------------------------------------------------------------- #
# The verify operation
# --------------------------------------------------------------------------- #
def verify(store: RecordStore, doc: PresentedDocument) -> VerifyResult:
    if not store.has_issuer(doc.issuer_id):
        return VerifyResult(
            VerifyStatus.UNVERIFIED, doc.issuer_id, doc.doc_type, doc.key,
            "issuer not onboarded — consistency-check only; authenticity cannot be confirmed",
        )

    record = store.get(doc.issuer_id, doc.doc_type, doc.key)
    if record is None:
        return VerifyResult(
            VerifyStatus.NOT_ISSUED, doc.issuer_id, doc.doc_type, doc.key,
            f"no '{doc.doc_type}' record with key {doc.key!r} was issued by {doc.issuer_id} — likely fake",
        )

    mismatches: list[tuple[str, str, str]] = []
    for name, presented in doc.fields.items():
        issued = record.fields.get(name)
        if issued is None:
            continue  # nothing on the record to compare this field against
        if _canon(presented) != _canon(issued):
            mismatches.append((name, str(presented), str(issued)))

    if mismatches:
        detail = "; ".join(f"{n}: '{p}' vs issued '{s}'" for n, p, s in mismatches)
        return VerifyResult(
            VerifyStatus.ALTERED, doc.issuer_id, doc.doc_type, doc.key,
            f"document does not match the issued record — {detail}", mismatches,
        )

    return VerifyResult(
        VerifyStatus.CONFIRMED, doc.issuer_id, doc.doc_type, doc.key,
        "matches the issuer's record",
    )


_LABEL = {
    VerifyStatus.CONFIRMED: "[CONFIRMED]",
    VerifyStatus.ALTERED: "[ALTERED] ",
    VerifyStatus.NOT_ISSUED: "[FAKE]    ",
    VerifyStatus.UNVERIFIED: "[UNVERIF] ",
}


def render_verify(result: VerifyResult) -> str:
    return f"{_LABEL[result.status]} {result.issuer_id}/{result.doc_type}/{result.key} — {result.message}"
