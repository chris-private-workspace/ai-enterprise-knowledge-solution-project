# W55 — Live Verify chunk-strategy recall harness · Checklist

> Atomic items。不可刪未勾項(只 `[x]` 或標 🚧 + reason)。
> 純 live verification(預期無新 code);CLI live-path bug 最小修;誠實解讀 controlled-but-synthetic+lexical(承 W54)。

## F0 — Phase kickoff
- [x] F0.1 plan/checklist/progress committed(R1);pre-flight 4 發現(現有 KB 冇 sources / test-kb-v1 得 1 source / 原始 manuals 喺 docs/06-reference / 用戶清 index Free-tier 3-cap)+ 決策(Option 1 CB manual fresh KB)記 progress

## F1 — Ingest fresh KB(CB manual)
- [x] F1.1 `POST /kb` 建 `w54-live-ab-1`(index `ekp-kb-w54-live-ab-1-v1` provisioned;config chunk_strategy=auto / extract_embedded_images=false)
- [x] F1.2 multipart upload CB docx(`curl.exe -F`)→ ingest 成功:**28 chunks**,images 0(純文字)
- [x] F1.3 驗 `-sources` container 有該 doc(1 blob ✓ reindex 前提)+ chunks section_path 豐富階層(10/10 non-empty ✓ controlled A/B 文字錨點前提)

## F2 — 跑 W54 controlled A/B(live 實證)
- [x] F2.1 CLI 跑通 exit 0(第三次;前兩次揭 2 個 live-path bug)
- [x] F2.2 報告捕捉入 progress:layout_aware 1.0/28chunks、heading_aware 1.0/33chunks、best=layout_aware;frozen eval-set `reports/controlled-ab-shared-seed0.yaml`(11 text-anchored QA)
- [x] F2.3 2 個 live-path bug 記低 + 最小修(非 architectural):(1) win32 ProactorEventLoop→SelectorEventLoop[psycopg];(2) print unicode `→`/`—`→ ASCII + PYTHONIOENCODING=utf-8。W53/W52 CLI 同款 latent bug 記 carry-over

## F3 — 結果記錄 + closeout
- [x] F3.1 progress 記 live 結果 + 誠實解讀(recall 飽和 = corpus-size artifact;chunk 分化 28vs33 證 ADR-0044;建議大 corpus)
- [~] F3.2 🚧 **deferred** — W53 self-retrievability cross-check：recall 已飽和(小 corpus ceiling)→ 同一 KB 重跑只 reconfirm artifact + 額外 judge 成本,marginal value 低；且 W53 CLI 有同款 event-loop latent bug 未 live-verify → 不應用 unverified fix。記 carry-over W56+（大 corpus run 時一併修+verify）
- [x] F3.3 Phase Gate G1-G4 = **PASS** + retro + R5 recheck(只改 script → 非 §3/§4 → 無 ADR)+ checklist tick / 🚧 + doc-sync(roadmap 修訂史 + session-start §10 local-only)
