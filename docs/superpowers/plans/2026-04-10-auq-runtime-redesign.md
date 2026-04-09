# AUQ Runtime Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the AUQ runtime sections of `plugins/superpower-dev/skills/do/SKILL.md` to fix five identified issues: single-session_id limitation, starvation polling, duplicate resume, undefined fix-errors/RESUME_READY priority, and no crash-recovery contract.

**Architecture:** Pure document edit — no code changes. Four sections of SKILL.md are replaced in order: Core Rules 18–20, Decision Tree AUQ block, AUQ Runtime State Machine (+ new Registry section inserted before it), AUQ Timeout Guardrail (+ new Scheduling subsection appended after it). Each task ends with a commit.

**Tech Stack:** Edit tool (targeted SKILL.md edits), Grep (verification), Git

---

## File Map

| File | Change |
|------|--------|
| `plugins/superpower-dev/skills/do/SKILL.md:42-44` | Replace Rules 18–20 |
| `plugins/superpower-dev/skills/do/SKILL.md:93-101` | Replace Decision Tree AUQ block |
| `plugins/superpower-dev/skills/do/SKILL.md:124-146` | Replace AUQ Runtime State Machine + insert Registry section above it |
| `plugins/superpower-dev/skills/do/SKILL.md:168-180` | Replace AUQ Timeout Guardrail + append Scheduling subsection |

Spec reference: `docs/superpowers/specs/2026-04-10-auq-runtime-redesign-design.md`

---

### Task 1: Update Core Rules 18–20

**Files:**
- Modify: `plugins/superpower-dev/skills/do/SKILL.md:42-44`

- [ ] **Step 1: Verify current text is present**

```bash
grep -n "capture \`session_id\`, then call" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: line 42 found.

- [ ] **Step 2: Replace Rules 18–20**

Using Edit tool, replace:

```
18. AUQ default flow must use `ask_user_questions(nonBlocking: true)` first, capture `session_id`, then call `get_answered_questions(session_id, blocking: true)`.
19. If `get_answered_questions(..., blocking: true)` times out, convert the waiting branch into `PARTIAL_PROGRESS`: keep the unresolved question open, detach blocked steps, and continue planning/executing independent steps in `RUNNING`.
20. While any `WAITING_AUQ` items exist, re-check them with `get_answered_questions(session_id, blocking: false)` after each merged implementation unit or after the user indicates they replied (for example: `answered`, `replied`); when an answer is found, resume the blocked branch immediately.
```

With:

```
18. AUQ default flow: `ask_user_questions(nonBlocking: true)` → capture `session_id` → append entry to `docs/superpowers/executions/auq-registry.json` (status: `pending`) → `get_answered_questions(session_id, blocking: true)`.
19. If `get_answered_questions(..., blocking: true)` times out: update entry `status → timeout`; split plan into blocked slice (depends on AUQ answer) and independent slice (does not); continue `RUNNING` with independent slice. Immediately launch `bash sleep 120` in background as a best-effort heartbeat trigger.
20. While any `auq-registry.json` entries have `status` `pending` or `timeout`, on each trigger point — merged implementation unit, explicit user reply signal (`answered`, `replied`, etc.), or background `bash sleep 120` completion (best-effort; if context resets, next user input serves as trigger) — perform a **batch re-check**: for each `pending` or `timeout` entry, call `get_answered_questions(entry.session_id, blocking: false)` individually, one call per entry. For each entry found answered: update `status → answered`. After the batch scan completes, re-derive macro state from table (any `status=answered` AND `consumed_at=null` → `RESUME_READY`; this takes priority over `PARTIAL_PROGRESS` — if both conditions coexist, handle `RESUME_READY` first). For each `RESUME_READY` entry: re-attach `blocked_slices` (read slice content from `plan_file`/`section` in the entry) and begin execution; set `consumed_at` when that slice's execution begins. Subsequent passes skip entries where `consumed_at` is set.
```

- [ ] **Step 3: Verify new text is present**

```bash
grep -n "auq-registry.json" plugins/superpower-dev/skills/do/SKILL.md
grep -n "bash sleep 120" plugins/superpower-dev/skills/do/SKILL.md
grep -n "batch re-check" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: all three grep commands return at least one match.

- [ ] **Step 4: Verify old text is gone**

