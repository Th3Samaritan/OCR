"""Financial / Audit domain pack: schema + deterministic rule pack.

This is the pitch-lead vertical. Every check here is arithmetic — that is the
point. The model extracts the numbers; this code decides whether they are
internally consistent.
"""
from __future__ import annotations

from collections import Counter
from typing import Optional

from pydantic import BaseModel

from .core import Finding, RulePack, Severity, fmt, money_equal


# --------------------------------------------------------------------------- #
# Schema Pack — what the extraction layer (OCR + Claude) must produce.
# Every figure carries its source location so a finding can cite the exact box.
# --------------------------------------------------------------------------- #
class Figure(BaseModel):
    label: str
    value: float
    page: Optional[int] = None
    bbox: Optional[list[float]] = None          # [x1, y1, x2, y2] from <|grounding|>
    confidence: float = 1.0

    def cite(self) -> str:
        loc = f"p.{self.page}" if self.page is not None else "p.?"
        if self.bbox:
            loc += f" {self.bbox}"
        return f"{self.label} ({loc})"


class LineItem(BaseModel):
    label: str
    amount: float
    page: Optional[int] = None
    confidence: float = 1.0

    def cite(self) -> str:
        loc = f"p.{self.page}" if self.page is not None else "p.?"
        return f"{self.label} ({loc})"


class IncomeStatement(BaseModel):
    revenue: Figure
    cogs: Figure
    gross_profit: Figure
    opex: list[LineItem] = []
    operating_income: Figure
    interest: Optional[Figure] = None
    tax: Optional[Figure] = None
    net_income: Figure


class BalanceSheet(BaseModel):
    assets: list[LineItem] = []
    total_assets: Figure
    liabilities: list[LineItem] = []
    total_liabilities: Figure
    equity: list[LineItem] = []
    total_equity: Figure


class FinancialStatement(BaseModel):
    entity: str
    period: str
    currency: str = "NGN"
    income_statement: IncomeStatement
    balance_sheet: BalanceSheet
    bank_closing_balance: Optional[Figure] = None  # cross-document reconciliation


# --------------------------------------------------------------------------- #
# Rule Pack — the deterministic checks (the "audit").
# Each rule returns a list of Findings. Add a rule = extend the audit.
# --------------------------------------------------------------------------- #
def _equality_finding(rule, expected, actual, cur, ok_msg, fail_msg, citations, severity=Severity.ERROR):
    passed = money_equal(expected, actual)
    if passed:
        msg = ok_msg
    else:
        msg = fail_msg.format(
            expected=fmt(expected, cur), actual=fmt(actual, cur), gap=fmt(actual - expected, cur)
        )
    return Finding(rule, passed, Severity.INFO if passed else severity, msg, expected, actual, citations)


def check_gross_profit(s: FinancialStatement) -> list[Finding]:
    inc, cur = s.income_statement, s.currency
    expected = inc.revenue.value - inc.cogs.value
    return [_equality_finding(
        "gross_profit", expected, inc.gross_profit.value, cur,
        ok_msg=f"gross profit = revenue − COGS = {fmt(expected, cur)}",
        fail_msg="revenue − COGS = {expected} but gross profit is stated as {actual} (gap {gap})",
        citations=[inc.revenue.cite(), inc.cogs.cite(), inc.gross_profit.cite()],
    )]


def check_operating_income(s: FinancialStatement) -> list[Finding]:
    inc, cur = s.income_statement, s.currency
    opex_total = sum(li.amount for li in inc.opex)
    expected = inc.gross_profit.value - opex_total
    return [_equality_finding(
        "operating_income", expected, inc.operating_income.value, cur,
        ok_msg=f"operating income = gross profit − Σ opex = {fmt(expected, cur)}",
        fail_msg="gross profit − Σ opex = {expected} but operating income is stated as {actual} (gap {gap})",
        citations=[inc.gross_profit.cite()] + [li.cite() for li in inc.opex] + [inc.operating_income.cite()],
    )]


def check_net_income(s: FinancialStatement) -> list[Finding]:
    inc, cur = s.income_statement, s.currency
    interest = inc.interest.value if inc.interest else 0.0
    tax = inc.tax.value if inc.tax else 0.0
    expected = inc.operating_income.value - interest - tax
    return [_equality_finding(
        "net_income", expected, inc.net_income.value, cur,
        ok_msg=f"net income = operating income − interest − tax = {fmt(expected, cur)}",
        fail_msg="operating income − interest − tax = {expected} but net income is stated as {actual} (gap {gap})",
        citations=[inc.operating_income.cite(), inc.net_income.cite()],
    )]


