# Online Build Handoff — Math Translation Layer

## Current State

The Math Translation Layer is a working TypeScript/Node project with:

- parser/translator/renderer core
- browser overlay for equation translation cards
- structural equation map rows that keep the physical equation and common-language terms aligned
- TTS preparation workflow for HTML/Markdown/text inputs
- tests passing locally

Validation on 2026-05-19:

```text
npm test         -> 6 files / 22 tests passed
npm run typecheck -> passed
npm run build     -> passed, emits dist/browser/math-translation-overlay.js
```

## Structural Equation Map

The browser overlay now inserts a `mtl-structure-map` before the normal word-equation sentence. It renders two aligned rows:

```text
change in coherence | equals | openness | times | outside-in restoration | remaining gap | minus | breakdown pressure | times | inner wholeness
dC/dt               | =      | O        | ·     | G                      | (1-C)         | −     | S                  | ·     | C
```

Purpose: let a reader listen to the equation while visually seeing the same structure translated into ordinary language.

The structural map is also machine-readable. It carries:

```text
data-mtl-event-id="mtl-struct-..."
data-mtl-event="structural-equation-map"
data-mtl-review-priority="high"
data-mtl-review="{...json payload...}"
```

The TTS workflow writes matching sidecar review files:

```text
workflow_output/logs/<run-id>/<paper>.translation-events.json
```

See `NLP_REVIEW_EVENTS.md` for the reviewer schema and prompt.

See `IDENTIFIER_POLICY.md` for run, document, and translation-event UUID rules.

## HTML Problem Fixed

The TTS workflow previously assumed GTQ-shaped HTML:

```text
section#paper article.story
main article.story
```

That meant generic HTML pages could produce only title/subtitle output and silently drop the actual body.

The workflow now falls back through:

```text
main article
article
main
[role='main']
body
```

It also treats these math containers as extractable blocks:

```text
.eq-block
.equation-block
.math-box
.math
.hero-eq
.bx-eq
[data-tex]
mjx-container
```

## Remaining Online Build Targets

If prompting this out online, ask for these specific improvements:

1. Add automated tests for `scripts/prepare-tts-workflow.js` against:
   - GTQ article HTML
   - generic `<main>` article HTML
   - MathJax-rendered HTML
   - article pages with duplicated title/header chrome
2. Add a CLI option:
   - `--content-selector "main article"`
   - fallback to auto-discovery if omitted
3. Add an HTML preview mode:
   - input HTML
   - output copied HTML with translation cards inserted
   - no mutation of source file
4. Add a batch manifest:
   - input path
   - output path
   - math blocks found
   - failed math blocks
   - extraction strategy used
5. Keep reusable class handles stable:
   - `eq-block`
   - `bx-eq`
   - `hero-eq`
   - `mtl-card`
   - `mtl-shell`

## Boundary

Do not turn this into a second website generator. It should remain a translation/preparation layer that can be called from GTQ, AI-HUB, paper-grader, or TTS workflows.
