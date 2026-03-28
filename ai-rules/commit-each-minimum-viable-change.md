# Commit after each Minimum Viable Change and scan remaining dirty work

## Requirements

- When a **Minimum Viable Change (MVC)** is implemented and you have **minimal verification evidence**, create a **local commit** before continuing.
- An MVC is a change unit that can be **explained, verified, and reverted on its own**—not “the whole feature at the end.”
- When an MVC is done, finish verification first, then align specs so they reflect what is actually landed—avoid long drift between code and docs.
- If this round used a plan artifact, refresh it before commit: remove completed items, add newly discovered work, and delete the plan when everything is done.
- The MVC commit should include implementation, verification, and necessary spec sync; **do not** commit throwaway plan artifacts unless the user explicitly asks.
- After the first MVC commit, scan what is still unstaged/uncommitted and look for the **next** MVC-sized slice.
- If another MVC exists in the remaining diff, commit it separately instead of letting multiple finished MVCs sit mixed in one working tree.
- If no further MVC can be formed yet, report what is left dirty and what is missing to complete the next MVC.
- If the user forbids commits, defers commits, or the tree contains someone else’s work you must not touch, obey that and report status only.
- Before starting the **next** MVC while the tree is still dirty, follow [before-new-mvc-assess-existing-dirty-tree.md](before-new-mvc-assess-existing-dirty-tree.md) (including unknown-origin changes).

## Why this exists

Without this habit, multiple finished changes pile up unstaged, rollback gets hard, interrupts leave messy trees, and specs lag verified code.

## Local tuning (discuss per project)

- How this repo defines an MVC and what verification gate applies.  
- Which changes must sync back to spec before commit.  
- How to treat evolving plan artifacts vs formal design docs.  
- Whether agents may commit automatically.  
- How to separate user-owned WIP from agent-owned changes.  
- Where to record “gap to next MVC” when splitting is blocked.

## How to verify

- After a verifiable MVC, there is a commit—not an ever-growing dirty tree.  
- Evidence existed before commit; spec matches the MVC.  
- Plan artifacts were updated or removed per rules above.  
- Throwaway plans were excluded unless requested.  
- Post-commit scan for next MVC or explicit gap report.  
- User constraints on commits were respected.
