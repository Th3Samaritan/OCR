from hermes.core import run_pack
from hermes.demo_financial import sample_statement
from hermes.financial import (
    FINANCIAL_RULE_PACK,
    BalanceSheet,
    Figure,
    FinancialStatement,
    IncomeStatement,
    LineItem,
)


def _flagged(findings):
    return {f.rule for f in findings if not f.passed}


def test_planted_sample_flags_the_four_issues():
    findings = run_pack(FINANCIAL_RULE_PACK, sample_statement())
    assert _flagged(findings) == {
        "operating_income",
        "balance_sheet_identity",
        "bank_reconciliation",
        "duplicate_line_item",
    }


def clean_statement() -> FinancialStatement:
    return FinancialStatement(
        entity="Clean Co", period="FY2025", currency="₦",
        income_statement=IncomeStatement(
            revenue=Figure(label="Revenue", value=10_000_000),
            cogs=Figure(label="COGS", value=6_000_000),
            gross_profit=Figure(label="Gross profit", value=4_000_000),
            opex=[
                LineItem(label="Salaries", amount=1_200_000),
                LineItem(label="Rent", amount=600_000),
                LineItem(label="Marketing", amount=300_000),
            ],
            operating_income=Figure(label="Operating income", value=1_900_000),
            interest=Figure(label="Interest", value=100_000),
            tax=Figure(label="Tax", value=300_000),
            net_income=Figure(label="Net income", value=1_500_000),
        ),
        balance_sheet=BalanceSheet(
            assets=[
                LineItem(label="Cash", amount=6_300_000),
                LineItem(label="Receivables", amount=2_000_000),
                LineItem(label="Equipment", amount=5_000_000),
            ],
            total_assets=Figure(label="Total assets", value=13_300_000),
            liabilities=[
                LineItem(label="Payables", amount=1_800_000),
                LineItem(label="Loan", amount=4_000_000),
            ],
            total_liabilities=Figure(label="Total liabilities", value=5_800_000),
            equity=[
                LineItem(label="Share capital", amount=5_000_000),
                LineItem(label="Retained earnings", amount=2_500_000),
            ],
            total_equity=Figure(label="Total equity", value=7_500_000),
        ),
        bank_closing_balance=Figure(label="Bank closing balance", value=6_300_000),
    )


def test_clean_statement_has_zero_false_positives():
    findings = run_pack(FINANCIAL_RULE_PACK, clean_statement())
    assert _flagged(findings) == set()


def test_single_error_is_isolated():
    s = clean_statement()
    # Add an equity line and bump the total equally → cross-foot still holds,
    # but assets no longer equal liabilities + equity. Only the identity should flag.
    s.balance_sheet.equity.append(LineItem(label="Reserve", amount=1_000_000))
    s.balance_sheet.total_equity.value += 1_000_000
    flagged = _flagged(run_pack(FINANCIAL_RULE_PACK, s))
    assert flagged == {"balance_sheet_identity"}
