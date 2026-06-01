---
bug_id: BUG-031
report_ref: ./report.md
checklist_ref: ./checklist.md
status: fix-verified
---

# BUG-031 — Progress

## Day 1 — 2026-06-01

### Triage + Diagnosis (ground-truth, no guessing)
- User live-UI test on `test-kb-20260531-v1`, query "how to Create Customer Payment Journal header?": answer text correct (4 steps) BUT 24 images + first sentence markers run together as "1234567891011".
- Backend `/query` repro: 11 citations all in §2.1.3, only 3 carry images (ci=7→8, ci=8→27, ci=4→1), other 8 = 0 → proves NOT uniform neighbour-attach; images are chunk-OWN.
- Direct index read (throwaway `_diag_imgcount.py`, deleted): image-dense mega-chunks — ci=15=57 own imgs, ci=8=27, ci=31=25, ci=51=23; 30/68 chunks carry imgs; 278 refs / 221 unique.
- Effective knobs (printed from Settings): `citation_expansion_max_aux=10`, `..._section_path_prefix_depth=1`, `citation_neighbour_max_aux_images=8`, `..._prefix_depth=1`, `enable_parent_doc_retrieval=True` — all the aggressive values the user persisted via `.env` for the enumeration query (memory #1/#4).
- Causal chain: narrow query → LLM cites chunk-0007 → citation_expansion expands to 11 same-section chunks → (B) 11 adjacent markers on sentence 1; (A) expanded chunks' own images (chunk-0008's 27 etc.) flood → deduped 24 → rendered in full (no cap).

### Decision (user via 2× AskUserQuestion)
1. Direction = "(B) marker render + (A) image cap" (knobs NOT touched — display-layer only).
2. (A) image cap is an H7 deviation (mockup `ImageGallery` renders all). STOP+ask raised → user approved **cap=8 + "View all in Image Library" overflow**.
- (B) = mockup-faithful drift correction (mockup `CitationPill ids[]` has gap:2/marginLeft:3); EKP drifted to no-gap. NOT an H7 deviation.

### Mockup checks (H7, before coding)
- `ekp-page-chat.jsx:516` CitationPill: wrapper `inline-flex gap:2 marginLeft:3`, `ids[]` array → confirms (B) target spacing.
- `ekp-page-chat.jsx:621` ImageGallery: `citations.map` render-all + static "View all in Image Library →" → confirms (A) cap = deviation; View-all is the design-intent overflow affordance.

### Done (fix — frontend display layer only, knobs untouched)
- (B) `splitStringForPills` (chat/page.tsx) groups consecutive `⟦CITn⟧` placeholders into one `inline-flex` wrapper `gap:2 marginLeft:3` (mockup ekp-page-chat.jsx:519). H7-compliance drift fix.
- (A) `INLINE_IMAGE_CAP=8`; `cappedImages = dedupedImages.slice(0,8)` drives inline cards + gallery; gallery `totalCount` keeps true total for the badge; meta-row keeps true total; threaded `kbId` ChatThread→MessageRow→ImageGallery; "View all in Image Library →" wired to `<Link href={/kb/${kbId}?tab=images}>`. H7 deviation (mockup renders all), user-approved.

### Verify
- type-check 0 errors; ESLint 0-err (1 pre-existing `<img>` warning, not mine); Vitest chat-meta-row **9 passed** (7 existing + 2 new BUG-031: pill-group + image-cap), citation-images + chat-kb-sync green.
- **live Playwright** (`test-kb-20260531-v1`, same query "how to Create Customer Payment Journal header?"; fresh bundle — HMR picked up, no stale-`.next` this time):
  - (B) answer first sentence now renders **11 DISTINCT bordered pills "1 2 3 … 11"** (screenshot confirmed) — no more "1234567891011". Group wrapper present (`inline-flex gap:2px marginLeft:3px`, 11 children).
  - (A) screenshot imgs = **16** (8 inline cards + 8 gallery, was 48); inline figure cards = **8**; gallery badge = **"24"** (true total); "View all" href = `/kb/test-kb-20260531-v1?tab=images`.
- console errors present (theme/lucide hydration + `/api/backend/notifications` 404) are PRE-EXISTING dev-mode noise, unrelated to this fix (render is correct).

### Commits
| Hash | Subject |
|---|---|
| _(this commit)_ | fix(frontend): BUG-031 cap chat images to 8 + group adjacent citation pills |

### Lessons
- ONE narrow query exposed BOTH symptoms from the SAME root (aggressive citation_expansion knobs the user kept for enumeration queries) — but the fix is display-layer (cap + group), not knob retuning, so the enumeration-query win (memory #1/#4) is preserved. text/image completeness vs narrow-query volume is a render-time tradeoff, not a retrieval one.
- H7 discipline caught a real deviation: I'd called the image cap "pure additive zero-risk" — reading the mockup showed `ImageGallery` renders ALL (no cap), so capping IS an H7 deviation → STOP+ask → user approved. (B) by contrast was H7-COMPLIANCE (impl had drifted from the mockup's gap:2/marginLeft:3 pill group).
- CSS `gap` does not change `textContent` — the group wrapper's textContent stays "1234567891011"; only a SCREENSHOT proves the visual fix (11 distinct badges). Don't trust textContent for a spacing fix.
