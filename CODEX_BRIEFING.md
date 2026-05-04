# Standalone Math Translation Engine — Codex Briefing
**POF 2828 | May 2, 2026 | Implementation briefing**

## What This Is

A standalone math translation engine, not an Obsidian plugin.

The engine is dictionary-agnostic and follows one rule:

`parse -> translate -> render`

Theophysics is the first bundled dictionary and the first validation corpus. The engine architecture must not hard-code Theophysics as the only possible domain.

## Product Direction

Build order is fixed:

1. CLI first
2. Browser overlay second
3. Obsidian wrapper later, if needed

The core engine must have zero Obsidian dependencies and zero host-framework coupling.

## Required Architecture

```text
src/
├── core/
│   ├── parser.ts
│   ├── translator.ts
│   ├── renderer.ts
│   ├── extract.ts
│   └── types.ts
├── dictionaries/
│   ├── theophysics.json
│   └── theophysics.hooks.ts
├── renderers/
├── cli/
├── browser/
└── api/
```

## Canon Rules For Theophysics

Source of truth is `\\192.168.1.177\Desktop\Cannon\`.

Non-negotiable canon facts:

- factor order is `G · M · E · S_eff · T · K · R · Q · F · C`
- raw `S_prod` must not multiply `χ` directly
- `C` is a factor
- `χ` is the output

These rules belong in dictionary data and hooks, then must be covered by tests.

## Deliverables

### 1. Core API

- `parseMath(input, { format })`
- `translateMath(ast, { dictionary, mode })`
- `renderMath(translated, { renderer })`
- `translate({ input, format, dictionary, mode, renderer })`

### 2. Dictionary Artifact

`src/dictionaries/theophysics.json` is a first-class deliverable. It is the machine-readable canon layer and should be reviewable on its own.

### 3. CLI

Support:

- `translate --input`
- `translate --file`
- `scan --path`
- `dictionary list`
- `dictionary inspect`

### 4. Browser Overlay

Support:

- `.equation-block .math`
- `.math`
- recoverable MathJax-backed blocks
- translated math shown by default
- toggle between translation and raw math
- one-line summary under each equation

## V1 Scope

Universal means the architecture supports future dictionaries.

It does not mean solving all mathematical notation at once.

V1 is locked to the Theophysics corpus plus safe pass-through for unsupported constructs. Unsupported constructs must survive as opaque nodes and be reported, not guessed away.

## Verification

Required validation:

- parser tests
- canon-alignment tests
- dictionary validation tests
- CLI tests
- browser tests against the live article shape

## Canonical Inputs Used

- `D:\GitHub\Math-Translation-Layer\theophysics-math-translator.ts`
- `\\192.168.1.177\Desktop\Cannon\00_READ_ME_FIRST.md`
- `\\192.168.1.177\Desktop\Cannon\01_FORMAL_LAYER_Definition10.md`
- `\\192.168.1.177\Desktop\Cannon\02_PHYSICAL_THEOLOGICAL_LAYER_TenFactorTable.md`
- `\\192.168.1.177\Desktop\faiththru Physics\faiththruphysics.com-deploy-cannotical\_archive\convergence\convergence-01-why-god-drown-everybody.html`

## Success Condition

The engine runs standalone from the CLI, the browser overlay translates real article equations by default, and the Theophysics canon is encoded as data rather than trapped inside host-specific code.
