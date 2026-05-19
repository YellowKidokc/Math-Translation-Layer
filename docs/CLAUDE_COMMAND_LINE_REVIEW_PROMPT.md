# Claude Command-Line Review Prompt

Paste this into Claude Code or another command-line coding agent after the implementation pass.

```text
You are doing an adversarial code review of:
https://github.com/YellowKidokc/Math-Translation-Layer

Your job is not to praise the repo. Your job is to find what will break, what leaks private context, what is overfit to David's machine, and what prevents a normal user or institution from cloning and trusting it.

Read first:
- README.md
- docs/PROMPT_PACK.md
- docs/GITHUB_PREFLIGHT_STRUCTURE.md
- docs/AI_WIRING_PROMPT.md
- IDENTIFIER_POLICY.md
- NLP_REVIEW_EVENTS.md
- ONLINE_HANDOFF_MATH_TRANSLATION_LAYER.md
- src/browser/overlay.ts
- scripts/prepare-tts-workflow.js
- tests/

Review targets:
1. Public/private boundary:
   - No private NAS/local paths.
   - No credentials or fake keys that trigger scanners.
   - No generated output accidentally tracked.
2. Runtime reproducibility:
   - Fresh clone can install, build, test.
   - Windows batch workflow has safe defaults.
   - TTS root is environment-driven, not machine-coded.
3. Translation correctness:
   - parse -> translate -> render remains clean.
   - Structural equation maps preserve symbol order.
   - TTS output explains equations in plain English.
4. UUID/provenance:
   - IDs are stable where they should be stable.
   - run IDs are unique where they should be unique.
   - source SHA-256 and document UUID are not lost in exports.
5. Test adequacy:
   - Current tests cover the new behavior.
   - Add focused tests if a bug is found.

If you edit:
- Keep changes minimal and surgical.
- Do not invent private NLP logic.
- Route NLP needs through sidecar JSON review events.
- Do not move major folders unless tests and docs are updated.

Validation:
- npm run typecheck
- npm test
- npm run build
- private path/credential scan excluding .git, node_modules, dist, workflow_output, _private

Final output:
- Blockers fixed
- Remaining risks
- Exact validation output
- Whether the repo is safe to present publicly
```
