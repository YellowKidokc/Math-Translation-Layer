# Middle Layer

The middle layer is the engine logic that should remain public and reviewable:

- `src/core` parses, translates, and renders math through a strict pipeline.
- `src/dictionaries` stores machine-readable equation vocabulary and canon metadata.
- `src/renderers` produces human, TTS, HTML, and structural outputs.
- `src/browser` turns the same translation contract into a page overlay.
- `tests` locks behavior so online refactors do not silently drift.

This layer may emit NLP review events, but it should not contain the private NLP reviewer, hidden preference engine, local article vault, or David-only workflow state.
