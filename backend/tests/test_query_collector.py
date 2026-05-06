"""W9 D3 F5.3 — Real query log scaffolding tests.

Per W09 plan §2 F5.3 acceptance:
  - PII strip handles email + phone + employee-ID patterns
  - Dedup collapses canonicalised case-fold duplicates
  - YAML round-trip preserves all RealQueryRecord fields
  - build_record helper assembles records with correct shape
  - user_oid redaction truncates to 4-char slug
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest

from observability.query_collector import (
    _redact_user_oid,
    build_record,
    dedupe_queries,
    pii_strip,
    query_hash,
    read_yaml,
    to_yaml,
    write_yaml,
)

# ---------------------------------------------------------------------------
# pii_strip
# ---------------------------------------------------------------------------


def test_pii_strip_redacts_email() -> None:
    text = "Email me at john.doe@ricoh.com about the printer"
    assert pii_strip(text) == "Email me at <REDACTED_EMAIL> about the printer"


def test_pii_strip_redacts_phone_dash_format() -> None:
    text = "Call 555-123-4567 for support"
    out = pii_strip(text)
    assert "<REDACTED_PHONE>" in out
    assert "555-123-4567" not in out


def test_pii_strip_redacts_phone_intl_format() -> None:
    text = "Reach me at +81 90 1234 5678 anytime"
    out = pii_strip(text)
    assert "<REDACTED_PHONE>" in out


def test_pii_strip_redacts_employee_id() -> None:
    text = "User emp123456 reported the issue"
    assert pii_strip(text) == "User <REDACTED_EMP_ID> reported the issue"


def test_pii_strip_redacts_ricoh_id() -> None:
    text = "Ticket assigned to ricoh78901"
    assert pii_strip(text) == "Ticket assigned to <REDACTED_RICOH_ID>"


def test_pii_strip_handles_multiple_patterns() -> None:
    text = "Contact john@ricoh.com or call 555-123-4567 (emp987654)"
    out = pii_strip(text)
    assert "<REDACTED_EMAIL>" in out
    assert "<REDACTED_PHONE>" in out
    assert "<REDACTED_EMP_ID>" in out
    # Original PII NOT present
    assert "@ricoh.com" not in out
    assert "555-123-4567" not in out


def test_pii_strip_empty_string_passthrough() -> None:
    assert pii_strip("") == ""
    assert pii_strip(None) is None  # type: ignore[arg-type]


def test_pii_strip_no_match_returns_unchanged() -> None:
    text = "How do I configure the printer?"
    assert pii_strip(text) == text


# ---------------------------------------------------------------------------
# query_hash
# ---------------------------------------------------------------------------


def test_query_hash_is_stable_for_canonical_equivalent() -> None:
    """Different casing + whitespace → same hash(canonicalisation)。"""
    h1 = query_hash("How do I configure the printer?")
    h2 = query_hash("how DO  I    configure THE printer?")
    h3 = query_hash("  How  do I configure the printer?  ")
    assert h1 == h2 == h3


def test_query_hash_different_for_different_queries() -> None:
    h1 = query_hash("How do I configure the printer?")
    h2 = query_hash("How do I scan to email?")
    assert h1 != h2


def test_query_hash_is_64_hex_chars() -> None:
    h = query_hash("any text")
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


# ---------------------------------------------------------------------------
# dedupe
# ---------------------------------------------------------------------------


def test_dedupe_collapses_duplicate_hashes() -> None:
    base = build_record(
        query_text="How do I configure the printer?",
        kb_id="drive",
        user_oid="oid-aaaa-bbbb-cccc",
        status_code=200,
        duration_ms=1500,
    )
    # Same canonical text → same hash → collapsed
    dup = build_record(
        query_text="how DO I configure THE printer?",
        kb_id="drive",
        user_oid="oid-aaaa-bbbb-cccc",
        status_code=200,
        duration_ms=1820,
    )
    other = build_record(
        query_text="How do I scan to email?",
        kb_id="drive",
        user_oid="oid-aaaa-bbbb-cccc",
        status_code=200,
        duration_ms=2100,
    )

    deduped = dedupe_queries([base, dup, other])
    assert len(deduped) == 2
    # First-seen preserved
    assert deduped[0].query_hash == base.query_hash
    assert deduped[1].query_hash == other.query_hash


def test_dedupe_empty_list() -> None:
    assert dedupe_queries([]) == []


def test_dedupe_single_record() -> None:
    record = build_record(
        query_text="single", kb_id="kb1", user_oid="o1",
        status_code=200, duration_ms=100,
    )
    assert dedupe_queries([record]) == [record]


# ---------------------------------------------------------------------------
# build_record + redaction
# ---------------------------------------------------------------------------


def test_build_record_strips_pii_and_redacts_oid() -> None:
    record = build_record(
        query_text="Contact john@ricoh.com please",
        kb_id="drive",
        user_oid="aaaa-bbbb-cccc-dddd",
        status_code=200,
        duration_ms=1500,
    )
    assert "<REDACTED_EMAIL>" in record.query_text
    assert "@ricoh.com" not in record.query_text
    assert record.user_oid_redacted == "u_aaaa"


def test_redact_user_oid_truncates_to_4_hex() -> None:
    assert _redact_user_oid("12345678-aaaa-bbbb-cccc-dddddddddddd") == "u_1234"


def test_redact_user_oid_handles_short_input() -> None:
    assert _redact_user_oid("ab") == "u_ab"


def test_redact_user_oid_handles_empty() -> None:
    assert _redact_user_oid("") == "u_0000"


def test_build_record_uses_provided_timestamp() -> None:
    ts = datetime(2026, 5, 30, 14, 23, 0, tzinfo=UTC)
    record = build_record(
        query_text="test",
        kb_id="kb",
        user_oid="o",
        status_code=200,
        duration_ms=100,
        timestamp=ts,
    )
    assert record.timestamp == "2026-05-30T14:23:00Z"


def test_build_record_propagates_optional_flags() -> None:
    record = build_record(
        query_text="airspeed of unladen swallow",
        kb_id="drive",
        user_oid="o",
        status_code=200,
        duration_ms=900,
        refused=True,
        crag_triggered=True,
    )
    assert record.refused is True
    assert record.crag_triggered is True


# ---------------------------------------------------------------------------
# YAML round-trip
# ---------------------------------------------------------------------------


def test_yaml_roundtrip_preserves_records(tmp_path: Path) -> None:
    records = [
        build_record(
            query_text="How do I configure the printer?",
            kb_id="drive",
            user_oid="aaaa-bbbb-cccc",
            status_code=200,
            duration_ms=1850,
        ),
        build_record(
            query_text="airspeed of unladen swallow",
            kb_id="drive",
            user_oid="bbbb-cccc-dddd",
            status_code=200,
            duration_ms=900,
            refused=True,
        ),
    ]

    path = tmp_path / "real-queries.yaml"
    write_yaml(
        records,
        path,
        phase="W9 test",
        collection_owner="ai-test",
    )

    metadata, restored = read_yaml(path)

    assert metadata["phase"] == "W9 test"
    assert metadata["collection_owner"] == "ai-test"
    assert metadata["record_count"] == 2
    assert len(restored) == 2
    assert restored[0].query_hash == records[0].query_hash
    assert restored[0].query_text == records[0].query_text
    assert restored[1].refused is True


def test_to_yaml_includes_metadata_header() -> None:
    records = [
        build_record(
            query_text="single", kb_id="k", user_oid="o",
            status_code=200, duration_ms=100,
        ),
    ]
    text = to_yaml(records, phase="W9", collection_owner="me")
    assert "collection_metadata:" in text
    assert "phase: W9" in text
    assert "queries:" in text
    assert "record_count: 1" in text


def test_write_yaml_dedupes_before_serialise(tmp_path: Path) -> None:
    """write_yaml runs dedup pass before YAML output。"""
    base = build_record(
        query_text="duplicate query",
        kb_id="k", user_oid="o",
        status_code=200, duration_ms=100,
    )
    dup = build_record(
        query_text="DUPLICATE Query",
        kb_id="k", user_oid="o",
        status_code=200, duration_ms=120,
    )

    path = tmp_path / "deduped.yaml"
    write_yaml([base, dup], path, phase="W9", collection_owner="me")

    metadata, records = read_yaml(path)
    assert metadata["record_count"] == 1
    assert len(records) == 1


# ---------------------------------------------------------------------------
# Mock corpus fixture sanity check
# ---------------------------------------------------------------------------


def test_mock_corpus_yaml_loads_successfully() -> None:
    """`docs/03-implementation/beta-real-queries-W9-W10.yaml` mock corpus parses
    cleanly through `read_yaml` — ensures the bootstrap format is stable。"""
    repo_root = Path(__file__).resolve().parents[2]
    corpus_path = repo_root / "docs" / "03-implementation" / "beta-real-queries-W9-W10.yaml"
    if not corpus_path.exists():
        pytest.skip(f"mock corpus not present at {corpus_path}")

    metadata, records = read_yaml(corpus_path)

    assert metadata.get("status", "").startswith("mock-bootstrap")
    assert metadata.get("privacy_class") == "Internal"
    assert metadata.get("pii_strip_version") == "v1"
    assert metadata.get("record_count") == len(records)
    assert len(records) >= 5  # 8 mock queries baseline

    # All records have non-empty kb_id + valid status_code + 4-char oid slug
    for r in records:
        assert r.kb_id
        assert r.status_code in (200, 502, 503, 429)
        assert r.user_oid_redacted.startswith("u_")
        assert len(r.user_oid_redacted) == 6  # "u_" + 4 chars
