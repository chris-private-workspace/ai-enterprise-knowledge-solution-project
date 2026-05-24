---
bug_id: BUG-020
title: "Chat 回應結尾缺 mockup CitationPill hover popover 機制 + ImageGallery `>=2` gate 令 1-image case 缺 collective screenshot section"
severity: Sev2
status: done
reported: 2026-05-24
reporter: "Chris(chat 2026-05-24 W25 D2 — BUG-019 fix landed `d586fc3` 確認 inline image 顯示 OK 之後,user-eye cross-check chat dialogue 對比 mockup `ekp-page-chat.jsx`,觀察到 2 個額外 mockup-faithful surface 缺失:(a) 每段回應結尾無 citation pill icons 配 hover popover 顯示詳細 source 內容 (b) 1-image 情境下 ImageGallery `>=2` gate 令『Referenced screenshots』collective section 完全唔出)"
affects_components: [C10]    # Chat Interface UI
spec_refs:
  - architecture.md §5.4     # Chat View spec
  - references/design-mockups/ekp-page-chat.jsx  # H7 canonical visual spec (line 515-578 CitationPill hover popover + line 354-357 ImageGallery `>=2` gate)
  - CLAUDE.md §5.7           # H7 Design Fidelity Constraint
related: [BUG-009, BUG-010, BUG-011, BUG-012, BUG-013, BUG-014, BUG-015, BUG-016, BUG-017, BUG-019]
---

# BUG-020 — Chat footer missing CitationPill hover + Single-screenshot strip

> **Report version**:1.0(initial)
> **Triage approver**:AI self-triaged **Sev2** per CLAUDE.md §5.7 H7 — design fidelity violation,同 BUG-019 同層 W22 regression / 衍生 issue。User user-eye verify cascade extending to 11 個 bug。

## 1. Symptom

User 喺 Chat page query「what is high-level architecture」against `sample-document-with-image-1` KB,response 帶 1 citation × 1 embedded image。BUG-019 fix(commit `d586fc3`)之後,InlineImageCard 正確 inline 顯示。但 user-eye cross-check mockup `ekp-page-chat.jsx` 後識別 2 個額外缺失:

**Issue 1 — CitationPill icons + hover popover 完全冇**:
- 每段 assistant 回應結尾應該有 citation pill icons(`[1]`、`[2]` 等 numeric badges)
- 滑鼠 hover 時應該彈出 popover 詳細顯示對應 source(file name + section path + chunk title + relevance score)
- 現實:答案文字內仲有 LLM 嘅 verbose marker `(chunk kb=..., doc=..., chunk=NNNN)`,但結尾完全冇 pill icon row + 冇 hover popover 機制

**Issue 2 — Referenced screenshots collective section 喺 1-image case 唔出**:
- 對話視窗結尾應該有「Referenced screenshots」labelled section(per mockup line 621-664 ImageGallery)
- 現實:`ImageGallery` gate `>= 2`(per mockup line 354-357 conformant),user query 只有 1 image citation → gallery 完全 skip → user 視覺上感覺「冇 referenced screenshots 部分」

## 2. Reproduction Steps

1. 確保 backend `/query` 已 wire citation 完整(BUG-019 chain DONE)
2. 確保 frontend BUG-019 fix landed(InlineImageCard inline rendering OK)
3. 打開 `/chat`,select KB `sample-document-with-image-1`
4. Query「what is high-level architecture」(returns 1 citation × 1 embedded image)
5. **Expected**(per mockup line 470-498 + 515-578 + 621-664 整套 chat surface):
   - 答案文字 inline 帶 InlineImageCard ✅(BUG-019 已 fix)
   - 答案結尾有 CitationPill icons,hover 彈 popover with file/section/score detail ❌
   - 1-image case 有 collective「Single screenshot」mini-section(per user-pick option 3 hybrid;NOT mockup exact behavior — mockup `>=2` gate skips for 1)❌
6. **Actual**:
   - 答案 inline 帶 InlineImageCard ✅
   - 結尾無 CitationPill — code 內 `InlineCitationPills` 存在(line 1238)但 gate 在 `citationMode === 'inline'`(line 1163);`citationMode` hard-coded `'sidebar'`(line 166)→ 永遠 false
   - Mockup `CitationPill` hover popover behavior(line 515-578)完全冇 port 入 frontend
   - 1-image case 無 ImageGallery render(per `>=2` gate line 1175)

## 3. Root Cause

