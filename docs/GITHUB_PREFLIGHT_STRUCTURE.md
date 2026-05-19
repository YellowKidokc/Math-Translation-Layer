# GitHub Preflight Structure

## Public Upload

- Root release files: `README.md`, `LICENSE`, `package.json`, `package-lock.json`, `tsconfig*.json`, `vitest.config.ts`, `esbuild.config.mjs`.
- Public source: `src/`, `scripts/`, `tests/`, `theophysics-math-translator.ts`.
- Public docs: `IDENTIFIER_POLICY.md`, `NLP_REVIEW_EVENTS.md`, `ONLINE_HANDOFF_MATH_TRANSLATION_LAYER.md`, this `docs/` folder, and the station folders.
- Public front doors: `front-doors/`, `middle-layer/`, `exports/`.
- Public David template: `DAVID_WORKFLOW.template.md`, which documents the local workflow shape without exposing local paths.

## Private / Ignored

- `_private/` for old AI handoffs, private spreadsheets, local prompts, and non-public canon notes.
- `David/` for David-only workflow notes and machine-specific procedures.
- `workflow_output/` for generated source copies, markdown, prepared TTS, logs, audio, zips, and sidecar events.
- `.env`, `.env.*`, local API keys, and private TTS/NLP credentials.
- Office working files such as `.xlsx`, `.xlsm`, and `.xls` unless intentionally sanitized and whitelisted.

## Boundary Rule

The public repo should show how the translation layer works, how to test it, and how to extend it. It should not reveal David's local NAS layout, private NLP backside, unreleased canon workbooks, or generated article/audio batches.
