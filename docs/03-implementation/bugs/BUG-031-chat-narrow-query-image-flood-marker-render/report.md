---
bug_id: BUG-031
title: Chat narrow-query over-attaches images (24 from image-dense mega-chunks) + inline citation markers render with no separator ("1234567891011")
severity: Sev3
status: fix-verified
opened: 2026-06-01
related:
  - frontend/app/(app)/chat/page.tsx (splitStringForPills inline pills + dedupedImages inline cards + ImageGallery)
  - references/design-mockups/ekp-page-chat.jsx (CitationPill ids[] gap:2/marginLeft:3 + ImageGallery render-all)
  - memory project-chat-demo-rag-quality-followups #1 (citation_expansion knobs) + #4 (BUG-027 neighbour attach)
---

# BUG-031 — Chat narrow-query image flood + citation marker run-together

## 1. Symptom

KB `test-kb-20260531-v1` (DRIVE AR manual). Query: **"how to Create Customer Payment Journal header ?"** (a narrow 4-step how-to). The answer **text is correct** (4 steps), but two visual anomalies:

- **(A) Image flood** — the answer renders **24 images** (inline `figure 1..24` cards in the answer body + a 24-item "REFERENCED SCREENSHOTS" gallery). Almost all are from one section, `2.1.3 System Instruction for each step`. Far too many for a narrow how-to.
- **(B) Citation markers run together** — the first answer sentence ends with `1234567891011` (eleven citation pills `[1]`..`[11]` rendered back-to-back with no separator).

## 2. Root Cause (ground-truth via backend `/query` + direct index read)

Effective chat retrieval knobs (persisted in `.env` by the user for the "show me ALL the integration scenarios" enumeration query — memory #1/#4) are all at **aggressive** values:

| knob | effective | default |
|---|---|---|
| `citation_expansion_max_aux` | 10 | 2 |
| `citation_expansion_section_path_prefix_depth` | 1 | 0 |
| `citation_neighbour_max_aux_images` | 8 | 2 |
| `citation_neighbour_section_path_prefix_depth` | 1 | 0 |
| `enable_parent_doc_retrieval` | True | False |

The DRIVE manual has **image-dense mega-chunks**: `2.1.3` → chunk ci=15 owns **57 images**, ci=8 owns 27, `4.1.3` ci=31 owns 25, `8.1.2` ci=51 owns 23 (30/68 chunks carry images; 278 refs / 221 unique).

**Causal chain (both A and B share it):** narrow query → LLM cites only `chunk-0007` → `citation_expansion` (max_aux=10 + same-section prefix_depth=1) expands to **11 same-section chunks** (`chunk-0004..0014`) → (B) those 11 expanded chunk-ids are appended to the first answer sentence as 11 adjacent `[chunk-…]` markers; (A) the expanded chunks' OWN images (incl. chunk-0008's 27) all flow into the citation set → deduped to 24 → rendered in full (inline cards + gallery, **no cap** — matches the mockup which also renders all).

The images are **not wrong** (all topically in §2.1.3, the section about creating the journal) — the problem is **volume** on a narrow query, and the **marker run-together** rendering.

- **(B) precise root**: `citation_expansion` appends markers with no separator (`[chunk-A][chunk-B]…`). Frontend `splitStringForPills` (page.tsx) renders one `<CitationPill>` per placeholder back-to-back with **no gap**. The **mockup** (`ekp-page-chat.jsx:516`) groups adjacent ids into ONE `<CitationPill ids={[…]}>` with `gap:2` between pills + `marginLeft:3` before the group. → EKP **drifted** from the mockup's spacing.
- **(A) precise root**: image-dense mega-chunks × aggressive citation_expansion. The mockup's `ImageGallery` (`ekp-page-chat.jsx:621`) renders all (`citations.map`), with a static "View all in Image Library →" overflow button — its demo data only had 2–5 images so it never flooded.

## 3. Fix (user-chosen: (B) render fix + (A) image cap 8; knobs NOT touched)

Display-layer only — no backend / retrieval / re-ingest change. User explicitly kept the aggressive knobs (they fix the enumeration query, memory #1/#4); the over-attach is mitigated at render time.

- **(B) — mockup-faithful drift correction** (NOT an H7 deviation; brings impl back toward mockup): `splitStringForPills` groups consecutive `⟦CITn⟧` placeholders into a single `inline-flex` wrapper with `gap:2` + `marginLeft:3`, mirroring the mockup's `CitationPill ids={[…]}`.
- **(A) — display cap to 8** (⚠️ **H7 DEVIATION, user-approved 2026-06-01**): inline answer-body cards + the "REFERENCED SCREENSHOTS" gallery both render only the first 8 of the deduped image list. The gallery **badge shows the true total** (e.g. 24). The existing **"View all in Image Library →"** button is **wired** to navigate to the KB images tab (`/kb/{kbId}?tab=images`, verified working — 221 imgs) so the overflow is reachable (without the wiring, capping would orphan images 9–24). Meta-row "N with screenshots" keeps the true total.

### H7 boundary

- (B) = H7-compliance (reverse-direction drift fix) → no STOP needed.
- (A) = H7 deviation: the mockup `ImageGallery` renders all images; a cap shows fewer. STOP+ask was raised; user approved "cap 8 + View all" 2026-06-01. Logged here + (if a plan exists) plan changelog. The mockup's existing "View all in Image Library →" overflow button is the design-intent affordance the cap leans on.

## 4. Verify

- type-check 0 errors; ESLint 0-err (1 pre-existing `<img>` warning); Vitest chat-meta-row **9 passed** (7 existing + 2 new: pill-group + image-cap), citation-images + chat-kb-sync green.
- **live Playwright** (`test-kb-20260531-v1`, same query; fresh bundle):
  - (B) answer renders **11 distinct bordered pills "1 2 3 … 11"** (screenshot) — not "1234567891011". Group wrapper `inline-flex gap:2px marginLeft:3px` × 11 children.
  - (A) screenshot imgs = **16** (8 inline + 8 gallery, was 48); inline figure cards = **8**; gallery badge = **"24"** (true total); "View all" href = `/kb/test-kb-20260531-v1?tab=images`.

## 5. Acceptance

- [x] (B) adjacent inline citation pills render with mockup `gap:2`/`marginLeft:3` (no run-together)
- [x] (A) inline cards + gallery cap to 8; badge = true total; "View all in Image Library" wired to `/kb/{kbId}?tab=images`
- [x] knobs untouched (display-layer only); answer text + citation data model unchanged
- [x] Vitest + tsc + ESLint green
- [x] live UI verify (Playwright — fresh bundle, no stale `.next`)

## 6. Changelog

| Date | Change | Approver |
|---|---|---|
| 2026-06-01 | Triage Sev3 + ground-truth root cause (aggressive citation_expansion knobs × image-dense mega-chunks → 24-img flood + 11 run-together markers) + user-chosen display-layer fix ((B) mockup-faithful pill grouping + (A) H7-deviation cap-8 with wired View-all) | user (chat: (B)+(A) cap, then cap=8) |
| 2026-06-01 | Fix landed + verified: type-check/ESLint/Vitest green (2 new tests); live Playwright confirmed 11 distinct pills + 16 imgs (8+8) + badge 24 + View-all → images tab. status → fix-verified | — |
