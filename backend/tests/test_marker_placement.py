"""W70 F8 — marker-placement metric unit tests (per CLAUDE.md §5.6 H6 — eval critical).

Tests the pure metric core (`backend/eval/marker_placement.py`):
- marker occurrence extraction (order, stripped contexts, adjacent markers)
- word-level similarity boundaries
- evaluate_answer: validity split (unknown vs not-returned), coverage, dup rate,
  relative misplacement flag (constructed swap case)
- aggregate micro misplaced-rate + report serialization shape
"""

from __future__ import annotations

from eval.marker_placement import (
    aggregate,
    build_source_occurrences,
    evaluate_answer,
    extract_marker_occurrences,
    order_consistency,
    own_markers_by_chunk,
    report_to_dict,
    similarity,
)

_SHA_A = "aaaaaaaa"
_SHA_B = "bbbbbbbb"
_SHA_C = "cccccccc"
_FULL_A = _SHA_A + "0" * 56
_FULL_B = _SHA_B + "1" * 56


def test_extract_occurrences_order_and_context() -> None:
    text = f"Open the payment journal. [IMG#{_SHA_A}] Then post it. [IMG#{_SHA_B}] Done."
    occ = extract_marker_occurrences(text)
    assert [o.sha8 for o in occ] == [_SHA_A, _SHA_B]
    assert occ[0].context_before.endswith("Open the payment journal. ")
    # contexts come from marker-STRIPPED text — no marker leaks into a window
    assert "[IMG#" not in occ[1].context_before
    assert occ[1].context_before.endswith("Then post it. ")
    assert occ[0].context_after.startswith(" Then post it.")


def test_extract_adjacent_markers_share_position() -> None:
    occ = extract_marker_occurrences(f"Step one. [IMG#{_SHA_A}][IMG#{_SHA_B}] next")
    assert len(occ) == 2
    assert occ[0].position == occ[1].position
    assert occ[1].context_before.endswith("Step one. ")


def test_similarity_boundaries() -> None:
    assert similarity("post the payment journal", "post the payment journal") == 1.0
    assert similarity("alpha beta", "gamma delta") == 0.0
    assert similarity("", "anything") == 0.0
    # case / punctuation folded away
    assert similarity("Post, the JOURNAL!", "post the journal") == 1.0


def test_source_maps() -> None:
    marked = {
        "c1": f"Open journal [IMG#{_SHA_A}] post it [IMG#{_SHA_B}]",
        "c2": "",  # imageless chunk — skipped
        "c3": f"Review screen [IMG#{_SHA_A}]",
    }
    occ = build_source_occurrences(marked)
    assert {k: len(v) for k, v in occ.items()} == {_SHA_A: 2, _SHA_B: 1}
    assert own_markers_by_chunk(marked) == {
        "c1": {_SHA_A, _SHA_B},
        "c3": {_SHA_A},
    }


def _source_fixture() -> tuple[dict[str, list], dict[str, set[str]]]:
    marked = {
        "c1": (
            f"Navigate to AR and open the customer payment journal screen [IMG#{_SHA_A}] "
            f"Fill the posting date and amount then click post to settle [IMG#{_SHA_B}]"
        ),
    }
    return build_source_occurrences(marked), own_markers_by_chunk(marked)


def test_evaluate_clean_answer() -> None:
    source_occ, chunk_own = _source_fixture()
    answer = (
        f"1. Navigate to AR and open the customer payment journal screen. [IMG#{_SHA_A}]\n"
        f"2. Fill the posting date and amount then click post to settle. [IMG#{_SHA_B}]"
    )
    r = evaluate_answer("Q1", "q", answer, {_FULL_A, _FULL_B}, ["c1"], source_occ, chunk_own)
    assert r.total_markers == 2
    assert r.validity == 1.0
    assert r.coverage == 1.0  # both of c1's own markers re-surface
    assert r.misplaced_count == 0
    assert r.dup_rate == 0.0
    assert all(j.own_score > j.best_other_score for j in r.judgements)


def test_evaluate_swapped_markers_flagged() -> None:
    # the answer text for step 1 carries step 2's marker and vice versa —
    # the RELATIVE test must flag both occurrences
    source_occ, chunk_own = _source_fixture()
    answer = (
        f"1. Navigate to AR and open the customer payment journal screen. [IMG#{_SHA_B}]\n"
        f"2. Fill the posting date and amount then click post to settle. [IMG#{_SHA_A}]"
    )
    r = evaluate_answer("Q1", "q", answer, {_FULL_A, _FULL_B}, ["c1"], source_occ, chunk_own)
    assert r.misplaced_count == 2
    assert r.misplaced_rate == 1.0


