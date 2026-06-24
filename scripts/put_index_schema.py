"""Ops: PUT a KB's Azure AI Search index schema from the canonical schema.json.

W90 P2.2b — after the index schema gains `allowed_principals` + `classification`
(ADR-0066), an EXISTING per-KB index must be updated so re-ingest can upload the
two new fields (Azure rejects a batch carrying a field the index doesn't define).
`IndexPopulator.create_index_for_kb` issues an idempotent PUT (201 create / 204
in-place update) with `backend/indexing/schema.json` — an ADDITIVE field update
preserves existing documents (the new fields read as null until re-indexed).

Usage (from project root):
    backend/.venv/Scripts/python.exe -m scripts.put_index_schema --kb-id drive-images-1
"""

from __future__ import annotations

import truststore

truststore.inject_into_ssl()

import argparse  # noqa: E402
import asyncio  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from indexing.populate import IndexPopulator  # noqa: E402
from storage.kb_naming import kb_id_to_index_name  # noqa: E402
from storage.settings import get_settings  # noqa: E402


async def _main(kb_id: str) -> int:
    settings = get_settings()
    if not (settings.azure_search_endpoint and settings.azure_search_admin_key):
        print("ERROR: AZURE_SEARCH_ENDPOINT / AZURE_SEARCH_ADMIN_KEY missing in .env")
        return 2
    index_name = kb_id_to_index_name(
        kb_id, legacy_default_index=settings.azure_search_default_index
    )
    print(f"PUT schema for kb_id={kb_id!r} -> index {index_name!r} ...")
    async with IndexPopulator(
        endpoint=settings.azure_search_endpoint,
        admin_key=settings.azure_search_admin_key,
        index_name=settings.azure_search_default_index,
    ) as populator:
        await populator.create_index_for_kb(kb_id)
    print(f"OK: {index_name} schema updated (allowed_principals + classification added).")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kb-id", required=True, help="KB id, e.g. drive-images-1")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_main(args.kb_id)))
