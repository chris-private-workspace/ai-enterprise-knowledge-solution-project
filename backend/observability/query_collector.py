"""C07 Observability — Real query log collection scaffolding(W9 D3 F5.3).

Per W09-beta-internal-testing plan §2 F5.3 + W08 retro § Carry-over C9 + Q6
(Real query collection owner trigger W9)+ architecture.md §3.1 audit pipeline。

Three concerns:
  1. **`RealQueryRecord`** — Pydantic model representing one real-user query
     captured from Beta cohort traffic(W9-W12 phase),with PII-stripped text
     + audit-trail metadata。
  2. **Dedup + PII strip** — case-fold canonicalisation collapses near-duplicate
     queries(common in user studies);regex strip emails / phone / employee
     IDs per CLAUDE.md §5.5 H5 before YAML serialise。
  3. **YAML serialise / deserialise** — round-trip-safe storage to
     `docs/03-implementation/beta-real-queries-W9-W10.yaml`(scope per Q9
     Internal classification — no PII at rest;collection_metadata header
     documents privacy class + collection owner)。

W9 D3 ships **scaffolding only** — actual collection from Beta cohort traffic
plumbs in W11+ post-IT-cred populate(per W9 D1 三方 outcome IT delivery
target early June real)。Mock corpus `beta-real-queries-W9-W10.yaml` validates
the format before real cohort onboarding。

Karpathy §1.2 simplicity-first:
  - **No live Langfuse fetch in this module** — collection source is
    structured `audit_log` events(JSON line stream),which `extract_*`
    functions parse offline。Live Langfuse generations API integration is
    W11+ scope when real cohort signals exist。
  - **No DB layer** — YAML-on-disk storage matches Q9 Internal classification
    + supports git history audit trail + zero infra dep。
  - **PII strip = regex baseline** — covers email / phone / 7-digit Ricoh
    employee ID。Aggressive PII detection(NER / classifier)= Tier 2 trigger
    when corpus volume warrants。
"""

from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class RealQueryRecord(BaseModel):
    """One real-user query captured from Beta cohort traffic.

    Fields parallel `audit_log` middleware emit + `/query` route response so
    one record reflects a complete request lifecycle observation。
    """

    query_hash: str = Field(
        ...,
        description="SHA-256 hex of canonicalised PII-stripped text (64 hex chars)",
    )
    query_text: str = Field(..., description="PII-stripped query text")
    kb_id: str
    timestamp: str = Field(..., description="ISO 8601 UTC e.g. 2026-05-30T14:23:00Z")
    status_code: int
    duration_ms: int
    refused: bool = False
    crag_triggered: bool = False
    user_oid_redacted: str = Field(
        ...,
        description="4-char user-ID slug (NOT full Entra oid) — H5 redaction",
    )


# ---------------------------------------------------------------------------
# PII strip regex patterns(CLAUDE.md §5.5 H5)
# ---------------------------------------------------------------------------

_EMAIL_PATTERN = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
_PHONE_PATTERN = re.compile(r"\b(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b")
_EMPLOYEE_ID_PATTERN = re.compile(r"\bemp[\s_-]?\d{5,8}\b", re.IGNORECASE)
_RICOH_ID_PATTERN = re.compile(r"\bricoh[\s_-]?\d{4,8}\b", re.IGNORECASE)


def pii_strip(text: str) -> str:
    """Replace email / phone / employee-ID patterns with placeholder tokens.

    Order matters:email check first(more specific),phone last(broader)。
    Each pattern emits a distinct placeholder so downstream review can
    quantify privacy-strip impact per record。
    """
    if not text:
        return text
    text = _EMAIL_PATTERN.sub("<REDACTED_EMAIL>", text)
    text = _EMPLOYEE_ID_PATTERN.sub("<REDACTED_EMP_ID>", text)
    text = _RICOH_ID_PATTERN.sub("<REDACTED_RICOH_ID>", text)
    text = _PHONE_PATTERN.sub("<REDACTED_PHONE>", text)
    return text


# ---------------------------------------------------------------------------
# Canonicalisation + dedup
# ---------------------------------------------------------------------------


def _canonical(text: str) -> str:
    """Lowercase + collapse internal whitespace + strip ends — for dedup compare only。

    Returned string is NOT used as the stored `query_text`(which preserves
    original casing post-PII-strip);used purely for hash + duplicate check。
    """
    return " ".join(text.lower().split()).strip()


