---
name: do
description: Use as the governance entry point for Superpowers workflow routing from idea, bugfix, spec, or plan into the correct planning/execution skills with executor and worktree guardrails.
---

# Do

Route the user request to the right Superpowers workflow stage and enforce execution guardrails.

## Core Rules

1. Start from current artifacts and task shape, not assumptions.
2. Use semi-automatic artifact detection:
   - First try to infer `spec`/`plan` from common paths and recent files.
   - Ask only if there is no clear candidate or there are conflicting candidates.
3. If subagents are already active in the session, continue with `subagent-driven-development` parallel flow.
4. If a plan requires execution and no subagents are currently active, always ask AUQ to confirm executor choice, with `subagent-driven-development` recommended first.
   - In Codex, use AUQ (`mcp__ask_user_questions__ask_user_questions`) for this confirmation.
   - Do not fall back to plain-text confirmation unless AUQ is unavailable.
   - Exception: when the request explicitly targets `fix-errors` queue continuation and `todo` is non-empty, skip executor AUQ and enter `subagent-driven-development` directly.
5. Except single-thread `executing-plans`, enforce `using-git-worktrees` before execution if not already guaranteed.
6. When the user provides multiple plans in one request, treat them as an ordered queue and continue automatically after each completion.
7. After finishing each plan, automatically converge back to `main` and continue the next queued plan when the convergence path is single, low-risk, and reversible.
   - Example: worktree branch is fully verified, merge/cherry-pick path is unambiguous, and no conflict is detected.
8. Only pause for user confirmation when convergence strategy is ambiguous (merge vs rebase/cherry-pick), conflicts occur, or verification failed.
9. For direct governance updates to this skill (for example: `update $superpower-dev:do ...`) with a single explicit target and low-risk, doc-only edits, auto-commit after verification without waiting for extra confirmation.
   - Scope guard: stage and commit only files required by the requested governance update.
   - If unrelated modified files exist, do not revert them; exclude them from the commit unless explicitly requested.
10. If new worktree paths under `.worktrees/*` appear in git unstaged/untracked state, enforce ignore hygiene before continuing:
   - Ensure project `.gitignore` contains `/.worktrees/` (add it if missing).
   - Include that `.gitignore` update in the same commit that resolves the worktree hygiene issue.
   - Do not remove existing ignore rules; apply the minimal additive change.
11. Before executor selection, run a quick preflight to detect whether the requested plan is already applied (target files/commits already present, no remaining actionable delta).
12. If preflight shows “already applied,” report completion evidence and skip executor/worktree flows.
13. Scope note: AUQ window-focus return behavior is implemented by tmux/window-management tooling and is intentionally out of scope for `superpower-dev:do`.
14. After each plan execution is verified complete, run a feedback stage before final stop/convergence messaging.
15. The feedback stage must review (a) current `superpower-dev:do` skill text and (b) the just-finished execution trace, then report concrete gaps and improvements.
16. After implementation is complete:
   - If implemented with `subagent-driven-development`, always merge back to `main` locally.
   - Otherwise, commit implementation directly on `main`.
17. After local merge to `main` or direct commit on `main`, remove finished plan files that were executed in this run.
18. AUQ default flow: `ask_user_questions(nonBlocking: true)` → capture `session_id` → append entry to `docs/superpowers/executions/auq-registry.json` (status: `pending`) → `get_answered_questions(session_id, blocking: true)`.
19. If `get_answered_questions(..., blocking: true)` times out: update entry `status → timeout`; split plan into blocked slice (depends on AUQ answer) and independent slice (does not); continue `RUNNING` with independent slice. Immediately launch `bash sleep 120` in background as a best-effort heartbeat trigger.
20. While any `auq-registry.json` entries have `status` `pending` or `timeout`, on each trigger point — merged implementation unit, explicit user reply signal (`answered`, `replied`, etc.), or background `bash sleep 120` completion (best-effort; if context resets, next user input serves as trigger) — perform a **batch re-check**: for each `pending` or `timeout` entry, call `get_answered_questions(entry.session_id, blocking: false)` individually, one call per entry. For each entry found answered: update `status → answered`. After the batch scan completes, re-derive macro state from table (any `status=answered` AND `consumed_at=null` → `RESUME_READY`; this takes priority over `PARTIAL_PROGRESS` — if both conditions coexist, handle `RESUME_READY` first). For each `RESUME_READY` entry: re-attach `blocked_slices` (read slice content from `plan_file`/`section` in the entry) and begin execution; set `consumed_at` when that slice's execution begins. Subsequent passes skip entries where `consumed_at` is set.
21. In `fix-errors` mode, if monitor stage discovers or receives new `todo` items, immediately re-route to ordered todo execution and dispatch subagents in background by queue order; do not pause for extra "continue/proceed" prompts unless a defined blocking condition is hit.

## Artifact Detection (Semi-Automatic)

Check in this order:

1. Explicit user-provided path.
2. `docs/superpowers/plans/*.md` (latest relevant file).
3. `docs/superpowers/specs/*.md` (latest relevant file).
4. `tasks/todo.md` and nearby plan-like docs.

If exactly one strong candidate exists, proceed with it.
If multiple plausible candidates exist, ask a short disambiguation question.
In Codex, use AUQ for this question.
If none exists, route by request type (idea/bugfix/implementation).

## Already Applied Preflight

Run this preflight when a concrete plan path is selected:

1. Check whether plan-target files already exist in their intended final locations.
2. Check whether expected key markers/commands from the plan are already present.
3. Check recent commits for matching intent when available.
4. If all checks indicate no actionable delta, classify as `already_applied`.

