"""Synthetic-QA recall harness unit tests (W52 — per CLAUDE.md §5.6 H6, eval critical).

Covers:
- generate_qa: deterministic seeded sampling + per-chunk question generation
- generate_qa: empty-text skip + None-degrade (judge error) drop
- to_eval_set_payload: EvalRunner-compatible STRICT-mode entry shape
- run_synthetic_recall: full round-trip — enumerate → generate → EvalRunner recall
  (proves the zero-new-recall-math reuse: synthetic entries flow through strict mode)
- make_qa_generator: graceful None when no Azure OpenAI judge credential
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
import yaml

from eval.synthetic_qa import (
    SyntheticQAPair,
    generate_qa,
    make_qa_generator,
    run_synthetic_recall,
    to_eval_set_payload,
)
from retrieval.retrieval_engine import RetrievalResult, RetrievedChunk


def _hit(chunk_id: str, chunk_text: str = "...", score: float = 0.9) -> RetrievedChunk:
    return RetrievedChunk(score=score, fields={"chunk_id": chunk_id, "chunk_text": chunk_text})


def _retrieval_result(hits: list[RetrievedChunk]) -> RetrievalResult:
    return RetrievalResult(
        chunks=hits,
        embed_latency_ms=10,
        search_latency_ms=20,
        rerank_latency_ms=0,
        total_latency_ms=30,
        reranked=False,
    )


async def _gen_echo(chunk_text: str) -> str | None:
    """Stub generator: maps chunk_text → a deterministic question."""
    return f"question about {chunk_text}"


@pytest.mark.asyncio
async def test_generate_qa_deterministic_seeded_sample() -> None:
    """Same seed → same sampled chunk set (sorted by chunk_id) + count == sample_size."""
    chunks = [
        {"chunk_id": f"c{i}", "chunk_text": f"text {i}", "section_path": [f"S{i}"]}
        for i in range(1, 6)
    ]
    pairs_a = await generate_qa(chunks, _gen_echo, sample_size=3, seed=0)
    pairs_b = await generate_qa(chunks, _gen_echo, sample_size=3, seed=0)

    assert len(pairs_a) == 3
    ids_a = [p.source_chunk_id for p in pairs_a]
    assert ids_a == sorted(ids_a)  # stable sort by chunk_id
    assert ids_a == [p.source_chunk_id for p in pairs_b]  # deterministic
    # source fields propagate
    first = pairs_a[0]
    assert first.question == f"question about text {first.source_chunk_id[1:]}"
    assert first.source_section_path == [f"S{first.source_chunk_id[1:]}"]


@pytest.mark.asyncio
async def test_generate_qa_skips_empty_text_and_drops_none() -> None:
    """Empty-text chunks excluded before sampling; None from generate_fn → dropped."""
    chunks = [
        {"chunk_id": "c1", "chunk_text": "t1", "section_path": ["A"]},
        {"chunk_id": "c2", "chunk_text": "   ", "section_path": ["B"]},  # empty → skipped
        {"chunk_id": "c3", "chunk_text": "t3", "section_path": ["C"]},
    ]

    async def _gen(text: str) -> str | None:
        return None if text == "t3" else f"q::{text}"  # c3 degrades to None

    pairs = await generate_qa(chunks, _gen, sample_size=10, seed=0)
    assert [p.source_chunk_id for p in pairs] == ["c1"]
    assert pairs[0].question == "q::t1"


def test_to_eval_set_payload_strict_mode_shape() -> None:
    pairs = [
        SyntheticQAPair(
            question="Qa?", source_chunk_id="c1", source_section_path=["A"], source_chunk_text="t1"
        ),
        SyntheticQAPair(
            question="Qb?",
            source_chunk_id="c2",
            source_section_path=["B", "b"],
            source_chunk_text="t2",
        ),
    ]
    payload = to_eval_set_payload(pairs, kb_id="kb-x", seed=7)

    assert payload["metadata"]["version"] == "synthetic-W52-kb-x-seed7"
    assert payload["metadata"]["kind"] == "synthetic_qa_recall"
    q0 = payload["queries"][0]
    assert q0["query_id"] == "SQ001"
    assert q0["query_text"] == "Qa?"
    assert q0["kb_id"] == "kb-x"
    assert q0["query_phrasing_source"] == "synthetic_llm_W52"
    # STRICT-mode ground truth: source chunk = acceptable, validated, not OOS
    assert q0["ground_truth"]["acceptable_chunk_ids"] == ["c1"]
    assert q0["ground_truth"]["expected_refusal"] is False
    assert q0["annotation"]["validated"] is True
    assert payload["queries"][1]["query_id"] == "SQ002"


@pytest.mark.asyncio
async def test_run_synthetic_recall_round_trip(tmp_path: Path) -> None:
    """End-to-end: enumerate chunks → generate QA → EvalRunner strict recall.

    3 synthetic queries; retrieval hits the source chunk for 2 of them → aggregate
    self-supervised Recall@5 = 2/3. Proves synthetic entries flow through EvalRunner
    strict mode (zero new recall math)."""
    engine = MagicMock()
    engine.list_documents = AsyncMock(return_value=[{"doc_id": "doc-A"}])
    engine.list_chunks = AsyncMock(
        return_value=[
            {"chunk_id": "c1", "section_path": ["A"]},
            {"chunk_id": "c2", "section_path": ["B"]},
            {"chunk_id": "c3", "section_path": ["C"]},
        ]
    )
    engine.fetch_by_chunk_ids = AsyncMock(
        return_value={
            "c1": {"chunk_text": "alpha one"},
            "c2": {"chunk_text": "beta two"},
            "c3": {"chunk_text": "gamma three"},
        }
    )

    async def _retrieve(query: str, **kwargs: object) -> RetrievalResult:
        # questions are "question about <text>"; hit source chunk for c1 + c2, miss c3
        if "three" in query:
            return _retrieval_result([_hit("cX")])  # miss
        if "one" in query:
            return _retrieval_result([_hit("c1")])
        if "two" in query:
            return _retrieval_result([_hit("c2")])
        return _retrieval_result([])

    engine.retrieve = AsyncMock(side_effect=_retrieve)

    out = tmp_path / "syn-eval-set.yaml"
    report = await run_synthetic_recall(
        engine,
        "kb-x",
        generate_fn=_gen_echo,
        output_path=out,
        sample_size=10,
        seed=0,
        top_k=5,
    )

    assert report.queries_evaluated == 3
    assert report.aggregate_recall_at_5 == pytest.approx(2 / 3, rel=1e-3)
    assert all(r.mode == "strict" for r in report.per_query)
    # synthetic eval-set artifact written + parseable
    assert out.exists()
    parsed = yaml.safe_load(out.read_text(encoding="utf-8"))
    assert parsed["metadata"]["kind"] == "synthetic_qa_recall"
    assert len(parsed["queries"]) == 3


def test_make_qa_generator_none_without_credential() -> None:
    settings = MagicMock()
    settings.azure_openai_api_key = ""
    assert make_qa_generator(settings) is None
