"""W86 DD-14 降級版 — preset 出廠中值 ingest 信號 audit.

Reuse `profiler_accuracy_harness` 的 real-parse + DocumentProfiler,額外按 *classified
profile* group 收集 `ProfileSignals` 圖量分布,對照 `profile_presets.PROFILE_PRESETS` 的
`max_images_per_answer` cap → 判每 profile cap 是否被真實 sample 圖量截斷。

方法論邊界（誠實標,per W86 plan §1）：
- doc `embedded_images` = 整份文件圖數（非單 answer）;cap = per-answer 上限。
- doc_images ≤ cap → 該文件任何 query 絕不可能被 cap 截斷（絕對安全,可數據驗證）。
- doc_images > cap → query-dependent（單 query 召回幾多 section 決定,需 retrieval GT — blocked）。
- scan（P4）embedded=0（page raster 非 embedded）,圖量信號 N/A。
- 其他旋鈕（neighbour / marker / answer_detail）非圖量函數,不在本 audit 數據範圍（靠 D1 rationale）。

Local-only（sample-doc gitignored）. Run from repo root:
    backend/.venv/Scripts/python.exe scripts/dd14_preset_signal_audit.py
"""

from __future__ import annotations

import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "backend"))

# Windows console default cp1252 chokes on 中文 表頭 (UnicodeEncodeError); force utf-8.
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]

from profiler_accuracy_harness import (  # noqa: E402
    EXPECTED,
    PROFILER,
    SAMPLE,
    SCAN,
    parse_doc,
)

from ingestion.parsers.base import ParserResult  # noqa: E402
from ingestion.profile_presets import PROFILE_PRESETS  # noqa: E402


def _cap_of(profile: str) -> int | None:
    preset = PROFILE_PRESETS.get(profile)
    return preset.max_images_per_answer if preset is not None else None


def main() -> None:
    # profile → list[(name, images, img_density, tables, paragraphs, pdf_pages)]
    groups: dict[str, list[tuple[str, int, float, int, int, int | None]]] = defaultdict(list)
    t0 = time.monotonic()

    # content docx / pptx / born-digital pdf — real parse
    for path in sorted(SAMPLE.glob("*.*")):
        if path.suffix.lower() not in (".docx", ".pptx", ".pdf"):
            continue
        if EXPECTED.get(path.name) is None:
            continue
        pr = parse_doc(path)
        r = PROFILER.profile(pr, path)
        s = r.signals
        groups[r.profile].append(
            (path.name, s.images, s.img_density, s.tables, s.paragraphs, s.pdf_pages)
        )
        print(f"  {path.name} -> {r.profile} (img={s.images})", flush=True)

    # scan pdf — empty ParserResult skip OCR; P4 embedded=0 by nature (pre-OCR P4 detect)
    for path in sorted(SCAN.glob("*.pdf")):
        pr = ParserResult(source_path=path, doc_format="pdf", doc_title=path.stem)
        r = PROFILER.profile(pr, path)
        s = r.signals
        groups[r.profile].append(
            (path.name, s.images, s.img_density, s.tables, s.paragraphs, s.pdf_pages)
        )

    # --- audit report ---
    print(f"\n{'=' * 92}\n=== W86 preset signal audit ({time.monotonic() - t0:.0f}s) ===\n{'=' * 92}")
    print("| profile | n | cap | img min/中位/max | 截斷風險 verdict |")
    print("|---|---|---|---|---|")
    for profile in sorted(groups):
        docs = groups[profile]
        imgs = [d[1] for d in docs]
        cap = _cap_of(profile)
        lo, mid, hi = min(imgs), int(statistics.median(imgs)), max(imgs)
        is_scan = profile.startswith("P4")
        if cap is None:
            verdict = "inherit（per-KB/global,無 cap）"
        elif is_scan:
            verdict = "N/A（scan embedded=0,圖=OCR pages,需 retrieval 驗）"
        elif hi <= cap:
            verdict = f"SAFE（全 {len(docs)} sample 整份圖量 ≤ cap,絕不截斷）"
        else:
            over = sum(1 for x in imgs if x > cap)
            verdict = f"QUERY-DEP（{over}/{len(docs)} 整份圖量>cap,單 query 召回需 retrieval 驗 — blocked）"
        print(f"| {profile} | {len(docs)} | {cap} | {lo}/{mid}/{hi} | {verdict} |")

    # --- per-doc detail (透明度) ---
    print("\n=== per-doc 圖量 detail（按圖量降序）===")
    for profile in sorted(groups):
        print(f"\n[{profile}] cap={_cap_of(profile)}")
        for name, img, imgd, tbl, para, pages in sorted(groups[profile], key=lambda d: -d[1]):
            short = name if len(name) <= 50 else name[:47] + "..."
            pg = f" pages={pages}" if pages else ""
            print(f"  {img:>3} img (d={imgd:.2f}) tbl={tbl:>2} para={para:>4}{pg}  {short}")


if __name__ == "__main__":
    main()
