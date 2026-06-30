"""The benchmark corpus must stay at a perfect score.

This is the regression gate behind the accuracy numbers we quote: if a future
edit makes a pack miss a planted defect (a false negative) or flag a clean
document (a false positive), this test fails. It also guards the hand-built
clean fixtures — they only count as "clean" if every check genuinely passes.
"""
from bench.corpus import CORPUS
from bench.harness import score_case, score_corpus


def test_corpus_is_perfect():
    card = score_corpus()
    o = card.overall
    assert o["fn"] == 0, "a planted defect was missed"
    assert o["fp"] == 0, "a clean document was falsely flagged"
    assert o["precision"] == 1.0 and o["recall"] == 1.0


def test_every_case_is_exact():
    # Each case individually flags exactly its labeled set.
    for case in CORPUS:
        result = score_case(case)
        assert result.exact, (
            f"{case.name}: missed={sorted(result.false_negatives)} "
            f"false_alarm={sorted(result.false_positives)}"
        )


def test_clean_documents_flag_nothing():
    for case in CORPUS:
        if case.name.endswith("/clean"):
            assert score_case(case).flagged == set(), f"{case.name} should be clean"


def test_expected_flags_are_real_rules():
    # A label can only reference a rule the pack actually emits — catches typos
    # in the corpus that would otherwise silently never match.
    for case in CORPUS:
        result = score_case(case)
        unknown = result.expected - result.universe
        assert not unknown, f"{case.name} labels unknown rule(s): {sorted(unknown)}"
