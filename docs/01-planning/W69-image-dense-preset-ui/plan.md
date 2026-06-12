---
phase: W69
name: image-dense-preset-ui
status: closed       # draft | active | closed
created: 2026-06-12
owner: "Claude (AI) — 技術 Lead Chris 審閱"
gap: "圖密手冊配方(cap=80 / rerank_k=10 / max_aux=40,W62–W68 實證)而家要逐欄手動 PATCH;一鍵套用 UI 完成 per-KB config 願景嘅 config-lifecycle 閉環(設定 → 試跑 → 驗證 → 持久化)"
adr: "—(無需 — frontend-only 便利按鈕,寫現有 KbConfig 欄位;ADR-0040 機制 as-designed)"
spec_refs:
  - docs/adr/0040-per-kb-tunable-retrieval-config-scope.md   # tuning card + PATCH 機制根據
  - docs/adr/0054-dedup-before-cap-image-budget.md           # cap=80 語義(unique 預算)
  - docs/01-planning/W68-dedup-before-cap/                   # 配方終態實證(80/10/40)
---

# W69 — 圖密手冊 preset 一鍵套用 UI

> **緣起**:W59→W68 image-recall 弧收官(0.574 → ~1.00),配方三件套
> `max_images_per_answer=80` + `default_rerank_k=10` + `citation_neighbour_max_aux_images=40`
> 已實證並 persist 到 drive-images-1。但新圖密 KB 要套配方仍需逐欄手動改 —
> 一鍵套用完成用戶 2026-06-01 願景嘅閉環。用戶 2026-06-12 拍板開呢條線。
>
> **R6 核實(plan-text grounding)**:tuning card = `frontend/app/(app)/kb/[id]/page.tsx:2736`
> (W43 F3.2);12 knobs 喺 `knobs` state,**但 `default_rerank_k` 係獨立 `rerankK` state**
> (preset handler 要兩邊都填);PATCH full-replacement 已 wired(`buildConfigBody`);
> mockup 對應 = `references/design-mockups/ekp-page-kb.jsx:832-873`(card 已存在,preset
> 行係新增 → mockup 先行);test pattern = `tests/unit/kb-settings-tuning.test.tsx`。

## 1. 行為設計

- **Preset 定義**(frontend 常量,Tier 1 一個 preset 起步):
  `圖密步驟手冊(image-dense manual)` = `{ default_rerank_k: 10, citation_neighbour_max_aux_images: 40, max_images_per_answer: 80 }`
  — 正正係 W62–W68 實證三件套,出處注釋標明 phase + ADR-0054。
- **套用 = 填表,唔即時 PATCH**:撳 preset → 三個欄位填入草稿值(行現有 dirty 偵測)→
  用戶可先「試跑(config-test)」驗證 → 滿意先撳「儲存到此 KB」persist。
  呢個流程正正係 config-lifecycle loop(設定 → 試跑 → 驗證 → 持久化),
  亦避免一鍵誤寫(per-KB PATCH 係 full replacement)。
- **已套用偵測**:三個欄位現值 == preset 值 → 按鈕顯示「已套用」disabled 態(affordance)。

## 2. 交付物 + Gate

| # | 交付 | Gate |
|---|---|---|
| **F1** | mockup 先行(H7):`ekp-page-kb.jsx` tuning card 加 preset 行(按鈕 + 配方摘要 + 來源注釋) | mockup 視覺確定,先於 frontend 實作 |
| **F2** | frontend:`page.tsx` 加 `IMAGE_DENSE_PRESET` 常量 + 套用 handler(`setRerankK` + 2×`setKnob`)+ preset 行 UI 對齊 mockup | tsc 0 / eslint 0 |
| **F3** | tests:`kb-settings-tuning.test.tsx` 加 case(套用後欄位值正確 / save body 含 preset 值 / 已套用 disabled 態) | vitest 全綠 |
| **F4** | 驗證:live UI 對 mockup 逐項 fidelity check(H7 self-verify)+ drive-images-1 顯示「已套用」態 | §12 fidelity check 過 |
| **F5** | doc-sync(rollup §4.5 + memory)+ closeout | — |

## 3. Acceptance Criteria

- **AC1**:撳 preset 後三欄填入 80/10/40,dirty 偵測亮起,**未有任何 PATCH 發出**。
- **AC2**:照常「儲存到此 KB」→ PATCH body 含 preset 三值 + 其餘欄位原樣(full-replacement 語義不變)。
- **AC3**:drive-images-1(已 persist 80/10/40)入 settings tab → preset 按鈕顯示「已套用」。
- **AC4**:H7 — implementation 同 mockup 逐項對齊(layout / spacing / typography / class 用法);
  mockup 唔清晰位 STOP+ask,唔自行 approximate。
- **AC5**:零 backend 改動、零 schema 改動。

## 4. 風險

- **R1 🟢 rerank_k 喺 General 區唔喺 tuning card**:preset 跨兩個 UI 區寫值 — 處理 =
  preset 行注明「含 rerank_k(上方 General 區)」,套用後兩區都反映。
- **R2 🟢 mockup 表達**:preset 行係 tuning card 內新增 — 跟 W43/W65 mockup-first
  precedent,唔屬 8-view layout philosophy 改動(card 內 additive row)。

## 5. 非目標

- ❌ Preset 管理 CRUD(自定義 preset / 多 preset 清單)— Tier 1 一個實證配方起步,
  通用機制等真需求(Karpathy §1.2)。
- ❌ Backend preset API / preset persist 概念 — 純 frontend 常量。
- ❌ Doc-level preset(per-doc tuning tab,ADR-0051)— 本 phase 只做 KB-level。
- ❌ 自動偵測「呢個 KB 係咪圖密」— 用戶自行判斷撳唔撳。

## 6. H 核對

- **H1**:不觸 — 無 component / schema / scope 變動;ADR-0040 機制 as-designed 用法。
- **H7**:**觸發並跟流程** — mockup 先行(F1)+ 實作對齊(F2)+ fidelity self-check(F4)。
- **H2/H3/H4/H5**:不觸。**H6**:N/A(無 backend);frontend test 同步加(F3)。

## 7. Changelog

| Date | Change | Reason |
|---|---|---|
| 2026-06-12 | Initial plan(active)| 用戶拍板 preset 一鍵套用線;R6 grounding 完成(tuning card / rerankK 獨立 state / mockup card 已存在 / test pattern)|
| 2026-06-12 | **Phase closed**(F1–F5 全 done,同日)| AC1–AC5 全達:mockup 先行 → 實作對齊 → test 7/7(全套 147/147)→ Playwright live 驗 AC3(drive-images-1 自動「✓ 已套用」)。code `2424695`。config-lifecycle 閉環 UI 面完成 |
