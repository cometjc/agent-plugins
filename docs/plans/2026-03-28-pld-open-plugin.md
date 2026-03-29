# parallel-lane-dev Open Plugin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate PLD governance into a single Agent Skill and ship it as the `parallel-lane-dev` package per [Open Plugins 1.0.0](https://open-plugins.com/plugin-builders/specification); fix template marketplace `source` paths under `metadata.pluginRoot`.

**Architecture:** Skill body is `skills/parallel-lane-dev/SKILL.md` (`name: parallel-lane-dev`); dual manifests; `plugins/parallel-lane-dev/` holds `scripts/`, the execution tree (`scoreboard.md`, `executions/`), `spec/PLD/`, `tests/pld-*.test.js`, driven by root `package.json` scripts.

**Tech Stack:** Cursor plugin-template layout conventions, Open Plugins standard layout, `node scripts/validate-template.mjs` validation.

---

## Chunk 1: Plugin skeleton and validation

**Files:**
- Create: `plugins/parallel-lane-dev/.cursor-plugin/plugin.json`
- Create: `plugins/parallel-lane-dev/.plugin/plugin.json`
- Create: `plugins/parallel-lane-dev/assets/logo.svg`
- Modify: `.cursor-plugin/marketplace.json`

- [x] **Step 1:** Create `plugins/parallel-lane-dev` and align both `plugin.json` files with Open Plugins / Cursor templates (`name`: `parallel-lane-dev`, `logo`: relative `assets/logo.svg`).
- [x] **Step 2:** Register `parallel-lane-dev` in `marketplace.json`; set each `source` to the directory name under `pluginRoot` so `validate-template.mjs` passes.
- [x] **Step 3:** Run `node scripts/validate-template.mjs`; expect **Validation passed** (optional hooks/MCP warnings only).

## Chunk 2: parallel-lane-dev skill content

**Files:**
- Create: `plugins/parallel-lane-dev/skills/parallel-lane-dev/SKILL.md`

- [x] **Step 4:** Author `SKILL.md`: `description` is trigger-only (writing-skills CSO); body covers executor authority, `pld-go` semantics, `pld-tool.cjs` subcommands, `plan/` vs legacy boundaries, common mistakes, cross-links to worktree/subagent skills.
- [x] **Step 5:** Run `node scripts/validate-template.mjs` again; confirm skill frontmatter has `name` and `description`.

## Chunk 3: Docs and handoff

**Files:**
- Create: `docs/plans/2026-03-28-pld-open-plugin.md` (this file)
- Create: `plugins/parallel-lane-dev/README.md`

- [x] **Step 6:** Add plugin-level `README.md` (install paths: `~/.agents/plugins/` or project `.agents/plugins/`, see Open Plugins docs).
- [x] **Step 7:** Land a focused commit in this repo (marketplace fix + new plugin).

---

## Review

- Verify: `cd ~/repo/agent-plugins && node scripts/validate-template.mjs` → **Validation passed**.
- The skill summarizes `plugins/parallel-lane-dev/AGENTS.md` and `pld-tool.cjs` usage; executor implementation lives in consumer repos that adopt PLD.

---

## Chunk 4 (iteration): `pld-tool` ACL — default **`worker`** (safer)

**Intent (2026-03-28):** 預設角色不應是 **`coordinator`**。若忘記帶 `--role` / `PLD_ROLE`，目前會得到完整 orchestration（`import-plans`、`go` 等），屬於 **fail-open**，風險較高。**預設改為 `worker`**：忘記指定時只會得到「實作車道」權限（與 **`coder`** 同等），協調者必須 **顯式** `--role coordinator` 或 `PLD_ROLE=coordinator`。

**Role model (when implemented):**

| Role | Default? | Allowed subcommands (same as today unless noted) |
|------|----------|--------------------------------------------------|
| **`worker`** | **yes** (new default) | `audit`, `claim-assignment`, `report-result` — same Set as **`coder`** |
| **`coder`** | no | **Alias of `worker`** (both accepted in CLI; docs may prefer `worker` over time) |
| **`reviewer`** | no | `audit`, `report-result` |
| **`coordinator`** | no | full: `import-plans`, `audit`, `go`, `claim-assignment`, `report-result` |

**Implementation checklist:**

- [x] `plugins/parallel-lane-dev/scripts/pld-tool.cjs`: default in `resolveRole` from `coordinator` → `worker`; add `worker` to `ROLE_COMMANDS` (duplicate Set or alias resolution so `coder` ≡ `worker`).
- [x] **Breaking:** call sites that need coordinator (tests via `runExecutor` injection, `package.json` `import`/`go` scripts) pass **`--role coordinator`** where `import-plans` / `go` / full orchestration is required.
- [x] Update `SKILL.md`, `agents/pld-coder.md` / `pld-reviewer.md`: **omitting role ⇒ worker**; coordinator flows **opt in** to `coordinator`.
- [x] `spec/PLD/operating-rules.md` documents default **`worker`** and explicit **`coordinator`** for orchestration commands.
- [x] Verify: `npm run test:pld`, `npm run validate:plugins`.
