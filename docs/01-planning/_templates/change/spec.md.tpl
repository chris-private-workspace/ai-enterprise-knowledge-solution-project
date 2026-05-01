---
change_id: CH-{NNN}
title: "{Brief title}"
status: draft           # draft | proposed | approved | active | done | cancelled
created: YYYY-MM-DD
target_completion: YYYY-MM-DD
affects_components: [Cn]      # per COMPONENT_CATALOG.md (CC-1)
spec_refs:
  - architecture.md §X.Y
  - components/Cn-{kebab}.md
---

# CH-{NNN} — {Title}

> **Spec version**:1.0(initial)
> **Owner**:{Chris / AI / SME}
> **Approved by**:_(name when status flips draft → approved)_

## 1. Context (Why)

What triggered this change? What problem does it solve? Who requested?

## 2. Scope (What)

### 2.1 Behavior Change
- **Before**:{current behavior — cite spec section if applicable}
- **After**:{new behavior — concrete description}

### 2.2 In Scope
- {Concrete change item 1}
- {Concrete change item 2}

### 2.3 Out of Scope(explicit)
- {What WON'T change — to prevent scope creep}

## 3. Acceptance Criteria

Verifiable list of "done" conditions:

- [ ] {Pass condition 1 — e.g. "POST /kb returns 422 on invalid kb_id format with regex error message"}
- [ ] {Pass condition 2}
- [ ] {Verification command:`<command>`}

## 4. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | ... | High / Med / Low | High / Med / Low | ... |

## 5. Effort Estimate

{N hours / days}

## 6. Dependencies

- External work / OQ resolution / other Cn that must be ready
- (if cross-component)tag affected Cn per CC-1

## 7. Spec Changelog(deviation log)

| Date | Change | Reason | Approver |
|---|---|---|---|
| YYYY-MM-DD | Initial draft | — | Chris |

---

**Lifecycle reminder**:呢份 spec locked after status=approved。重大 deviation → §7 changelog。
