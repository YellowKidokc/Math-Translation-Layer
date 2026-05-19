# Math Translation Layer Prompt Pack

Use this file to route the repository through multiple online/code AIs without re-explaining the project each time.

## Recommended Order

1. Run `docs/ONLINE_CODEX_IMPLEMENTATION_PROMPT.md` first for implementation/refactor work.
2. Run `docs/CLAUDE_COMMAND_LINE_REVIEW_PROMPT.md` second for adversarial review and patch instructions.
3. Run `docs/PASTE_READY_ESCALATION_PROMPT.md` when you need one large all-in prompt.

## Non-Negotiables

- Do not expose private/backside NLP logic.
- Do not hard-code David's machine paths.
- Do not commit generated `workflow_output/`, `dist/`, `node_modules/`, `_private/`, or `David/` material.
- Preserve the public contract: parse -> translate -> render.
- All proposed changes must pass `npm run typecheck`, `npm test`, and `npm run build`.
- Any UUID/provenance row that is already published must be amended by adding a new row, not edited in place.

## Success Definition

The repo becomes easy for a normal person or institution to clone, run, inspect, and extend while still keeping David's private workflow, NLP backside, local article vault, and unpublished canon material out of GitHub.
