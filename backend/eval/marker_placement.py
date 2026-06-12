"""W70 F8 — marker-placement metric core (pure logic, no IO; per ADR-0055).

Measures how well a knob-ON `/query` answer carries `[IMG#sha8]` inline image
markers, across the four axes the W70 plan defines (plan §1 驗證先行):

- validity:  marker sha8 corresponds to an image actually attached to the answer
             (prefix of a returned `checksum_sha256`). Invalid markers split into
             `unknown` (no such image anywhere in the KB — hallucinated) and
             `not_returned` (real KB image, but outside the answer's image set —
             exactly what W71's membership validation would strip).
- coverage:  of the cited chunks' OWN markers (from their `chunk_text_marked`),
             the fraction that re-surface as markers in the answer.
- placement: per valid marker, word-level similarity of the answer text before
             the marker vs the source text before the same marker. The
             auto-misplacement flag is RELATIVE — flagged when some OTHER
             marker's source context matches the answer context strictly better
             than the marker's own (robust to paraphrase, catches swaps).
- dup rate:  repeated marker occurrences over total occurrences.

The live driver (`scripts/run_marker_placement.py`) walks the Azure index for
source `chunk_text_marked`, hits the real `/query` endpoint per GT query, and
feeds both here. AC4 gate: micro misplaced-rate ≤ 3% + manual review of the
emitted review table shows no misleading mismatch.
"""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field
from typing import Any

MARKER_RE = re.compile(r"\[IMG#([0-9a-f]{8})\]")
_WORD_RE = re.compile(r"[a-z0-9]+")

# Context windows (chars of marker-stripped text). 240 before ≈ one procedure
# step + its lead-in — enough signal for word-overlap without swallowing the
# whole answer; 120 after is review-table context only (not scored).
_BEFORE_WINDOW = 240
_AFTER_WINDOW = 120


@dataclass(frozen=True, slots=True)
class MarkerOccurrence:
    """One `[IMG#sha8]` occurrence with its marker-stripped context windows."""

    sha8: str
    position: int  # char offset in the marker-stripped text
    context_before: str
    context_after: str


def extract_marker_occurrences(
    text: str,
    window: int = _BEFORE_WINDOW,
    after_window: int = _AFTER_WINDOW,
) -> list[MarkerOccurrence]:
    """All marker occurrences in order, contexts taken from marker-stripped text.

    Stripping first means a run of adjacent markers never pollutes each other's
    context (they share the same stripped-text position instead).
    """
    parts: list[str] = []
    stripped_len = 0
    pending: list[tuple[str, int]] = []
    last = 0
    for m in MARKER_RE.finditer(text):
        seg = text[last : m.start()]
        parts.append(seg)
        stripped_len += len(seg)
        pending.append((m.group(1), stripped_len))
        last = m.end()
    parts.append(text[last:])
    stripped = "".join(parts)
    return [
        MarkerOccurrence(
            sha8=sha8,
            position=pos,
            context_before=stripped[max(0, pos - window) : pos],
            context_after=stripped[pos : pos + after_window],
        )
        for sha8, pos in pending
    ]


def similarity(a: str, b: str) -> float:
    """Word-level SequenceMatcher ratio (case-folded alnum tokens); 0.0 when empty."""
    ta = _WORD_RE.findall(a.lower())
    tb = _WORD_RE.findall(b.lower())
    if not ta or not tb:
        return 0.0
    return difflib.SequenceMatcher(None, ta, tb).ratio()


# sha8 -> [(chunk_id, occurrence-in-source)]
SourceOccurrences = dict[str, list[tuple[str, MarkerOccurrence]]]


def build_source_occurrences(
    marked_by_chunk: dict[str, str],
    window: int = _BEFORE_WINDOW,
) -> SourceOccurrences:
    """Index every source marker occurrence by sha8 across a KB's chunks."""
    out: SourceOccurrences = {}
    for chunk_id, marked in marked_by_chunk.items():
        if not marked:
            continue
        for occ in extract_marker_occurrences(marked, window=window):
            out.setdefault(occ.sha8, []).append((chunk_id, occ))
    return out


