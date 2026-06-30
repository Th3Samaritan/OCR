"""Provider-agnostic structured extraction.

`extract(prompt, schema)` returns an instance of the given Pydantic schema,
using the configured provider (Gemini by default; Anthropic optional). Callers
hit this only on the real path — mock modes never reach here.

NOTE: both providers need a schema without free-form `dict` fields for strict
structured output. If a schema uses an open dict (e.g. PresentedDocument.fields),
model it as a list of {name, value} pairs before relying on the real path.
Verify the Gemini model name + SDK against the installed `google-genai` version.
"""
from __future__ import annotations

from typing import TypeVar

from pydantic import BaseModel

from .config import settings

T = TypeVar("T", bound=BaseModel)


def extract(prompt: str, schema: type[T]) -> T:
    if settings.extraction_provider == "gemini":
        return _extract_gemini(prompt, schema)
    elif settings.extraction_provider == "anthropic":    
        return _extract_anthropic(prompt, schema)
    else:
        return _extract_deepseek(prompt, schema)


def _extract_gemini(prompt: str, schema: type[T]) -> T:
    from google import genai  # lazy — pip install google-genai

    client = genai.Client(api_key=settings.gemini_api_key)
    resp = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={"response_mime_type": "application/json", "response_schema": schema},
    )
    parsed = getattr(resp, "parsed", None)
    if isinstance(parsed, schema):
        return parsed
    # fallback: parse the JSON text against the schema
    return schema.model_validate_json(resp.text)


def _extract_anthropic(prompt: str, schema: type[T]) -> T:
    import anthropic  # lazy

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.parse(
        model=settings.anthropic_model,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
        output_format=schema,
    )
    return resp.parsed_output

def _extract_deepseek(prompt: str, schema: type[T]) -> T:
    import deepseek  # lazy

    client = deepseek.Client(api_key=settings.deepseek_api_key)
    resp = client.extract(
        model=settings.deepseek_model,
        max_tokens=4096,
        prompt=prompt,
        output_format=schema,
    )
    return resp.parsed_output