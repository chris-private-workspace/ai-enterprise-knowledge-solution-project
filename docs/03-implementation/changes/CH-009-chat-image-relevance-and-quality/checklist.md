---
change_id: CH-009
spec_ref: ./spec.md
adr_ref: ../../../adr/0046-chat-image-relevance-decorative-dims.md
---

# CH-009 — Checklist

> 逐項 atomic;done → `→[x]`,未做標 🚧 + 理由(per CLAUDE.md sacred rule)。**Code GATED on ADR-0046 Accept(H1)。**

## I-A — Decorative filter + dims probe (OD-1)
- [ ] A1 — PNG IHDR dims probe helper(stdlib `struct`;非 PNG / 損壞 → `None`);`ScreenshotExtractor.extract` populate `ScreenshotRecord.width/height`
- [ ] A2 — dims 落 `ChunkRecord` ImageRef(C03 schema)+ index `embedded_images_json` serialize/parse 帶 width/height
- [ ] A3 — `decorative` 判定(`min(width,height) < 64px`,常數可調)+ chat display filter 走 decorative(backend `/query` image build 或 frontend display — 定位見實作)
- [ ] A7a — architecture.md §3.5/§3.6 文字更新(ImageRef dims + decorative filter)
- [ ] A7b — C01 + C03 design note bump

## I-B — Per-KB cap wiring (OD-2)
- [ ] B1 — frontend `INLINE_IMAGE_CAP` 改讀 per-KB `max_images_per_answer`(`/query` response 或 KB config;null fallback 8)
- [ ] B2 — C10 design note bump(cap wiring)

## I-C — Query-relevance ordering (OD-3)
- [ ] C1 — 圖片按 owning citation `relevance_score` 揀入 cap(最相關行先);cap 內 document-order(Finding D)顯示
- [ ] C2 — **H4 guard**:確認只用文字 rerank 信號(無 image embedding / multimodal);ADR 邊界 cross-ref
- [ ] C3 — C05 + C10 design note bump(relevance-select + document-display)

## Tests (H6)
- [ ] T1 — dims probe helper:PNG → 正確 w/h;非 PNG / 截斷 → None
- [ ] T2 — decorative 判定:< 64px → decorative;≥ → keep;display filter 走 decorative
- [ ] T3 — cap wiring:per-KB `max_images_per_answer` 生效;null → 8 fallback
- [ ] T4 — relevance-select + document-display 排序(unit;mock citations 不同 relevance_score + section)

## Re-index + Verification
- [ ] V1 — backend pytest(ingestion + generation)+ frontend lint/test pass + ruff + mypy 改檔 0 新 error(AC6)
- [ ] V2 — `drive-images-1` in-place re-index(A1 dims populate 生效)
- [ ] V3 — `/query` GL「post a journal entry」:ImageRef 帶真實 w/h(非 0)+ 燈泡 decorative 已 filter(AC1+AC2)
- [ ] V4 — cap per-KB 可控(AC3)+ inline 圖片 relevance-select + document-display(AC4)
- [ ] V5 — chat live 驗(用戶):GL 答案無裝飾燈泡 + 圖貼題 + 文件次序
- [ ] V6 — 無 regression:text-only / 無圖 KB 不變;Finding D dedup work;CH-008 文字 rerank 不受影響(AC5)

## Closeout
- [ ] C-1 — spec status → done;progress closeout retro
- [ ] C-2 — ADR-0046 Proposed → Accepted
- [ ] C-3 — commits 對應 Day-N(R2);ff-merge 入 main(用戶確認)
