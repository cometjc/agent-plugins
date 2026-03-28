# Surface stale untracked governance drafts at stop

## Requirements

- On **stop / handoff reports**, check governance tracking directories (e.g. `changes/`) for **untracked** files older than a fixed age (default suggestion: **7 days**).
- List any such items in the report and prompt the user to adopt, adjust, or delete them.
- Do not let untracked governance proposals sit silently; age is a backlog signal.

## Why this exists

Draft proposals accumulate untracked; without a trigger, they rot and create noise. A stop-report scan surfaces pending governance work early.

## Local tuning

- Actual directory name (`changes/`, `docs/changes/`, etc.).  
- Age threshold per team cadence.  
- Whether to also track “tracked but stuck in planned forever.”  
- Where the backlog list appears in reports.

## How to verify

- Stop reports can list stale untracked governance files when present.  
- Users are nudged to act; resolved items are adopted, deleted, or marked cancelled—not left forever.
