"""Runtime settings, read from environment.

Mock modes auto-enable when an external dependency isn't configured, so the API
runs end-to-end on a laptop with no GPU and no Anthropic key.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.lower() in ("1", "true", "yes", "on")


@dataclass
class Settings:
    anthropic_api_key: str | None = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY"))
    ocr_service_url: str | None = field(default_factory=lambda: os.getenv("OCR_SERVICE_URL"))
    model: str = field(default_factory=lambda: os.getenv("CLAUDE_MODEL", "claude-opus-4-8"))

    rate_limit_per_min: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_PER_MIN", "5")))
    daily_job_cap: int = field(default_factory=lambda: int(os.getenv("DAILY_JOB_CAP", "200")))

    mock_ocr: bool = field(default_factory=lambda: _bool(os.getenv("MOCK_OCR"), os.getenv("OCR_SERVICE_URL") is None))
    mock_extraction: bool = field(default_factory=lambda: _bool(os.getenv("MOCK_EXTRACTION"), os.getenv("ANTHROPIC_API_KEY") is None))

    cors_origins: list[str] = field(default_factory=lambda: [
        o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
    ] or ["*"])


settings = Settings()
