---
change_id: CH-012
spec_ref: ./spec.md
status: implementing     # planning | implementing | verifying | done
last_updated: 2026-06-09
---

# CH-012 — Checklist

> 逐項 atomic;done → `→[x]`,未做標 🚧 + 理由。Spec approved 2026-06-09(方向 A）。

## Setup
- [x] S1 — ADR-0049 寫 + Accepted(Chris）+ README index
- [x] S2 — spec status → approved
- [x] S3 — branch `feat/chat-image-section-fair`(off main);kickoff docs commit `cf94a63`

## Fix（主修）
- [x] F1 — `_find_section_neighbour_images`(`backend/generation/citation_image_neighbors.py`):候選由「`chunk_index` 升序 truncate」改「按 sub-section key(`section_path[:section_path_prefix_depth+1]`)分組 → round-robin 跨組取圖,組內 doc order,直到 max_aux」;只一層 sub-section / 無細分 → 退回現狀 document-order(bit-identical）
- [x] F2 — **決定:次修唔需要做**。/query drive-images-1 實測主修(F1）已令 20 distinct 圖 spread 過 §3.1.1(2)/§3.1.3(7)/§3.1.4(5)/§3.1.5(6),全 survive cap=20。`cap_images_per_answer` **不改**(Karpathy §1.2 唔做投機改動）

## Test（H6 — C05 image pipeline）
- [x] T1 — `_find_section_neighbour_images` round-robin unit test（4 新 test:spread budget / tail-not-starved / within-group doc-order / shared-figure dedup）:多 sub-section fixture(§a/§b/§c 各數圖),assert max_aux 內每 sub-section 有代表(非頭組塞滿）
- [x] T2 — production-preserve regression（26 既有 section/window-mode test 全綠;單 sub-section → document-order bit-identical 確認）:單層 sub-section → document-order bit-identical;depth=0 → 唔行;既有 neighbour-image test 全綠
- [ ] T3 —(若 F2 改 cap）cap section-fair test

## Verify
- [x] V1 — pytest **30 passed**（test_citation_image_neighbors）;ruff format clean;ruff check 只 2 pre-existing（B905 L83 `attach_neighbour_images` zip + I001 import block,皆 CH-011 已記錄保留,非我新增）；我嘅新 function + tests 零新 error
- [x] V2 — /query drive-images-1 GL03 **PASS**（AC1）:20 distinct 圖 by section = §3.1.1:2 / §3.1.3:7 / **§3.1.4:5** / **§3.1.5:6**（baseline 修前 §3.1.4+§3.1.5 = 0）。尾段 Approve/Reject + Post 唔再零圖
- [ ] V3 — 用戶 live 驗(chat UI hard refresh + 問 GL03,確認 Approve/Reject + Post 步驟有圖 + 順序 + 文字格式仍 OK）
- [ ] V4 —(可選 AC6）BUG-037 `--kb-id drive-images-1` eval 順手量化(視 Azure key + load）

## Closeout
- [ ] C1 — spec status → done;progress retro
- [ ] C2 — commit + ff-merge(用戶確認）;platform design doc §3.3 C-2 標 done
