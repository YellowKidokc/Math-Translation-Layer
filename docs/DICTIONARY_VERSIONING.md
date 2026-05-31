# Dictionary Versioning and Governance

## Required Metadata Fields

Every dictionary metadata block must include these version fields:

| Field | Meaning | Example |
| --- | --- | --- |
| `dictionary_version` | Version of the machine-readable dictionary artifact. Changes when JSON rules, labels, aliases, equations, summaries, or hooks change. | `2026.05.02` |
| `canon_version` | Version of the reviewed source canon represented by the dictionary. Changes when the underlying reviewed source material changes. | `public-canon-2026.05.02` |
| `schema_version` | Version of the dictionary data contract expected by code and tests. Changes when required fields or structural rules change. | `dictionary-schema-1.0.0` |

The legacy `version` field remains for compatibility and should mirror `dictionary_version` until consumers migrate.

## Version Change Rules

### Change `dictionary_version` when:

- symbol labels or spoken text change;
- aliases change;
- equation patterns change;
- equation summaries or narratives change;
- dictionary hooks change dictionary-visible behavior;
- examples or tests reveal that the dictionary artifact must be corrected.

### Change `canon_version` when:

- the reviewed source canon changes;
- canonical factor order changes;
- a canon source is added, removed, or superseded;
- a reviewed theological or mathematical interpretation changes.

### Change `schema_version` when:

- required dictionary fields change;
- rule object shapes change;
- metadata governance requirements change;
- loader expectations change in a backward-incompatible way.

## Governance Checklist

Before a dictionary release:

1. Confirm required version fields exist.
2. Confirm every equation has a summary.
3. Confirm canon-sensitive equations have tests.
4. Confirm examples show representative input, AST expectation, translation, and rendered output.
5. Confirm `npm run typecheck` and `npm test` pass.
6. Confirm README and docs identify the project as the Math Translation Layer.

## Review Posture

Dictionary changes are not cosmetic. They alter how formal notation is explained to readers. Treat every label, summary, and narrative as a claim that must be traceable, reviewable, and reversible if evidence or scrutiny requires correction.