def own_markers_by_chunk(marked_by_chunk: dict[str, str]) -> dict[str, set[str]]:
    """chunk_id -> the sha8 set of its own markers (coverage denominator source)."""
    return {
        chunk_id: set(MARKER_RE.findall(marked))
        for chunk_id, marked in marked_by_chunk.items()
        if marked
    }


@dataclass(frozen=True, slots=True)
class MarkerJudgement:
    """One answer-marker occurrence judged for validity + placement."""

    sha8: str
    valid: bool  # sha8 prefixes a returned image checksum
    known_in_kb: bool  # sha8 has a source occurrence somewhere in the KB
    own_score: float  # best sim(answer ctx, source ctx of SAME sha8)
    own_source_chunk: str  # chunk_id of that best own match ("" if none)
    best_other_sha8: str  # strongest competing sha8 in the same answer ("" if none)
    best_other_score: float
    misplaced: bool  # auto flag: competing source context wins strictly
    answer_context_before: str
    answer_context_after: str
    source_context_before: str  # best own match's source context ("" if none)


@dataclass(frozen=True, slots=True)
class QueryPlacementResult:
    query_id: str
    query_text: str
    total_markers: int
    unique_markers: int
    valid_markers: int
    invalid_unknown: int
    invalid_not_returned: int
    validity: float  # valid / total (1.0 when no markers)
    cited_own_count: int
    cited_own_in_answer: int
    coverage: float  # cited own markers re-surfacing in answer (1.0 when none)
    scorable_markers: int  # valid AND known — placement denominator
    misplaced_count: int
    misplaced_rate: float  # misplaced / scorable (0.0 when no scorable)
    dup_rate: float  # (total - unique) / total (0.0 when no markers)
    judgements: list[MarkerJudgement] = field(default_factory=list)
    error: str | None = None


def evaluate_answer(
    query_id: str,
    query_text: str,
    answer: str,
    returned_checksums: set[str],
    cited_chunk_ids: list[str],
    source_occ: SourceOccurrences,
    chunk_own: dict[str, set[str]],
    window: int = _BEFORE_WINDOW,
) -> QueryPlacementResult:
    """Judge one answer's markers against the KB source map + returned image set."""
    returned_sha8 = {c[:8] for c in returned_checksums}
    occurrences = extract_marker_occurrences(answer, window=window)
    unique = {o.sha8 for o in occurrences}

    judgements: list[MarkerJudgement] = []
    for occ in occurrences:
        own_score, own_chunk, own_ctx = 0.0, "", ""
        for chunk_id, src in source_occ.get(occ.sha8, []):
            s = similarity(occ.context_before, src.context_before)
            if s >= own_score:
                own_score, own_chunk, own_ctx = s, chunk_id, src.context_before
        best_other_sha8, best_other_score = "", 0.0
        for other in unique - {occ.sha8}:
            for _, src in source_occ.get(other, []):
                s = similarity(occ.context_before, src.context_before)
                if s > best_other_score:
                    best_other_sha8, best_other_score = other, s
        valid = occ.sha8 in returned_sha8
        known = occ.sha8 in source_occ
        judgements.append(
            MarkerJudgement(
                sha8=occ.sha8,
                valid=valid,
                known_in_kb=known,
                own_score=own_score,
                own_source_chunk=own_chunk,
                best_other_sha8=best_other_sha8,
                best_other_score=best_other_score,
                misplaced=valid and known and best_other_score > own_score,
                answer_context_before=occ.context_before,
                answer_context_after=occ.context_after,
                source_context_before=own_ctx,
            )
        )

    total = len(judgements)
    valid_count = sum(1 for j in judgements if j.valid)
    unknown = sum(1 for j in judgements if not j.known_in_kb)
    not_returned = sum(1 for j in judgements if j.known_in_kb and not j.valid)
    scorable = sum(1 for j in judgements if j.valid and j.known_in_kb)
    misplaced = sum(1 for j in judgements if j.misplaced)

    cited_own: set[str] = set()
    for chunk_id in cited_chunk_ids:
        cited_own |= chunk_own.get(chunk_id, set())
    own_in_answer = len(cited_own & unique)

    return QueryPlacementResult(
        query_id=query_id,
        query_text=query_text,
        total_markers=total,
        unique_markers=len(unique),
        valid_markers=valid_count,
        invalid_unknown=unknown,
        invalid_not_returned=not_returned,
        validity=valid_count / total if total else 1.0,
        cited_own_count=len(cited_own),
        cited_own_in_answer=own_in_answer,
        coverage=own_in_answer / len(cited_own) if cited_own else 1.0,
        scorable_markers=scorable,
        misplaced_count=misplaced,
        misplaced_rate=misplaced / scorable if scorable else 0.0,
        dup_rate=(total - len(unique)) / total if total else 0.0,
        judgements=judgements,
    )


