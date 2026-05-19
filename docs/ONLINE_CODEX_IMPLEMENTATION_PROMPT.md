# Online Codex Implementation Prompt

Paste this into online Codex or a GitHub-based code assistant.

```text
You are implementing inside this public GitHub repo:
https://github.com/YellowKidokc/Math-Translation-Layer

Goal:
Make the Math Translation Layer more robust as a public, reproducible translation engine for equation-to-English overlays, TTS preparation, UUID/provenance, and review-event handoff.

Read first, in this order:
1. README.md
2. docs/PROMPT_PACK.md
3. docs/GITHUB_PREFLIGHT_STRUCTURE.md
4. docs/AI_WIRING_PROMPT.md
5. IDENTIFIER_POLICY.md
6. NLP_REVIEW_EVENTS.md
7. ONLINE_HANDOFF_MATH_TRANSLATION_LAYER.md
8. front-doors/README.md
9. middle-layer/README.md
10. exports/README.md

Core architecture:
- Public front doors: README, CLI, browser overlay, Windows wizard, TTS preparation script.
- Public middle layer: parser, dictionary, renderers, browser overlay, tests.
- Public export layer: generated-output contracts and sidecar review-event JSON.
- Private backside/NLP logic is intentionally absent. Do not create or expose it. Emit explicit review events instead.

Implementation priorities:
1. Tighten UUID/provenance coverage across document, run, translation event, review event, human repair, and release/build records.
2. Improve HTML equation extraction without breaking existing fixtures.
3. Improve structural equation-map rendering so the English words align visually with the equation symbols.
4. Ensure TTS output preserves math meaning and does not read raw TeX unless no translation is available.
5. Add tests before broad refactors.
6. Keep all examples public-safe: no NAS locations, no local drive roots, no private article-vault paths, no credentials.
7. Keep generated outputs ignored unless they are tiny fixtures required by tests.

Hard boundaries:
- Do not edit private/backside folders if present.
- Do not add credentials, API keys, or local machine paths.
- Do not rewrite the project into a new framework.
- Do not remove existing tests unless replacing them with stricter tests.
- Do not alter published identifier/prediction rows in place; add versioned rows.

Validation required before final answer:
- npm run typecheck
- npm test
- npm run build
- Search public-scope files for private path/credential leakage.

Final answer format:
- Changed files
- What behavior improved
- Validation results
- Any remaining risks or follow-up prompts
```
