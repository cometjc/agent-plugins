# Shared rules and consumer layout (authoritative entry and thin adapters)

## How this relates to adoption / sync

- **Pulling updates from a shared baseline** is handled per project via its `adopted/<project>` branch and diff workflow (see each project’s adoption notes).
- **This chapter** constrains how a consumer repo **wires** adopted rules internally so tools stay aligned and text does not fork.

## Requirements

1. **Single authoritative entry**  
   - The repo root **`AGENTS.md`** is the governance entry point and index of chapters.

2. **Single source for rule text**  
   - Full chapters live in **`ai-rules/*.md`** (or another directory explicitly named in `AGENTS.md`).  
   - Tool adapters (`CLAUDE.md`, `.cursor/rules/*.mdc`, Copilot instructions, etc.) **must not** duplicate full chapter bodies; they only **point** to chapter files via `@`, import, or links.

3. **When adding or adopting a chapter**  
   - [ ] Add or update the chapter file under `ai-rules/`.  
   - [ ] Add a link in `AGENTS.md`.  
   - [ ] Update each tool adapter’s reference list to match the index.  
   - [ ] On rename or delete, update the index and all references; search for old paths to avoid broken links.

## How to verify

- Every path listed in `AGENTS.md` exists.  
- Adapter files list the same chapters as the index and do not contain long duplicated bodies.

## Why this exists

With multiple tools, rules copied into one config drift from others. Fixing **`AGENTS.md` + `ai-rules/` as the only sources** and keeping adapters as thin pointers makes imports repeatable and checkable.
