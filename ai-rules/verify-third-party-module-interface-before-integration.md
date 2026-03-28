# Verify third-party module interfaces before integration

## Requirements

- When adding or changing integration with a third-party module, use the project’s **authoritative docs skill** (e.g. find-docs) for official documentation or upstream repo docs.
- Confirm the **actual export shape and primary entrypoints** under the current runtime and module system before full integration.
- Run at least one **minimal smoke check** proving import shape, constructor, or main call path works.
- Prefer **positive** rule text: verify the interface and confirm with a minimal case—avoid rules that only restate one past error message.

## Why this exists

Agents often guess APIs from names or unofficial examples. Failures then appear only at runtime. A stable cross-project habit is: verify real exports, then integrate.

## Local tuning

- Whether docs lookup is mandatory before every new dependency.  
- Whether smoke checks live in tests, scripts, or documented manual steps.  
- How bundler/runtime affects import-shape checks.  
- Rewriting one-off “never do X with package Y” rules into general positive checks.

## How to verify

- New or changed integrations have a smoke check, test, or explicit verification step.  
- Official docs were consulted, not only names or second-hand snippets.  
- Wiring matches actual exports under this runtime.  
- Rules describe what to do, not only past failure modes.  
- Incident learnings were generalized where possible.