@dataclass(frozen=True, slots=True)
class PlacementReport:
    eval_set: str
    kb_id: str
    total_queries: int
    scored_queries: int
    total_markers: int
    total_valid: int
    total_scorable: int
    total_misplaced: int
    mean_validity: float
    mean_coverage: float
    micro_misplaced_rate: float  # Σ misplaced / Σ scorable — the AC4 statistic
    mean_dup_rate: float
    per_query: list[QueryPlacementResult] = field(default_factory=list)


def aggregate(
    eval_set: str,
    kb_id: str,
    per_query: list[QueryPlacementResult],
) -> PlacementReport:
    """Micro misplaced-rate over all scorable markers; means over scored queries."""
    scored = [r for r in per_query if r.error is None]
    n = len(scored)
    total_scorable = sum(r.scorable_markers for r in scored)
    total_misplaced = sum(r.misplaced_count for r in scored)
    return PlacementReport(
        eval_set=eval_set,
        kb_id=kb_id,
        total_queries=len(per_query),
        scored_queries=n,
        total_markers=sum(r.total_markers for r in scored),
        total_valid=sum(r.valid_markers for r in scored),
        total_scorable=total_scorable,
        total_misplaced=total_misplaced,
        mean_validity=sum(r.validity for r in scored) / n if n else 0.0,
        mean_coverage=sum(r.coverage for r in scored) / n if n else 0.0,
        micro_misplaced_rate=total_misplaced / total_scorable if total_scorable else 0.0,
        mean_dup_rate=sum(r.dup_rate for r in scored) / n if n else 0.0,
        per_query=per_query,
    )


@dataclass(frozen=True, slots=True)
class OrderInversion:
    """One adjacent answer-marker pair that runs against source document order."""

    sha8_earlier: str  # appears first in the answer
    sha8_later: str  # appears second in the answer but earlier in the source
    kind: str  # "artifact" | "cross_chunk" | "local_swap"


@dataclass(frozen=True, slots=True)
class OrderCheck:
    """Answer marker sequence vs source document flow (W70 F8 覆核 signal).

    A genuinely misplaced marker (wrong image for the text) surfaces as an
    ORDER INVERSION — orthogonal to context-similarity scoring, immune to the
    boilerplate-asymmetry false positives that proxy suffers on repetitive
    procedural manuals. Inversion kinds:

    - artifact:    the sha8 occurs at multiple source positions and choosing a
                   different occurrence removes the inversion (a repeated
                   screenshot's later instance was the one being walked).
    - cross_chunk: the pair lives in different chunks — answer-level section
                   re-organisation, locally consistent.
    - local_swap:  same chunk, no alternative occurrence — REAL misplacement.

    Caveat: chunk ids order lexicographically (zero-padded `chunk-NNNN`), which
    matches document flow within one doc; cross-doc pairs land in `cross_chunk`.
    """

    pairs: int
    inversions: list[OrderInversion] = field(default_factory=list)

    @property
    def real_local_swaps(self) -> int:
        return sum(1 for i in self.inversions if i.kind == "local_swap")


