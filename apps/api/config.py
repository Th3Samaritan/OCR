"""Runtime settings, read from environment.

Mock modes auto-enable when an external dependency isn't configured, so the API
runs end-to-end on a laptop with no GPU and no LLM key. Extraction defaults to
the Gemini provider.
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
    # OCR tier
    ocr_service_url: str | None = field(default_factory=lambda: os.getenv("OCR_SERVICE_URL"))
    mock_ocr: bool = field(default_factory=lambda: _bool(os.getenv("MOCK_OCR"), os.getenv("OCR_SERVICE_URL") is None))

    # Extraction provider — Gemini by default (set EXTRACTION_PROVIDER=anthropic to switch)
    extraction_provider: str = field(default_factory=lambda: os.getenv("EXTRACTION_PROVIDER", "gemini").lower())
    gemini_api_key: str | None = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    anthropic_api_key: str | None = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY"))
    anthropic_model: str = field(default_factory=lambda: os.getenv("CLAUDE_MODEL", "claude-opus-4-8"))
    deepseek_api_key: str | None = field(default_factory=lambda: os.getenv("DEEPSEEK_API_KEY"))
    deepseek_model: str = field(default_factory=lambda: os.getenv("DEEPSEEK_MODEL", "deepseek-v4"))

    # Persistence
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite+pysqlite:///./hermes.db"))

    # Cost guard
    rate_limit_per_min: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_PER_MIN", "5")))
    daily_job_cap: int = field(default_factory=lambda: int(os.getenv("DAILY_JOB_CAP", "200")))

    cors_origins: list[str] = field(default_factory=lambda: [
        o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
    ] or ["*"])

    mock_extraction: bool = field(default=False)

    def __post_init__(self) -> None:
        explicit = os.getenv("MOCK_EXTRACTION")
        if explicit is not None:
            self.mock_extraction = _bool(explicit, False)
        else:
            key = self.gemini_api_key if self.extraction_provider == "gemini" else self.anthropic_api_key
            self.mock_extraction = key is None

    @property
    def active_model(self) -> str:
        return self.gemini_model if self.extraction_provider == "gemini" else self.anthropic_model if self.extraction_provider == "anthropic" else self.deepseek_model


settings = Settings()