```bash
grep -n "WAITING_AUQ items exist" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add plugins/superpower-dev/skills/do/SKILL.md
git commit -m "feat(superpower-dev): update Core Rules 18-20 for per-session AUQ registry"
```

---

### Task 2: Replace Decision Tree AUQ Block

**Files:**
- Modify: `plugins/superpower-dev/skills/do/SKILL.md:93-101`

- [ ] **Step 1: Verify current text is present**

```bash
grep -n "on each merge OR user" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: one match found.

- [ ] **Step 2: Replace the AUQ state handling block**

Using Edit tool, replace:

```
│  │  AUQ state handling:
│  │  ├─ ask_user_questions(nonBlocking: true) -> session_id
│  │  ├─ get_answered_questions(session_id, blocking: true)
│  │  │  ├─ answered -> continue normal flow
│  │  │  └─ timeout  -> move blocked branch to WAITING_AUQ/PARTIAL_PROGRESS, continue independent RUNNING work
│  │  └─ on each merge OR user "answered/replied" signal:
│  │     └─ get_answered_questions(session_id, blocking: false)
│  │        ├─ answered -> resume blocked branch
│  │        └─ pending  -> keep WAITING_AUQ and continue RUNNING
```

With:

```
│  │  AUQ state handling:
│  │  ├─ ask_user_questions(nonBlocking: true) -> session_id
│  │  │   append entry to auq-registry.json (status: pending)
│  │  ├─ get_answered_questions(session_id, blocking: true)
│  │  │  ├─ answered -> update entry status=answered, continue normal flow
│  │  │  └─ timeout  -> update entry status=timeout
│  │  │                 split: blocked_slices vs independent_slices
│  │  │                 launch bash sleep 120 (background heartbeat)
│  │  │                 continue RUNNING with independent_slices
│  │  └─ on trigger (merge / user signal / sleep complete):
│  │     batch re-check: per-entry get_answered_questions(entry.session_id, blocking: false)
│  │     ├─ any answered -> RESUME_READY: re-attach blocked_slices, set consumed_at on slice start
│  │     └─ all still pending/timeout -> keep WAITING_AUQ/PARTIAL_PROGRESS, continue RUNNING
│  │        (if context reset, sleep trigger lost; next user input serves as fallback trigger)
│  │
│  │  fix-errors + RESUME_READY concurrency:
│  │  ├─ fix-errors dispatched first (priority)
│  │  └─ RESUME_READY: concurrent if non-overlapping worktrees, else wait
```

- [ ] **Step 3: Verify new text is present**

```bash
grep -n "append entry to auq-registry.json" plugins/superpower-dev/skills/do/SKILL.md
grep -n "fix-errors dispatched first" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: both match.

- [ ] **Step 4: Verify old text is gone**

```bash
grep -n "on each merge OR user" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add plugins/superpower-dev/skills/do/SKILL.md
git commit -m "feat(superpower-dev): replace Decision Tree AUQ block with registry-based batch polling"
```

---

### Task 3: Insert Registry Section + Rewrite AUQ Runtime State Machine

**Files:**
- Modify: `plugins/superpower-dev/skills/do/SKILL.md:124-146`

- [ ] **Step 1: Verify current section header is present**

```bash
grep -n "^## AUQ Runtime State Machine" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: one match.

- [ ] **Step 2: Replace the section**

Using Edit tool, replace the entire block from `## AUQ Runtime State Machine` through the last state transition entry (ending before `## Execution Guardrails`).

**OLD_STRING** (exact text to match):

~~~~
## AUQ Runtime State Machine

Use explicit runtime states for AUQ-gated execution:

- `RUNNING`: Active execution of steps that do not require unresolved AUQ answers.
- `WAITING_AUQ`: A pending AUQ session exists and at least one branch is answer-gated.
- `PARTIAL_PROGRESS`: Timeout occurred on blocking wait; blocked branch remains open while independent work continues.
- `RESUME_READY`: A previously pending AUQ received an answer and the blocked branch can re-enter execution.

State transitions:

1. `RUNNING -> WAITING_AUQ`
   - Trigger: AUQ question submitted for required clarification.
2. `WAITING_AUQ -> RUNNING`
   - Trigger: Answer received during blocking wait.
3. `WAITING_AUQ -> PARTIAL_PROGRESS`
   - Trigger: `get_answered_questions(session_id, blocking: true)` timeout.
