"""Scoring: run each case through its pack, compare flags to the labels.

Scoring is at the *rule* level. For one case the universe of labels is the set
of rule ids the pack emits; a rule that fires (``not passed``) is a positive
prediction. Against the hand-authored expected set that gives, per case:

* TP — a rule we *should* flag and *did*,
* FP — a rule we flagged but shouldn't have (a false alarm), and
* FN — a defect we *missed*.

Aggregate those across cases for precision / recall / F1 per pack and overall.
Recall is the number that matters for an audit tool (a missed defect is the
expensive error); precision guards against crying wolf.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from hermes.core import run_pack
from apps.api.packs import PACKS

from .corpus import CORPUS, Case


@dataclass
class CaseResult:
    case: Case
    universe: set[str]          # every rule id the pack emitted
    flagged: set[str]           # rules that fired (predicted positive)
    expected: set[str]          # rules that should fire (labeled positive)

    @property
    def true_positives(self) -> set[str]:
        return self.flagged & self.expected

    @property
    def false_positives(self) -> set[str]:
        return self.flagged - self.expected

    @property
    def false_negatives(self) -> set[str]:
        return self.expected - self.flagged

    @property
    def exact(self) -> bool:
        """Did the pack flag exactly the labeled set — no misses, no false alarms?"""
        return self.flagged == self.expected


def _prf(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    precision = tp / (tp + fp) if (tp + fp) else 1.0
    recall = tp / (tp + fn) if (tp + fn) else 1.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return precision, recall, f1


@dataclass
class Scorecard:
    results: list[CaseResult] = field(default_factory=list)

    def _tally(self, subset: list[CaseResult]) -> dict:
        tp = sum(len(r.true_positives) for r in subset)
        fp = sum(len(r.false_positives) for r in subset)
        fn = sum(len(r.false_negatives) for r in subset)
        precision, recall, f1 = _prf(tp, fp, fn)
        return {
            "cases": len(subset),
            "exact_cases": sum(1 for r in subset if r.exact),
            "tp": tp, "fp": fp, "fn": fn,
            "precision": precision, "recall": recall, "f1": f1,
        }

    @property
    def by_pack(self) -> dict[str, dict]:
        packs: dict[str, list[CaseResult]] = {}
        for r in self.results:
            packs.setdefault(r.case.doc_type, []).append(r)
        return {pack: self._tally(rs) for pack, rs in packs.items()}

    @property
    def overall(self) -> dict:
        return self._tally(self.results)

    def to_dict(self) -> dict:
        return {
            "overall": self.overall,
            "by_pack": self.by_pack,
            "cases": [
                {
                    "name": r.case.name,
                    "doc_type": r.case.doc_type,
                    "expected": sorted(r.expected),
                    "flagged": sorted(r.flagged),
                    "false_positives": sorted(r.false_positives),
                    "false_negatives": sorted(r.false_negatives),
                    "exact": r.exact,
                }
                for r in self.results
            ],
        }


def score_case(case: Case) -> CaseResult:
    pack = PACKS[case.doc_type]
    findings = run_pack(pack.rule_pack, case.build())
    universe = {f.rule for f in findings}
    flagged = {f.rule for f in findings if not f.passed}
    return CaseResult(case, universe, flagged, set(case.expected_flags))


def score_corpus(corpus: list[Case] = CORPUS) -> Scorecard:
    return Scorecard([score_case(c) for c in corpus])