`already_applied` behavior:
- Do not ask executor AUQ.
- Do not create worktree.
- Return a concise evidence-based completion report.

## Decision Tree

```text
Request arrives
├─ Has implementation plan?
│  ├─ yes
│  │  ├─ Preflight: already applied?
│  │  │  ├─ yes -> report evidence, skip execution
│  │  │  └─ no  -> continue executor selection
│  │  ├─ Subagents already active?
│  │  │  ├─ yes -> continue subagent-driven-development (parallel allowed)
│  │  │  └─ no  -> ask AUQ executor confirmation (recommend subagent-driven-development)
│  │  └─ Worktree required?
│  │     ├─ yes -> setup worktree
│  │     │  ├─ success -> continue execution
│  │     │  └─ fail -> AUQ fallback selection
│  │     └─ no -> continue execution
│  │
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
│  │
│  │  After one plan completes:
│  │  ├─ Verification passed?
│  │  │  ├─ no  -> report failure and request recovery choice
│  │  │  └─ yes -> run Post-Execution Feedback Stage
│  │  │           ├─ findings -> create MVC remediation plan and continue convergence rules
│  │  │           └─ no findings -> continue convergence rules
│  │  ├─ Convergence path to main unambiguous and verified?
│  │  │  ├─ yes -> apply completion policy (subagent flow: local merge to main; non-subagent flow: commit on main), then continue next queued plan
│  │  │  └─ no  -> ask AUQ confirmation for convergence strategy
│  │  ├─ Integration completed on main?
│  │  │  ├─ yes -> remove finished plan files for this run, then continue next queued plan
│  │  │  └─ no  -> stop and resolve integration first
│  └─ no
│     ├─ Has approved spec?
│     │  ├─ yes -> writing-plans
│     │  └─ no
│     │     ├─ Clear bugfix/test-fix request?
│     │     │  ├─ yes -> systematic-debugging (then execution path as needed)
│     │     │  └─ no  -> brainstorming
```

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

## Execution Guardrails

- `subagent-driven-development`:
  - Require `using-git-worktrees` if workspace isolation is not already guaranteed.
  - If worktree setup fails:
    1. capture and report the concrete failure cause,
    2. attempt one safe automated fix/retry,
    3. if still failing, ask AUQ for fallback:
       - retry with adjusted worktree parameters,
       - switch to `executing-plans` in current workspace,
       - pause for manual remediation.
  - Use `dispatching-parallel-agents` only for independent subproblems inside the flow.
- `dispatching-parallel-agents`:
  - Not a top-level replacement for plan executors.
  - Use only when at least 2 independent tasks can run without shared state.
  - Require `using-git-worktrees` if agents may edit concurrently.
- `executing-plans`:
  - Single-thread path; can run directly in current execution session.
  - If branch/worktree risk is detected, still prefer isolated worktree.

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

## Completion Chaining

- If request includes multiple explicit plan paths, execute them in the provided order.
- For each completed plan:
  - verify completion and tests first
  - enforce completion policy:
    - `subagent-driven-development` -> always merge back to `main` locally
    - non-`subagent-driven-development` -> commit implementation directly on `main`
  - after integration on `main`, remove finished plan files executed in this run
  - immediately start the next queued plan without waiting for an extra "proceed"
- If convergence is ambiguous or risky, ask once via AUQ and continue after answer.
- For direct `superpower-dev:do` governance edits that satisfy Core Rule 9, auto-commit with a Conventional Commit message immediately after verification.
- Record evidence using `Execution Evidence Checklist` before final completion messaging.

## Post-Execution Feedback Stage

Trigger:
- Run after execution verification for each completed plan.

Required review outputs:
1. Findings first, ordered by severity.
2. Each finding includes concrete evidence and file/line references when applicable.
3. Distinguish confirmed defects from assumptions/open questions.
4. Produce a minimum-viable remediation plan path under `docs/superpowers/plans/` when fixes are needed.

Behavior:
- If no findings: state "no findings" and list residual risks/testing gaps.
- If findings exist: summarize highest-risk gap first, then propose the smallest safe correction set.

## Execution Evidence Checklist

For each executed plan, capture:
- Selected artifact path and why it was chosen.
- Preflight result (`already_applied` or `action_required`) with command evidence.
- Executor AUQ result (when applicable).
- AUQ runtime state transitions when timeout/recovery occurs (`WAITING_AUQ`, `PARTIAL_PROGRESS`, `RESUME_READY`).
- Verification commands and outcomes.
- Feedback stage result (`findings` or `no_findings`) and report/plan path.

## Confirmation Template

When no active subagents and a plan exists:

`Recommendation: use subagent-driven-development for higher review quality and parallel capability.`
`Alternative: executing-plans for single-thread, linear execution.`
`Please confirm which one to use.`

Codex AUQ form (required when available):
- Title: `Executor`
- Prompt: `Choose execution mode for this plan.`
- Options:
  - `subagent-driven-development (recommended)`
  - `executing-plans`

## Hand-off Mapping

- Idea / new behavior / unclear scope -> `brainstorming`
- Approved spec without plan -> `writing-plans`
- Explicit `fix-errors` continuation with non-empty todo -> direct `subagent-driven-development` (ordered queue background dispatch, no executor AUQ)
- Plan with active subagents -> `subagent-driven-development`
- Plan without active subagents -> ask AUQ executor confirmation (recommend subagent-driven-development)
- Independent multi-domain subproblems during execution -> `dispatching-parallel-agents`
- Explicit single-thread preference -> `executing-plans`
- Multiple explicit plans in one request -> queue + auto-converge-per-plan + continue next plan