4. `PARTIAL_PROGRESS -> RUNNING`
   - Trigger: Independent branch extraction complete and actionable steps remain.
5. `PARTIAL_PROGRESS -> RESUME_READY`
   - Trigger: non-blocking AUQ re-check finds an answer.
6. `RESUME_READY -> RUNNING`
   - Trigger: blocked branch is re-planned and execution resumes.
~~~~

**NEW_STRING** (replacement text):

~~~~
## AUQ Registry

AUQ sessions are tracked in `docs/superpowers/executions/auq-registry.json` (global single file, maintained by coordinator).

Each entry:

```json
{
  "question_id": "auq-001",
  "session_id": "sess-abc123",
  "blocked_slices": [
    { "plan_file": "docs/superpowers/plans/foo.md", "section": "## Step 3" }
  ],
  "status": "pending",
  "submitted_at": "2026-04-10T10:00:00Z",
  "last_checked_at": null,
  "consumed_at": null
}
```

`status` values: `pending` | `answered` | `timeout` | `consumed`  
(`consumed` = `consumed_at` is set; subsequent polls skip this entry)

`blocked_slices` stores `{ plan_file, section }` so the coordinator can reconstruct slice content after crash/restart without relying on in-memory context.

Read/write contract:
- First AUQ: create file if absent (`{ "entries": [] }`), append new entry.
- Each poll: update matching entry's `status` and `last_checked_at` in-place.
- On RESUME trigger: write `consumed_at` timestamp.
- On restart: read file; resume entries with `status` in `{ pending, timeout }` or `status=answered` with `consumed_at=null`.

## AUQ Runtime State Machine

Macro state is derived from `auq-registry.json` entries, evaluated in priority order:

| Macro State | Condition |
|---|---|
| `RESUME_READY` | Any entry: `status=answered` AND `consumed_at=null` |
| `WAITING_AUQ` | Any entry: `status=pending` |
| `PARTIAL_PROGRESS` | Any entry: `status=timeout`, AND no `RESUME_READY` entries |
| `RUNNING` | All entries `consumed` or table empty |

Agent reads the table and derives macro state by priority order above. No additional global flag is needed.

State transitions (per entry):

1. `RUNNING -> WAITING_AUQ`
   - Trigger: new AUQ entry appended (status=pending).
2. `WAITING_AUQ -> RUNNING`
   - Trigger: answer received during blocking wait.
3. `WAITING_AUQ -> PARTIAL_PROGRESS`
   - Trigger: blocking wait timeout; entry status → timeout.
4. `PARTIAL_PROGRESS -> RUNNING`
   - Trigger: independent slice extracted and executing.
5. `PARTIAL_PROGRESS -> RESUME_READY`
   - Trigger: batch re-check finds entry status → answered.
6. `RESUME_READY -> RUNNING`
   - Trigger: blocked_slices re-attached and execution resumed; consumed_at written.
~~~~

- [ ] **Step 3: Verify new text is present**

```bash
grep -n "^## AUQ Registry" plugins/superpower-dev/skills/do/SKILL.md
grep -n "consumed_at=null" plugins/superpower-dev/skills/do/SKILL.md
grep -n "plan_file.*section" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: all three match.

- [ ] **Step 4: Verify old prose-list state definitions are gone**

```bash
grep -n "A pending AUQ session exists and at least one branch is answer-gated" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add plugins/superpower-dev/skills/do/SKILL.md
git commit -m "feat(superpower-dev): add AUQ Registry section and rewrite State Machine with table-derived macro state"
```

---

### Task 4: Rewrite AUQ Timeout Guardrail + Add Scheduling Subsection

**Files:**
- Modify: `plugins/superpower-dev/skills/do/SKILL.md:168-180` (line numbers will have shifted after Task 3; locate by section header)

- [ ] **Step 1: Verify current section is present**

```bash
grep -n "^### AUQ Timeout Guardrail" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: one match.

- [ ] **Step 2: Replace AUQ Timeout Guardrail section**

Using Edit tool, replace:

