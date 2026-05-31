# Repository Health Check

Use this checklist before publishing or handing the repository to another AI collaborator.

## Documentation

- [x] `README.md` exists and identifies the project as the Math Translation Layer.
- [x] `docs/SPECIFICATION.md` exists.
- [x] `docs/ARCHITECTURE.md` exists.
- [x] `docs/ROADMAP.md` exists.
- [x] `docs/DICTIONARY_VERSIONING.md` exists.

## Examples

- [x] `examples/` directory exists.
- [x] At least 10 examples are documented.
- [x] Examples include input, AST expectation, translation metadata, rendered output, and expected result.

## Tests

- [x] `tests/` directory exists.
- [x] Parser tests exist.
- [x] Translation tests exist.
- [x] Dictionary tests exist.
- [x] Browser overlay tests exist.
- [x] CLI tests exist.

## Dictionary Governance

- [x] Dictionaries include `dictionary_version`.
- [x] Dictionaries include `canon_version`.
- [x] Dictionaries include `schema_version`.
- [x] Dictionary type definitions require the governance fields.

## Architecture

- [x] Architecture docs explain parse → translate → render.
- [x] Architecture docs explain browser overlay path.
- [x] Architecture docs explain CLI path.
- [x] Architecture docs explain dictionary loading path.

## Required Checks

Run before release:

```bash
npm run typecheck
npm test
```
