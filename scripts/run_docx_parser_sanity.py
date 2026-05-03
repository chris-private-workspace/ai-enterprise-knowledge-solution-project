"""W2 D1 F1 Docling parser sanity report on 6 sample Drive manuals.

Runs DoclingDocxParser over docs/06-reference/01-sample-doc/*.docx and emits a
YAML report at reports/w02_d1_docx_parser_sanity.yaml capturing per-doc parse
status, section coverage, image / table counts, and aggregate stats.

Usage (from repo root):
    backend/.venv/Scripts/python.exe -m scripts.run_docx_parser_sanity

Exit codes:
    0  — report generated, all 6 docs parsed (no parse_failed)
    1  — sample directory missing OR any doc parse_failed
"""

from __future__ import annotations

import sys
from pathlib import Path

# sys.path bootstrap: scripts run from project root, but backend/ ingestion
# package uses bare-prefix imports (e.g. `from ingestion.parsers.base ...`)
# matching the pytest pythonpath convention. Add backend/ to path so the
# inner imports resolve under both contexts.
_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import yaml  # noqa: E402  — after sys.path bootstrap

from ingestion.parsers.docx_parser import DoclingDocxParser  # noqa: E402  — after sys.path bootstrap

SAMPLE_DIR = Path("docs/06-reference/01-sample-doc")
REPORT_PATH = Path("reports/w02_d1_docx_parser_sanity.yaml")


def main() -> int:
    if not SAMPLE_DIR.is_dir():
        print(f"sample dir not found: {SAMPLE_DIR}", file=sys.stderr)
        return 1

    samples = sorted(SAMPLE_DIR.glob("*.docx"))
    if not samples:
        print(f"no .docx files in {SAMPLE_DIR}", file=sys.stderr)
        return 1

    parser = DoclingDocxParser()
    per_doc: list[dict[str, object]] = []
    aggregate = {
        "total_files": 0,
        "total_paragraphs": 0,
        "total_headings": 0,
        "total_images": 0,
        "total_tables": 0,
        "total_image_bytes": 0,
        "parse_failures": 0,
        "level_distribution": {},
    }
    levels: dict[int, int] = {}

    for s in samples:
        r = parser.parse(s)
        sha_set = {img.sha256 for img in r.embedded_images}
        for h in r.heading_tree:
            levels[h.level] = levels.get(h.level, 0) + 1
        coverage_pct = (
            round(len(r.heading_tree) / r.paragraphs_total * 100, 1)
            if r.paragraphs_total
            else 0.0
        )
        total_img_bytes = sum(len(img.image_bytes) for img in r.embedded_images)
        per_doc.append(
            {
                "filename": s.name,
                "size_kb": round(s.stat().st_size / 1024, 1),
                "parse_failed": r.parse_failed,
                "parse_error": r.parse_error,
                "paragraphs_total": r.paragraphs_total,
                "headings": len(r.heading_tree),
                "heading_coverage_pct": coverage_pct,
                "heading_level_distribution": dict(
                    sorted({h.level: sum(1 for x in r.heading_tree if x.level == h.level) for h in r.heading_tree}.items()),
                ),
                "first_5_heading_texts": [h.text[:80] for h in r.heading_tree[:5]],
                "embedded_images": len(r.embedded_images),
                "embedded_images_unique_sha256": len(sha_set),
                "embedded_images_total_bytes": total_img_bytes,
                "tables": len(r.tables),
                "raw_text_length": len(r.raw_text),
            },
        )
        aggregate["total_files"] = int(aggregate["total_files"]) + 1  # type: ignore[arg-type]
        aggregate["total_paragraphs"] = int(aggregate["total_paragraphs"]) + r.paragraphs_total  # type: ignore[arg-type]
        aggregate["total_headings"] = int(aggregate["total_headings"]) + len(r.heading_tree)  # type: ignore[arg-type]
        aggregate["total_images"] = int(aggregate["total_images"]) + len(r.embedded_images)  # type: ignore[arg-type]
        aggregate["total_tables"] = int(aggregate["total_tables"]) + len(r.tables)  # type: ignore[arg-type]
        aggregate["total_image_bytes"] = int(aggregate["total_image_bytes"]) + total_img_bytes  # type: ignore[arg-type]
        if r.parse_failed:
            aggregate["parse_failures"] = int(aggregate["parse_failures"]) + 1  # type: ignore[arg-type]

    aggregate["level_distribution"] = dict(sorted(levels.items()))
    aggregate["aggregate_heading_coverage_pct"] = (
        round(int(aggregate["total_headings"]) / int(aggregate["total_paragraphs"]) * 100, 1)
        if aggregate["total_paragraphs"]
        else 0.0
    )

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
    print(f"Files: {aggregate['total_files']}, Headings: {aggregate['total_headings']} "
          f"({aggregate['aggregate_heading_coverage_pct']}%), "
          f"Images: {aggregate['total_images']}, Tables: {aggregate['total_tables']}, "
          f"Failures: {aggregate['parse_failures']}")

    return 1 if aggregate["parse_failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
