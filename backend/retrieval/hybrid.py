"""Azure AI Search hybrid retrieval REST client (per architecture.md §3.1 + components/C04 §1).

W2 baseline: BM25 + vector hybrid via Azure AI Search built-in RRF (no custom fusion).
Filter clause: `enabled eq true and low_value_flag eq false` per architecture.md §3.6.

W16+ ADR-0018 Phase 3 multi-KB invariant: search() requires kb_id parameter; index_name
dynamically constructed via kb_naming.kb_id_to_index_name (with self.index_name as Tier 1
legacy alias for kb_id="drive_user_manuals"); kb_id eq filter clause prepended to any
caller-supplied filter making per-KB scoping mandatory.

Response shape (Azure AI Search /docs/search):
    {
      "value": [
        {
          "@search.score": 0.7234,
          "chunk_id": "kb-drive_doc-A_chunk-0007",
          ...all retrievable fields per index schema...
        }, ...
      ]
    }
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import httpx
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from storage.kb_naming import kb_id_filter_clause, kb_id_to_index_name

_API_VERSION = "2024-07-01"
_DEFAULT_FILTER = "enabled eq true and low_value_flag eq false"

logger = structlog.get_logger(__name__)


@dataclass(slots=True, frozen=True)
class HybridSearchHit:
    """One result from /docs/search. score + raw fields dict from index."""

    score: float
    fields: dict


class HybridSearcher:
    """Async REST client for Azure AI Search hybrid (BM25 + vector RRF) query."""

    def __init__(
        self,
        endpoint: str,
        admin_key: str,
        index_name: str,
        api_version: str = _API_VERSION,
    ) -> None:
        self.endpoint = endpoint.rstrip("/")
        self.admin_key = admin_key
        self.index_name = index_name
        self.api_version = api_version
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> HybridSearcher:
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            headers={
                "Content-Type": "application/json",
                "api-key": self.admin_key,
            },
        )
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @retry(
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    async def fetch_by_chunk_ids(
        self,
        chunk_ids: list[str],
        kb_id: str,
    ) -> dict[str, dict]:
        """Batch fetch chunks by chunk_id list (no ranking) per ADR-0020 Context Expander.

        Single Azure AI Search /docs/search call with `search.in()` filter to retrieve
        multiple chunks in one round-trip — minimizes latency overhead vs N parallel
        single-doc lookups. kb_id required per ADR-0018 multi-KB invariant.

        Returns mapping chunk_id → fields dict; only chunks present in the index appear.
        Empty input list returns empty dict (no API call — cost guard).
        """
        if not chunk_ids:
            return {}
        assert self._client is not None, "use 'async with' to manage searcher lifecycle"

        # ADR-0018: dynamic per-KB index name (Option B b2 dynamic injection)
        index_name = kb_id_to_index_name(kb_id, legacy_default_index=self.index_name)

        # ADR-0018: prepend kb_id eq clause + chunk_id batch filter
        kb_filter = kb_id_filter_clause(kb_id)
        chunk_id_filter = f"search.in(chunk_id, '{','.join(chunk_ids)}', ',')"
        full_filter = f"{kb_filter} and {chunk_id_filter}"

        url = (
            f"{self.endpoint}/indexes/{index_name}"
            f"/docs/search?api-version={self.api_version}"
        )
        # search="*" + filter = pure filtering retrieval (no BM25/vector ranking)
        payload: dict = {
            "search": "*",
            "filter": full_filter,
            "top": len(chunk_ids),
        }

        response = await self._client.post(url, content=json.dumps(payload))

        if response.status_code >= 500 or response.status_code == 429:
            response.raise_for_status()
        if response.status_code != 200:
            response.raise_for_status()

        body = response.json()
        result: dict[str, dict] = {}
        for item in body.get("value", []):
            chunk_id = str(item.get("chunk_id", ""))
            if not chunk_id:
                continue
            fields = {k: v for k, v in item.items() if not k.startswith("@search.")}
            result[chunk_id] = fields

        logger.debug(
            "hybrid_fetch_by_chunk_ids",
            index=index_name,
            kb_id=kb_id,
            requested=len(chunk_ids),
            returned=len(result),
        )
        return result

    @retry(
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    async def search(
        self,
        query_text: str,
        query_vector: list[float],
        kb_id: str,
        top_k: int = 50,
        filter_clause: str | None = _DEFAULT_FILTER,
    ) -> list[HybridSearchHit]:
        """Hybrid retrieval — BM25 (search) + vector (vectorQueries) → built-in RRF.

        kb_id required per ADR-0018 multi-KB invariant — index_name dynamically
        constructed via kb_naming.kb_id_to_index_name with self.index_name as Tier 1
        legacy alias for kb_id="drive_user_manuals". Per-KB filter clause prepended
        making kb_id scoping mandatory on every search call.
        """
        assert self._client is not None, "use 'async with' to manage searcher lifecycle"

        # ADR-0018: dynamic per-KB index name (Option B b2 dynamic injection)
        index_name = kb_id_to_index_name(kb_id, legacy_default_index=self.index_name)

        # ADR-0018: prepend kb_id eq clause to filter (multi-KB scoping mandatory)
        kb_filter = kb_id_filter_clause(kb_id)
        full_filter = f"{kb_filter} and {filter_clause}" if filter_clause else kb_filter

        url = (
            f"{self.endpoint}/indexes/{index_name}"
            f"/docs/search?api-version={self.api_version}"
        )
        payload: dict = {
            "search": query_text,
            "vectorQueries": [
                {
                    "kind": "vector",
                    "vector": query_vector,
                    "k": top_k,
                    "fields": "content_vector",
                },
            ],
            "top": top_k,
            "queryType": "semantic",
            "semanticConfiguration": "ekp-semantic-config",
            "filter": full_filter,
        }

        response = await self._client.post(url, content=json.dumps(payload))

        if response.status_code >= 500 or response.status_code == 429:
            response.raise_for_status()
        if response.status_code != 200:
            response.raise_for_status()

        body = response.json()
        hits: list[HybridSearchHit] = []
        for item in body.get("value", []):
            score = float(item.get("@search.score", 0.0))
            # Strip Azure AI Search system fields; keep all schema fields
            fields = {k: v for k, v in item.items() if not k.startswith("@search.")}
            hits.append(HybridSearchHit(score=score, fields=fields))

        logger.debug(
            "hybrid_search_returned",
            index=index_name,
            kb_id=kb_id,
            count=len(hits),
            top_k=top_k,
        )
        return hits
