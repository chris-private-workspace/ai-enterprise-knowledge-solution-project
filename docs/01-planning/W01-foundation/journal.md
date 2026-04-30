---
phase: W01-foundation
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: in-progress
---

# Phase W01 — Journal

> Daily progress + 結尾 retro。
> 每 commit 必須對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。

---

## Day 0 — 2026-04-30: Kickoff(retroactive)

**Action**:Phase W01 kickoff,**retroactively documented**(framework 喺 Day 1 中段引入)

- Templates copied from `_templates/`
- `plan.md` filled,status=`active`
- `checklist.md` derived from plan deliverables(F1-F11)
- Carry-over from prior phase:`N/A — first phase of EKP Tier 1`

**Note**:正常 lifecycle Day 0 應該係 phase kickoff、Day 1 起 implementation。本次因 framework 喺 Day 1 中段引入(per Chris guidance),Day 0 entry 同 Day 1 同日(2026-04-30)。Future phases follow 正常 D0 / D1 split。

**Commits relevant**:Phase planning framework setup commit pending(framework files 同呢份 journal 一齊 commit)。

---

## Day 1 — 2026-04-30

### Done

**Pre-framework execution(8:00–14:00 local time approximate)**:
- F1 ✅ Repo hygiene + Dify reference(`9ea18f1` initial commit;Dify clone retry with `core.longpaths=true` after Windows MAX_PATH hit)
- 6 critical OQ resolution(Q1-Q4 + Q13 + Q14)by Chris(`d74fee2`)
- F2 ✅ Backend FastAPI skeleton 26 files(`b21a0a2`)
- F3 ✅ Frontend Next.js 14 skeleton 21 files(`7589110`)
- F5 + F6 ✅ Eval set validator + docx structure inspector scripts(`cc0b90b`)
- Repo follow-up:gitignore `.claude/` + dev log + topology SVG(`e3fc338`)
- F4 ✅ Local dev stack hybrid(Postgres + Langfuse via Docker;Azurite via npm fallback after MCR DNS intercept blocker)— compose tag fix(`f7ba973`)

**Framework introduction(14:00 onwards)**:
- Per Chris's guidance,Phase Planning framework introduced mid-Day 1
- Created `docs/01-planning/PROCESS.md`、3 templates、W01-foundation/{plan,checklist,journal}.md retroactive
- CLAUDE.md §10 Phase Planning Workflow added with rules R1-R5 reference

### Decisions / OQ Resolved

- **OQ-Q1** Resolved:format ratio **40% Word + 30% PPT + 30% PDF**(deviation from default 80/15/5 → W2 PDF + PPT 同等 priority,唔可推到 W3)
- **OQ-Q2** Resolved:stakeholder 提供原檔(direct upload / shared folder / SharePoint)— POC manual upload OK
- **OQ-Q3** Resolved:Azure AI Search service exists(POC stage),pending implementation detail by W2 D1
- **OQ-Q4** Resolved:Azure OpenAI 完整 deployment ready(GPT-5.5 / 5.4 / 5.4-mini / 5.4-nano / embedding small + large),pending exact deployment names + endpoint by W2 D1
- **OQ-Q13** Resolved:Yes — SME allocation
- **OQ-Q14** Resolved (partial):Yes,specific labeler name pending W1 末
- **Decision** — `gitignore` 缺 leading dot 屬 critical issue:H3 + H5 prevention failure;rename 之前 D2 git init,save Dify license risk + secret commit risk
- **Decision** — Azurite Docker pull blocked by Ricoh corp DNS intercept(`mcr.microsoft.com` resolves to `10.160.92.1` internal proxy);workaround = npm-distributed Azurite。Document as long-term infra follow-up
- **Decision** — Python 3.14 cp314 wheel supply persistent issue;defer pytest run to W2 D1。Recommend Chris install Python 3.12 stable env

### Blockers

- 🚫 **Q14 specific labeler name** — Chris W1 末 confirm
- 🚫 **Q2 sample manual delivery** — needed for F8 + F11 + Q17/Q18 execution
- 🚫 **Q3 + Q4 implementation detail** — needed for F9 + F10 .env wiring
- ⚠️ **Python 3.14 cp314 wheel supply** — `pydantic-core` / `httptools` download keeps connection-resetting via PyPI / TUNA mirror。Long-term:Chris install Python 3.12
- ⚠️ **Ricoh corp DNS intercept MCR** — `mcr.microsoft.com` blocked at proxy 10.160.92.1。Long-term:IT whitelist or VPN for Docker workflow

### Actual vs Planned Effort

| Deliverable | Planned (h) | Actual (h) | Variance | Note |
|---|---|---|---|---|
| F1 | 1 | 1.5 | +0.5h | Windows MAX_PATH on Dify clone |
| F2 | 3 | 3.5 | +0.5h | pyproject setuptools packages.find config + Python 3.14 wheel issue |
| F3 | 3 | 3 | 0 | Clean |
| F4 | 0.5 | 1.5 | +1h | MCR DNS intercept,npm Azurite fallback |
| F5 | 1 | 1 | 0 | Clean(after null difficulty handling) |
| F6 | 1 | 1 | 0 | Clean |
| Framework setup | 0(unplanned) | 1 | +1h | Mid-day pivot per Chris guidance |
| **Total Day 1** | **9.5** | **12.5** | **+3h** | Network supply issues drove most variance |

### Commits

| Hash | Subject |
|---|---|
| `9ea18f1` | chore(repo): initial portfolio scaffold |
| `d74fee2` | docs(decision-form): resolve 6 critical OQ (Q1-Q4, Q13, Q14) |
| `b21a0a2` | feat(api): scaffold FastAPI skeleton with 18 endpoint stubs |
| `7589110` | feat(frontend): scaffold Next.js 14 with shadcn/ui foundation and design tokens |
| `cc0b90b` | feat(eval): add eval-set validator + docx structure inspector scripts |
| `e3fc338` | chore(repo): gitignore .claude/ + checkpoint W1 D1 dev log + add topology SVG |
| `f7ba973` | fix(infra): pin Langfuse image to langfuse:2 (was 2-latest, no longer published) |
| `(pending)` | chore(planning): introduce phase-based rolling planning framework + W01 retroactive |

---

## Day 2 — 2026-05-01(planned)

### Targeted deliverables

- F7 KB CRUD impl(in-memory storage backend OK 因 Q3 implementation detail pending)
- F8 start Docling `.docx` parser PoC(若 Q2 sample 到位)
- W2 D1 retry pytest(if Python 3.12 installed by Chris)

### Pre-flight checks

- [ ] Q14 specific labeler name 收到?
- [ ] Q2 sample manual zip / folder access?
- [ ] Q3 / Q4 .env value 收到?
- [ ] Python 3.12 installed?(可選,W1 D2 decision)

---

## Retro(寫於 phase 結束 W1 D5 / 2026-05-04)

### What worked

_(填於 phase 結束)_

### What didn't work / unexpected friction

_(填於 phase 結束)_

### Surprises / discoveries

_(填於 phase 結束)_

### Carry-overs to W02-multi-format-ingestion

_(填於 phase 結束)_

### ADR triggers

_(填於 phase 結束 — W1 暫無 architectural-adjacent decision triggering ADR)_

### Phase Gate result

_(填於 phase 結束 — G1-G6 per plan §3)_

### Phase status

_(填於 phase 結束 — closeout commit hash + status flip + W2 kickoff trigger)_

---

**End of W01 journal**(in progress)
