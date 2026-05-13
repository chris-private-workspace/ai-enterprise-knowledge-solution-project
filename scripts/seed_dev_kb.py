"""Seed a sample KB *record* for local-dev — so `/dashboard`'s KB card and
`<GlobalSearch>`'s KB results aren't empty before you've uploaded anything.

What it does (and doesn't):
    - Creates the KB metadata record via `KBService.create` against whatever
      `KBStorageBackend` the env points at (`make_kb_backend(settings)` — Postgres
      when `DATABASE_URL` is set per ADR-0023, otherwise the in-memory backend).
    - Does NOT provision the per-KB Azure AI Search index. That happens via
      `POST /kb` (CH-001 — needs Azure cred) or `scripts/create_index.py`. So a
      seeded KB shows up in the UI listing, but uploading a doc into it still
      needs the index to exist. For the in-memory backend the record is wiped on
      backend restart (W1 behaviour); for Postgres it persists.

Usage (from the project root, with the backend venv):
    backend/.venv/Scripts/python.exe -m scripts.seed_dev_kb
    # or with options:
    backend/.venv/Scripts/python.exe -m scripts.seed_dev_kb --kb-id demo-kb --name "Demo KB"

Exit codes:
    0  — KB created (or already existed and `--skip-existing` was passed)
    1  — KB already exists (and `--skip-existing` not passed) or another error
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Make `backend/` importable when run as `python -m scripts.seed_dev_kb` from
# the repo root (the other scripts under `scripts/` rely on the same layout).
_BACKEND = Path(__file__).resolve().parents[1] / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from api.schemas.kb import KbConfig, KbCreate  # noqa: E402
from kb_management import make_kb_backend  # noqa: E402
from kb_management.service import KBService  # noqa: E402
from storage.settings import get_settings  # noqa: E402


async def _seed(kb_id: str, name: str, description: str, skip_existing: bool) -> int:
    settings = get_settings()
    service = KBService(make_kb_backend(settings))

    existing = {kb.kb_id for kb in await service.list_all()}
    if kb_id in existing:
        msg = f"KB {kb_id!r} already exists"
        if skip_existing:
            print(f"{msg} — nothing to do (--skip-existing).")
            return 0
        print(f"ERROR: {msg}. Pass --skip-existing to ignore, or pick another --kb-id.")
        return 1

    kb = await service.create(
        KbCreate(kb_id=kb_id, name=name, description=description, config=KbConfig()),
    )
    backend_kind = "Postgres" if settings.database_url else "in-memory (wiped on restart)"
    print(f"Created KB {kb.kb_id!r} (name={kb.name!r}) in the {backend_kind} backend.")
    print(
        "Note: this only created the metadata record. To upload documents into it,"
        " the per-KB Azure AI Search index must exist —"
        f" use `POST /kb` (needs Azure cred) or `scripts/create_index.py --kb-id {kb_id}`.",
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed a sample KB record for local dev.")
    parser.add_argument("--kb-id", default="dev-sample-kb", help="KB id (index-name-safe).")
    parser.add_argument("--name", default="Dev Sample KB", help="Display name.")
    parser.add_argument(
        "--description",
        default="Local-dev seed KB — created by scripts/seed_dev_kb.py (no Azure index provisioned).",
        help="Description.",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Exit 0 (instead of 1) if the KB already exists.",
    )
    args = parser.parse_args()
    return asyncio.run(_seed(args.kb_id, args.name, args.description, args.skip_existing))


if __name__ == "__main__":
    raise SystemExit(main())
