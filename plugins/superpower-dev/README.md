# superpower-dev (Open Plugin)

Governance plugin for Superpowers workflows.  
Primary entry skill: `do`.

## What `do` Does

- Routes from request to the correct workflow stage:
  - `brainstorming`
  - `writing-plans`
  - `subagent-driven-development`
  - `executing-plans`
  - `dispatching-parallel-agents` (as an embedded accelerator, not primary executor)
- Uses semi-automatic artifact detection:
  - tries to infer `spec`/`plan` from common paths
  - asks only when no clear candidate or multiple conflicting candidates exist
- Applies executor governance:
  - if subagents are already active, continue with `subagent-driven-development`
  - otherwise ask for confirmation with a recommendation
  - non-single-thread execution must run with `using-git-worktrees`

## Layout

- `skills/do/SKILL.md`: governance entry skill.
- `.plugin/plugin.json`: Open Plugins manifest.
- `.cursor-plugin/plugin.json`: Cursor plugin manifest.

## Installation (Open Plugins)

### User scope

```bash
mkdir -p ~/.agents/plugins
ln -sfn ~/repo/agent-plugins/plugins/superpower-dev ~/.agents/plugins/superpower-dev
mkdir -p ~/.agents/plugins/plugins
ln -sfn ~/.agents/plugins/superpower-dev ~/.agents/plugins/plugins/superpower-dev
```

### Home marketplace (optional but recommended)

If you use `~/.agents/plugins/marketplace.json` for plugin listing/order, add an entry for `superpower-dev`.

Create the file if missing:

```bash
mkdir -p ~/.agents/plugins
```

Example `~/.agents/plugins/marketplace.json`:

```json
{
  "name": "local-plugins",
  "interface": {
    "displayName": "Local Plugins"
  },
  "plugins": [
    {
      "name": "superpower-dev",
      "source": {
        "source": "local",
        "path": "./plugins/superpower-dev"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

### Project scope

```bash
mkdir -p .agents/plugins
ln -sfn ~/repo/agent-plugins/plugins/superpower-dev .agents/plugins/superpower-dev
```

### Optional: skill symlink (if host reads `~/.agents/skills`)

```bash
mkdir -p ~/.agents/skills
ln -sfn ~/repo/agent-plugins/plugins/superpower-dev/skills/do ~/.agents/skills/do
```

### Reload and verify

After installation:

1. Run `/plugins reload` in TUI.
2. Start a new session (skill discovery may be cached per session).
3. Verify:

```bash
test -f ~/.agents/skills/do/SKILL.md && echo "do skill OK"
test -f ~/.agents/plugins/plugins/superpower-dev/skills/do/SKILL.md && echo "plugin path OK"
```
