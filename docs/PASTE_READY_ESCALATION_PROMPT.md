# Paste-Ready Escalation Prompt

Use this when you want one big prompt for an online coding AI.

```text
We are working on the public Math Translation Layer repo:
https://github.com/YellowKidokc/Math-Translation-Layer

This repo translates formal Theophysics equations into human-readable, TTS-friendly, browser-overlay-friendly English while preserving equation structure. The key UX goal is that a reader can see the original equation and an aligned plain-English structure at the same time, so complexity becomes legible instead of intimidating.

Important context:
- This is the public layer only.
- Private NLP/backside logic is intentionally not uploaded.
- Private local paths, NAS paths, unpublished canon workbooks, generated audio/text batches, and David-only workflow notes must stay out of GitHub.
- The public repo should be cloneable, testable, and credible.

Read first:
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

What I want you to do:
1. Inspect the whole repo.
2. Find the highest-value improvements that make it more robust, public-safe, and institution-ready.
3. Prefer small, test-backed changes over broad rewrites.
4. Improve equation-to-English alignment if you can do so safely.
5. Improve UUID/provenance coverage if any gap exists.
6. Improve TTS/readability if the output still sounds awkward.
7. Keep private/backside NLP logic out of the repo; emit explicit JSON review events instead.
8. Add or strengthen tests for any behavior you change.

Do not:
- Hard-code David's machine paths.
- Add credentials or example API keys shaped like real keys.
- Track generated workflow output.
- Rewrite the repo into a new architecture.
- Break parse -> translate -> render.
- Edit published identifier/prediction records in place.

Run before final:
- npm run typecheck
- npm test
- npm run build
- scan public files for private path/credential leaks

Final answer should include:
- Files changed
- Why each change matters
- Validation results
- Remaining risks
- Exact next prompt if another AI should continue
```
