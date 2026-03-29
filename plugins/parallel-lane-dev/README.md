# parallel-lane-dev (Open Plugin)

Documents the **multi-lane / executor** workflow for agents: see `skills/parallel-lane-dev/SKILL.md`.

## Workflow sequence (ASCII)

Derived from the Mermaid **sequence diagram** in `skills/parallel-lane-dev/SKILL.md`. Regenerate: `npm run render:pld-flowchart`.

<!-- pld-flowchart-ascii:start -->

```text
+------+         +-------------+                                    +----------+                        +-----------+     +--------------+
| User |         | Main Agent  |                                    | pld-tool |                        | pld-coder |     | pld-reviewer |
+------+         | Coordinator |                                    +----------+                        +-----------+     +--------------+
                 +-------------+
    |                   |                                                 |                                   |                   |
    |  pld-go · goals   |                                                 |                                   |                   |
    |------------------->                                                 |                                   |                   |
    |                   |                                                 |                                   |                   |
    |                   |            import-plans · decompose             |                                   |                   |
    |                   |------------------------------------------------->                                   |                   |
    |                   |                                                 |                                   |                   |
    |                   |                                     +----------------------+                        |                   |
    |                   |                                     | .pld/executor.sqlite |                        |                   |
    |                   |                                     +----------------------+                        |                   |
    |                   |                                                 |                                   |                   |
    |                   |           audit · go (orchestration)            |                                   |                   |
    |                   |------------------------------------------------->                                   |                   |
    |                   |                                                 |                                   |                   |
    |                   |                             spawn @pld-coder · context                              |                   |
    |                   |------------------------------------------------------------------------------------->                   |
    |                   |                                                 |                                   |                   |
    |                   |                                                 |         claim-assignment          |                   |
    |                   |                                                 <-----------------------------------|                   |
    |                   |                                                 |                                   |                   |
    |                   |                                                 |                                   +---+               |
    |                   |                                                 |                                   |   | worktree · MVC · verify
    |                   |                                                 |                                   <---+               |
    |                   |                                                 |                                   |                   |
    |                   |                                                 |  report-result · handoff status   |                   |
    |                   |                                                 <-----------------------------------|                   |
    |                   |                                                 |                                   |                   |
    |                   +---+                                             |                                   |                   |
    |                   |   | lane-item commit (not merge to main)        |                                   |                   |
    |                   <---+                                             |                                   |                   |
    |                   |                                                 |                                   |                   |
    |                   |                                 spawn @pld-reviewer · diff + lane item              |                   |
    |                   |--------------------------------------------------------------------------------------------------------->
    |                   |                                                 |                                   |                   |
    |                   |                +--------------------------------------------------+                 |                   |
    |                   |                | Optional: spawn another @pld-coder if C+R at cap |                 |                   |
    |                   |                +--------------------------------------------------+                 |                   |
    |                   |                                                 |                                   |                   |
    |                   |                                                 |             report-result · spec outcome              |
    |                   |                                                 <-------------------------------------------------------|
    |                   |                                                 |                                   |                   |
    |                   |                                                 |             +---------------------------------------------------------------+
    |                   |                                                 |             | On fail: Cod report-result fixes; new @pld-reviewer re-review |
    |                   |                                                 |             +---------------------------------------------------------------+
    |                   |                                                 |                                   |                   |
    |                   |                              spawn @pld-reviewer · quality · new subagent           |                   |
    |                   |--------------------------------------------------------------------------------------------------------->
    |                   |                                                 |                                   |                   |
    |                   |                                                 |            report-result · quality outcome            |
    |                   |                                                 <-------------------------------------------------------|
    |                   |                                                 |                                   |                   |
    |                   |                                                 |                                 +-----------------------+
    |                   |                                                 |                                 | On fail: same pattern |
    |                   |                                                 |                                 +-----------------------+
    |                   |                                                 |                                   |                   |
    |                   |            audit --json · batch sync            |                                   |                   |
    |                   |------------------------------------------------->                                   |                   |
    |                   |                                                 |                                   |                   |
    |                   |  report-result / policy transitions as needed   |                                   |                   |
    |                   |------------------------------------------------->                                   |                   |
    |                   |                                                 |                                   |                   |
    |                   |                                                 +---+                               |                   |
    |                   |                                                 |   | refill · promote next item    |                   |
    |                   |                                                 <---+                               |                   |
    |                   |                                                 |                                   |                   |
    |                   +---+                                             |                                   |                   |
    |                   |   | final merge to mainline (only MAC)          |                                   |                   |
    |                   <---+                                             |                                   |                   |
    |                   |                                                 |                                   |                   |
    |                   |                    +------------------------------------------+                     |                   |
    |                   |                    | Other items in parallel while C+R at cap |                     |                   |
    |                   |                    +------------------------------------------+                     |                   |
    |                   |                                                 |                                   |                   |
+------+         +-------------+                                    +----------+                        +-----------+     +--------------+
| User |         | Main Agent  |                                    | pld-tool |                        | pld-coder |     | pld-reviewer |
+------+         | Coordinator |                                    +----------+                        +-----------+     +--------------+
                 +-------------+
```

<!-- pld-flowchart-ascii:end -->
## Installation (Open Plugins)

Per [Installation](https://open-plugins.com/plugin-builders/installation):

- User scope: `~/.agents/plugins/`
- Project scope: `<project>/.agents/plugins/`

Example (link install from a clone), replacing `<repo>` with the path to this plugin directory:

```bash
mkdir -p ~/.agents/plugins
ln -sfn <repo>/plugins/parallel-lane-dev ~/.agents/plugins/parallel-lane-dev
```

After you place this directory (or `plugins/parallel-lane-dev` from the marketplace repo) on a supported plugin path, the **`parallel-lane-dev`** skill should appear (namespace depends on the host, e.g. `parallel-lane-dev:parallel-lane-dev`).

### Cursor (skill path)

Cursor loads skills from **`~/.cursor/skills/<name>/`** (each folder contains `SKILL.md`). If your setup mirrors other skills via **`~/.agents/skills/`**, link the plugin’s skill folder there and point Cursor at it:

```bash
mkdir -p ~/.agents/skills
ln -sfn <repo>/plugins/parallel-lane-dev/skills/parallel-lane-dev ~/.agents/skills/parallel-lane-dev
ln -sfn ~/.agents/skills/parallel-lane-dev ~/.cursor/skills/parallel-lane-dev
```

Restart Cursor (or reload the window) if the skill does not show up immediately.

## Manifests

- **Cursor:** `.cursor-plugin/plugin.json` (checked by `node scripts/validate-template.mjs`)
- **Cross-tool:** `.plugin/plugin.json` ([Open Plugins Specification](https://open-plugins.com/plugin-builders/specification))

## Project-side dependencies

**This monorepo** ships executor scripts in `plugins/parallel-lane-dev/scripts/`; the execution tree (`scoreboard.md`, `executions/`, `state/`) and `AGENTS.md` live alongside under `plugins/parallel-lane-dev/`; specs live in `plugins/parallel-lane-dev/spec/PLD/`. If you install **only** the Open Plugin skill into another project, that project must vendor or link the same execution directory (repo-root `PLD/` or the full `parallel-lane-dev/` tree including `pld-*.cjs`) and use `.pld/executor.sqlite`. The skill describes the contract for `node …/scripts/pld-tool.cjs …`.
