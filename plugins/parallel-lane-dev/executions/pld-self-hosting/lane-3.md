# Lane 3 Plan - Rules and Communication

> Ownership family:
> `plugins/parallel-lane-dev/spec/PLD/operating-rules.md`, `plugins/parallel-lane-dev/spec/PLD/guardrails.md`, `plugins/parallel-lane-dev/spec/PLD/communication.md`
>
> PLD worktree: `.worktrees/pld-lane-3-rules`
>
> Lane-local verification:
> `rg -n "active lane count|4PLD|4 active lanes" plugins/parallel-lane-dev/spec/PLD`

## M - Operating Model

- [ ] Clarify that tracked scoreboard and lane-status sections are sync targets derived from execution truth, not independent writable memory
- [ ] Define how degraded-mode coordinator reads should behave when auxiliary runtime artifacts are absent or malformed

## V - Communication Surface

- [ ] Document `pld-sync-execution-truth` as the preferred cleanup path after accepted work lands on `main`
- [ ] Clarify which read helpers are observational, which helpers may sync tracked status sections, and which surfaces must stay coordinator-authored

## C - Guardrails

- [ ] Keep autopilot, probe, execution-insights, and execution-truth sync rules consistent with projection-only tracked surfaces

## Current Lane Status

- [x] Projected phase: parked
- [x] Current item: Lane-pool + active-cap rules alignment
- [x] Latest commit: `ef5f71e`
- [x] Latest event: parked · pld-go: park self-hosting after dev-flow improvement plan completed
- [x] Next expected phase: n/a
- [x] Next refill target: Execution-level wording cleanup
- [x] Latest note: pld-go: park self-hosting after dev-flow improvement plan completed

## Refill Order

- [ ] First refill target: projection-only wording for degraded-mode reads and execution-truth sync
- [ ] Then lane-creation guidance only if the new reducer/read model exposes another documentation gap
