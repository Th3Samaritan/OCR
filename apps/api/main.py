"""Hermes API — FastAPI orchestrator.

    uvicorn apps.api.main:app --reload     # run from the repo root

Endpoints:
    GET  /health                  — liveness + which mock modes are active
    POST /documents   (multipart) — upload a file for audit, returns {job_id, status}
    GET  /documents/{job_id}      — poll job status + result
    POST /issuers/records (json)  — onboard one issuer record (the source of truth)
    POST /verify      (multipart) — verify an uploaded document against issuer records
    POST /verify/presented (json) — verify an already-structured PresentedDocument
"""
from __future__ import annotations

import asyncio

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from hermes.registry import IssuerRecord, PresentedDocument, verify as verify_record

from .config import settings
from .jobs import store
from .onboarding import ingest_rows, ingest_scans
from .pipeline import process_document
from .ratelimit import guard
from .verification import result_to_dict, store as record_store, verify_file


class BulkRecordsRequest(BaseModel):
    doc_type: str
    key_field: str
    rows: list[dict]

app = FastAPI(title="Hermes API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _run_job(job_id: str, data: bytes, filename: str) -> None:
    """Runs in Starlette's threadpool (sync background task)."""
    store.update(job_id, status="processing")
    try:
        result = asyncio.run(process_document(data, filename))
        store.update(job_id, status="done", result=result)
    except Exception as exc:  # surface the message to the client, keep the server up
        store.update(job_id, status="error", error=str(exc))


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "mock_ocr": settings.mock_ocr,
        "mock_extraction": settings.mock_extraction,
        "model": settings.model,
    }


@app.post("/documents")
async def create_document(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile = File(...),
) -> dict:
    allowed, message = guard.check(_client_ip(request))
    if not allowed:
        raise HTTPException(status_code=429, detail=message)

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    job = store.create(file.filename or "upload")
    background.add_task(_run_job, job.id, data, job.filename)
    return {"job_id": job.id, "status": job.status}


@app.get("/documents/{job_id}")
def get_document(job_id: str) -> dict:
    job = store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "job_id": job.id,
        "status": job.status,
        "filename": job.filename,
        "result": job.result,
        "error": job.error,
    }


# --------------------------------------------------------------------------- #
# Verifiable-records: onboarding + verification (Push + structured)
# --------------------------------------------------------------------------- #
@app.post("/issuers/records")
def add_issuer_record(record: IssuerRecord) -> dict:
    """Onboard one issuer record into the source of truth."""
    record_store.add(record)
    return {"ok": True, "issuer_id": record.issuer_id, "doc_type": record.doc_type, "key": record.key}


@app.post("/issuers/{issuer_id}/bulk-records")
def bulk_records(issuer_id: str, req: BulkRecordsRequest) -> dict:
    """Onboard an issuer's register (rows from a CSV/Excel export)."""
    return ingest_rows(issuer_id, req.doc_type, req.key_field, req.rows)


@app.post("/issuers/{issuer_id}/bulk-scans")
async def bulk_scans(
    issuer_id: str,
    doc_type: str = Form(...),
    files: list[UploadFile] = File(...),
) -> dict:
    """Onboard a scanned paper archive: each file → OCR → extract → record."""
    payload = [(f.filename or "scan", await f.read()) for f in files]
    return await ingest_scans(issuer_id, doc_type, payload)


@app.post("/verify/presented")
def verify_presented(doc: PresentedDocument) -> dict:
    """Verify an already-structured document (Pull flow / integrations)."""
    return result_to_dict(verify_record(record_store, doc))


@app.post("/verify")
async def verify_upload(
    request: Request,
    file: UploadFile = File(...),
    issuer_id: str = Form(""),
    doc_type: str = Form(""),
) -> dict:
    """Push flow: upload a document → OCR → extract → match against issuer records."""
    allowed, message = guard.check(_client_ip(request))
    if not allowed:
        raise HTTPException(status_code=429, detail=message)

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    result = await verify_file(data, file.filename or "upload", issuer_id, doc_type)
    return result_to_dict(result)
