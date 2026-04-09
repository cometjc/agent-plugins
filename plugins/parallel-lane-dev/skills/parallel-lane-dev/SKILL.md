---
name: parallel-lane-dev
description: Use when the user says pld-go, when coordinating multi-lane subagent execution through this repo's pld-tool, or when lane work must claim assignments and report results without using ad-hoc markdown or chat as system state.
---

# parallel-lane-dev (multi-lane / pld-tool)

## Overview

Multi-lane work funnels plan decomposition and execution state into a **single authority**: **`pld-tool`** (`pld-tool.cjs`) and **SQLite** (`.pld/executor.sqlite`) in this repo—not ad-hoc `plan/*.md`, scoreboards, or chat. **pld-coder** and **pld-reviewer** subagents write progress **only through `pld-tool`**; the **Main Agent** batches **`audit --json`** (and related orchestration) to coordinate and is the **only** actor that performs **final merge** to mainline.

Scripts live under **`plugins/parallel-lane-dev/scripts/`** (`pld-*.cjs`); in this monorepo the scoreboard, `executions/`, and `state/` sit next to those scripts under **`plugins/parallel-lane-dev/`**. Other projects may keep the same semantics under a repo-root **`PLD/`** directory.

## Converging multi-source status

Avoid parallel **files + chat** as competing progress trackers between Main Agent, coders, and reviewers. **Readable** markdown (scoreboard, lane journals) may exist for humans, but **writable** execution truth is **`pld-tool` → SQLite** only. Subagents **do not** ask the Main Agent to “record” state that belongs in **`report-result`**.

## Plugin agents (Open Plugins)

