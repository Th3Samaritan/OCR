"""Core verification primitives shared by every domain pack.

The whole product thesis lives here: a *finding* is produced by deterministic
code, not by the language model. The LLM's job (elsewhere) is to extract fields
and explain findings; the verdict in this module is pure arithmetic, so it
cannot hallucinate a number.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class Finding:
    """One result from one deterministic check."""
    rule: str
    passed: bool
    severity: Severity
    message: str
    expected: Optional[float] = None
    actual: Optional[float] = None
    citations: list[str] = field(default_factory=list)  # human-readable source refs


def money_equal(a: float, b: float, abs_tol: float = 1.0, rel_tol: float = 1e-4) -> bool:
    """Compare two monetary amounts with a small absolute + relative tolerance.

    Statements round to whole currency units, and OCR can introduce sub-unit
    noise, so exact float equality is the wrong test.
    """
    return abs(a - b) <= max(abs_tol, rel_tol * max(abs(a), abs(b)))


def fmt(x: float, currency: str = "") -> str:
    return f"{currency}{x:,.2f}"


# A "rule pack" is just an ordered list of functions that each take the parsed
# document and return a list of Findings. This is the unit that makes the
# platform horizontal: a new vertical = a new schema + a new list like this.
RulePack = list[Callable[[object], list[Finding]]]


def run_pack(pack: RulePack, document: object) -> list[Finding]:
    findings: list[Finding] = []
    for rule in pack:
        findings.extend(rule(document))
    return findings


def render_report(findings: list[Finding], currency: str = "") -> str:
    """Format findings as a human-readable exception report (the auditor's queue)."""
    fails = [f for f in findings if not f.passed]
    passes = [f for f in findings if f.passed]
    lines: list[str] = []
    lines.append("=" * 64)
    lines.append("VERIFICATION REPORT")
    lines.append("=" * 64)
    lines.append(f"{len(findings)} checks run — {len(passes)} passed, {len(fails)} flagged")
    lines.append("")

    if fails:
        lines.append(f"FLAGGED ({len(fails)}) - review these:")
        for i, f in enumerate(fails, 1):
            mark = "[!!]" if f.severity == Severity.ERROR else "[! ]"
            lines.append(f"  {mark} [{i}] {f.rule}: {f.message}")
            if f.citations:
                lines.append(f"          source: {', '.join(f.citations)}")
        lines.append("")

    lines.append("PASSED:")
    for f in passes:
        lines.append(f"  [OK] {f.rule}: {f.message}")
    lines.append("=" * 64)
    return "\n".join(lines)
