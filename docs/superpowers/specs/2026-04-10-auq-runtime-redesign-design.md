# AUQ Runtime Redesign — Design Spec

**Date:** 2026-04-10  
**Scope:** `plugins/superpower-dev/skills/do/SKILL.md` — Rules 18–21, AUQ Runtime State Machine, AUQ Timeout Guardrail, Decision Tree AUQ section  
**Approach:** Full AUQ runtime rewrite (Approach B)

---

## Problem Summary

Five issues found in the current AUQ state machine:

| Severity | Finding |
|---|---|
| High | `session_id` is a single value; cannot safely track multiple concurrent AUQs |
| High | Polling only triggers on merge or explicit user signal; no heartbeat → starvation risk |
| Medium | No resume dedup; same answer can trigger RESUME_READY multiple times |
| Medium | `fix-errors` dispatch and `RESUME_READY` recovery have no defined priority or concurrency rule |
| Medium | No persistence contract; AUQ state lost on crash/restart |

---

## Section 1: Registry Schema + Persistence

### `waiting_auq[]` Entry Shape

```json
{
  "question_id": "auq-001",
  "session_id": "sess-abc123",
  "blocked_slices": ["slice-3", "slice-5"],
  "status": "pending",
  "submitted_at": "2026-04-10T10:00:00Z",
  "last_checked_at": null,
  "consumed_at": null
}
```

**`status` values:** `pending` | `answered` | `timeout` | `consumed`  
(`consumed` = `consumed_at` is set; subsequent polls skip this entry)

### Persistence Location

`docs/superpowers/executions/auq-registry.json` — global single file, maintained by the coordinator agent.

**Read/write contract:**

- First AUQ in a session: create file if absent (`{ "entries": [] }`), append new entry.
- Each poll: update matching entry's `status` and `last_checked_at` in-place.
- On RESUME trigger: write `consumed_at` timestamp.
- On restart: read file; find entries with `status` in `{ pending, timeout }` or `status=answered` with `consumed_at=null`; resume corresponding slices.

---

## Section 2: Updated Rules 18–21

**Rule 18 — AUQ default flow**

> `ask_user_questions(nonBlocking: true)` → capture `session_id` → append entry to `auq-registry.json` (status: `pending`) → `get_answered_questions(session_id, blocking: true)`.

**Rule 19 — Timeout handling**

> If `get_answered_questions(..., blocking: true)` times out: update entry `status → timeout`; split plan into blocked slice (depends on AUQ answer) and independent slice (does not); continue `RUNNING` with independent slice. Immediately launch `bash sleep 120` in background as a best-effort heartbeat trigger.

**Rule 20 — Batch polling**

> While any `auq-registry.json` entries have `status` `pending` or `timeout`, on each trigger point — merged implementation unit, explicit user reply signal (`answered`, `replied`, etc.), or background `bash sleep 120` completion (best-effort; if context resets, next user input serves as trigger) — perform a **batch re-check**: call `get_answered_questions(session_id, blocking: false)` for ALL `pending` and `timeout` entries in one pass.
>
> For each entry found answered: update `status → answered`; re-attach its `blocked_slices`.  
> After the batch scan, if any entries transitioned to `answered`, derive macro state as `RESUME_READY` and resume blocked slices.  
> On first resume per entry, set `consumed_at`; subsequent passes skip entries where `consumed_at` is set.

**Rule 21 — fix-errors mode** *(unchanged)*

> In `fix-errors` mode, if monitor stage discovers or receives new `todo` items, immediately re-route to ordered todo execution and dispatch subagents in background by queue order; do not pause for extra "continue/proceed" prompts unless a defined blocking condition is hit.

---

## Section 3: AUQ Runtime State Machine

### Macro State Derivation

Macro state is derived from `auq-registry.json` entries, evaluated in priority order:

| Macro State | Condition |
|---|---|
| `RESUME_READY` | Any entry: `status=answered` AND `consumed_at=null` |
| `WAITING_AUQ` | Any entry: `status=pending` |
| `PARTIAL_PROGRESS` | Any entry: `status=timeout`, AND no `RESUME_READY` entries |
| `RUNNING` | All entries `consumed` or table empty |

When multiple entries coexist with different statuses, agent reads the table and derives macro state by the priority order above. No additional global flag is needed.

### State Transitions (per-entry)

```
RUNNING → WAITING_AUQ
  Trigger: new AUQ entry appended (status=pending)

WAITING_AUQ → RUNNING
  Trigger: answer received during blocking wait

WAITING_AUQ → PARTIAL_PROGRESS
  Trigger: blocking wait timeout; entry status → timeout

PARTIAL_PROGRESS → RUNNING
  Trigger: independent slice extracted and executing

PARTIAL_PROGRESS → RESUME_READY
  Trigger: batch re-check finds entry status → answered

RESUME_READY → RUNNING
  Trigger: blocked_slices re-attached and execution resumed; consumed_at written
```

---

## Section 4: Scheduling — fix-errors + RESUME_READY

**Priority:** fix-errors dispatch takes priority over RESUME_READY transitions.

When both fire simultaneously:

1. Dispatch fix-errors subagent first (background, worktree-isolated).
2. Evaluate whether RESUME_READY blocked slices can proceed concurrently:
   - **Non-overlapping worktrees** → proceed concurrently.
   - **Overlapping worktrees** → defer RESUME_READY until fix-errors completes.

---

## Section 5: Decision Tree AUQ Section (replacement)

Replaces the existing AUQ state handling block in the Decision Tree:

```text
│  AUQ state handling:
│  ├─ ask_user_questions(nonBlocking: true) -> session_id
│  │   append entry to auq-registry.json (status: pending)
│  ├─ get_answered_questions(session_id, blocking: true)
│  │  ├─ answered -> update entry status=answered, continue normal flow
│  │  └─ timeout  -> update entry status=timeout
│  │                 split: blocked_slices vs independent_slices
│  │                 launch bash sleep 120 (background heartbeat)
│  │                 continue RUNNING with independent_slices
│  └─ on trigger (merge / user signal / sleep complete):
│     batch re-check all pending/timeout entries (blocking: false)
│     ├─ any answered -> RESUME_READY: re-attach blocked_slices, set consumed_at
│     └─ all still pending/timeout -> keep WAITING_AUQ/PARTIAL_PROGRESS, continue RUNNING
│
│  fix-errors + RESUME_READY concurrency:
│  ├─ fix-errors dispatched first (priority)
│  └─ RESUME_READY: concurrent if non-overlapping worktrees, else wait
```

---

## Out of Scope

- tmux/window-management tooling (per Core Rule 13)
- Changes to Rules 1–17 or non-AUQ sections of SKILL.md
- Changes to `parallel-lane-dev` plugin
