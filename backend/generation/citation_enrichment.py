"""Citation enrichment per architecture.md §4.5 + §3.5 (W3 D2 F3).

Maps Synthesizer-emitted chunk_ids to full Citation records sourced from the
retrieved chunks. Pulls embedded_images list (parsed from the index field
`embedded_images_json`, an architecture.md §3.6 Edm.String JSON-encoded array).

W2 D3 R12 deferral note:
- F3 Blob upload is deferred to W7+ cloud Azure Blob, so embedded_images_json
  is currently `[]` for every populated chunk. parse_embedded_images() handles
  empty list gracefully — Citation.embedded_images = [].
- When real Blob URLs land post W7+, no F3 changes needed (already shape-correct).
"""

from __future__ import annotations

import json

import structlog

from api.schemas.query import Citation, ImageRef
from retrieval.retrieval_engine import RetrievedChunk

logger = structlog.get_logger(__name__)


def parse_embedded_images(json_str: str) -> list[ImageRef]:
    """Parse the index field `embedded_images_json` into ImageRef list.

    Returns [] for empty / null / malformed JSON (logged at warning level).
    """
    if not json_str:
        return []
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError:
        logger.warning("embedded_images_json_decode_failed", value=json_str[:120])
        return []
    if not isinstance(data, list):
        return []
    images: list[ImageRef] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        # BUG-026 C-ii — image's own section (list[str]); defensive coerce.
        section_raw = item.get("source_section")
        source_section = [str(s) for s in section_raw] if isinstance(section_raw, list) else []
        try:
            images.append(
                ImageRef(
                    blob_url=str(item.get("blob_url", "")),
                    alt_text=str(item.get("alt_text", "") or ""),
                    checksum_sha256=str(item.get("checksum_sha256", "") or ""),
                    width=int(item.get("width", 0) or 0),
                    height=int(item.get("height", 0) or 0),
                    source_section=source_section,
                    # CH-011 / ADR-0048 — true document position (0 when absent:
                    # pre-CH-011 chunks not yet re-indexed → legacy section ordering).
                    doc_order=int(item.get("doc_order", 0) or 0),
                )
            )
        except (TypeError, ValueError):
            continue
    return images


def build_citations(
    citation_ids: list[str],
    retrieved_chunks: list[RetrievedChunk],
) -> list[Citation]:
    """Translate ordered citation_ids → Citation list using retrieved chunks.

    Citation order matches `citation_ids` (Synthesizer emit order = appearance
    in answer). chunk_ids cited but not in retrieved set are skipped — that
    indicates a hallucinated citation, logged for observability.
    """
    chunks_by_id: dict[str, RetrievedChunk] = {
        str(c.fields.get("chunk_id", "")): c for c in retrieved_chunks
    }
    citations: list[Citation] = []
    hallucinated_ids: list[str] = []
    for cid in citation_ids:
        chunk = chunks_by_id.get(cid)
        if chunk is None:
            hallucinated_ids.append(cid)
            continue
        f = chunk.fields
        # BUG-021 — doc_format propagated from index schema field (Literal docx/pdf/pptx).
        # Fallback to "docx" when field absent (legacy chunks pre-W25); guards against
        # Pydantic validation reject — doc_format field is required in Citation per
        # ADR-0036 chat surface needs.
        raw_fmt = str(f.get("doc_format", "") or "").lower()
        doc_format = raw_fmt if raw_fmt in ("docx", "pdf", "pptx") else "docx"
        citations.append(
            Citation(
                chunk_id=cid,
                doc_id=str(f.get("doc_id", "")),
                doc_title=str(f.get("doc_title", "")),
                doc_format=doc_format,
                chunk_title=str(f.get("chunk_title", "")),
                chunk_index=int(f.get("chunk_index", 0) or 0),
                section_path=list(f.get("section_path") or []),
                relevance_score=float(chunk.score),
                embedded_images=parse_embedded_images(str(f.get("embedded_images_json", "") or "")),
            )
        )
    if hallucinated_ids:
        logger.warning("citation_hallucinated_ids", ids=hallucinated_ids)
    return citations


def cap_images_per_answer(
    citations: list[Citation],
    max_images: int | None,
) -> list[Citation]:
    """W43 F1.6 (ADR-0040 + BUG-031) → W68 (ADR-0054) — per-answer UNIQUE-image ceiling.

    The BACKEND per-KB counterpart of the BUG-031 frontend `INLINE_IMAGE_CAP=8`.
    `max_images=None` (default for KBs with no explicit per-KB config) → return
    citations unchanged — no cap AND no dedup (production-preserve, bit-identical
    to the pre-W68 behaviour for capless KBs).

    When set, walk citations in order with a budget of `max_images` UNIQUE images
    (ADR-0054 dedup-before-cap, superseding ADR-0040's blunt ref-counting walk):
    a duplicate ref — an image whose `checksum_sha256` (fallback `blob_url`) was
    already kept under an earlier citation — is dropped WITHOUT consuming budget,
    even while budget remains (payload hygiene; the frontend dedups for display
    anyway, so a dup ref never rendered twice). A fresh image consumes 1 budget;
    once the budget is spent, fresh images are trimmed too. Citations themselves
    are never dropped — only their image lists.

    Why ADR-0054: under the W64 neighbour-aux-heavy preset the first 3-4 citations
    each carry ~40 highly-overlapping aux refs (W67 measured 150 refs = 48 unique,
    68% dups) and exhausted ANY reasonable ref-counted cap, zeroing the OWN images
    of the 22 later cited chunks — capping mega-query image recall at 0.74 with
    every missing ground-truth image provably in reach.
    """
    if max_images is None or max_images < 0:
        return citations  # None = no backend cap (production-preserve)

    budget = max_images
    seen: set[str] = set()
    capped: list[Citation] = []
    for citation in citations:
        kept: list = []
        for img in citation.embedded_images:
            key = img.checksum_sha256 or img.blob_url
            if key in seen:
                continue  # duplicate ref — dropped, consumes no budget (ADR-0054)
            if budget <= 0:
                continue
            seen.add(key)
            kept.append(img)
            budget -= 1
        if len(kept) == len(citation.embedded_images):
            capped.append(citation)  # untrimmed — preserve the original object
        else:
            capped.append(citation.model_copy(update={"embedded_images": kept}))
    return capped
