# Lane 2 Plan - Scoreboard Integration

> Ownership family:
> `plugins/parallel-lane-dev/scripts/pld-refresh-scoreboard.cjs`, `plugins/parallel-lane-dev/scoreboard.md`
>
> PLD worktree: `.worktrees/pld-lane-2-scoreboard`
>
> Lane-local verification:
> `npm run pld:scoreboard:refresh`
> `node plugins/parallel-lane-dev/scripts/pld-suggest-schedule.cjs --execution pld-self-hosting`

## M - Derived Columns

- [ ] Add a shared fallback path that prefers runtime scoreboard artifacts but degrades to tracked scoreboard rows when parsing fails
- [ ] Keep scoreboard-derived scheduling fields stable even when the runtime scoreboard is absent, empty, or malformed

## V - Scoreboard Surface

- [ ] Keep commit-intake and coordinator reads usable without forcing a runtime scoreboard regeneration step
- [ ] Preserve coordinator-authored tracked intent fields while degraded-mode reads fall back to tracked scoreboard rows

## C - Coordinator Flow

- [ ] Make the runtime-scoreboard boundary truthful for coordinator read loops instead of crashing on auxiliary-surface drift

## Current Lane Status

- [x] Projected phase: parked
- [x] Current item: Self-hosting scoreboard rows and schedule-facing refresh
- [x] Latest commit: `1613f3c`
- [x] Latest event: parked · pld-go: park self-hosting after dev-flow improvement plan completed
- [x] Next expected phase: n/a
- [x] Next refill target: Schedule-facing scoreboard wording polish
- [x] Latest note: pld-go: park self-hosting after dev-flow improvement plan completed

## Refill Order

- [ ] First refill target: fail-soft runtime scoreboard loading for coordinator / commit intake
- [ ] Then surface extra derived hints only if the read-only refresh flow still needs them
