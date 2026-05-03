"""W2 D2 F2 Layout-aware chunker sanity report on 6 sample Drive manuals.

Runs LayoutAwareChunker over the 6 sample Drive manuals (parsed via DoclingDocxParser)
and emits a YAML report at reports/w02_d2_chunker_sanity.yaml capturing per-doc + aggregate
chunk count, token distribution, low_value rate, section_path depth distribution, and
table/text breakdown.

Usage (from repo root):
    backend/.venv/Scripts/python.exe -m scripts.run_chunker_sanity

Exit codes:
    0  — report generated, all 6 docs chunked (no parse_failed)
    1  — sample directory missing OR any doc parse_failed
"""

from __future__ import annotations

import statistics
import sys
from collections import Counter
from pathlib import Path

# sys.path bootstrap: scripts run from project root, but backend/ ingestion
# package uses bare-prefix imports (e.g. `from ingestion.parsers.base ...`)
# matching the pytest pythonpath convention. Add backend/ to path so the
# inner imports resolve under both contexts.
_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import yaml  # noqa: E402  — after sys.path bootstrap

from ingestion.chunker.layout_aware import LayoutAwareChunker  # noqa: E402  — after sys.path bootstrap
from ingestion.parsers.docx_parser import DoclingDocxParser  # noqa: E402  — after sys.path bootstrap

SAMPLE_DIR = Path("docs/06-reference/01-sample-doc")
REPORT_PATH = Path("reports/w02_d2_chunker_sanity.yaml")


def _percentile(values: list[int], pct: float) -> int:
    if not values:
        return 0
    s = sorted(values)
    k = max(0, min(len(s) - 1, int(round(pct * (len(s) - 1)))))
    return s[k]


def main() -> int:
    if not SAMPLE_DIR.is_dir():
        print(f"sample dir not found: {SAMPLE_DIR}", file=sys.stderr)
        return 1

    samples = sorted(SAMPLE_DIR.glob("*.docx"))
    if not samples:
        print(f"no .docx files in {SAMPLE_DIR}", file=sys.stderr)
        return 1

    parser = DoclingDocxParser()
    chunker = LayoutAwareChunker()
    per_doc: list[dict[str, object]] = []
    all_token_counts: list[int] = []
    aggregate_section_depths: Counter[int] = Counter()
    total_chunks = 0
    total_text = 0
    total_table = 0
    total_low_value = 0
    total_failures = 0

    for s in samples:
        r = parser.parse(s)
        chunks = chunker.chunk(r)
        if r.parse_failed:
            total_failures += 1

        text_chunks = [c for c in chunks if c.chunk_kind == "text"]
        table_chunks = [c for c in chunks if c.chunk_kind == "table"]
        low_value_chunks = [c for c in chunks if c.low_value_flag]
        depths = Counter(len(c.section_path) for c in chunks)
        token_counts = [c.chunk_token_count for c in chunks]

        per_doc.append(
            {
                "filename": s.name,
                "parse_failed": r.parse_failed,
                "total_chunks": len(chunks),
                "text_chunks": len(text_chunks),
                "table_chunks": len(table_chunks),
                "low_value_chunks": len(low_value_chunks),
                "low_value_rate_pct": round(len(low_value_chunks) / len(chunks) * 100, 1)
                if chunks
                else 0.0,
                "section_path_depths": dict(sorted(depths.items())),
                "token_min": min(token_counts) if token_counts else 0,
                "token_max": max(token_counts) if token_counts else 0,
                "token_median": int(statistics.median(token_counts)) if token_counts else 0,
                "token_mean": round(statistics.mean(token_counts), 1) if token_counts else 0.0,
                "token_p95": _percentile(token_counts, 0.95),
                "token_p99": _percentile(token_counts, 0.99),
            },
        )

        total_chunks += len(chunks)
        total_text += len(text_chunks)
        total_table += len(table_chunks)
        total_low_value += len(low_value_chunks)
        all_token_counts.extend(token_counts)
        for depth, count in depths.items():
            aggregate_section_depths[depth] += count

    aggregate = {
        "total_files": len(samples),
        "total_chunks": total_chunks,
        "total_text_chunks": total_text,
        "total_table_chunks": total_table,
        "total_low_value_chunks": total_low_value,
        "low_value_rate_pct": round(total_low_value / total_chunks * 100, 1)
        if total_chunks
        else 0.0,
        "parse_failures": total_failures,
        "section_path_depths": dict(sorted(aggregate_section_depths.items())),
        "token_distribution": {
            "min": min(all_token_counts) if all_token_counts else 0,
            "max": max(all_token_counts) if all_token_counts else 0,
            "median": int(statistics.median(all_token_counts)) if all_token_counts else 0,
            "mean": round(statistics.mean(all_token_counts), 1) if all_token_counts else 0.0,
            "p50": _percentile(all_token_counts, 0.50),
            "p95": _percentile(all_token_counts, 0.95),
            "p99": _percentile(all_token_counts, 0.99),
        },
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        yaml.safe_dump(
            {"per_doc": per_doc, "aggregate": aggregate},
            sort_keys=False,
            allow_unicode=True,
        ),
        encoding="utf-8",
    )

    print(f"Sanity report written: {REPORT_PATH}")
    print(
        f"Files: {aggregate['total_files']}, Total chunks: {aggregate['total_chunks']} "
        f"(text={aggregate['total_text_chunks']}, table={aggregate['total_table_chunks']}), "
        f"low_value: {aggregate['total_low_value_chunks']} "
        f"({aggregate['low_value_rate_pct']}%), Failures: {aggregate['parse_failures']}",
    )
    print(
        f"Token dist (median={aggregate['token_distribution']['median']}, "
        f"p95={aggregate['token_distribution']['p95']}, "
        f"max={aggregate['token_distribution']['max']})",
    )

    return 1 if aggregate["parse_failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