def query_hash(text: str) -> str:
    """SHA-256 hex of the canonicalised text — stable identifier across runs。"""
    return hashlib.sha256(_canonical(text).encode("utf-8")).hexdigest()


def dedupe_queries(records: list[RealQueryRecord]) -> list[RealQueryRecord]:
    """Collapse records with identical canonical text into the first occurrence。

    Order preserved per first-seen。Useful for collapsing common repeat queries
    in cohort sessions(eg. "How do I print double-sided?")
    """
    seen: set[str] = set()
    out: list[RealQueryRecord] = []
    for record in records:
        key = record.query_hash
        if key in seen:
            continue
        seen.add(key)
        out.append(record)
    return out


# ---------------------------------------------------------------------------
# Construction helpers
# ---------------------------------------------------------------------------


def build_record(
    *,
    query_text: str,
    kb_id: str,
    user_oid: str,
    status_code: int,
    duration_ms: int,
    refused: bool = False,
    crag_triggered: bool = False,
    timestamp: datetime | None = None,
) -> RealQueryRecord:
    """Assemble a `RealQueryRecord` with PII-stripped text + redacted user slug.

    `user_oid` accepts the full Entra ID object id(eg. uuid)— this helper
    truncates to a 4-char prefix slug `u_<4hex>` so the audit trail can
    correlate within a session WITHOUT exposing full identity at rest。
    """
    stripped = pii_strip(query_text)
    ts = (timestamp or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")
    slug = _redact_user_oid(user_oid)
    return RealQueryRecord(
        query_hash=query_hash(stripped),
        query_text=stripped,
        kb_id=kb_id,
        timestamp=ts,
        status_code=status_code,
        duration_ms=duration_ms,
        refused=refused,
        crag_triggered=crag_triggered,
        user_oid_redacted=slug,
    )


def _redact_user_oid(oid: str) -> str:
    """Truncate full Entra oid to 4-char prefix slug `u_<4hex>`。

    Strips dashes first(uuid format)then takes first 4 hex chars。Maps
    same user → same slug within a single phase but breaks cross-phase
    correlation(by design — annual rotation policy)。
    """
    cleaned = oid.replace("-", "").replace("_", "")
    return f"u_{cleaned[:4]}" if cleaned else "u_0000"


# ---------------------------------------------------------------------------
# YAML serialise / deserialise
# ---------------------------------------------------------------------------


def to_yaml(
    records: list[RealQueryRecord],
    *,
    phase: str,
    collection_owner: str,
    privacy_class: str = "Internal",
    pii_strip_version: str = "v1",
) -> str:
    """Serialise records + collection_metadata header into a YAML document。"""
    metadata: dict[str, Any] = {
        "phase": phase,
        "collection_owner": collection_owner,
        "privacy_class": privacy_class,
        "pii_strip_version": pii_strip_version,
        "record_count": len(records),
        "spec_ref": "W09 plan §2 F5.3 + Q6 owner + Q9 sensitivity classification",
    }
    payload: dict[str, Any] = {
        "collection_metadata": metadata,
        "queries": [r.model_dump() for r in records],
    }
    return yaml.safe_dump(
        payload,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
    )


def write_yaml(
    records: list[RealQueryRecord],
    path: Path,
    *,
    phase: str,
    collection_owner: str,
    privacy_class: str = "Internal",
    pii_strip_version: str = "v1",
) -> None:
    """Write records to `path` after PII-strip + dedup pass."""
    deduped = dedupe_queries(records)
    text = to_yaml(
        deduped,
        phase=phase,
        collection_owner=collection_owner,
        privacy_class=privacy_class,
        pii_strip_version=pii_strip_version,
    )
    path.write_text(text, encoding="utf-8")


def read_yaml(path: Path) -> tuple[dict[str, Any], list[RealQueryRecord]]:
    """Read records + metadata back from `path`。Used for regression checks
    + downstream eval-set augmentation cycle(per architecture.md §6.1 W4 D5
    pattern of 加 20 條 real query into eval set)。

    YAML automatically parses ISO 8601 timestamps to `datetime` — coerce back
    to ISO string before Pydantic validation so the schema stays string-only。
    """
    text = path.read_text(encoding="utf-8")
    payload = yaml.safe_load(text) or {}
    metadata = payload.get("collection_metadata", {})
    records_raw = payload.get("queries", [])
    records: list[RealQueryRecord] = []
    for raw in records_raw:
        ts = raw.get("timestamp")
        if isinstance(ts, datetime):
            raw = {**raw, "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ")}
        records.append(RealQueryRecord(**raw))
    return metadata, records
