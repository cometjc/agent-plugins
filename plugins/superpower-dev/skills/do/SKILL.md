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
4. If subagents are not active and execution choice is ambiguous, ask for confirmation with a recommendation.
   - In Codex, use AUQ (`mcp__ask_user_questions__ask_user_questions`) for this confirmation.
   - Do not fall back to plain-text confirmation unless AUQ is unavailable.
5. Except single-thread `executing-plans`, enforce `using-git-worktrees` before execution if not already guaranteed.
6. When the user provides multiple plans in one request, treat them as an ordered queue and continue automatically after each completion.
7. After finishing each plan, automatically converge back to `main` and continue the next queued plan when the convergence path is single, low-risk, and reversible.
   - Example: worktree branch is fully verified, merge/cherry-pick path is unambiguous, and no conflict is detected.
8. Only pause for user confirmation when convergence strategy is ambiguous (merge vs rebase/cherry-pick), conflicts occur, or verification failed.

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

## Decision Tree

```text
Request arrives
├─ Has implementation plan?
│  ├─ yes
│  │  ├─ Subagents already active?
│  │  │  ├─ yes -> continue subagent-driven-development (parallel allowed)
│  │  │  └─ no  -> ask confirmation (recommend subagent-driven-development)
│  │  └─ If user chooses executing-plans -> allow single-thread execution
│  │
│  │  After one plan completes:
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
- Plan without active subagents -> confirm executor (recommend `subagent-driven-development`)
- Independent multi-domain subproblems during execution -> `dispatching-parallel-agents`
- Explicit single-thread preference -> `executing-plans`
- Multiple explicit plans in one request -> queue + auto-converge-per-plan + continue next plan
