# Math Translation Layer Roadmap

## Current Capabilities

- TypeScript core with a strict parse → translate → render flow.
- TeX-first parser for common equation structures.
- Bundled Theophysics canon dictionary.
- Dictionary hooks for normalization, structural decoration, diagnostics, and fallback summaries.
- CLI translation, scan, and dictionary inspection paths.
- Browser overlay bundle for article integration.
- Renderers for structural TeX, plaintext, Markdown, JSON, HTML/MathJax, word-equation, and TTS-oriented output.
- Tests for parser behavior, dictionary integrity, translation behavior, CLI behavior, browser overlay behavior, and workflow preparation.

## Near-Term Milestones

1. **Schema validation**: add a formal JSON Schema for dictionaries and validate in CI.
2. **Example regression tests**: turn `examples/translation-examples.md` into executable fixtures.
3. **Renderer snapshot tests**: lock down expected output for each renderer.
4. **Parse diagnostics expansion**: improve reporting for unsupported TeX commands and malformed nesting.
5. **CLI health command**: add a command that checks dictionary metadata, docs, examples, and test presence.
6. **Documentation cross-links**: connect README, specification, architecture, roadmap, and dictionary governance docs.

## Future Dictionary Support

- Multiple public dictionaries with independent `dictionary_version`, `canon_version`, and `schema_version` fields.
- Dictionary provenance fields for source documents, reviewers, and review dates.
- Rule-level stability markers such as `draft`, `reviewed`, `deprecated`, and `canonical`.
- Canon compatibility tests that verify equations against named source releases.
- Optional domain dictionaries for physics, information theory, mathematics, and theology where meanings must remain distinct.

## Future Renderer Support

- Accessible HTML renderer with ARIA labels and raw/translated comparison controls.
- Rich Markdown renderer with summaries, diagnostics, and source math blocks.
- Speech renderer tuned for audio narration and TTS pacing.
- Educational renderer that explains each term in a table.
- Research renderer that emits machine-readable provenance for downstream review.
- Word processor export path for manuscript workflows.

## Future Plugin Architecture

A future plugin system should allow separately maintained modules to contribute:

- dictionaries,
- renderers,
- extractors,
- diagnostics,
- review-event exporters,
- and UI integrations.

Plugin boundaries should protect correctness. A plugin may add meanings or outputs, but it must not silently change parser semantics, alter canon rules without version changes, or hide diagnostics.

## Guiding Principle

Every roadmap item should strengthen the bridge between formal mathematics and human comprehension without weakening rigor. If a feature makes the output more impressive but less auditable, it should not ship.
