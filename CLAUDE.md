# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests
npm run test:pld

# Validate plugin manifests
npm run validate:plugins

# Regenerate ASCII flowcharts from Mermaid in READMEs
npm run render:pld-flowchart
```

No build step — all code is native Node.js (CommonJS). Node.js >=18 required.

## Architecture

This repo is a **Cursor Open Plugins marketplace template** containing two plugins:

- **`parallel-lane-dev`** — A multi-subagent executor framework (PLD) for parallel work decomposition
- **`superpower-dev`** — A governance routing skill (`do`) that routes user requests to the correct executor

### PLD Execution Model

The PLD plugin orchestrates parallel subagent lanes using **SQLite as the single source of truth** (`.pld/executor.sqlite`). The coordinator decomposes goals into lanes, and stateless `pld-coder` / `pld-reviewer` subagents claim assignments, work in isolated git worktrees, and report results back via `pld-tool`. Only the Main Agent (coordinator) merges to mainline.

```
User → Coordinator (import-plans → audit → go) → spawns pld-coder (per lane, worktree)
                                                → spawns pld-reviewer
                                                → merges to mainline
```

State machine: `pending → claimed → in-progress → review-ready → review-pass → merged`

### Key Files

| Path | Purpose |
|------|---------|
| `plugins/parallel-lane-dev/scripts/pld-tool.cjs` | Central CLI; all lane state transitions |
| `plugins/parallel-lane-dev/scripts/pld-tool-lib.cjs` | SQLite schema + helper functions |
| `plugins/parallel-lane-dev/scripts/pld-lib.cjs` | File I/O + git utility functions |
| `plugins/parallel-lane-dev/skills/parallel-lane-dev/SKILL.md` | Workflow entry point + full Mermaid diagram |
| `plugins/parallel-lane-dev/agents/pld-coder.md` | System prompt for implementer subagents |
| `plugins/parallel-lane-dev/agents/pld-reviewer.md` | System prompt for reviewer subagents |
| `plugins/superpower-dev/skills/do/SKILL.md` | Governance routing rules |
| `scripts/validate-template.mjs` | Plugin manifest linter |
| `.cursor-plugin/marketplace.json` | Marketplace registry |

### Governance Layers

Rules live in one canonical location and thin adapters point to it — never duplicate:

- **`ai-rules/*.md`** — Authoritative governance chapters (long-form)
- **`AGENTS.md`** — Repo-specific index (lists all ai-rules with summaries)
- **`.cursor/rules/*.mdc`** — Thin adapters that point to `AGENTS.md` / `ai-rules/`

When adding new rules, add them to `ai-rules/` and register in `AGENTS.md`. Do not embed rule content in `.cursor/rules/`.

### Plugin Structure (for adding new plugins)

Each plugin under `plugins/<name>/` requires:
- `.cursor-plugin/plugin.json` — Plugin manifest
- `skills/<name>/SKILL.md` — Entry point skill
- Registration in `.cursor-plugin/marketplace.json`

See `scripts/validate-template.mjs` for manifest schema requirements.
