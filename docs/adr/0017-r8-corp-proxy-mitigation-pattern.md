# ADR-0017: R8 — Ricoh corp-proxy mitigation pattern (dependency-add discipline)

**Date**: 2026-05-10
**Status**: Accepted
**Approver**: Chris (Tech Lead — W17 F1 decision, AskUserQuestion 2026-05-10: keep psycopg + defer local verification + formalize ADR-0017)

## Context

Risk **R8** (Ricoh corp proxy — `RISK_REGISTER`) has now bitten **5 times** across the Tier 1 build, each in the same shape: the corp proxy SSL-inspects outbound HTTPS and **intermittently truncates / resets large downloads** from PyPI and vendor CDNs, so `pip install <package-with-binary-wheel>` and similar fetches fail with `IncompleteRead` / `ECONNRESET` / "Connection timed out while downloading", often mid-wheel and not reliably resumable.

Cumulative occurrences:

| # | When | What blocked | How it was handled |
|---|---|---|---|
| 1 | W3 | Cohere — direct-API / Cohere-SDK path complications under the proxy | Path A Azure Marketplace + an `httpx` REST client (`retrieval/reranker/cohere.py`) — no `cohere` SDK dependency at all (Q5 Resolved / ADR-0012) |
| 2 | W13 | `pip install argon2-cffi` (C-extension wheel) | Switched to `hashlib.scrypt` (Python stdlib) — **ADR-0016** |
| 3 | W13 | `pip install azure-communication-email` (ACS SDK) | Lazy import inside `email_provider.py`; `feature_email_mock=true` / empty `acs_connection_string` → `ConsoleEmailProvider` stub; real ACS path raises a clear `EmailSendError` when the dep is missing (C13 / ADR-0014) |
| 4 | W15 D5 | `npx playwright install chromium` (~300 MB browser binary CDN) | `ECONNRESET` at 0%; deferred to user smoke / personal Azure dev tier (CO17); `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` + system-Chrome `channel:'chrome'` workaround documented; `@playwright/test` itself (npm) installed fine — only the browser binary CDN is blocked |
| 5 | W17 F1 | `pip install psycopg[binary]>=3.2` (3.6 MB binary wheel — ADR-0023 Postgres driver) | `IncompleteRead` then "Connection timed out" on retry; **this ADR's trigger**. Code shipped anyway (dep declared in `pyproject.toml`, lazily imported via `kb_management/factory.py` so an unset `DATABASE_URL` never touches it, in-memory path unaffected); local Postgres-path verification (CRUD tests + `mypy postgres_backend.py` + manual smoke) deferred to W18+ / a personal Azure dev tier per CO17 |