def check_balance_sheet_identity(s: FinancialStatement) -> list[Finding]:
    bs, cur = s.balance_sheet, s.currency
    expected = bs.total_liabilities.value + bs.total_equity.value
    return [_equality_finding(
        "balance_sheet_identity", expected, bs.total_assets.value, cur,
        ok_msg=f"assets = liabilities + equity = {fmt(expected, cur)}",
        fail_msg="liabilities + equity = {expected} but total assets = {actual} — books don't balance (gap {gap})",
        citations=[bs.total_assets.cite(), bs.total_liabilities.cite(), bs.total_equity.cite()],
    )]


def _crossfoot(rule, lines, total: Figure, cur) -> Finding:
    expected = sum(li.amount for li in lines)
    return _equality_finding(
        rule, expected, total.value, cur,
        ok_msg=f"{total.label} = Σ lines = {fmt(expected, cur)}",
        fail_msg=f"Σ lines = {{expected}} but {total.label} is stated as {{actual}} (gap {{gap}})",
        citations=[li.cite() for li in lines] + [total.cite()],
    )


def check_crossfoot(s: FinancialStatement) -> list[Finding]:
    bs = s.balance_sheet
    return [
        _crossfoot("crossfoot_assets", bs.assets, bs.total_assets, s.currency),
        _crossfoot("crossfoot_liabilities", bs.liabilities, bs.total_liabilities, s.currency),
        _crossfoot("crossfoot_equity", bs.equity, bs.total_equity, s.currency),
    ]


def check_bank_reconciliation(s: FinancialStatement) -> list[Finding]:
    """Cross-document: balance-sheet Cash must match the bank statement's closing balance."""
    if s.bank_closing_balance is None:
        return []
    cash = next((li for li in s.balance_sheet.assets if "cash" in li.label.lower()), None)
    if cash is None:
        return [Finding("bank_reconciliation", False, Severity.WARNING,
                        "bank closing balance supplied but no 'Cash' line found on the balance sheet",
                        citations=[s.bank_closing_balance.cite()])]
    return [_equality_finding(
        "bank_reconciliation", s.bank_closing_balance.value, cash.amount, s.currency,
        ok_msg=f"balance-sheet Cash matches bank closing balance = {fmt(cash.amount, s.currency)}",
        fail_msg="balance-sheet Cash = {actual} but bank statement closing balance = {expected} (gap {gap})",
        citations=[cash.cite(), s.bank_closing_balance.cite()],
    )]


def check_duplicate_line_items(s: FinancialStatement) -> list[Finding]:
    """Identical amounts among opex lines often mean a double entry."""
    amounts = [li.amount for li in s.income_statement.opex]
    dupes = [amt for amt, n in Counter(amounts).items() if n > 1]
    findings = []
    for amt in dupes:
        labels = [li.label for li in s.income_statement.opex if li.amount == amt]
        findings.append(Finding(
            "duplicate_line_item", False, Severity.WARNING,
            f"amount {fmt(amt, s.currency)} appears {len(labels)}× in opex ({', '.join(labels)}) — possible double entry",
            citations=[li.cite() for li in s.income_statement.opex if li.amount == amt],
        ))
    if not findings:
        findings.append(Finding("duplicate_line_item", True, Severity.INFO,
                                "no duplicate opex amounts detected"))
    return findings


def check_benford(s: FinancialStatement) -> list[Finding]:
    """First-digit (Benford) anomaly check — a classic fraud signal.

    Needs a meaningful sample (>= 30 figures) to be statistically valid, so on a
    single small statement it reports INFO rather than a misleading flag.
    """
    import math
    amounts = (
        [li.amount for li in s.income_statement.opex]
        + [li.amount for li in s.balance_sheet.assets]
        + [li.amount for li in s.balance_sheet.liabilities]
        + [li.amount for li in s.balance_sheet.equity]
    )
    digits = [int(str(int(abs(a)))[0]) for a in amounts if abs(a) >= 1]
    n = len(digits)
    if n < 30:
        return [Finding("benford", True, Severity.INFO,
                        f"Benford check needs >= 30 figures to be meaningful (only {n} here) — skipped")]
    expected = {d: math.log10(1 + 1 / d) for d in range(1, 10)}
    counts = Counter(digits)
    chi2 = sum((counts.get(d, 0) - expected[d] * n) ** 2 / (expected[d] * n) for d in range(1, 10))
    flagged = chi2 > 15.51  # chi-square, 8 dof, ~0.05
    return [Finding("benford", not flagged,
                    Severity.WARNING if flagged else Severity.INFO,
                    f"first-digit distribution {'deviates from' if flagged else 'is consistent with'} "
                    f"Benford's law (χ²={chi2:.1f}, n={n})")]


# The pack: order is the order findings appear in the report.
FINANCIAL_RULE_PACK: RulePack = [
    check_gross_profit,
    check_operating_income,
    check_net_income,
    check_balance_sheet_identity,
    check_crossfoot,
    check_bank_reconciliation,
    check_duplicate_line_items,
    check_benford,
]
