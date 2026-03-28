# Cursor plugin template

Build and publish Cursor Marketplace plugins from a single repo.

Plugins in this template:

- **parallel-lane-dev**: Open Plugins skill plus `plugins/parallel-lane-dev/scripts/` and the sibling execution tree (`scoreboard.md`, `executions/`); specs in `plugins/parallel-lane-dev/spec/PLD/` (`.plugin/` + `skills/parallel-lane-dev/`)

When `marketplace.json` sets `metadata.pluginRoot` to `plugins`, each plugin `source` must be the **folder name under that root** (for example `parallel-lane-dev`), not `./plugins/<name>`.

**Governance:** see root `AGENTS.md` and `ai-rules/` for shared baseline chapters (English). Cursor rules under `.cursor/rules/` are thin pointers only.

## Executor and tests (this repo)

- `npm run test:pld` — `node --test plugins/parallel-lane-dev/tests/pld-*.test.js`
- `npm run pld:executor:audit` — requires an initialized `.pld/` (created via import)

## Getting started

[Use this template](https://github.com/cursor/plugin-template/generate) to create a new repository, then customize:

1. `.cursor-plugin/marketplace.json`: set marketplace `name`, `owner`, and `metadata`.
2. `plugins/*/.cursor-plugin/plugin.json`: set `name` (lowercase kebab-case), `displayName`, `author`, `description`, `keywords`, `license`, and `version`.
3. Replace placeholder rules, skills, agents, commands, hooks, scripts, and logos.

To add more plugins, see `docs/add-a-plugin.md`.

## Single plugin vs multi-plugin

This template defaults to **multi-plugin** (multiple plugins in one repo).

For a **single plugin**, move your plugin folder contents to the repository root, keep one `.cursor-plugin/plugin.json`, and remove `.cursor-plugin/marketplace.json`.

## Submission checklist

- Each plugin has a valid `.cursor-plugin/plugin.json`.
- Plugin names are unique, lowercase, and kebab-case.
- `.cursor-plugin/marketplace.json` entries map to real plugin folders.
- All frontmatter metadata is present in rule, skill, agent, and command files.
- Logos are committed and referenced with relative paths.
- `node scripts/validate-template.mjs` passes.
- Repository link is ready for submission to the Cursor team (Slack or `kniparko@anysphere.com`).
