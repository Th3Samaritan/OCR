"""Runnable demo of the verifiable-records core.

    python -m hermes.demo_verify

One issuer's archive is digitized into the store, then four documents are
presented: genuine, altered, fake, and one from a non-onboarded issuer.
"""
from __future__ import annotations

from .registry import (
    IssuerRecord,
    PresentedDocument,
    RecordStore,
    render_verify,
    verify,
)


def seeded_store() -> RecordStore:
    store = RecordStore()
    # Pretend we bulk-OCR'd University of Lagos' degree archive into records.
    store.add(IssuerRecord(
        issuer_id="UNILAG", doc_type="degree", key="CSC/2019/0413",
        holder_name="Ada Obi", issued_date="2019-07-15",
        fields={"holder": "Ada Obi", "classification": "First Class", "year": "2019",
                "programme": "Computer Science"},
        source_ref="archive/box12/p221.png",
    ))
    return store


def main() -> None:
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    store = seeded_store()

    presented = [
        ("genuine certificate (case differs, still matches)", PresentedDocument(
            issuer_id="UNILAG", doc_type="degree", key="CSC/2019/0413",
            fields={"holder": "ada obi", "classification": "First Class", "year": "2019"})),
        ("altered grade", PresentedDocument(
            issuer_id="UNILAG", doc_type="degree", key="CSC/2019/0413",
            fields={"holder": "Ada Obi", "classification": "Second Class Upper", "year": "2019"})),
        ("forged certificate number", PresentedDocument(
            issuer_id="UNILAG", doc_type="degree", key="CSC/2019/9999",
            fields={"holder": "John Doe", "classification": "First Class", "year": "2019"})),
        ("issuer not onboarded", PresentedDocument(
            issuer_id="UNKNOWN_POLY", doc_type="degree", key="X/1",
            fields={"holder": "Jane Doe"})),
    ]

    print("\nVerifying presented documents against the issuer source of truth:\n")
    for label, doc in presented:
        print(f"  {render_verify(verify(store, doc))}")
        print(f"      ({label})")
    print()


if __name__ == "__main__":
    main()