This package ships [Open Plugins **Agents**](https://open-plugins.com/agent-builders/components/agents):

| File | Namespaced id (typical) |
|------|-------------------------|
| [`agents/pld-coder.md`](../../agents/pld-coder.md) | **`parallel-lane-dev:pld-coder`** |
| [`agents/pld-reviewer.md`](../../agents/pld-reviewer.md) | **`parallel-lane-dev:pld-reviewer`** |

**Spawn pattern (host-dependent):** Main Agent invokes a subagent with the **pld-coder** or **pld-reviewer** role — e.g. **`@pld-coder`** or **`@parallel-lane-dev:pld-coder`** — so the subagent’s system prompt matches the agent body and it **uses `pld-tool` to claim/report** without serializing every step through the Main Agent chat.

## When to use

- The user says **`pld-go`** (fixed cue: keep driving related plans through **pld-tool** until done).
- You need **import / audit / dispatch / claim / report** against **pld-tool**.
- Someone treats **lane docs, events, or threads** as the system of record—redirect them to **pld-tool** / SQLite.

## Sources of truth (non-negotiable)

| Concern | Authority |
|--------|-----------|
| plan / decomposition | `.pld/executor.sqlite` (read/write via **pld-tool**) |
| lane assignment / progress | same |
| review / intake | **pld-tool** (`report-result`, etc.), not chat |

**Final merge to integration/mainline:** **Main Agent only** (git merge / PR merge). **pld-coder** / **pld-reviewer** do not perform that merge.

**Physical handoffs:** **pld-tool**-provided **worktree path, lane branch, base branch**; **report-result** carries **status + result branch**.

## `pld-tool` by role (policy)

Same binary; **different allowed subcommands** enforced by **`--role coordinator|worker|coder|reviewer`** (or **`PLD_ROLE`**). Default is **`worker`** (fail-closed: lane implementer ACL). **`coordinator`** is **never** implicit — Main Agent must pass **`--role coordinator`** (or env) for **`import-plans`**, **`go`**, and full orchestration. **`coder`** is an alias of **`worker`**.

| Role | CLI flag / env | Use `pld-tool` for |
|------|----------------|---------------------|
| **worker** (default) | omit role, `--role worker`, or `PLD_ROLE=worker` | `claim-assignment`, `report-result`; optional **`audit [--json]`** — same as **`coder`** |
| **coordinator** (Main Agent) | **`--role coordinator`** or `PLD_ROLE=coordinator` | `import-plans`, **`audit`**, **`go`**, **`claim-assignment`**, **`report-result`**; **git merge / integration** stays human/policy |
| **pld-coder** | `--role coder` or `PLD_ROLE=coder` (alias of **worker**) | same as **worker** |
| **pld-reviewer** | **`--role reviewer`** or `PLD_ROLE=reviewer` | `report-result`; optional **`audit [--json]`** — **not** `claim-assignment` |

Valid **`report-result --status`** values and flags: **`node plugins/parallel-lane-dev/scripts/pld-tool.cjs`** (no args) or inspect **pld-tool-lib.cjs**. **`audit --json`** shape: stable top-level keys include **`planFiles`**, **`pendingPlanCount`**, **`queuedLaneCount`**, **`reviewLaneCount`**, **`blockingIssues`** — see **`plugins/parallel-lane-dev/tests/pld-tool.test.js`** (`audit --json exposes stable top-level fields`).

## Main Agent batch sync (cadence)

After **macro steps** (e.g. a spawn wave completes, or N subagent **`report-result`** events), run **`pld-tool audit --json`** once to load **all lanes**, counts, and **blocking issues** — then decide spawns, intake, and **`go`**. Avoid tight **poll loops**; batch reads reduce chat bottleneck and match SQLite truth.

## Co-advancement (two sides)

- **Main Agent:** batch **`audit`**, **`go`**, **`import-plans`**, **merge**, spawn **`@pld-coder` / `@pld-reviewer`**.
- **Subagents:** concurrent **`claim-assignment` / `report-result`** into SQLite.

> When managing 2+ active executions, prefer `pld:dispatch-plan:all` for a unified view of what to do next. Slots are distributed evenly (floor division). Use per-execution commands when fine-grained slot control matters.

Both advance work; **only Main Agent** integrates to mainline. Subagents finish first on **pld-tool**; Main Agent **re-reads `audit`** before orchestration decisions.

## Primary entrypoint

From **this monorepo root** (other repos with root `PLD/` use `node PLD/scripts/pld-tool.cjs`):

```bash
node plugins/parallel-lane-dev/scripts/pld-tool.cjs [--role coordinator|worker|coder|reviewer] <command> [options]
```

**Reviewers** must pass **`--role reviewer`** (default **worker** can `claim-assignment`, which reviewers must not). Implementers may omit **`--role`** (defaults to **worker**) or pass **`--role worker`** / **`--role coder`**. Or: `npm run pld:tool -- [--role …] <command> [options]`.

| Command | Purpose |
|---------|---------|
| `import-plans [--cleanup] [--json]` | Import plans |
| `audit [--json]` | Batch health snapshot for coordinator |
| `go [--json]` | Advance dispatchable work (**pld-go**) |
| `claim-assignment --execution <id> --lane <Lane N> [--json]` | Coder claims |
| `report-result ...` | Coder or reviewer reports (see `--help`) |
| `pld:autopilot:all` | One-pass coordinator snapshot across **all** active executions |
| `pld:dispatch-plan:all` | Merged priority action queue across **all** active executions |

Optional: `--project-root <path>`.

## Composing PLD with subagent-driven-development and using-git-worktrees

| Layer | Skill | Role in PLD |
|-------|--------|-------------|
| Isolation | **`using-git-worktrees`** | Work in **pld-tool**-assigned paths; verify ignore / baseline. |
| Per-item quality | **`subagent-driven-development`** | Implement → spec → quality; **state via pld-tool**. |

### Roles and worker-slot accounting

| Role | Meaning | Count toward **active subagent cap**? |
|------|---------|--------------------------------------|
| **Main Agent** | Import, **`audit`/`go`**, spawn agents, **merge**, human judgment | **No** |
| **Coder** (pld-coder) | Implement + **`claim`/`report-result`** | **Yes** — per concurrent coder |
| **Reviewer** (pld-reviewer) | Review + **`report-result`** | **Yes** — per concurrent reviewer |
| **pld-tool** | CLI + SQLite | **No** |

**`C + R` ≤ active subagent cap.**

**Parallelism:** At most **one** active implementer per lane item per worktree; parallel coders only on **non-overlapping** lanes.

**Suggested loop:** Main Agent **`import-plans`** → **`go`** → **`pld:provision-worktree --execution <id> --lane <Lane N>`** (per lane, before coder dispatch) → spawn **`@pld-coder`** → coder **`claim-assignment`** → MVC in provisioned worktree → coder **`report-result`** → Main Agent **lane-item commit** → spawn **`@pld-reviewer`** → reviewer **`report-result`** (spec then quality) → Main Agent **`audit`** batch → **`report-result`/refill** as policy → repeat → **Main Agent merge** when ready.

> If `pld:provision-worktree` reports `gitignoreStaged: true`, commit `.gitignore` before dispatching the coder.
> If `baselinePassed: false`, investigate before dispatching.

### Parallel review pipeline

1. While **pld-reviewer** works on item A, Main Agent may spawn another **@pld-coder** for item B if **`C + R ≤ cap`** and write sets do not overlap.
2. On review failure: coder fixes and **`report-result`**; **new `pld-reviewer`** for re-review.
3. **Hot path:** coders/reviewers use **`pld-tool`** directly; Main Agent uses **batched `audit`**, not per-message chat relay for authority.

### Clarifications

- **Spec (planning)** vs **spec compliance review** — first is import/decompose; second is **post-commit** diff review.
- **Refill:** After both gates pass, promote next item per `spec/PLD/operating-rules.md`.

### Sequence diagram

```mermaid
sequenceDiagram
  autonumber
  participant Usr as User
  participant MAC as Main Agent<br/>Coordinator
  participant Tool as pld-tool
  participant Cod as pld-coder
  participant Rev as pld-reviewer

  Usr->>MAC: pld-go · goals
  MAC->>Tool: import-plans · decompose
  Note over Tool: .pld/executor.sqlite

  MAC->>Tool: audit · go (orchestration)
  MAC->>Cod: spawn @pld-coder · context
  Cod->>Tool: claim-assignment
  Cod->>Cod: worktree · MVC · verify
  Cod->>Tool: report-result · handoff status
  MAC->>MAC: lane-item commit (not merge to main)

  MAC->>Rev: spawn @pld-reviewer · diff + lane item
  Note over MAC,Cod: Optional: spawn another @pld-coder if C+R at cap
  Rev->>Tool: report-result · spec outcome
  Note over Rev,Cod: On fail: Cod report-result fixes; new @pld-reviewer re-review

  MAC->>Rev: spawn @pld-reviewer · quality · new subagent
  Rev->>Tool: report-result · quality outcome
  Note over Rev,Cod: On fail: same pattern

  MAC->>Tool: audit --json · batch sync
  MAC->>Tool: report-result / policy transitions as needed
  Tool->>Tool: refill · promote next item

  MAC->>MAC: final merge to mainline (only MAC)
  Note over Usr,Rev: Other items in parallel while C+R at cap
```

## `plan/` and legacy surfaces

- **`plan/`** empty or imported before **`go`**.
- Scoreboard / `state/*` / `executions/*/*.md`: **legacy render** unless maintaining migration — **not** a second writable truth.

## Telemetry helpers

`pld:autopilot` already includes telemetry inline. Use the standalone scripts when you want only telemetry, e.g. for a post-execution cost review.

| npm script | When to use |
|-----------|-------------|
| `npm run pld:telemetry:summarize -- --execution <id>` | View minute-bucket cost and drop-segment summary after an execution |
| `npm run pld:telemetry:review -- --execution <id>` | Write a structured telemetry review file to `PLD/state/<execution>/telemetry-review.md` for offline inspection |

These are read-only helpers — they do not change lane state or executor DB.

## Common mistakes

- Using **chat** or **extra markdown** as authoritative status instead of **`report-result`**.
- **Subagents** running **`import-plans`** / **`go`** without explicit Main Agent delegation.
- **Subagents** performing **final merge** to mainline.
- Counting **lanes** instead of **`C + R`** against cap.
- **Tight `audit` polling** instead of **batch** reads after macro steps.

## Related skills

- **`using-git-worktrees`**, **`subagent-driven-development`**, **`executing-plans`**, **`requesting-code-review`** — PLD state still flows through **pld-tool**.

## Spec and namespace

- Open Plugins package **`parallel-lane-dev`**; skill namespace **`parallel-lane-dev:parallel-lane-dev`**.
- Agents: **`parallel-lane-dev:pld-coder`**, **`parallel-lane-dev:pld-reviewer`**.

**Scripts, spec, tests:** `plugins/parallel-lane-dev/` (`scripts/`, `spec/PLD/`, `tests/pld-*.test.js`, **`agents/`**).
