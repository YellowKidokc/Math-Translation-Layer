# Math Translation Engine

Standalone TypeScript math translation engine with a strict `parse -> translate -> render` pipeline, a pluggable dictionary system, a CLI proof path, and a browser overlay for site integration.

The Theophysics dictionary is the first bundled canon artifact. It lives at [src/dictionaries/theophysics.json](/D:/GitHub/Math-Translation-Layer/src/dictionaries/theophysics.json) and is designed to be reviewed directly against the canon sources.

## What Ships Now

- Pure TypeScript core in [src/core](/D:/GitHub/Math-Translation-Layer/src/core)
- Theophysics canon dictionary in [src/dictionaries](/D:/GitHub/Math-Translation-Layer/src/dictionaries)
- CLI in [src/cli/index.ts](/D:/GitHub/Math-Translation-Layer/src/cli/index.ts)
- Browser overlay in [src/browser/overlay.ts](/D:/GitHub/Math-Translation-Layer/src/browser/overlay.ts)
- Legacy compatibility shim in [theophysics-math-translator.ts](/D:/GitHub/Math-Translation-Layer/theophysics-math-translator.ts)

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
node dist/src/cli/index.js scan --path "\\\\192.168.1.177\\Desktop\\faiththru Physics\\faiththruphysics.com-deploy-cannotical" --report text
```

Inspect bundled dictionaries:

```bash
node dist/src/cli/index.js dictionary list
node dist/src/cli/index.js dictionary inspect --dictionary theophysics
```

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

## Canonical Inputs

- [CODEX_BRIEFING.md](/D:/GitHub/Math-Translation-Layer/CODEX_BRIEFING.md)
- `\\192.168.1.177\Desktop\Cannon\00_READ_ME_FIRST.md`
- `\\192.168.1.177\Desktop\Cannon\01_FORMAL_LAYER_Definition10.md`
- `\\192.168.1.177\Desktop\Cannon\02_PHYSICAL_THEOLOGICAL_LAYER_TenFactorTable.md`
- `\\192.168.1.177\Desktop\faiththru Physics\faiththruphysics.com-deploy-cannotical\_archive\convergence\convergence-01-why-god-drown-everybody.html`
