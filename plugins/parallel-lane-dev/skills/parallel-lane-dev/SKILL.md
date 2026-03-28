---
name: parallel-lane-dev
description: Use when the user says pld-go, when coordinating multi-lane subagent execution through this repo's executor, or when lane work must claim assignments and report results without using ad-hoc markdown or chat as system state.
---

# parallel-lane-dev (multi-lane / executor)

## Overview

Multi-lane work funnels plan decomposition and execution state into a **single authority**: **executor + SQLite** (`.pld/executor.sqlite`) in this repo—not ad-hoc `plan/*.md`, scoreboards, or chat. Coordinators and subagents exchange ground truth via the **executor CLI** and **git worktree / result branch** handoffs.

Scripts live under **`plugins/parallel-lane-dev/scripts/`** (`pld-*.cjs`); in this monorepo the scoreboard, `executions/`, and `state/` sit next to those scripts under **`plugins/parallel-lane-dev/`**. Other projects may keep the same semantics under a repo-root **`PLD/`** directory.

## When to use

- The user says **`pld-go`** (fixed cue: keep driving related plans through the executor until done).
- You need **import / audit / dispatch / claim / report** against the executor.
- Someone treats **lane docs, events, or threads** as the system of record—redirect them to the executor.

## Sources of truth (non-negotiable)

| Concern | Authority |
|--------|-----------|
| plan / decomposition | `.pld/executor.sqlite` (read/write via executor) |
| lane assignment / progress | same |
| review / intake / integration | coordinator via executor, not hand-edited markdown |

**Physical handoffs:** executor-provided **worktree path, lane branch, base branch**; subagents return **status + result branch** through the executor interface.

## Primary entrypoint

From **this monorepo root** (run from repo root; other repos with root `PLD/` use `node PLD/scripts/pld-executor.cjs`):

```bash
node plugins/parallel-lane-dev/scripts/pld-executor.cjs <command> [options]
```

Common commands:

| Command | Purpose |
|---------|---------|
| `import-plans [--cleanup] [--json]` | Import plans; `--cleanup` may remove sources |
| `audit [--json]` | Inspect executor / state health |
| `go [--json]` | Advance dispatchable work (**pld-go** core) |
| `claim-assignment --execution <id> --lane <Lane N> [--json]` | Subagent claims an assignment |
| `report-result ...` | Report outcomes (see `--help` / `pld-executor.cjs` usage) |

Optional: `--project-root <path>` to pin the project root.

## `plan/` and legacy surfaces

- **`plan/` must not retain live plans**; before `pld-go` or dispatch, ensure it is empty or has been imported/cleaned via executor **import/cleanup**.
- `PLD/scoreboard.md`, `PLD/state/*`, `PLD/executions/*/*.md`, and most non-executor helpers are **legacy / migration**; unless you are maintaining import or compatibility, **do not** add new workflow responsibility there.

## Common mistakes

- Treating `plan/`, scoreboard, or lane journals as progress truth without running `audit` / `go`.
- Asking the main agent to **infer** phase from prose instead of using executor **claim / report** state.
- Running `git commit` inside a lane worktree **outside** the governed flow (if a consumer repo’s AGENTS forbids it, that repo wins).

## Related skills

- **`using-git-worktrees`**: isolated directories; lane **paths** are often `.worktrees/...` inside the project—still follow executor assignments.
- **`subagent-driven-development` / `executing-plans`**: when executing plans, **state writes** must follow this skill’s executor rules, not only markdown checklists.

## Spec and namespace

This skill ships with the Open Plugins package **`parallel-lane-dev`**; component namespaces look like **`parallel-lane-dev:parallel-lane-dev`** (host-dependent). See [Open Plugins — Specification](https://open-plugins.com/plugin-builders/specification).

**Scripts, execution tree, spec, and tests:** `plugins/parallel-lane-dev/` (`scripts/`, `scoreboard.md`, `executions/`), `plugins/parallel-lane-dev/spec/PLD/`, `plugins/parallel-lane-dev/tests/pld-*.test.js`.
