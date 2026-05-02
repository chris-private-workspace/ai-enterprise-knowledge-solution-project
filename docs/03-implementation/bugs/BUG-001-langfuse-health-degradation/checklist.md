---
bug_id: BUG-001
report_ref: ./report.md
status: in-progress     # in-progress | done
last_updated: 2026-05-02
---

# BUG-001 — Checklist

> Atomic checkbox per investigation / fix / regression / verify stages。
> AI tick 完成嘅 item;唔可以 tick 嘅 item 喺 progress Day-N entry 寫原因。

## Investigation

- [x] Reproduce locally per `report.md §2`(W1 D5 pre-flight 5x replication 已確認 always-reproducible)
- [ ] Read `docker logs ekp-langfuse --tail 100` 完整檢視 container 內 process state
- [ ] `docker inspect ekp-langfuse` 檢視 health check command output + restart count
- [ ] `docker exec ekp-langfuse <process-list>` 確認 Langfuse Node.js process 是否 alive(若 exec 仲 work)
- [ ] Check Postgres connection from Langfuse perspective(是否 connection pool exhaustion)
- [ ] Check Docker Desktop daemon state(`docker system info` + `docker version`,看 daemon 是否 responsive)
- [ ] Check disk space + Docker volume health(`docker system df`)
- [ ] Identify root cause confirmed via concrete evidence
- [ ] Update `report.md §6` with confirmed root cause

## Fix

- [ ] Attempt 1:`docker rm -f ekp-langfuse` + `docker compose up -d langfuse`(force remove + clean re-init,bypass 'restart' hang path)
- [ ] If Attempt 1 fail:`docker compose down` + `docker compose up -d`(全 stack restart,Postgres + Langfuse 一齊)
- [ ] If Attempt 2 fail:Docker Desktop restart(GUI level)+ retry compose up
- [ ] If Attempt 3 fail:investigate Langfuse version bump(2 → 2-latest if available 2026-05 / OR explicit version pin)
- [ ] Verify:`/api/public/health` 返 HTTP 200 sustained ≥ 5 min
- [ ] Update `components/C07-observability.md` design note + `components/C12-devops.md`:document recovery procedure + bump status if design changed

## Regression Test

- [ ] **N/A unit/integration test**(infrastructure bug,not Python module)
- [x] **Substitute mitigation**:document daily morning health check ritual in `components/C12-devops.md`(curl 3 services × 1 line each)— per W1 D5 retro lesson learned
- [ ] Add health check command to `infrastructure/README.md` quick-reference(若 README 存在;否則 inline 落 `docker-compose.yml` comment)

## Verification

- [ ] Re-run `report.md §2` repro steps in fixed env → `curl http://localhost:3000/api/public/health` 返 HTTP 200
- [ ] Confirm Postgres still healthy(no regression introduced by Langfuse fix)
- [ ] Confirm Azurite still healthy(no regression)
- [ ] (if Postgres recreated)Verify Langfuse can ingest test trace via `@observe` decorator round-trip

## Closeout

- [ ] `progress.md` closeout summary(timeline + root cause + lessons)
- [ ] (Sev3,encouraged not mandatory)Evaluate `postmortem.md` write — recommend WRITE 因 R8/R9/R11 corp infra ecosystem pattern recurring
- [ ] Update `RISK_REGISTER.md` R11 entry status(🔴 Open → 🟢 Closed YYYY-MM-DD)
- [ ] `report.md` status flipped to `done`
- [ ] `progress.md` status flipped to `closed`
- [ ] Update `components/C07-observability.md` if recovery procedure documented

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1(`fix(c07): description (BUG-001)` 或 `fix(c12): description (BUG-001)`)
- [ ] No ADR triggered(non-architectural fix,operational recovery only)— but if version bump Langfuse → ADR(H2 vendor lock check)
- [ ] OQ status sync N/A(no OQ affected)
- [ ] R11 status update in `RISK_REGISTER.md` 隨 fix landing
