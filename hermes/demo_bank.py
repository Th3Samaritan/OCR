"""Runnable demo of the Bank statements pack.

    python -m hermes.demo_bank

Planted problems: a broken running-balance row, a closing balance that doesn't
reconcile, a duplicate deposit, and a cluster of just-under-threshold deposits.
"""
from __future__ import annotations

from .bank import BANK_RULE_PACK, BankStatement, Transaction
from .core import render_report, run_pack


def sample_statement() -> BankStatement:
    return BankStatement(
        account_holder="Acme Trading Ltd",
        bank="First Bank",
        account_masked="****3920",
        period_start="2026-01-01",
        period_end="2026-01-31",
        currency="₦",
        opening_balance=100_000,
        closing_balance=3_200_000,           # planted: doesn't reconcile (should be 3,190,000)
        stated_total_credits=3_350_000,       # correct → passes
        stated_total_debits=260_000,          # correct → passes
        transactions=[
            Transaction(date="2026-01-03", description="Salary", credit=500_000, balance=600_000, page=1),
            Transaction(date="2026-01-05", description="Rent", debit=200_000, balance=400_000, page=1),
            Transaction(date="2026-01-09", description="Transfer", debit=50_000, balance=360_000, page=1),  # planted: should be 350,000
            Transaction(date="2026-01-10", description="POS", debit=10_000, balance=350_000, page=1),
            Transaction(date="2026-01-15", description="Deposit", credit=950_000, balance=1_300_000, page=2),
            Transaction(date="2026-01-16", description="Deposit", credit=950_000, balance=2_250_000, page=2),
            Transaction(date="2026-01-16", description="Deposit", credit=950_000, balance=3_200_000, page=2),  # planted: dup of prev + structuring
        ],
    )


def main() -> None:
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    s = sample_statement()
    findings = run_pack(BANK_RULE_PACK, s)
    print(f"\nAuditing bank statement: {s.account_holder} — {s.period_start} to {s.period_end}\n")
    print(render_report(findings, currency=s.currency))


if __name__ == "__main__":
    main()
