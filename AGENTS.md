# Repository guidance

`AGENTS.md` is the **authoritative entry point** for governance in this repo. Full chapters live under **`ai-rules/`** only; Cursor rules and other tool configs must stay **thin adapters** (pointers), not second copies of chapter text. See [ai-rules/shared-rules-entry-and-thin-adapters.md](ai-rules/shared-rules-entry-and-thin-adapters.md).

## Language

**Use English** for all content in this repository: documentation, comments, plans, plugin prose, commit messages, and user-facing strings in code and tests. Do not add or retain non-English copy unless it is a required proper noun or external quote.

## Governance chapters (`ai-rules/`)

- [shared-rules-entry-and-thin-adapters.md](ai-rules/shared-rules-entry-and-thin-adapters.md) — `AGENTS.md` + `ai-rules/` as single source; tool configs are thin pointers.
- [commit-each-minimum-viable-change.md](ai-rules/commit-each-minimum-viable-change.md) — commit each MVC with verification; refresh plans; scan remaining dirty work.
- [before-new-mvc-assess-existing-dirty-tree.md](ai-rules/before-new-mvc-assess-existing-dirty-tree.md) — before the next MVC, clarify a dirty tree and unknown-origin changes.
- [choose-agents-skill-script-or-runbook.md](ai-rules/choose-agents-skill-script-or-runbook.md) — where to place rules vs skills vs scripts vs runbooks.
- [verify-third-party-module-interface-before-integration.md](ai-rules/verify-third-party-module-interface-before-integration.md) — docs + smoke check before third-party integration.
- [distinguish-rule-suggestions-from-established-process-state.md](ai-rules/distinguish-rule-suggestions-from-established-process-state.md) — separate new suggestions from routine process status.
- [surface-stale-untracked-governance-files-at-stop.md](ai-rules/surface-stale-untracked-governance-files-at-stop.md) — on stop, surface old untracked governance drafts (e.g. under `changes/`).

## Repository layout

- Marketplace: `.cursor-plugin/marketplace.json` (`metadata.pluginRoot` → `plugins/`).
- PLD tooling: `plugins/parallel-lane-dev/` (`scripts/`, `executions/`, `spec/PLD/`, tests).
- Validate plugins: `node scripts/validate-template.mjs`.
