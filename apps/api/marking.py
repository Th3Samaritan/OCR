"""Exam-marking assist — the API your CBT platform calls for handwritten answers.

Lecturer-assist by design: it reads the handwriting *using the question + marking
scheme as context* (which resolves most character-confusion), proposes a score
with a per-criterion breakdown, and ALWAYS returns needs_review=True. The lecturer
sees the original image beside the transcription and approves/adjusts — the model
never finalises a grade.
"""
from __future__ import annotations

from pydantic import BaseModel

from .config import settings


class CriterionScore(BaseModel):
    criterion: str
    awarded: float
    max: float
    note: str = ""


class MarkResult(BaseModel):
    transcription: str
    transcription_confidence: float = 0.0   # 0..1 — flag low values for careful review
    score: float = 0.0
    max_score: float = 0.0
    rationale: str = ""
    criteria: list[CriterionScore] = []
    needs_review: bool = True                # lecturer-assist: always true


_MIME = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "pdf": "application/pdf"}


def _mime_for(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    return _MIME.get(ext, "image/png")


def _mock(max_score: float) -> MarkResult:
    return MarkResult(
        transcription="x = (-b ± √(b²−4ac)) / 2a.  For x²−5x+6=0: x = 2 or x = 3.",
        transcription_confidence=0.82,
        score=round(0.8 * max_score, 1),
        max_score=max_score,
        rationale="Correct method and both roots found; one intermediate step not shown.",
        criteria=[
            CriterionScore(criterion="Correct formula/approach", awarded=round(0.3 * max_score, 1), max=round(0.3 * max_score, 1), note="stated correctly"),
            CriterionScore(criterion="Working shown", awarded=round(0.3 * max_score, 1), max=round(0.4 * max_score, 1), note="a step skipped"),
            CriterionScore(criterion="Final answer", awarded=round(0.2 * max_score, 1), max=round(0.3 * max_score, 1), note="both roots correct"),
        ],
        needs_review=True,
    )


def mark_answer(image_bytes: bytes, filename: str, question: str, marking_scheme: str, max_score: float) -> MarkResult:
    if settings.mock_extraction:
        return _mock(max_score)

    # Real path — Gemini vision reads the handwriting with the question as context.
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    prompt = (
        "You are assisting a lecturer marking a HANDWRITTEN exam answer. Use the question and "
        "marking scheme as context to disambiguate unclear handwriting (e.g. 1 vs l, 0 vs O).\n\n"
        f"QUESTION:\n{question}\n\nMARKING SCHEME / EXPECTED ANSWER:\n{marking_scheme or '(none provided)'}\n\n"
        f"MAX SCORE: {max_score}\n\n"
        "Transcribe the answer, give transcription_confidence (0..1), then score it against the "
        "scheme with a per-criterion breakdown and a short rationale. This is a DRAFT for lecturer review."
    )
    resp = client.models.generate_content(
        model=settings.gemini_model,
        contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type=_mime_for(filename))],
        config={"response_mime_type": "application/json", "response_schema": MarkResult},
    )
    result = getattr(resp, "parsed", None) or MarkResult.model_validate_json(resp.text)
    result.max_score = max_score
    result.needs_review = True   # never let the model finalise a grade
    return result
