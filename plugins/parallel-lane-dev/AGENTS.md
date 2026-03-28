# PLD Directory Rules

- In this monorepo the executor entrypoint is `plugins/parallel-lane-dev/scripts/pld-executor.cjs`; in repos that use a root `PLD/` tree it is `PLD/scripts/pld-executor.cjs`. Both pair with `.pld/executor.sqlite` as the only canonical PLD execution interface and state.
- Coordinators and subagents exchange facts only via executor CLI/API plus worktree branch / result branch; do not treat markdown, `events.ndjson`, `lane-*.json`, or thread prose as authoritative state channels.
- `plan/` must not hold live plans. If `plan/*.md` still exists, run executor import/cleanup before `pld-go` or dispatch.
- Each state dimension has a single source of truth, currently executor SQLite:
  - plan / decomposition truth: `.pld/executor.sqlite`
  - execution / lane / assignment truth: `.pld/executor.sqlite`
  - result / review / integration truth: `.pld/executor.sqlite`
- Worktree branch and result branch are the only durable handoff payloads:
  - lane assignment comes from executor (worktree path, lane branch, base branch)
  - subagents return a single status and result branch
  - review / intake / integration close through the coordinator via executor
- Tracked scoreboard, `state/*`, `executions/*/*.md` (whether under repo-root `PLD/…` or this plugin `plugins/parallel-lane-dev/…`), and most non-executor helpers are **legacy migration surfaces**; do not add new workflow responsibility there unless maintaining import/cleanup/backward compatibility.
- `pld-go` means the main agent drives all related plans through the executor until those plans complete—not a one-off truth scan or a single execution’s dispatchability snapshot.
- Subagent status must go through executor interfaces such as `claim-assignment` and `report-result`; do not ask the main agent to infer phase from free text.
