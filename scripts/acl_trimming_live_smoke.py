"""Ops: live Azure AI Search ACL-trimming smoke (W90 P2.2b / ADR-0066 G2).

Proves that Azure's server-side `allowed_principals/any(search.in(...))` filter REALLY
drops an unauthorized chunk — the end-to-end behaviour the route wiring
(test_query_route_acl_trimming) and the OData construction (test_retrieval_acl_filter)
cover only up to the Azure boundary.

Self-contained + self-cleaning: uploads ONE synthetic chunk stamped
`allowed_principals=['alice-oid']` (restrictive, non-empty), then issues the
fail-open retrieval filter for two different subjects and asserts the drop, then
deletes the synthetic chunk in a finally block (no real data touched).

  alice (listed)   -> chunk visible      (any() matches)
  bob   (unlisted) -> chunk TRIMMED      (not in list, and non-empty so fail-open
                                          `not any()` is false)
  empty-ACL chunks -> visible to bob too (fail-open production-preserve)

Usage (from project root):
    backend/.venv/Scripts/python.exe -m scripts.acl_trimming_live_smoke --kb-id drive-images-1
"""

from __future__ import annotations

import truststore

truststore.inject_into_ssl()

import argparse  # noqa: E402
import asyncio  # noqa: E402
import json  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import httpx  # noqa: E402

from retrieval.hybrid import _build_acl_filter  # noqa: E402
from storage.kb_naming import kb_id_filter_clause, kb_id_to_index_name  # noqa: E402
from storage.settings import get_settings  # noqa: E402

_SMOKE_CHUNK_ID = "acl-smoke-synthetic-zzz"  # no leading underscore (Azure key rule)
_API_VERSION = "2024-07-01"


async def _count(client: httpx.AsyncClient, url: str, filter_str: str) -> int:
    """POST /docs/search count-only; return the matched doc count."""
    payload = {"search": "*", "filter": filter_str, "count": True, "top": 0}
    r = await client.post(url, content=json.dumps(payload))
    r.raise_for_status()
    return int(r.json().get("@odata.count", 0))


async def _main(kb_id: str) -> int:
    settings = get_settings()
    if not (settings.azure_search_endpoint and settings.azure_search_admin_key):
        print("ERROR: AZURE_SEARCH_ENDPOINT / AZURE_SEARCH_ADMIN_KEY missing in .env")
        return 2
    index = kb_id_to_index_name(kb_id, legacy_default_index=settings.azure_search_default_index)
    endpoint = settings.azure_search_endpoint.rstrip("/")
    search_url = f"{endpoint}/indexes/{index}/docs/search?api-version={_API_VERSION}"
    index_url = f"{endpoint}/indexes/{index}/docs/index?api-version={_API_VERSION}"
    kb_clause = kb_id_filter_clause(kb_id)

    alice = _build_acl_filter(["alice-oid"])  # fail-open clause for alice
    bob = _build_acl_filter(["bob-oid"])  # fail-open clause for bob
    assert alice is not None and bob is not None

    headers = {"Content-Type": "application/json", "api-key": settings.azure_search_admin_key}
    ok = True
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0), headers=headers) as client:
        try:
            # Upload the synthetic restrictive chunk (allowed_principals=['alice-oid']).
            doc = {
                "chunk_id": _SMOKE_CHUNK_ID,
                "kb_id": kb_id,
                "allowed_principals": ["alice-oid"],
                "classification": "internal",
                "enabled": True,
                "content_vector": [0.0] * 1024,
                "@search.action": "mergeOrUpload",
            }
            up = await client.post(index_url, content=json.dumps({"value": [doc]}))
            if up.status_code not in (200, 207):
                print(f"UPLOAD {up.status_code}: {up.text[:800]}")
                up.raise_for_status()
            # Azure indexes asynchronously; poll until the synthetic chunk is searchable.
            id_clause = f"{kb_clause} and chunk_id eq '{_SMOKE_CHUNK_ID}'"
            for _ in range(20):
                if await _count(client, search_url, id_clause) == 1:
                    break
                await asyncio.sleep(0.5)

            # 1. alice (listed) sees the synthetic chunk.
            alice_sees = await _count(client, search_url, f"{id_clause} and {alice}")
            # 2. bob (unlisted) is TRIMMED from the synthetic chunk.
            bob_sees = await _count(client, search_url, f"{id_clause} and {bob}")
            # 3. fail-open: bob still sees the real empty-ACL chunks of this KB.
            bob_public = await _count(
                client, search_url, f"{kb_clause} and chunk_id ne '{_SMOKE_CHUNK_ID}' and {bob}"
            )
            total_public = await _count(
                client, search_url, f"{kb_clause} and chunk_id ne '{_SMOKE_CHUNK_ID}'"
            )

            print(f"index={index}")
            print(f"  [1] alice (listed)   sees synthetic chunk : {alice_sees}  (expect 1)")
            print(f"  [2] bob   (unlisted) sees synthetic chunk : {bob_sees}  (expect 0 = TRIMMED)")
            print(f"  [3] bob   fail-open sees real empty chunks: {bob_public} / {total_public}  (expect equal)")

            if alice_sees != 1:
                print("  FAIL: alice (listed principal) should see the chunk")
                ok = False
            if bob_sees != 0:
                print("  FAIL: bob (unlisted) should be TRIMMED (Azure drop not working)")
                ok = False
            if bob_public != total_public or total_public == 0:
                print("  FAIL: fail-open should pass ALL empty-ACL chunks to bob")
                ok = False
            if ok:
                print("  PASS: Azure server-side ACL trimming + fail-open both verified.")
        finally:
            # Cleanup — delete the synthetic chunk (no real data touched).
            payload = {"value": [{"chunk_id": _SMOKE_CHUNK_ID, "@search.action": "delete"}]}
            try:
                d = await client.post(index_url, content=json.dumps(payload))
                d.raise_for_status()
                print(f"cleanup: synthetic chunk {_SMOKE_CHUNK_ID} deleted.")
            except Exception as exc:  # noqa: BLE001
                print(f"cleanup WARNING: failed to delete synthetic chunk: {exc}")
    return 0 if ok else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kb-id", required=True, help="KB id, e.g. drive-images-1")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_main(args.kb_id)))
