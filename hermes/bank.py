"""Bank statements domain pack: schema + deterministic rule pack.

The signature check is running-balance continuity: every row's stated balance
must equal the previous balance ± the transaction. It catches OCR misreads AND
tampering, and it's pure arithmetic.
"""
from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Optional

from pydantic import BaseModel

from .core import Finding, RulePack, Severity, fmt, money_equal


# --------------------------------------------------------------------------- #
# Schema Pack
# --------------------------------------------------------------------------- #
class Transaction(BaseModel):
    date: str                      # ISO yyyy-mm-dd
    description: str
    debit: float = 0.0             # money out
    credit: float = 0.0            # money in
    balance: Optional[float] = None  # running balance after this row, if printed
    page: Optional[int] = None

    def cite(self) -> str:
        loc = f"p.{self.page}" if self.page is not None else "p.?"
        return f"{self.date} {self.description} ({loc})"


class BankStatement(BaseModel):
    account_holder: str
    bank: str = ""
    account_masked: str = ""
    period_start: str              # ISO
    period_end: str               # ISO
    currency: str = "NGN"
    opening_balance: float
    closing_balance: float
    transactions: list[Transaction] = []
    stated_total_credits: Optional[float] = None
    stated_total_debits: Optional[float] = None


# --------------------------------------------------------------------------- #
# Rule Pack
# --------------------------------------------------------------------------- #
def check_running_balance(s: BankStatement) -> list[Finding]:
    """balance[i] must equal balance[i-1] + credit - debit (opening seeds it)."""
    prev = s.opening_balance
    breaks = []
    for i, t in enumerate(s.transactions):
        expected = prev + t.credit - t.debit
        if t.balance is not None:
            if not money_equal(expected, t.balance):
                breaks.append((i, t, expected, t.balance))
            prev = t.balance  # carry the stated value so we localise, not cascade
        else:
            prev = expected
    if not breaks:
        return [Finding("running_balance_continuity", True, Severity.INFO,
                        f"running balance is continuous across {len(s.transactions)} rows")]
    i, t, expected, actual = breaks[0]
    extra = f" (+{len(breaks) - 1} more)" if len(breaks) > 1 else ""
    return [Finding(
        "running_balance_continuity", False, Severity.ERROR,
        f"row {i + 1}: balance should be {fmt(expected, s.currency)} but statement shows "
        f"{fmt(actual, s.currency)} (gap {fmt(actual - expected, s.currency)}){extra}",
        expected=expected, actual=actual, citations=[t.cite()],
    )]


def check_opening_closing(s: BankStatement) -> list[Finding]:
    credits = sum(t.credit for t in s.transactions)
    debits = sum(t.debit for t in s.transactions)
    expected = s.opening_balance + credits - debits
    passed = money_equal(expected, s.closing_balance)
    msg = (f"opening + Σcredits − Σdebits = closing = {fmt(expected, s.currency)}" if passed
           else f"opening + Σcredits − Σdebits = {fmt(expected, s.currency)} but closing balance is "
                f"{fmt(s.closing_balance, s.currency)} (gap {fmt(s.closing_balance - expected, s.currency)})")
    return [Finding("opening_closing_reconciliation", passed,
                    Severity.INFO if passed else Severity.ERROR, msg,
                    expected=expected, actual=s.closing_balance)]


def check_stated_totals(s: BankStatement) -> list[Finding]:
    out = []
    if s.stated_total_credits is not None:
        actual = sum(t.credit for t in s.transactions)
        passed = money_equal(actual, s.stated_total_credits)
        out.append(Finding("stated_total_credits", passed,
                           Severity.INFO if passed else Severity.WARNING,
                           f"Σ credits = {fmt(actual, s.currency)}"
                           + ("" if passed else f" but statement totals {fmt(s.stated_total_credits, s.currency)}"),
                           expected=actual, actual=s.stated_total_credits))
    if s.stated_total_debits is not None:
        actual = sum(t.debit for t in s.transactions)
        passed = money_equal(actual, s.stated_total_debits)
        out.append(Finding("stated_total_debits", passed,
                           Severity.INFO if passed else Severity.WARNING,
                           f"Σ debits = {fmt(actual, s.currency)}"
                           + ("" if passed else f" but statement totals {fmt(s.stated_total_debits, s.currency)}"),
                           expected=actual, actual=s.stated_total_debits))
    return out


def check_dates(s: BankStatement) -> list[Finding]:
    try:
        start, end = date.fromisoformat(s.period_start), date.fromisoformat(s.period_end)
    except ValueError:
        return [Finding("date_sequence", False, Severity.ERROR,
                        f"unparseable statement period: {s.period_start}..{s.period_end}")]
    prev = None
    for i, t in enumerate(s.transactions):
        try:
            d = date.fromisoformat(t.date)
        except ValueError:
            return [Finding("date_sequence", False, Severity.ERROR,
                            f"row {i + 1}: impossible/unparseable date {t.date!r}", citations=[t.cite()])]
        if not (start <= d <= end):
            return [Finding("date_sequence", False, Severity.WARNING,
                            f"row {i + 1}: date {t.date} is outside the statement period", citations=[t.cite()])]
        if prev is not None and d < prev:
            return [Finding("date_sequence", False, Severity.WARNING,
                            f"row {i + 1}: date {t.date} is out of order", citations=[t.cite()])]
        prev = d
    return [Finding("date_sequence", True, Severity.INFO, "dates in order and within the period")]


def check_duplicates(s: BankStatement) -> list[Finding]:
    keys = [(t.date, t.description, t.debit, t.credit) for t in s.transactions]
    dupes = [k for k, n in Counter(keys).items() if n > 1]
    if not dupes:
        return [Finding("duplicate_transaction", True, Severity.INFO, "no duplicate transactions")]
    out = []
    for k in dupes:
        d, desc, debit, credit = k
        amt = credit or debit
        out.append(Finding("duplicate_transaction", False, Severity.WARNING,
                           f"{d} '{desc}' {fmt(amt, s.currency)} appears {keys.count(k)}× — possible duplicate"))
    return out


def check_structuring(s: BankStatement, threshold: float = 1_000_000.0) -> list[Finding]:
    """AML signal: clusters of deposits just under a reporting threshold."""
    near = [t for t in s.transactions if 0.9 * threshold <= t.credit < threshold]
    if len(near) >= 3:
        return [Finding("structuring_aml", False, Severity.WARNING,
                        f"{len(near)} credits just under {fmt(threshold, s.currency)} "
                        f"— possible structuring; review",
                        citations=[t.cite() for t in near])]
    return [Finding("structuring_aml", True, Severity.INFO,
                    f"no clustering of deposits just under {fmt(threshold, s.currency)}")]


BANK_RULE_PACK: RulePack = [
    check_running_balance,
    check_opening_closing,
    check_stated_totals,
    check_dates,
    check_duplicates,
    check_structuring,
]
