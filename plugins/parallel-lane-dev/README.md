# parallel-lane-dev (Open Plugin)

Documents the **multi-lane / executor** workflow for agents: see `skills/parallel-lane-dev/SKILL.md`.

## Installation (Open Plugins)

Per [Installation](https://open-plugins.com/plugin-builders/installation):

- User scope: `~/.agents/plugins/`
- Project scope: `<project>/.agents/plugins/`

After you place this directory (or `plugins/parallel-lane-dev` from the marketplace repo) on a supported plugin path, the **`parallel-lane-dev`** skill should appear (namespace depends on the host, e.g. `parallel-lane-dev:parallel-lane-dev`).

## Manifests

- **Cursor:** `.cursor-plugin/plugin.json` (checked by `node scripts/validate-template.mjs`)
- **Cross-tool:** `.plugin/plugin.json` ([Open Plugins Specification](https://open-plugins.com/plugin-builders/specification))

## Project-side dependencies

**This monorepo** ships executor scripts in `plugins/parallel-lane-dev/scripts/`; the execution tree (`scoreboard.md`, `executions/`, `state/`) and `AGENTS.md` live alongside under `plugins/parallel-lane-dev/`; specs live in `plugins/parallel-lane-dev/spec/PLD/`. If you install **only** the Open Plugin skill into another project, that project must vendor or link the same execution directory (repo-root `PLD/` or the full `parallel-lane-dev/` tree including `pld-*.cjs`) and use `.pld/executor.sqlite`. The skill describes the contract for `node …/scripts/pld-executor.cjs …`.
