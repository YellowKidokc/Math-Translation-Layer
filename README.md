# Math Translation Engine

Standalone TypeScript math translation engine with a strict `parse -> translate -> render` pipeline, a pluggable dictionary system, a CLI proof path, and a browser overlay for site integration.

The Theophysics dictionary is the first bundled canon artifact. It lives at `src/dictionaries/theophysics.json` and is designed to be reviewed directly against the public canon notes included with this release.

## What Ships Now

- Pure TypeScript core in `src/core`
- Theophysics canon dictionary in `src/dictionaries`
- CLI in `src/cli/index.ts`
- Browser overlay in `src/browser/overlay.ts`
- Legacy compatibility shim in `theophysics-math-translator.ts`

## Architecture

```text
src/
├── api/            future thin wrapper only
├── browser/        browser overlay integration
├── cli/            standalone command-line interface
├── core/           parser, translator, renderer, extractors, types
├── dictionaries/   machine-readable dictionaries + hooks
└── renderers/      output adapters
```

Core public API:

- `parseMath(input, { format })`
- `translateMath(ast, { dictionary, mode })`
- `renderMath(translated, { renderer })`
- `translate({ input, format, dictionary, mode, renderer })`

## Theophysics Canon Rules

- Factor order is `G · M · E · S_eff · T · K · R · Q · F · C`
- Raw `S_prod` does not multiply `χ` directly
- `C` is the factor
- `χ` is the output

These are encoded in the dictionary metadata and hooks, then enforced by tests.

## CLI

Build first:

```bash
npm install
npm run build
```

Translate inline input:

```bash
node dist/src/cli/index.js translate --input "\\chi = G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C" --renderer latex-structural
```

Translate a file:

```bash
node dist/src/cli/index.js translate --file article.html --mode structural --renderer html-mathjax --output translated.txt
```

Scan a folder:

```bash
node dist/src/cli/index.js scan --path "./tests/fixtures" --report text
```

Inspect bundled dictionaries:

```bash
node dist/src/cli/index.js dictionary list
node dist/src/cli/index.js dictionary inspect --dictionary theophysics
```

## Click-To-Run TTS Workflow

For HTML/articles that need the math layer before audio, double-click:

```text
RUN_MATH_TTS_WORKFLOW.bat
```

The menu is an intake wizard. It can:

- point at one file, a recursive folder, or a `.txt` list of many paper paths
- ask whether to process HTML, Markdown, text, or all supported files
- run a dry pass with Math Translation only
- run TTS only, skipping Math Translation
- run Math Translation first, pause for review, then push prepared text to TTS
- copy original source files into `workflow_output/source/<run-id>`
- rip readable Markdown into `workflow_output/markdown/<run-id>`
- write TTS-ready text into `workflow_output/prepared/<run-id>`
- optionally zip the copied source, Markdown, prepared text, logs, and audio folders

For HTML articles, the TTS reading order is intentional:

1. branded opener, defaulting to `Theophysics. David Lowe. POF 2828.`
2. title
3. subtitle
4. paper body
5. appendix material such as key finding, critical insight, rigor, blackboard, audit, kill conditions, and article stats

The extractor skips navigation, tab controls, media controls, hero images, tag pills, and other page chrome. Displayed equation boxes read as: `See the equation below. In plain English: ...`, then use the Math Translation Layer output and any human-facing explanatory note.

The underlying command is:

```bash
node scripts/prepare-tts-workflow.js --input "./tests/fixtures/convergence-01-why-god-drown-everybody.html" --run-tts
```

Use `--list paper-list-template.txt` when processing many files or folders.

## Browser Overlay

`npm run build` emits:

- `dist/browser/math-translation-overlay.js`

Include it on a page with MathJax-backed or raw TeX blocks:

```html
<script src="/path/to/math-translation-overlay.js"></script>
```

The overlay:

- scans `.equation-block .math`, `.math`, MathJax-adjacent nodes, and `data-tex` blocks
- renders translated math by default
- adds a one-line summary
- adds local and master toggles between translation and raw math

## Testing

```bash
npm run typecheck
npm test
```

The test suite covers:

- parser structure
- canon dictionary validation
- master-equation alignment
- CLI behavior
- browser overlay behavior against a real article-shaped fixture

## Public / Private Boundary

This repository is the public translation engine. Private canon workbooks, local article paths, generated audio/text output, and AI handoff archives stay outside GitHub under `_private/`, `David/`, or ignored runtime folders.

See `docs/GITHUB_PREFLIGHT_STRUCTURE.md` for the public station map and `docs/AI_WIRING_PROMPT.md` for the online-AI wiring prompt.
