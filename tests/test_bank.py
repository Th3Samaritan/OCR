from hermes.bank import BANK_RULE_PACK, BankStatement, Transaction
from hermes.core import run_pack
from hermes.demo_bank import sample_statement


def _flagged(findings):
    return {f.rule for f in findings if not f.passed}


def test_planted_sample_flags_expected():
    flagged = _flagged(run_pack(BANK_RULE_PACK, sample_statement()))
    assert {
        "running_balance_continuity",
        "opening_closing_reconciliation",
        "duplicate_transaction",
        "structuring_aml",
    } <= flagged


def clean_statement() -> BankStatement:
    return BankStatement(
        account_holder="Clean Co", bank="First Bank",
        period_start="2026-01-01", period_end="2026-01-31", currency="₦",
        opening_balance=100_000, closing_balance=340_000,
        stated_total_credits=500_000, stated_total_debits=260_000,
        transactions=[
            Transaction(date="2026-01-03", description="Salary", credit=500_000, balance=600_000),
            Transaction(date="2026-01-05", description="Rent", debit=200_000, balance=400_000),
            Transaction(date="2026-01-09", description="Transfer", debit=50_000, balance=350_000),
            Transaction(date="2026-01-10", description="POS", debit=10_000, balance=340_000),
        ],
    )


def test_clean_statement_has_zero_false_positives():
    assert _flagged(run_pack(BANK_RULE_PACK, clean_statement())) == set()


def test_balance_tamper_caught_without_breaking_totals():
    s = clean_statement()
    s.transactions[2].balance += 10_000  # tamper one printed balance only
    flagged = _flagged(run_pack(BANK_RULE_PACK, s))
    # continuity catches it; amounts are untouched so the closing total still reconciles
    assert "running_balance_continuity" in flagged
    assert "opening_closing_reconciliation" not in flagged


def test_out_of_order_date_flagged():
    s = clean_statement()
    s.transactions[3].date = "2026-01-01"  # earlier than the row before it
    assert "date_sequence" in _flagged(run_pack(BANK_RULE_PACK, s))
