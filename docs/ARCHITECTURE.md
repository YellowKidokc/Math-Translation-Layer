# Math Translation Layer Architecture

## Visual Pipeline

```text
                 ┌────────────────────┐
                 │ Raw math input      │
                 │ TeX / Unicode /     │
                 │ MathML contract     │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │ parseMath           │
                 │ tokenizer + AST     │
                 └─────────┬──────────┘
                           │ MathAst
                           ▼
                 ┌────────────────────┐
                 │ translateMath       │
                 │ dictionary + hooks  │
                 └─────────┬──────────┘
                           │ TranslatedMath
                           ▼
                 ┌────────────────────┐
                 │ renderMath          │
                 │ renderer adapters   │
                 └─────────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   CLI output       Browser overlay   TTS/review/export
```

## Core Path: Parse → Translate → Render

### 1. Parse

`parseMath` receives an input string and format flag. It tokenizes recognizable TeX-style notation, builds a typed AST, and records parse issues in metadata. Parsing is intentionally conservative: if the layer does not understand a construct, the correct behavior is to preserve or diagnose it rather than change its mathematical meaning.

### 2. Translate

`translateMath` loads the requested dictionary, normalizes aliases, matches known equation patterns, and annotates AST nodes with labels and spoken text. Translation does not reorder or simplify the expression. Dictionary hooks may apply canon-specific structural readings, but those readings must be tested and documented.

### 3. Render

`renderMath` selects an output adapter. Structural renderers keep equation shape visible; narrative renderers explain a matched equation in sentences when a reviewed narrative exists.

## Browser Overlay Path

```text
Web page DOM
   │
   ▼
scan math selectors and data-tex blocks
   │
   ▼
extract raw TeX / math text
   │
   ▼
translate with bundled dictionary
   │
   ▼
insert translated display + summary
   │
   ▼
reader toggles raw math ↔ translation
```

The browser overlay is for comprehension at the point of reading. It scans article-shaped pages, translates each discovered math block, inserts a local translated view, and keeps access to raw notation through toggles. This path must stay auditable: readers should be able to compare the bridge text against the original equation.

## CLI Path

```text
User command
   │
   ├── translate --input "..."
   ├── translate --file article.html
   └── scan --path ./folder
          │
          ▼
  parse → translate → render
          │
          ▼
 stdout, output file, or scan report
```

The CLI is the proof path for reproducible runs. It supports direct input, file input, folder scanning, renderer selection, and dictionary inspection. It should remain scriptable so future researchers and CI jobs can verify translations without a browser.

## Dictionary Loading Path

```text
loadDictionary(id)
   │
   ▼
registry lookup in src/dictionaries
   │
   ├── dictionary JSON metadata/rules
   └── dictionary hooks
          │
          ▼
LoadedDictionary { data, hooks }
```

A loaded dictionary contains metadata, aliases, symbol rules, structure rules, equation rules, summaries, and hooks. Metadata now separates three governance concepts:

- `dictionary_version`: the release version of the machine-readable dictionary file.
- `canon_version`: the source canon or reviewed content version represented by the dictionary.
- `schema_version`: the dictionary schema contract expected by code and tests.

## Public Extension Points

- Add dictionaries through the registry and dictionary type contract.
- Add renderers through renderer IDs and renderer adapter functions.
- Add extraction support without changing the parse/translate/render core contract.
- Add quality gates that diagnose uncertainty without rewriting mathematics.
