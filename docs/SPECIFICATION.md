# Math Translation Layer Specification

## Purpose

The Math Translation Layer preserves formal mathematical input while building a bridge to human-readable explanation. It is not a symbolic algebra system and it must not alter mathematical meaning. Its job is to parse mathematical notation, attach dictionary-backed meanings, and render the result for readers, overlays, TTS preparation, and review workflows.

## Supported Input Formats

All inputs enter through `parseMath(input, { format })` or the higher-level `translate(...)` API.

| Format | `format` value | Accepted input today | Requirement |
| --- | --- | --- | --- |
| TeX / LaTeX math | `tex` | Inline or display-style TeX fragments such as `\chi = G \cdot M` or `\frac{dS}{dt}`. | Primary supported format. Must preserve source text and report parse issues rather than silently dropping unsupported constructs. |
| Unicode math text | `unicode` | Plain Unicode mathematical text. | Accepted by the API contract, but still treated conservatively by the parser. Unsupported constructs must be preserved or diagnosed. |
| MathML | `mathml` | MathML strings. | Reserved input contract. Until a full MathML parser exists, callers should expect conservative parsing and diagnostics. |

Input is a single equation or mathematical expression string. Article extraction is handled separately by `extractMathBlocks`, which discovers candidate math blocks and then passes each block into the same parse → translate → render path.

## AST Expectations

The parser returns a `MathAst`, which is a root `group` node with `delimiter: "none"`. The root metadata must include:

- `format`: the declared input format.
- `rawInput`: the original input string.
- `displayMode`: optional caller intent.
- `parseIssues`: structured parser warnings.

Supported AST node kinds are:

- `group`
- `symbol`
- `number`
- `operator`
- `fraction`
- `root`
- `superscript`
- `subscript`
- `function`
- `sum`
- `product`
- `integral`
- `derivative`
- `text`
- `opaque`

AST rules:

1. Preserve the original raw input in metadata.
2. Preserve unsupported material as `opaque` where possible.
3. Do not evaluate, reorder, simplify, or infer new mathematics.
4. Add `parseIssues` for malformed or incomplete constructs.
5. Keep translated annotations (`translatedText`, `spokenText`, `translationStrategy`) separate from structural node identity.

## Translation Stages

Translation is performed by `translateMath(ast, { dictionary, mode })`.

1. **Dictionary loading**: Load a named dictionary from the registry.
2. **Input normalization**: Run dictionary hooks such as alias normalization.
3. **Equation matching**: Compare normalized source against dictionary equation patterns.
4. **AST cloning**: Clone the parse tree before attaching translations so the parser output remains conceptually immutable.
5. **Symbol translation**: Attach dictionary labels and spoken text to matching nodes.
6. **Structural decoration**: Allow dictionary hooks to add canon-specific structural corrections, such as treating the master-equation `S` factor as `S_eff` when appropriate.
7. **Diagnostic construction**: Report opaque or unsupported constructs and dictionary-specific warnings.
8. **Summary/narrative selection**: Attach matched equation summary or narrative text according to translation mode.

Translation modes:

- `structural`: replace mapped symbols and function heads while preserving equation structure.
- `narrative`: when a dictionary equation has a narrative, prefer a sentence-level explanation over the structural rendering.

## Rendering Stages

Rendering is performed by `renderMath(translated, { renderer })` or `withRenderedOutput(...)`.

Renderer IDs:

- `latex-structural`: TeX-like structural output with mapped labels inserted as text.
- `plaintext`: plain structural text.
- `markdown`: Markdown-ready math or narrative text.
- `tts`: spoken-friendly plaintext.
- `json`: metadata-focused JSON for tooling.
- `html-mathjax`: browser-ready HTML/MathJax output.
- `word-equation`: word equation output used by insight and TTS workflows.

Rendering requirements:

1. Render from the translated AST or narrative without mutating mathematical behavior.
2. Preserve unresolved material rather than inventing definitions.
3. Surface summaries and diagnostics where the renderer supports them.
4. Keep raw math available in browser overlays so readers can compare translation with source notation.

## Expected Outputs

A full translation call returns a `TranslationOutput` containing:

- `dictionaryId`
- `mode`
- translated `ast`
- optional `equationId`
- optional `summary`
- optional `narrative`
- optional `matchedPattern`
- `diagnostics`
- `resolvedSymbolCount`
- rendered `output`

The output must let reviewers answer:

- What did the system receive?
- What structure did it parse?
- Which dictionary meanings were applied?
- Which equation rule, if any, matched?
- What did the selected renderer emit?
- What warnings or unsupported constructs remain?

## Acceptance Criteria

A hardening-ready Math Translation Layer release should satisfy all of the following:

1. `npm run typecheck` succeeds.
2. `npm test` succeeds.
3. Dictionary metadata includes `dictionary_version`, `canon_version`, and `schema_version`.
4. Every equation rule has a summary.
5. Parser tests cover structural node creation and malformed input diagnostics.
6. Translator tests cover dictionary replacement, narrative output, and canon-sensitive distinctions.
7. Browser overlay tests cover article-shaped fixtures.
8. CLI tests cover command execution paths.
9. Documentation explains the parse → translate → render path.
10. Examples include input, AST expectation, translation metadata, rendered output, and expected result.

## Failure Modes

The layer should fail conservatively and visibly.

| Failure mode | Expected behavior |
| --- | --- |
| Unknown dictionary | Throw `Unknown dictionary: <id>` before translation. |
| Unsupported construct | Preserve source as `opaque` where possible and add an `unsupported` diagnostic. |
| Unmapped symbol | Preserve the original symbol and report only where quality gates or dictionary hooks identify it. |
| Malformed grouping | Return an AST with `parseIssues`; do not silently repair in a way that changes meaning. |
| Missing required command argument | Add a `missing-argument` parse issue. |
| Browser page with no math blocks | Do not change page content; overlay should remain inert. |
| Renderer cannot express a construct richly | Fall back to a conservative textual representation. |
| Dictionary/canon mismatch | Treat as governance failure; update dictionary metadata and review examples/tests before release. |

## Non-Goals

- Do not prove equations.
- Do not simplify expressions.
- Do not infer theological claims beyond dictionary text.
- Do not replace mathematical notation with vague inspirational language.
- Do not hide raw math from readers who need to audit the translation.
