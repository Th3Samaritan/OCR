"""Extraction layer: OCR markdown -> typed FinancialStatement (via Claude).

In mock mode it returns the planted-error sample so the audit has something to
flag without needing an Anthropic key.
"""
from __future__ import annotations

from .config import settings
from hermes.financial import FinancialStatement
from hermes.demo_financial import sample_statement


def extract_financial(markdown: str) -> FinancialStatement:
    if settings.mock_extraction:
        return sample_statement()

    import anthropic  # lazy import — only needed for the real call

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.parse(
        model=settings.model,
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": (
                "Extract the financial statement from this parsed document into the "
                "schema. Use the page numbers shown in the text for each figure. Do "
                "not invent values; omit optional fields that are absent.\n\n" + markdown
            ),
        }],
        output_format=FinancialStatement,
    )
    return resp.parsed_output