The session-start.md §11 / W15 retro flagged ADR-0017 as **reserved**, with a formalization trigger of "5th cumulative occurrence OR vendor-decision pivot needed". The W17 F1 `psycopg` block is the 5th — and was also a vendor-decision pivot point (resolved 2026-05-10: keep `psycopg`, don't pivot to sqlite3). So both halves of the trigger are met. This ADR formalizes the pattern so future dependency additions don't re-discover it ad hoc.

(Note: `truststore.inject_into_ssl()` in `api/server.py` already addresses the *runtime* HTTPS leg — it makes `httpx`/`urllib3` honour the Windows cert store so the proxy's SSL inspection doesn't break live API calls. It does **not** help `pip` downloads, which is what R8 keeps blocking.)

## Decision

**Adopt the following dependency-add discipline. The plan author + implementer run it whenever a new third-party dependency is proposed; it is the standing R8 mitigation pattern.**

1. **Prefer stdlib over a dependency.** If a stdlib module covers the need acceptably (even less ergonomically), use it. Precedent: `argon2-cffi → hashlib.scrypt` (ADR-0016). This is the first thing to consider for any new dep.
2. **Prefer a managed-service REST path over a vendor SDK.** When integrating a cloud vendor, an `httpx` client against the documented REST endpoint avoids a heavy SDK dependency. Precedent: Cohere via Azure Marketplace REST, no `cohere` SDK.
3. **Make any unavoidable third-party dep optional + lazily imported.** If the dep is only needed when a feature/config is enabled, import it inside that branch (not at module load), and provide a graceful fallback (stub / clear error) when it's absent. Precedents: ACS SDK lazy import (`email_provider.py`); `psycopg` lazy import (`kb_management/factory.py` — unset `DATABASE_URL` never touches it; in-memory backend keeps working). This way an R8-blocked install doesn't break local dev / CI.
4. **Declare the dep in `pyproject.toml` / `package.json` even when it can't be installed under the proxy.** A real deploy environment (Azure pipeline, personal Azure dev tier per CO17, or after an IT-mirror is configured) will install it. Don't silently drop the dep — declare it, gate the code path, and document the local-install caveat in the plan/progress.
5. **For binary-heavy / CDN-fetched assets (browser binaries, large wheels): defer to a non-proxy environment.** Document the workaround (skip-download env vars, system-binary channels, personal Azure dev tier) and accept a PARTIAL-PASS for the proxy-bound verification. Precedent: Playwright browsers (CO17 + the `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` workaround).
6. **Dev dependencies (test/lint/format/type tooling) are still exempt from the H2 ADR requirement** (per CLAUDE.md §5.2), but the same R8 caveats apply to *installing* them — note it if a dev-dep install is blocked.
7. **When a new dep is genuinely unavoidable, doesn't fit a stdlib/REST/lazy path, and its proxy-blocked install would block the work: STOP and ask** (per CLAUDE.md §5 / §13) — surface it as a vendor-decision pivot point.

This ADR does **not** supersede any vendor lock (§3.2 stack stays as-is) and does **not** require IT to change the proxy — it is a coding-discipline ADR. An IT-side fix (an internal PyPI/npm mirror that the proxy whitelists) would make most of this moot, and is tracked separately (out of scope here).

## Alternatives Considered

- **Don't formalize — keep handling R8 ad hoc each time** — rejected: 5 occurrences is enough signal that this recurs; an ad-hoc approach means each new dep re-discovers the same lessons (and risks someone adding a hard dep that breaks local dev / CI).
- **Wait for IT to provide an internal PyPI/npm mirror** — desirable but out of the team's control and not time-bound; this ADR doesn't block on it. If/when a mirror lands, this ADR can be amended/superseded.
- **Configure `pip` to use a corporate index now** — `pip config list` is empty (no mirror configured); setting one up is an IT task, not something the AI can do. Documented as the long-term fix.
- **Vendor everything (commit wheels into the repo)** — rejected: bloats the repo, license/security concerns, doesn't scale; the lazy-import + declare-anyway pattern (#3 + #4) achieves the goal without it.

## Consequences

- **Positive**: a written checklist the plan author / implementer runs for every new dep → fewer R8 surprises; the lazy-import + declare-anyway pattern keeps local dev / CI working even when an install is blocked; codifies the precedents (ADR-0016 stdlib, ACS lazy import, psycopg lazy import, Playwright deferral) so they're reused, not re-derived; clarifies that `truststore` covers runtime HTTPS but not `pip`.
- **Negative**: adds a step to the dependency-add flow; some deps that *would* be more ergonomic to add directly will instead get a stdlib/REST/lazy treatment (a small dev-ergonomics cost — the same trade ADR-0016 already accepted); the "declare-but-can't-install-locally" state means some verification (e.g. `mypy` on a module importing the blocked dep, integration tests needing it) is deferred to a non-proxy env — PARTIAL-PASS is the Tier 1 acceptance.
- **Neutral**: doesn't change the §3.2 vendor stack; doesn't require IT action; an IT-side mirror would supersede most of it later; the per-dep H2 ADR requirement (CLAUDE.md §5.2) is unchanged — this ADR is *additional* discipline, not a replacement for it.

## References

- `RISK_REGISTER` — risk R8 (Ricoh corp proxy)
- ADR-0016 — argon2-cffi → hashlib.scrypt (R8 occurrence #2, stdlib mitigation precedent)
- ADR-0014 — hybrid auth / C13 (ACS SDK lazy import — R8 occurrence #3)
- ADR-0012 — Cohere v4.0-pro (Azure Marketplace REST path — R8 occurrence #1)
- ADR-0023 — KB Manager persistent backing (psycopg — R8 occurrence #5, this ADR's trigger)
- session-start.md §11 — ADR-0017 reservation + 5th-occurrence trigger; CO17 (personal Azure dev tier pattern)
- `docs/01-planning/W15-polish-closeout/plan.md` §F4 risks (Playwright browser CDN — R8 occurrence #4)
- `docs/01-planning/W17-beta-hardening/progress.md` Day 2 (the psycopg block + this decision)
- CLAUDE.md §5.2 H2 (vendor / dependency constraint — dev-dep exception); §13 (when in doubt → ask)
- `backend/api/server.py` — `truststore.inject_into_ssl()` (runtime HTTPS cert-store leg)
