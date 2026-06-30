"""Print the benchmark scorecard.

    python -m bench            # human-readable scorecard
    python -m bench --json     # machine-readable, for CI/dashboards
    python -m bench --verbose  # also list every case and its flags

Exit code is non-zero if any defect was missed or any false alarm fired, so the
harness doubles as a CI gate on audit-layer accuracy.
"""
from __future__ import annotations

import argparse
import json
import sys

from .harness import Scorecard, score_corpus


def _pct(x: float) -> str:
    return f"{x * 100:5.1f}%"


def _render(card: Scorecard, verbose: bool) -> str:
    lines: list[str] = []
    lines.append("=" * 72)
    lines.append("HERMES AUDIT-LAYER BENCHMARK")
    lines.append("=" * 72)

    def _row(label: str, t: dict) -> str:
        exact = f"{t['exact_cases']}/{t['cases']}"
        conf = f"{t['tp']}/{t['fp']}/{t['fn']}"
        return (
            f"{label:<12}{t['cases']:>6}{exact:>7}"
            f"{_pct(t['precision']):>8}{_pct(t['recall']):>8}{_pct(t['f1']):>8}{conf:>14}"
        )

    lines.append(f"{'pack':<12}{'cases':>6}{'exact':>7}{'P':>8}{'R':>8}{'F1':>8}{'TP/FP/FN':>14}")
    lines.append("-" * 72)
    for pack, t in sorted(card.by_pack.items()):
        lines.append(_row(pack, t))
    lines.append("-" * 72)
    o = card.overall
    lines.append(_row("OVERALL", o))
    lines.append("=" * 72)

    if verbose:
        lines.append("")
        lines.append("CASES")
        lines.append("-" * 72)
        for r in card.results:
            mark = "ok  " if r.exact else "FAIL"
            lines.append(f"  [{mark}] {r.case.name}")
            if not r.exact:
                if r.false_negatives:
                    lines.append(f"         missed:      {', '.join(sorted(r.false_negatives))}")
                if r.false_positives:
                    lines.append(f"         false alarm: {', '.join(sorted(r.false_positives))}")
            lines.append(f"         {r.case.note}")

    lines.append("")
    miss = o["fn"]
    alarm = o["fp"]
    if miss == 0 and alarm == 0:
        lines.append("PASS — every planted defect caught, zero false alarms on clean docs.")
    else:
        lines.append(f"FAIL — {miss} missed defect(s), {alarm} false alarm(s).")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="bench", description="Hermes audit-layer benchmark")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    parser.add_argument("--verbose", action="store_true", help="list every case")
    args = parser.parse_args(argv)

    try:
        sys.stdout.reconfigure(encoding="utf-8")  # so the ₦ symbol prints anywhere
    except Exception:
        pass

    card = score_corpus()
    if args.json:
        print(json.dumps(card.to_dict(), indent=2))
    else:
        print(_render(card, args.verbose))

    o = card.overall
    return 0 if (o["fn"] == 0 and o["fp"] == 0) else 1


if __name__ == "__main__":
    raise SystemExit(main())
