---
bug_id: BUG-031
report_ref: ./report.md
last_updated: 2026-06-01
---

# BUG-031 — Checklist

## Triage + Diagnosis
- [x] symptom: narrow query "how to Create Customer Payment Journal header?" → 24 images + markers "1234567891011"
- [x] ground truth via /query: 11 citations (1 LLM cite chunk-0007 → expanded to 11 same-section)
- [x] ground truth via index read: image-dense mega-chunks (ci=15=57, ci=8=27 own imgs); 221 unique
- [x] effective knobs confirmed aggressive (expansion max_aux=10/prefix_depth=1, neighbour 8/1, parent_doc=true)
- [x] (B) root: citation_expansion appends adjacent markers + splitStringForPills no gap (mockup has gap:2/marginLeft:3)
- [x] (A) root: mega-chunks × aggressive expansion; mockup ImageGallery renders all (no cap)
- [x] user picked (B)+(A); cap=8; knobs NOT touched
- [x] H7: (A) cap = deviation (mockup render-all) → STOP+ask → user approved cap-8 + View-all

## Fix (B) — pill grouping (mockup-faithful)
- [x] splitStringForPills groups consecutive ⟦CITn⟧ into one inline-flex wrapper (gap:2, marginLeft:3)

## Fix (A) — image cap 8 (H7 deviation, approved)
- [x] INLINE_IMAGE_CAP=8; inline cards + gallery render first 8 of deduped list
- [x] gallery badge shows true total; meta-row keeps true total
- [x] thread kbId → ChatThread → MessageRow → ImageGallery
- [x] wire "View all in Image Library →" → /kb/{kbId}?tab=images

## Test
- [x] new Vitest: pill grouping (adjacent pills spaced) + image cap (≤8, badge=total) — 2 new, chat-meta-row 9 passed
- [x] existing citation-images + chat-meta-row + chat-kb-sync green (20→ now 9 in meta-row file); tsc 0; ESLint 0-err (1 pre-existing img warning)

## Verify
- [x] live Playwright (fresh bundle — HMR ok, no stale): markers = 11 DISTINCT pills "1 2 3 .. 11" (not "1234567891011"); screenshot imgs 16 (8 inline + 8 gallery, was 48); gallery badge "24" (true total); inline figure cards 8; View-all href `/kb/test-kb-20260531-v1?tab=images`

## Closeout
- [x] commit + push
- [x] memory append (BUG-031 finding + H7 cap deviation)
