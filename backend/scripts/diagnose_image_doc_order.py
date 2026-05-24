"""Diagnose Docling iterate_items doc_order ordering for picture vs heading events.

W25 D2 — investigate image-section attribution off-by-one (chunk 8 "3.7
Idempotency" attributed Figure 1 visually belonging to section "4. High-level
architecture"). Issue 2 per chat 2026-05-24.

Usage:
    cd backend
    ./.venv/Scripts/python.exe -m scripts.diagnose_image_doc_order \\
        "/path/to/DCE_Integration_Platform_Implementation_Plan.docx"

Outputs:
    - Event stream sorted by doc_order
    - Marks PICTURE events with leading [PIC]
    - Marks HEADING events with [HDR L<n>]
    - Marks TABLE events with [TBL]
    - Marks text body with [TXT]
    - Annotates the section-attribution outcome for each PIC: which open
      section it'd land in per the chunker's current accumulator semantics
      (`backend/ingestion/chunker/layout_aware.py` main loop).
"""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.diagnose_image_doc_order <path-to.docx>")
        return 2

    docx_path = Path(sys.argv[1])
    if not docx_path.exists():
        print(f"FAIL: {docx_path} does not exist")
        return 2
    if docx_path.suffix.lower() != ".docx":
        print(f"FAIL: expected .docx extension, got {docx_path.suffix}")
        return 2

    print(f"=== Diagnosing {docx_path.name} ===")
    print()

    from ingestion.parsers.docx_parser import DoclingDocxParser

    parser = DoclingDocxParser()
    try:
        result = parser.parse(docx_path)
    except Exception as exc:  # noqa: BLE001
        print(f"PARSE FAIL: {type(exc).__name__}: {exc}")
        return 1

    print(f"Parsed: {len(result.paragraphs)} paragraphs, "
          f"{len(result.embedded_images)} images, "
          f"{len(result.tables)} tables")
    print()

    # Build event stream same way layout_aware._merge_events does
    events: list[tuple[int, str, str]] = []
    for p in result.paragraphs:
        kind = (
            f"[HDR L{p.heading_level}]"
            if p.kind == "heading"
            else f"[{p.kind.upper()[:3]}]"
        )
        snippet = (p.text or "").replace("\n", " ")[:80]
        events.append((p.doc_order, kind, snippet))
    for img in result.embedded_images:
        events.append((img.doc_order, "[PIC]", f"sha256={img.sha256[:12]}.. alt={(img.alt_text or '')[:60]}"))
    for tbl in result.tables:
        events.append((tbl.doc_order, "[TBL]", f"{len(tbl.rows)}rows x {len(tbl.headers or []) or (len(tbl.rows[0]) if tbl.rows else 0)}cols"))
    events.sort(key=lambda e: e[0])

    # Simulate chunker accumulator section attribution per layout_aware.py:102+
    print("=== Event stream (sorted by doc_order) ===")
    print(f"{'doc_order':>9}  {'kind':<12}  {'attributed_section':<60}  text")
    print("-" * 200)

    current_section = "<pre-heading orphan>"
    section_stack: list[tuple[int, str]] = []
    pic_attributions: list[tuple[int, str]] = []  # (doc_order, attributed_section)
    for doc_order, kind, snippet in events:
        if kind.startswith("[HDR"):
            # parse level from "[HDR L<n>]" — slice from index 6 (skip "[HDR L")
            lvl = int(kind[6:].rstrip("]"))
            while section_stack and section_stack[-1][0] >= lvl:
                section_stack.pop()
            section_stack.append((lvl, snippet))
            current_section = " > ".join(s[1] for s in section_stack)
        elif kind == "[PIC]":
            pic_attributions.append((doc_order, current_section))
        # tables + text don't change attribution

        print(f"{doc_order:>9}  {kind:<12}  {current_section[:60]:<60}  {snippet}")

    print()
    print("=== Picture attribution summary ===")
    print(f"{'pic_doc_order':>13}  attributed_to_section")
    print("-" * 120)
    for doc_order, sec in pic_attributions:
        print(f"{doc_order:>13}  {sec}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
