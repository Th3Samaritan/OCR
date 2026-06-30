"""Job store, backed by the database (SQLAlchemy)."""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Optional

from .db import JobRow, SessionLocal, init_db

init_db()  # ensure tables exist


@dataclass
class Job:
    id: str
    filename: str = ""
    status: str = "queued"          # queued | processing | done | error
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: float = 0.0


def _to_job(row: JobRow) -> Job:
    return Job(id=row.id, filename=row.filename, status=row.status,
               result=row.result, error=row.error, created_at=row.created_at)


class JobStore:
    def create(self, filename: str) -> Job:
        job_id = uuid.uuid4().hex[:12]
        with SessionLocal() as s:
            s.add(JobRow(id=job_id, filename=filename, status="queued", created_at=time.time()))
            s.commit()
        return Job(id=job_id, filename=filename, status="queued", created_at=time.time())

    def get(self, job_id: str) -> Optional[Job]:
        with SessionLocal() as s:
            row = s.get(JobRow, job_id)
            return _to_job(row) if row is not None else None

    def update(self, job_id: str, **changes) -> None:
        with SessionLocal() as s:
            row = s.get(JobRow, job_id)
            if row is None:
                return
            for key, value in changes.items():
                setattr(row, key, value)
            s.commit()


store = JobStore()
