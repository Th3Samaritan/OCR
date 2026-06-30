"""Persistence layer (SQLAlchemy).

DATABASE_URL drives the backend: defaults to a local SQLite file for dev/tests,
set it to a `postgresql+psycopg://...` URL in production. The ORM is identical
either way.
"""
from __future__ import annotations

from sqlalchemy import JSON, Integer, String, Text, UniqueConstraint, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

from .config import settings


class Base(DeclarativeBase):
    pass


class JobRow(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    filename: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String(16), default="queued")
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[float] = mapped_column(default=0.0)


class VerificationLog(Base):
    """One row per verify submission — powers cross-submission fraud detection."""
    __tablename__ = "verification_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    issuer_id: Mapped[str] = mapped_column(String, index=True)
    doc_type: Mapped[str] = mapped_column(String)
    key_canon: Mapped[str] = mapped_column(String, index=True)
    holder_canon: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[float] = mapped_column(default=0.0)


class RecordRow(Base):
    __tablename__ = "issuer_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    issuer_id: Mapped[str] = mapped_column(String, index=True)
    doc_type: Mapped[str] = mapped_column(String)
    key_canon: Mapped[str] = mapped_column(String, index=True)
    key: Mapped[str] = mapped_column(String)
    fields: Mapped[dict] = mapped_column(JSON, default=dict)
    holder_name: Mapped[str] = mapped_column(String, default="")
    issued_date: Mapped[str] = mapped_column(String, default="")
    source_ref: Mapped[str] = mapped_column(String, default="")
    __table_args__ = (UniqueConstraint("issuer_id", "doc_type", "key_canon", name="uq_issuer_doc_key"),)


def _make_engine():
    url = settings.database_url
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        if ":memory:" in url:
            # one shared in-memory DB across sessions/threads (tests)
            return create_engine(url, connect_args=connect_args, poolclass=StaticPool)
        return create_engine(url, connect_args=connect_args)
    return create_engine(url, pool_pre_ping=True)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    """Create tables if they don't exist (idempotent)."""
    Base.metadata.create_all(engine)


__all__ = ["Base", "JobRow", "RecordRow", "VerificationLog", "SessionLocal", "engine", "init_db", "select"]