**Issue 1**:雙重 root cause —
- (a) `InlineCitationPills` rendering gated on `citationMode === 'inline'`(line 1163-1164),但 mode hard-coded `'sidebar'`(line 166 per W22 F4 file header comment line 28「citationMode is fixed at `sidebar`」)→ pills 永遠唔 render
- (b) `InlineCitationPills` 即使 render,亦只係 numeric badges with HTML `title` tooltip — 並非 mockup `CitationPill`(line 515-578)嘅 hover popover behavior(file icon + name + section path + relevance score in a card overlay)。Mockup 完整 hover popover 機制完全冇 port 入 frontend(W22 silent drop)

**Issue 2**:`ImageGallery` gate `>= 2`(line 1175)直接複製 mockup line 354-357 gate(mockup-conforming behavior),但 user query 數據分布實際係 1 image citation per typical query → gallery 完全 skip。Mockup design intent 係「collective list 為 2+ images;1 image 走 inline only」,但 user UX expectation 係「有 image 就見到 Referenced screenshots labelled section」。User pick option 3 hybrid → 保留 mockup `>= 2` for full ImageGallery + ADD NEW Single-screenshot mini-section for `=== 1` case(deviation from mockup,but user UX-driven)

## 4. Scope

- ✅ Backend:NO change(BUG-010 + BUG-019 wiring 完整)
- ❌ Frontend `frontend/app/(app)/chat/page.tsx`:
  - (a) Remove `citationMode === 'inline'` gate → always render CitationPill row
  - (b) Refactor / replace `InlineCitationPills` → mockup-faithful CitationPill with hover popover(file icon + doc title + section + score per pill)
  - (c) NEW `<SingleScreenshotStrip>` component for `imageCitations.length === 1` case;render below InlineImageCard region,gated on === 1(exclusive with ImageGallery >=2)
- ❌ Frontend test:assertion updates for CitationPill hover popover + Single-screenshot strip render conditions

## 5. Severity Rationale

**Sev2** per CLAUDE.md §5.7 H7 Design Fidelity Constraint:

- H7 trigger:「**寫 / 改前端 page 嘅 implementation 同對應 mockup 任何一項唔對齊**」+「**mockup interaction states 任一唔對齊**」
- W22 regression / 衍生 issue:同 BUG-019 同層;double-pattern「W22 missing-component silent drop」+「gating misconfiguration」
- 影響 user-facing chat surface 嘅 functional element(hover popover)+ visual element(collective screenshot section)
- 11-bug cascade extension(BUG-009/010/011/012/013/014/015/016/017/019/020)— 由 image-pipeline backend → presentation 完整 chain

## 6. Acceptance for Fix

- [ ] **Issue 1.a Gating fix**:Remove `citationMode === 'inline'` gate;CitationPill always render when `message.citations.length > 0`
- [ ] **Issue 1.b CitationPill hover popover restore**:Port mockup line 515-578 嘅 hover popover behavior:per-pill hoverState + absolute-positioned popover with file icon + doc title + section path + relevance score;preview text 因為 Citation schema 冇 `preview` field 所以 fallback to `chunk_title`(if available)or omit
- [ ] **Issue 2 Single-screenshot mini-section**:NEW `<SingleScreenshotStrip>` component;render when `imageCitations.length === 1`;mockup-derived compact visual(label + 1 thumbnail row + on-click open modal);place between InlineImageCard render region and ImageGallery `>=2` gate
- [ ] H7 per-page verification:對齊 mockup line 515-578 CitationPill behavior + mockup ImageGallery section spirit(label + thumbnail + click→modal),Single-screenshot 屬 mockup-derived deviation per user pick
- [ ] Vitest unit test:assert CitationPill renders unconditionally with citations;hover triggers popover content;SingleScreenshotStrip renders for === 1 imageCitations
- [ ] Verify gates:`tsc --noEmit` exit 0 / `next lint` clean / `[oklch`=0 milestone preserved / backend pytest 13/13 citation tests unchanged
- [ ] User-eye runtime verify:re-query → 見 CitationPill at end + hover popover + Single-screenshot section(consolidated post-commit walkthrough per cascade pattern)

## 7. Related

- BUG-009-019 cascade(W25 D1-D2 image-pipeline + chat-presentation 10-bug closure)
- ADR-0031 Option B(W20 F3 advanced chat surfaces — original CitationPill + ImageGallery scope)
- CLAUDE.md §5.7 H7 Design Fidelity Constraint
- `feedback_design_fidelity.md` memory(D11「remove pre-W22 UI that IS in mockup through misjudgment」candidate per BUG-019 postmortem;BUG-020 extends with double-pattern「gating misconfiguration」)
