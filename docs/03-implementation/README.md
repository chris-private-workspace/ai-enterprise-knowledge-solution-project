# Implementation Instances

> Folder hosts active + historical instances of:
> - **Changes**(`changes/CH-NNN-*/`)— modifications to existing features
> - **Bug fixes**(`bugs/BUG-NNN-*/`)— corrections of incorrect behavior
>
> Phase / sprint work lives separately at `docs/01-planning/W{NN}-*/`(see [`PROCESS.md`](../01-planning/PROCESS.md))。
> Workflow framework + templates:see [`docs/01-planning/PROCESS.md`](../01-planning/PROCESS.md) + [`docs/01-planning/_templates/`](../01-planning/_templates/)。

## ID Conventions

| Type | Format | Scope |
|---|---|---|
| Change | `CH-NNN`(3-digit zero-pad)| Project-wide monotonic(don't restart per phase)|
| Bug | `BUG-NNN`(3-digit zero-pad)| Project-wide monotonic |

## Per-Instance Folder Structure

### Change(`changes/CH-NNN-{kebab-name}/`)
```
spec.md           ← What / why / scope / acceptance(spec contract,locked after approve)
checklist.md      ← Atomic implementation items
progress.md       ← During-execution log + completion summary
```

### Bug-Fix(`bugs/BUG-NNN-{kebab-name}/`)
```
report.md         ← Symptom / repro / impact / severity(report contract,locked after triage)
checklist.md      ← Investigation + fix + regression + verify
progress.md       ← Timeline log + closeout
postmortem.md     ← OPTIONAL — Sev1/Sev2 mandatory(per PROCESS.md §4.5)
```

詳見 PROCESS.md §3(Change Workflow)+ §4(Bug-Fix Workflow)for full lifecycle。

## Active Instances

(Updated as instances land)

### Changes
_(none yet — first CH-001 will land here)_

### Bug Fixes
_(none yet — first BUG-001 will land here)_

## Historical / Closed Instances

(After closeout,instance folder remains for audit trail。`progress.md` status=closed marks completion。)
