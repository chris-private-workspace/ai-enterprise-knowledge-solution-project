"""Contextual Retrieval — section-context injection helper (per ADR-0045 / CH-008).

A chunk's retrieval representation (rerank document at query-time, embedding
input at ingest-time) is prefixed with its `section_path` hierarchy so the
reranker + embedding model can tell *which* chapter/procedure the chunk belongs
to. DRIVE manuals reuse a generic section leaf ("System Instruction for each
step") across GL02/GL03/GL05, so a reranker fed only `chunk_text` confuses
chapters (BUG-034 問題1 root cause; 74-chunk A/B experiment 2026-06-07 PASS).

The **stored** `chunk_text` field is NOT touched — citation render, `/chunks`
listing, and image ordering all keep the original text. Only the embedded
vector (ingest) and the rerank document (query) bake in the section context,
both via this single helper for consistency.

Format (validated by the experiment):
    "<section_path joined with ' > '>\n<chunk_text>"

Fallback: empty / whitespace-only `section_path` → return `chunk_text`
unchanged → bit-identical to pre-CH-008 behaviour (zero regression for legacy
chunks that have no section hierarchy).
"""

from __future__ import annotations

from collections.abc import Sequence

_SECTION_JOIN = " > "


def build_contextual_document(
    section_path: Sequence[str] | None,
    chunk_text: str,
) -> str:
    """Prefix `chunk_text` with its section hierarchy for retrieval.

    Args:
        section_path: ordered section hierarchy (root → leaf). May be None or
            contain empty/whitespace entries (defensive — index field is a
            Collection(Edm.String) that legacy chunks may leave empty).
        chunk_text: the original chunk body (stored verbatim elsewhere).

    Returns:
        ``"<path joined by ' > '>\\n<chunk_text>"`` when a non-empty path
        exists, else `chunk_text` unchanged (fallback).
    """
    parts = [p.strip() for p in (section_path or []) if p and p.strip()]
    if not parts:
        return chunk_text
    return _SECTION_JOIN.join(parts) + "\n" + chunk_text
