# Online AI Wiring Prompt

Use this prompt after the repository is clean and pushed. For the fuller multi-AI prompt sequence, start with `docs/PROMPT_PACK.md`.

```text
You are working in the Math Translation Layer repository. Your job is to wire the public station structure without exposing private/local backside material.

Read these first:
- README.md
- IDENTIFIER_POLICY.md
- NLP_REVIEW_EVENTS.md
- ONLINE_HANDOFF_MATH_TRANSLATION_LAYER.md
- docs/GITHUB_PREFLIGHT_STRUCTURE.md
- front-doors/README.md
- middle-layer/README.md
- exports/README.md

Architecture:
- Front doors are public entrypoints: README, CLI, browser overlay, Windows wizard, and TTS preparation script.
- Middle layer is public engine logic: parser, dictionary, renderers, browser overlay, tests.
- Export layer is generated output contract: source copies, markdown, prepared TTS, logs, review-event JSON, release bundles.
- Private backside/NLP logic is not in this repository. Do not invent it, expose it, or hard-code local paths.

Tasks:
1. Add or refine UUID coverage for paper/document, run, translation event, NLP review event, human repair, and release/build records.
2. Keep all generated artifacts out of Git unless they are tiny fixtures needed for tests.
3. Route NLP review needs through explicit event JSON sidecars, not hidden code.
4. Strengthen tests before moving architecture.
5. Preserve the parse -> translate -> render contract.
6. Replace any local path examples with placeholders or bundled fixtures.
7. If a private/local path is needed, document it as an environment variable or local template only.

Validation:
- npm run typecheck
- npm test
- npm run build
- scan for private paths and credentials before proposing a PR

Do not edit published prediction/identifier rows in place. Add versioned rows instead.
```
