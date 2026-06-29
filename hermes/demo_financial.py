"""Runnable demo of the Financial Audit pack.

Builds a sample statement that a perfect OCR pass would have produced, but with
three planted problems (the kind a human auditor hunts for by hand), then runs
the deterministic rule pack and prints the exception report.

    python -m hermes.demo_financial
"""
from __future__ import annotations

from .core import render_report, run_pack
from .financial import (
    BalanceSheet,
    Figure,
    FinancialStatement,
    IncomeStatement,
    LineItem,
    FINANCIAL_RULE_PACK,
)


def sample_statement() -> FinancialStatement:
    return FinancialStatement(
        entity="Acme Trading Ltd",
        period="FY2025",
        currency="₦",
        income_statement=IncomeStatement(
            revenue=Figure(label="Revenue", value=10_000_000, page=11),
            cogs=Figure(label="COGS", value=6_000_000, page=11),
            gross_profit=Figure(label="Gross profit", value=4_000_000, page=11),  # correct: 10M-6M
            opex=[
                LineItem(label="Salaries", amount=1_200_000, page=12),
                LineItem(label="Rent", amount=600_000, page=12),
                LineItem(label="Marketing", amount=300_000, page=12),
                LineItem(label="Rent", amount=600_000, page=12),  # PLANTED: duplicate entry
            ],
            # PLANTED: gross profit − Σ opex = 1,300,000, but stated as 1,500,000
            operating_income=Figure(label="Operating income", value=1_500_000, page=12,
                                    bbox=[120, 340, 410, 372]),
            interest=Figure(label="Interest", value=100_000, page=12),
            tax=Figure(label="Tax", value=300_000, page=12),
            net_income=Figure(label="Net income", value=1_100_000, page=12),  # ties to stated OI
        ),
        balance_sheet=BalanceSheet(
            assets=[
                LineItem(label="Cash", amount=8_000_000, page=28),  # PLANTED: ≠ bank statement
                LineItem(label="Receivables", amount=2_000_000, page=28),
                LineItem(label="Equipment", amount=5_000_000, page=28),
            ],
            total_assets=Figure(label="Total assets", value=15_000_000, page=28),  # correct crossfoot
            liabilities=[
                LineItem(label="Payables", amount=1_800_000, page=29),
                LineItem(label="Loan", amount=4_000_000, page=29),
            ],
            total_liabilities=Figure(label="Total liabilities", value=5_800_000, page=29),
            equity=[
                LineItem(label="Share capital", amount=5_000_000, page=29),
                LineItem(label="Retained earnings", amount=2_000_000, page=29),
            ],
            total_equity=Figure(label="Total equity", value=7_000_000, page=29),
            # identity: assets 15,000,000 ≠ liabilities+equity 12,800,000 → books don't balance
        ),
        # cross-document: the uploaded bank statement closes at 6,300,000, not 8,000,000
        bank_closing_balance=Figure(label="Bank closing balance", value=6_300_000, page=40,
                                    bbox=[88, 512, 300, 540]),
    )


def main() -> None:
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # so the ₦ symbol prints on any console
    except Exception:
        pass
    statement = sample_statement()
    findings = run_pack(FINANCIAL_RULE_PACK, statement)
    print(f"\nAuditing: {statement.entity} — {statement.period}\n")
    print(render_report(findings, currency=statement.currency))


if __name__ == "__main__":
    main()