def order_consistency(answer: str, source_occ: SourceOccurrences) -> OrderCheck:
    """Count adjacent-pair order inversions of the answer's unique marker sequence."""
    seq: list[str] = []
    for m in MARKER_RE.finditer(answer):
        sha8 = m.group(1)
        if sha8 not in seq and sha8 in source_occ:
            seq.append(sha8)
    keys: dict[str, list[tuple[str, int]]] = {
        sha8: [(chunk_id, occ.position) for chunk_id, occ in source_occ[sha8]] for sha8 in seq
    }
    first = {sha8: min(k) for sha8, k in keys.items()}
    inversions: list[OrderInversion] = []
    for a, b in zip(seq, seq[1:], strict=False):
        if first[b] >= first[a]:
            continue
        fixable = any(ob >= oa for oa in keys[a] for ob in keys[b])
        if fixable:
            kind = "artifact"
        elif first[a][0] != first[b][0]:
            kind = "cross_chunk"
        else:
            kind = "local_swap"
        inversions.append(OrderInversion(sha8_earlier=a, sha8_later=b, kind=kind))
    return OrderCheck(pairs=max(len(seq) - 1, 0), inversions=inversions)


def _trim_tail(s: str, n: int) -> str:
    return s if len(s) <= n else "…" + s[-n:]


def _trim_head(s: str, n: int) -> str:
    return s if len(s) <= n else s[:n] + "…"


def report_to_dict(report: PlacementReport) -> dict[str, Any]:
    """Serialize to a YAML-friendly dict, review table included (人工覆核表)."""
    return {
        "metadata": {
            "eval_set": report.eval_set,
            "kb_id": report.kb_id,
            "total_queries": report.total_queries,
            "scored_queries": report.scored_queries,
            "total_markers": report.total_markers,
            "total_valid": report.total_valid,
            "total_scorable": report.total_scorable,
            "total_misplaced": report.total_misplaced,
            "mean_validity": round(report.mean_validity, 4),
            "mean_coverage": round(report.mean_coverage, 4),
            "micro_misplaced_rate": round(report.micro_misplaced_rate, 4),
            "mean_dup_rate": round(report.mean_dup_rate, 4),
            "ac4_threshold": "micro_misplaced_rate <= 0.03 + manual review clean",
        },
        "per_query": [
            {
                "query_id": r.query_id,
                "query_text": r.query_text,
                "total_markers": r.total_markers,
                "unique_markers": r.unique_markers,
                "valid_markers": r.valid_markers,
                "invalid_unknown": r.invalid_unknown,
                "invalid_not_returned": r.invalid_not_returned,
                "validity": round(r.validity, 4),
                "cited_own_count": r.cited_own_count,
                "cited_own_in_answer": r.cited_own_in_answer,
                "coverage": round(r.coverage, 4),
                "misplaced_count": r.misplaced_count,
                "misplaced_rate": round(r.misplaced_rate, 4),
                "dup_rate": round(r.dup_rate, 4),
                "error": r.error,
            }
            for r in report.per_query
        ],
        "review_table": [
            {
                "query_id": r.query_id,
                "sha8": j.sha8,
                "valid": j.valid,
                "known_in_kb": j.known_in_kb,
                "own_score": round(j.own_score, 3),
                "own_source_chunk": j.own_source_chunk,
                "best_other_sha8": j.best_other_sha8,
                "best_other_score": round(j.best_other_score, 3),
                "misplaced": j.misplaced,
                "answer_before": _trim_tail(j.answer_context_before, 160),
                "answer_after": _trim_head(j.answer_context_after, 100),
                "source_before": _trim_tail(j.source_context_before, 160),
            }
            for r in report.per_query
            for j in r.judgements
        ],
    }