def test_evaluate_validity_split_and_dup() -> None:
    source_occ, chunk_own = _source_fixture()
    answer = (
        f"Step text. [IMG#{_SHA_A}] again [IMG#{_SHA_A}] "
        f"ghost [IMG#{_SHA_C}] real-but-unattached [IMG#{_SHA_B}]"
    )
    # only A's image is attached to the answer; B exists in the KB but not returned;
    # C exists nowhere (hallucinated)
    r = evaluate_answer("Q1", "q", answer, {_FULL_A}, ["c1"], source_occ, chunk_own)
    assert r.total_markers == 4
    assert r.unique_markers == 3
    assert r.valid_markers == 2
    assert r.invalid_unknown == 1
    assert r.invalid_not_returned == 1
    assert r.validity == 0.5
    assert r.dup_rate == 0.25
    # coverage: c1 owns {A, B}; answer surfaces both → 1.0 (validity is the
    # axis that penalises B's non-attachment, not coverage)
    assert r.coverage == 1.0


def test_evaluate_no_markers_vacuous() -> None:
    source_occ, chunk_own = _source_fixture()
    r = evaluate_answer("Q1", "q", "plain answer", set(), [], source_occ, chunk_own)
    assert r.total_markers == 0
    assert r.validity == 1.0
    assert r.coverage == 1.0  # no cited chunks → vacuous
    assert r.misplaced_rate == 0.0
    assert r.dup_rate == 0.0


def test_evaluate_uncited_chunk_coverage_denominator() -> None:
    source_occ, chunk_own = _source_fixture()
    # c1 cited but the answer surfaces only one of its two own markers
    answer = f"Navigate to AR and open the journal. [IMG#{_SHA_A}]"
    r = evaluate_answer("Q1", "q", answer, {_FULL_A}, ["c1"], source_occ, chunk_own)
    assert r.cited_own_count == 2
    assert r.cited_own_in_answer == 1
    assert r.coverage == 0.5


def test_order_consistency_in_order_and_swap() -> None:
    source_occ = build_source_occurrences({"chunk-0001": f"one [IMG#{_SHA_A}] two [IMG#{_SHA_B}]"})
    in_order = order_consistency(f"x [IMG#{_SHA_A}] y [IMG#{_SHA_B}]", source_occ)
    assert in_order.pairs == 1
    assert in_order.inversions == []
    swapped = order_consistency(f"x [IMG#{_SHA_B}] y [IMG#{_SHA_A}]", source_occ)
    assert swapped.real_local_swaps == 1
    assert swapped.inversions[0].kind == "local_swap"


def test_order_consistency_artifact_and_cross_chunk() -> None:
    # A occurs twice (chunk-0001 AND chunk-0009) — answering with the later
    # instance after B is order-consistent → artifact, not a swap
    source_occ = build_source_occurrences(
        {
            "chunk-0001": f"one [IMG#{_SHA_A}]",
            "chunk-0005": f"five [IMG#{_SHA_B}]",
            "chunk-0009": f"nine [IMG#{_SHA_A}] ten [IMG#{_SHA_C}]",
        }
    )
    artifact = order_consistency(f"[IMG#{_SHA_B}] [IMG#{_SHA_A}]", source_occ)
    assert artifact.real_local_swaps == 0
    assert artifact.inversions[0].kind == "artifact"
    # C (chunk-0009) before B (chunk-0005): different chunks, no alternative
    # occurrence → answer-level reorganisation, not a local swap
    cross = order_consistency(f"[IMG#{_SHA_C}] [IMG#{_SHA_B}]", source_occ)
    assert cross.real_local_swaps == 0
    assert cross.inversions[0].kind == "cross_chunk"


def test_order_consistency_ignores_unknown_and_dups() -> None:
    source_occ = build_source_occurrences({"chunk-0001": f"one [IMG#{_SHA_A}] two [IMG#{_SHA_B}]"})
    # unknown sha8 dropped; dup occurrences collapse to first — no phantom pairs
    check = order_consistency(
        f"[IMG#{_SHA_A}] [IMG#{'f' * 8}] [IMG#{_SHA_A}] [IMG#{_SHA_B}]", source_occ
    )
    assert check.pairs == 1
    assert check.inversions == []


def test_aggregate_micro_rate_and_report_shape() -> None:
    source_occ, chunk_own = _source_fixture()
    clean = evaluate_answer(
        "Q1",
        "q1",
        f"Navigate to AR and open the customer payment journal screen. [IMG#{_SHA_A}]",
        {_FULL_A},
        ["c1"],
        source_occ,
        chunk_own,
    )
    swapped = evaluate_answer(
        "Q2",
        "q2",
        (
            f"1. Navigate to AR and open the customer payment journal screen. [IMG#{_SHA_B}]\n"
            f"2. Fill the posting date and amount then click post to settle. [IMG#{_SHA_A}]"
        ),
        {_FULL_A, _FULL_B},
        ["c1"],
        source_occ,
        chunk_own,
    )
    report = aggregate("set.yaml", "kb", [clean, swapped])
    assert report.total_scorable == 3
    assert report.total_misplaced == 2
    assert round(report.micro_misplaced_rate, 4) == round(2 / 3, 4)

    d = report_to_dict(report)
    assert d["metadata"]["micro_misplaced_rate"] == round(2 / 3, 4)
    assert len(d["per_query"]) == 2
    # review table: one row per marker occurrence across all queries
    assert len(d["review_table"]) == 3
    row = d["review_table"][0]
    assert {"query_id", "sha8", "valid", "own_score", "misplaced", "answer_before"} <= set(row)
