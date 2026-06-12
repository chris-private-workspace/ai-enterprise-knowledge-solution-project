# W68 — progress(dedup-before-cap,ADR-0054)

## Day 1(2026-06-12)— kickoff

- W67 證據鏈完整 → H1 STOP+ask 提案 → 用戶 AskUserQuestion 批准「批准,实施(建議)」
  (= ADR + 改 `cap_images_per_answer` 預算計 unique + test + A/B + drive-images-1 cap 50→70)。
- R6:函數單一定義(citation_enrichment.py:111)/ caller query.py:492+645 / 現有 test fixture
  跨 citation 同 checksum → 兩個 test 喺新契約預期 fail,改寫反映新契約。
- 三件套 committed:`docs(planning): W68 dedup-before-cap kickoff`(`2cfbfbc`)

### F1 — ADR-0054 ✅(Accepted,approver Chris 2026-06-12)+ README index 加行

### F2 — code ✅(`16301ed`)
- `cap_images_per_answer` 改寫:unique 預算 walk + seen-set(key = checksum or blob_url);
  dup 剪走唔食預算(即使預算未盡);None passthrough bit-identical;citations 永不 drop。
- docstring 全面更新(指 ADR-0054 + W67 證據摘要)。

### F3 — tests ✅
- 兩個舊 test 改寫(`img_offset` 令跨 citation checksum distinct — 舊 fixture 共用 sha-0..4,
  新契約下會誤入 dedup 路徑)+ 3 個新契約 test(dup 唔食預算令後面 fresh 圖獲救 = W67 形態 /
  預算剩都剪 dup / within-citation dup)。
- **48 passed**(test_effective_config + test_ch010 + test_config_test_route)+ caller 側
  test_query_per_kb_config **6 passed** + ruff clean。

### F5 — persist ✅(先於 F4 run,A/B 即測 persisted 終態)
- backend 重啟載 ADR-0054 code → healthy;PATCH cap 50→**70** → readback 70/10/40 PASS。

### F4 — A/B 9/9 run ✅(`reports/image_recall_ar_dedup_cap70.yaml`)— **mean 0.995 / precision 0.988**
| Query | W64 baseline(cap=50 舊 code)| W68(ADR-0054 + cap=70)|
|---|---|---|
| Q001(GT 65)| 0.74(48)| **1.00(65/65)** — W67 預測命中 |
| Q036(GT 65)| 0.62(40)| **1.00(65/65)** |
| Q043(GT 73)| 0.66(48)| 0.96(**70 = 撞 cap**)|
| Q003/Q038(GT 37)| 1.00 | 1.00(38 returned,1 非 GT)|
| Q005(GT 32)| 0.69 | **1.00(32/32)** |
| 對照 ×3 | 1.00 | 1.00 持平 |

- AC3 全達:對照持平、precision 0.95–1.00、mega query 解封。

### R3 amendment — cap 70→80(Q043 證據驅動)
- Q043 returned **正正 = cap 70** → unique 預算差 3 張。PATCH cap 70→**80** + readback PASS →
  Q043 單條驗證:**raw=73 = unique=73,GT 73/73 = 1.00**(dedup 下 response 零重複 ref)。
- **九條 query 全部 1.00 可達**(8 條喺 full run + Q043 單條驗證)。persisted 終態:
  `max_images_per_answer=80` + `default_rerank_k=10` + `citation_neighbour_max_aux_images=40`。

### Retro — W59→W68 全弧收官
- **image-recall 軌跡:0.574(W59 baseline)→ 0.732(W61 cap60)→ 0.889(W62 供給)→
  0.855(W64 production sanity)→ 0.995 → 全部 query 1.00 可達(W68)**;precision 全程
  0.976–0.988 零代價;Tier 1 旋鈕 + 一個 surgical pipeline fix(ADR-0054)達成,
  章節收割新機制 / caption / image-embedding 全部唔使做。
- 方法論精華:每層「天花板」都係下一層機制嘅偽裝(cap=20 → max_aux=18 → refs 預算 →
  unique 供給 = 完整)— 逐層用 controlled 實驗揭穿,冇一步靠估。
- 剩餘注腳:Q002/Q003/Q038 各有 1 張非 GT 圖(precision 0.95–0.97)= 鄰居收割嘅輕微
  over-inclusion,定義上無關 recall;b-2 零引用模式(W63)喺 W68 全部 run 未現身,留
  production 觀察。
- prose 型第二份 GT 仍係圖片線唯一未驗部分(卡用戶提供文件)。
