# Choose AGENTS vs skill vs script vs runbook

## Requirements

- When you capture a repeatable improvement, classify it: governance rule, contextual workflow, mechanical procedure, or low-frequency critical knowledge.
- **High-frequency, generalizable governance** → local `AGENTS.md` (indexed; detailed text still in `ai-rules/` when using that layout).
- **Workflows with triggers, decision points, sequencing, exit criteria** → `skills/`.
- **Clear input/output, worth automating** → `scripts/`.
- **Both judgment and mechanics** → `skill` for judgment/stop conditions + `script` for repeatable steps.
- **Rare but critical troubleshooting / evidence / lookup** → runbook or fixed context location.

## Why this exists

Without boundaries, `AGENTS.md` becomes a manual, skills absorb one-off evidence, and repetitive work never gets scripted.

## Local tuning

- Whether `AGENTS.md` stays index-only vs short must-rules.  
- Whether skills hold real decisions vs mechanical edits.  
- Script threshold (e.g. after 2–3 manual repeats).  
- `skill + script` splits (similar to “finish MVC”: skill decides, script runs git steps).  
- Runbook/context location for rare ops.

## How to verify

- Clear separation of AGENTS index vs skill vs script vs runbook responsibilities.  
- New workflow detail prefers skills over dumping into AGENTS.  
- Repeated manual steps get scripted after a small number of repeats.  
- Mixed judgment+mechanics flows split across skill and script.  
- Rare troubleshooting lives in runbooks/context, not only in chat.
