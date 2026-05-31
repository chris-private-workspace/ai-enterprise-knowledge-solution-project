"""Compose retrieval result + Synthesizer stream into final SSE event sequence (W3 D3 F4).

Pure-data composer (no I/O) so unit tests don't need TestClient. The
`/query/stream` route just iterates events and serializes via
`data: {json}\\n\\n` Vercel AI SDK SSE format.

Event sequence to client:
    text-delta  ← passthrough from Synthesizer
    text-delta
    ...
    citation    ← one per cited chunk after stream complete
    citation
    ...
    done        ← final frame (model / cost / total_latency_ms / refused / reranker_used)
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable

from api.schemas.query import Citation
from generation.citation_enrichment import build_citations
from observability.realtime_cost import estimate_query_cost
from retrieval.retrieval_engine import RetrievalResult


async def compose_query_stream(
    retrieval_result: RetrievalResult,
    synth_stream: AsyncIterator[dict],
    citation_post_process: Callable[[list[Citation]], Awaitable[list[Citation]]] | None = None,
) -> AsyncIterator[dict]:
    """Yield ordered SSE events:text-delta* citation* done.

    `synth_stream` is `Synthesizer.synthesize_stream(query, chunks)` directly.

    W25 F5 D1 — optional `citation_post_process` runs on the batch of
    citations once the synthesizer's `result` event delivers them, before
    they emit. Used by `/query/stream` to attach neighbour-chunk images
    via `attach_neighbour_images`. Pure-data semantics preserved when
    callback omitted (default None = original behaviour bit-identical).
    """
    async for event in synth_stream:
        if event.get("type") == "text-delta":
            yield event
            continue

        if event.get("type") == "result":
            # BUG-028 ① — include the W32 engine-fetched expanded neighbour chunks
            # in the build_citations pool (parallel to /query's W32 F1.8 fix at
            # query.py:`final_chunks + expanded_neighbor_chunks`). Without them the
            # post-hoc citation_expansion ids beyond the top-K reranked set are
            # dropped by build_citations' Rule 5「hallucinated」filter, so the
            # stream surfaced only the top-K-resident citation (e.g. 1 §8 intro)
            # while non-stream /query returned the full §8.1-§8.6 set.
            expanded_neighbours = event.get("expanded_neighbor_chunks") or []
            citations = build_citations(
                event.get("citation_ids") or [],
                list(retrieval_result.chunks) + list(expanded_neighbours),
            )
            if citation_post_process is not None:
                citations = await citation_post_process(citations)
            for cit in citations:
                yield {"type": "citation", "citation": cit.model_dump()}

            deployment = event.get("deployment", "")
            input_tokens = int(event.get("input_tokens", 0) or 0)
            output_tokens = int(event.get("output_tokens", 0) or 0)
            yield {
                "type": "done",
                "model": deployment,
                # BUG-028 ② — carry the post-hoc-expanded answer. The text-delta
                # frames already streamed the raw LLM answer (whose [chunk-N]
                # markers stop at the model's original cites); this is the
                # canonical final text with citation_expansion's added markers, so
                # the client can replace the streamed content to match non-stream
                # /query (answer markers ↔ Sources-panel parity).
                "answer": event.get("answer", ""),
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost": estimate_query_cost(deployment, input_tokens, output_tokens),
                "latency_ms": int(retrieval_result.total_latency_ms)
                + int(event.get("latency_ms", 0) or 0),
                "refused": bool(event.get("refused", False)),
                "reranker_used": "cohere-v4.0-pro" if retrieval_result.reranked else "off",  # ADR-0012
            }
            return  # result is terminal — no more events expected
