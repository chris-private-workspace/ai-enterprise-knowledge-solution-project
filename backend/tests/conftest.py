"""pytest session bootstrap — store-backend test isolation (BUG-008).

The developer `.env` may set `DATABASE_URL` to wire the ADR-0023 Postgres-backed
stores. pytest reads the same `.env` (via `storage.settings.Settings`), so
without isolation the whole suite would silently switch to Postgres and the
in-memory-mode tests (KB list, auth sessions, `/health` postgres
`not_configured`) would fail against Postgres-backed behaviour.

Force `DATABASE_URL` empty here, at conftest import time — before any test
module imports `api.server` and builds the `lru_cache`d `Settings`. An empty
environment variable wins over the `.env` file in Pydantic Settings precedence,
so the suite always exercises the in-memory stores deterministically.
Postgres-path tests opt in explicitly via `Settings(database_url=...)` and are
unaffected by this.
"""

import os

# Must run before the first `Settings()` construction — conftest.py is imported
# by pytest ahead of every test module under `tests/`.
os.environ["DATABASE_URL"] = ""

# W44 F4.4 — disable the eval-only per-query retrieve throttle (eval/throttle.py)
# during tests so the runner/orchestrator unit tests don't sleep 1s per mocked
# query. The throttle's own unit tests pass an explicit `throttle_s` to exercise
# the delay; everything else reads this env knob at call time.
os.environ["EVAL_RETRIEVE_THROTTLE_S"] = "0"
