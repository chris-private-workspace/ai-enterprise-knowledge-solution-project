---
change_id: CH-002
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: in-progress     # in-progress | closed
---

# CH-002 — Progress

> Day-N entries during execution + 結尾 closeout summary。
> 每 commit 必須對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。

---

## Day 1 — 2026-05-12

### Done
- Deep Smoke v2(2026-05-12)11 findings → triage → batched F2/F3/F5/F6/F7/F8/F10 into CH-002(per user instruction:批 A frontend W16-F5 catch-up + 批 B backend small fixes,one PR)
- Wrote `spec.md` v1.0(§1 context per-finding diagnosis · §2 scope incl. §2.3 design choices · §3 14 AC · §4 7 risks · §5 effort 6-9h · §6 deps + H1/H2/ADR verification)
- Approved by Chris 2026-05-12 — **Decision F2 = Option A**(upload route preserves the original filename basename inside a `mkdtemp()` dir → `source.stem` correct, zero parser/orchestrator signature change)· **Decision F6 = Option a**(CH-001 spec §3 AC4 inline reconcile note — `resource.not_found` is acceptable since the message already names the KB; no code change, CH-001 status stays `done`)
- `spec.md` flipped `proposed → approved`; `checklist.md` + `progress.md` derived
- (commit: `docs(planning): CH-002 spec + checklist + progress — approved (F2=A, F6=a)`)

### Decisions
- **F2 = Option A** over Option B(thread `original_filename` through orchestrator + 3 parsers)— Karpathy §1.2 simplicity; `source.stem` is already the intended `doc_title` semantics, the route just needs to stop discarding the basename. Traversal guard: `Path(filename).name` + write only into a fresh `mkdtemp()`.
- **F6 = Option a** over Option b(route emits `kb.not_found` + new `ErrorCodes.KB_NOT_FOUND`)— `_verify_kb_or_404` is shared by 4 routes; changing it for a code-string the frontend doesn't even branch on is not surgical. The spec text was aspirational; reconcile in docs.
- **Sequencing**(Karpathy §1.4 goal-driven, per spec §5): backend first(F5 → F8 → F2 + tests → `pytest` green)→ F6 doc reconcile → frontend Eval(F3)→ Chunks tab(F7)→ Settings-Identity(F10)→ Vitest/RTL → grep sweep → docs closeout.
- **Out of scope**(separate handling, documented spec §2.4): F1(setup doc + `settings.py` env_file)· F4(favicon)· F9(`/dashboard` 375px overflow → BUG-NNN)· F11(chat focus-mode toggle → W18-impl verification)· Chunks `chunk_text` preview · chunk enable/disable write-path.

### Blockers
- None for backend / frontend code. AC14(browser walkthrough)stays on the user pre-Beta smoke backlog(R8 `npx playwright install chromium` blocked / CO_W15_F4 / ADR-0017)— consistent with the W15-W18 caveat pattern; not blocking CH-002 closeout.

### Effort
- Planned:0.5h(triage + spec + checklist + progress);Actual:~0.75h;Variance:+0.25h

### Commits
| Hash | Subject |
|---|---|
| _(pending)_ | `docs(planning): CH-002 spec + checklist + progress — approved (F2=A, F6=a)` |

---

## Closeout（填於 status=closed）

### Acceptance verification
_(All §3 acceptance criteria from spec.md verified ✅ / partial ⚠️ / failed ❌ — fill at closeout)_

### Effort summary
| Day | Planned (h) | Actual (h) | Variance |
|---|---|---|---|

### Lessons
- _(fill at closeout)_

### Component design note status updates
- _(fill at closeout — likely none; C01/C06/C08/C09 notes rolling JIT)_

---

**End of CH-002 progress**
