"""Extraction layer: OCR markdown -> typed FinancialStatement.

In mock mode it returns the planted-error sample so the audit has something to
flag without needing an LLM key. The real path uses the configured provider
(Gemini by default) via `llm.extract`.
"""
from __future__ import annotations

from .config import settings
from .llm import extract
from hermes.financial import FinancialStatement
from hermes.demo_financial import sample_statement


def extract_financial(markdown: str) -> FinancialStatement:
    if settings.mock_extraction:
        return sample_statement()

    prompt = (
        "Extract the financial statement from this parsed document into the schema. "
        "Use the page numbers shown in the text for each figure. Do not invent values; "
        "omit optional fields that are absent.\n\n" + markdown
    )
    return extract(prompt, FinancialStatement)
