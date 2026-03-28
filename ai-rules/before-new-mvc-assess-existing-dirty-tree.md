# Before a new MVC: assess the existing dirty tree

## How this relates to other chapters

- [commit-each-minimum-viable-change.md](commit-each-minimum-viable-change.md): after each MVC, commit soon and scan leftovers.  
- **This chapter**: before **starting** the next MVC’s edits, if the tree is dirty, clarify and converge so work does not mix.

## Requirements

1. **Before coding, inspect repo state (`git status`, `git diff` as needed)**  
   - If changes already form an MVC (explainable, verifiable, revertible), **commit that MVC first**, then start the new one.  
   - Do not let multiple finished MVCs sit mixed in one working tree.

2. **Changes you did not produce this session**  
   - Treat them as **possibly** another agent, another session, or human WIP.  
   - Do **not** blend them with a new MVC or commit them together without clarification.

3. **Assess unknown changes**  
   - Read the diff: intent clear vs half-baked vs experimental.  
   - Run project tests or verification commands when they exist and use results.  
   - If they reasonably form an MVC: commit alone per project conventions.  
   - If not finished or unclear: **do not** commit; leave the tree as-is and **report** paths and suggested next steps.

4. **User-imposed limits**  
   - If the user says not to commit or not to touch specific paths: comply and report only.

## How to verify

- Before new MVC work, you can state what was committed, what WIP remains on purpose, and why.  
- Unknown changes were reviewed (and tested when applicable).  
- No bundling of “unknown incomplete” work with a new MVC commit.

## Why this exists

Multi-agent and multi-session work mixes uncommitted changes easily. Clarifying before new edits reduces ownership confusion, bad rollbacks, and mistaken “done” states.
