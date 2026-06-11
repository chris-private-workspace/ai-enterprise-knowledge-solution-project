# W61 — progress(cap 放寬軸 A/B)

> Daily progress + decisions + commits + 結尾 retro。對應 plan.md / checklist.md。

## Day 1（2026-06-11）— kickoff + grounding

### 開場 grounding（落手前核實,防 W60 假設陷阱）
- Session start + pre-flight 全綠:Docker daemon up / ekp-postgres healthy + `SELECT 1` / Langfuse
  `/api/public/health` 200（container flag unhealthy = timing artifact,以 endpoint 為準）/ backend
  `/health` 200。**azurite 起初 down**（port 10000 無 LISTEN）→ native Plan B 起返（PID 23256）。
- 用戶選 **cap 放寬軸 A/B**（prose 第二份 GT 延後）。
- `GET /kb/drive-images-1` 確認 per-KB config:`max_images_per_answer=20` + DD-4 三旋鈕
  `enable_parent_doc_retrieval=false / citation_expansion_max_aux=10 /
  citation_expansion_section_path_prefix_depth=1`（W60 已改回,**非** null）。另留意
  `citation_neighbour_max_aux_images=18`（per-citation aux 上限,非 total binding cap）。
- **cap 鏈核實**（防 W60 env-override 踩坑）:`/query` route query.py:492
  `cap_images_per_answer(citations, effective.max_images_per_answer)` 讀 **per-KB** config（ADR-0040
  `_resolve` per-KB 贏）→ 正確 toggle = `PATCH /kb/{id}/settings`,**非** process env。
  `cap_images_per_answer`（citation_enrichment.py:111）= 簡單 cumulative budget truncation（closer-to-top
  citation 的 images 先保留,budget 用完後面 empty）→ 放寬 cap 直接抬高天花板。
- `PATCH /kb/{id}/settings` 核實 = **full KbConfig replacement**（kb.py:218,omitted fields reset）→ 必須
  GET→只改單一 field→PATCH 整個 object back。cap 在 query time apply → 即時生效,**不需 reindex/重啟**。
- GT 預期數核實（`docs/eval-set-image-recall-ar.yaml`）:Q001/Q036=67 / Q043=73 / Q003/Q038=37（= 5 條
  cap-bound,焦點）;Q002=18 / Q004=12 / Q006=8（≤cap,對照,recall 必持平）;Q005=32（W59 歸 section-miss
  stochastic,returned 卡 9 ≪ cap,放寬無反應）。

### 關鍵設計決策
- **三臂 20/40/60**:A=20（baseline,W59/W60 已 4× corroborate ~0.572）/ B=40 ×2 / C=60 ×2 = 共 5 runs。
- **量 returned_count 判 cap-binding**:W59「cap 是瓶頸」本身是**假設**。放寬 cap 後若 returned 升向新 cap →
  cap 確 binding;若持平 ~20 → upstream 候選供給才是真 binding,**反證 W59**（亦是有效進展）。
- **真 sanity gate = GET readback 確認 cap 已變**（非「重現 baseline」= 假 gate,W60 教訓）。
- **跑完務必復原 cap=20**（F4 獨立 deliverable + AC5 gate）。

### Plan / checklist / progress 三件套 committed（R1 gate 滿足）
- 待 commit:`docs(planning): W61 cap-widen image-recall A/B kickoff`

### Next（待續）
- F1:確保 backend 於 documented env（180s timeout）→ 跑 A 臂 baseline cap=20。
