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
│  │  After one plan completes:
│  │  ├─ Verification passed?
│  │  │  ├─ no  -> report failure and request recovery choice
│  │  │  └─ yes -> run Post-Execution Feedback Stage
│  │  │           ├─ findings -> create MVC remediation plan and continue convergence rules
│  │  │           └─ no findings -> continue convergence rules
│  │  ├─ Convergence path to main unambiguous and verified?
│  │  │  ├─ yes -> auto-converge to main, continue next queued plan
│  │  │  └─ no  -> ask AUQ confirmation for convergence strategy
│  └─ no
│     ├─ Has approved spec?
│     │  ├─ yes -> writing-plans
│     │  └─ no
│     │     ├─ Clear bugfix/test-fix request?
│     │     │  ├─ yes -> systematic-debugging (then execution path as needed)
│     │     │  └─ no  -> brainstorming
```

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

## Completion Chaining

- If request includes multiple explicit plan paths, execute them in the provided order.
- For each completed plan:
  - verify completion and tests first
  - auto-converge work back to `main` when there is exactly one safe path
  - immediately start the next queued plan without waiting for an extra "proceed"
- If convergence is ambiguous or risky, ask once via AUQ and continue after answer.
- For direct `superpower-dev:do` governance edits that satisfy Core Rule 9, auto-commit with a Conventional Commit message immediately after verification.

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
- Plan with active subagents -> `subagent-driven-development`
- Plan without active subagents -> ask AUQ executor confirmation (recommend subagent-driven-development)
- Independent multi-domain subproblems during execution -> `dispatching-parallel-agents`
- Explicit single-thread preference -> `executing-plans`
- Multiple explicit plans in one request -> queue + auto-converge-per-plan + continue next plan
