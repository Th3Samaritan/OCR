"""Hermes benchmark harness.

Measures the *audit layer* accuracy: given documents whose defects are known
and labeled by hand, does each deterministic rule pack flag exactly the rules it
should — no misses (recall) and no false alarms (precision)?

Extraction is out of scope here (it needs a GPU/key and a labeled OCR set); this
harness scores the part of the system that must never be wrong: the arithmetic
verdict. Run it with ``python -m bench``.
"""
from .corpus import Case, CORPUS
from .harness import CaseResult, Scorecard, score_case, score_corpus

__all__ = [
    "Case",
    "CORPUS",
    "CaseResult",
    "Scorecard",
    "score_case",
    "score_corpus",
]