```
### AUQ Timeout Guardrail

When blocking AUQ wait times out:

1. Keep the original question as unresolved state (`WAITING_AUQ`), do not discard or rewrite it.
2. Split the plan into:
   - blocked slice (depends on AUQ answer),
   - independent slice (can proceed safely without AUQ answer).
3. Re-plan independent slice immediately and continue in `RUNNING`.
4. Re-check all pending AUQ sessions with `get_answered_questions(session_id, blocking: false)`:
   - after each merged implementation unit, or
   - after explicit user reply signal (`answered`, `replied`, or equivalent).
5. Once answered, switch to `RESUME_READY`, re-attach blocked slice, and continue execution.
```

With:

```
### AUQ Timeout Guardrail

When blocking AUQ wait times out:

1. Update entry `status → timeout` in `auq-registry.json`. Do not discard or rewrite the original question.
2. Split the plan into:
   - blocked slice (depends on AUQ answer) — store `{ plan_file, section }` reference in entry's `blocked_slices`,
   - independent slice (can proceed without AUQ answer).
3. Re-plan independent slice immediately and continue in `RUNNING`. Launch `bash sleep 120` in background (best-effort heartbeat).
4. On each trigger (merged unit / user reply signal / sleep complete): batch re-check all `pending` and `timeout` entries — one `get_answered_questions(entry.session_id, blocking: false)` call per entry.
5. Once answered: update `status → answered`; derive macro state as `RESUME_READY`; re-attach `blocked_slices` from entry; set `consumed_at` when slice execution begins.

### fix-errors + RESUME_READY Scheduling

When fix-errors dispatch and RESUME_READY occur simultaneously:

1. Dispatch fix-errors subagent first (background, worktree-isolated).
2. Evaluate concurrency:
   - Non-overlapping worktrees → RESUME_READY may proceed concurrently.
   - Overlapping worktrees → defer RESUME_READY until fix-errors completes.
```

- [ ] **Step 3: Verify new text is present**

```bash
grep -n "fix-errors + RESUME_READY Scheduling" plugins/superpower-dev/skills/do/SKILL.md
grep -n "Non-overlapping worktrees" plugins/superpower-dev/skills/do/SKILL.md
grep -n "plan_file, section.*blocked_slices" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: all three match.

- [ ] **Step 4: Verify old guardrail text is replaced**

```bash
grep -n "Re-check all pending AUQ sessions with" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add plugins/superpower-dev/skills/do/SKILL.md
git commit -m "feat(superpower-dev): rewrite AUQ Timeout Guardrail and add fix-errors/RESUME_READY scheduling rules"
```

---

### Task 5: Final Consistency Check

**Files:**
- Read: `plugins/superpower-dev/skills/do/SKILL.md`

- [ ] **Step 1: Confirm no stale single-session_id references remain in AUQ sections**

```bash
grep -n "capture \`session_id\`, then call" plugins/superpower-dev/skills/do/SKILL.md
grep -n "WAITING_AUQ items exist" plugins/superpower-dev/skills/do/SKILL.md
grep -n "on each merge OR user" plugins/superpower-dev/skills/do/SKILL.md
grep -n "Re-check all pending AUQ sessions with" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: all four return no output.

- [ ] **Step 2: Confirm all four new anchors are present**

```bash
grep -c "auq-registry.json" plugins/superpower-dev/skills/do/SKILL.md
grep -c "batch re-check" plugins/superpower-dev/skills/do/SKILL.md
grep -c "consumed_at" plugins/superpower-dev/skills/do/SKILL.md
grep -c "Non-overlapping worktrees" plugins/superpower-dev/skills/do/SKILL.md
```

Expected: each returns 1 or more.

- [ ] **Step 3: Scan the full file for internal consistency**

Read `plugins/superpower-dev/skills/do/SKILL.md` end-to-end and verify:
- Rules 18–20 match spec Section 2
- Decision Tree AUQ block matches spec Section 5
- `## AUQ Registry` section exists between Core Rules and `## AUQ Runtime State Machine`
- State Machine table matches spec Section 3
- `### fix-errors + RESUME_READY Scheduling` subsection exists after `### AUQ Timeout Guardrail`

If any inconsistency found, apply targeted fix before proceeding.

- [ ] **Step 4: Commit (if Step 3 required fixes)**

```bash
git add plugins/superpower-dev/skills/do/SKILL.md
git commit -m "fix(superpower-dev): resolve consistency issues from final check"
```

Only run this step if Step 3 found issues requiring edits.
