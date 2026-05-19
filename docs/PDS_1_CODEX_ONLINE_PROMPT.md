# Codex Online Prompt: PDS-1 Station Completion Pack

You are working in the `YellowKidokc/Math-Translation-Layer` repository.

Read these first:

1. `docs/PDS_1_DEFENSIBILITY_STANDARD.md`
2. `docs/PDS_1_STATION_MAP.md`
3. `pipeline/models/types.py`
4. `pipeline/run.py`
5. `pipeline/stations/station_00_intake.py`
6. `pipeline/stations/station_03_claims.py`
7. `pipeline/stations/station_05_evidence.py`
8. `pipeline/stations/station_06_7q_forward.py`
9. `pipeline/stations/station_07_7q_reverse.py`
10. `pipeline/stations/station_09_objections.py`
11. `pipeline/stations/station_13_manifest.py`
12. `pipeline/tests/test_foundation.py`
13. `pipeline/tests/test_adversarial.py`

## Mission

Complete the next station layer for PDS-1 without breaking existing tests.

Do not collapse `Academic_Readiness`, `Framework_Coherence`, `Public_Communication`, and `Risk` into one truth score. These are separate tracks. Scores are audit trails, not verdicts.

## Required Work

### 1. Add shared PDS-1 models

Extend `pipeline/models/types.py` with dataclasses for:

- `ModuleOutput`
- `ScoreEvent`
- `ClaimTyping`
- `FormalTarget`
- `FourScoreLedger`
- `ReadinessDecision`
- `VectorSummary`
- `RunHandoff`

Every module output must support the base contract:

```json
{
  "findings": [],
  "score_events": [],
  "flags": [],
  "evidence_quotes": []
}
```

### 2. Implement Station 04 Claim Typing

Create `pipeline/stations/station_04_claim_typing.py`.

Input:

- `03_claims.json`

Output:

- `04_claim_typing.json`
- `04_claim_typing_human.md`

Each claim should get:

- `claim_uuid`
- `claim_type`
- `domain_badges`
- `overstatement_flags`
- `equation_semantics_needed`
- `evidence_requirement`
- `public_comm_risk`

Use heuristic rules only; no API calls.

### 3. Implement Station 08 Formal Routing

Create `pipeline/stations/station_08_formal_routing.py`.

Input:

- `03_claims.json`
- `04_claim_typing.json`

Output:

- `08_formal_targets.json`
- `08_formal_targets_human.md`

Route claims to:

- `Lean`
- `Python/state-model`
- `Alloy/TLA-style spec`
- `Bridge-only / not formal yet`

If claim text contains closure, self-repair, sign invariance, external grace, necessary conditions, product form, or targeted openness, add likely Lean dependency names when possible.

### 4. Implement Station 10 Score/Readiness

Create `pipeline/stations/station_10_score_readiness.py`.

Input:

- `03_claims.json`
- `04_claim_typing.json`
- `05_evidence.json`
- `06_7q_forward.json`
- `07_7q_reverse.json`
- `08_formal_targets.json`
- `09_objections.json`

Output:

- `10_score_ledger.json`
- `10_score_ledger_human.md`

Must produce four independent score tracks:

- `Academic_Readiness`
- `Framework_Coherence`
- `Public_Communication`
- `Risk`

Every score must have positive events, deductions, evidence quote or source field, and fix-to-improve text. No blended final truth score.

### 5. Wire pipeline runner

Update `pipeline/run.py` so default station chain is:

```text
00,03,04,05,06,07,08,09,10,13
```

Station 13 should include files from 04, 08, and 10 if present.

### 6. Tests

Add tests for the new stations:

- `pipeline/tests/test_pds1_stations.py`

Minimum tests:

- Station 04 writes claim typing and includes domain badges.
- Station 04 flags overstatement words.
- Station 08 routes formal claims and produces at least one target.
- Station 10 produces exactly four score tracks.
- Station 10 contains score events with reasons and fixes.
- Full runner with `--stations 00,03,04,05,06,07,08,09,10,13` produces expected files.

Run the existing tests plus new tests:

```bash
python -m pytest tests/test_rewrite_layer.py tests/test_extract_figures_math.py pipeline/tests/test_foundation.py pipeline/tests/test_adversarial.py pipeline/tests/test_pds1_stations.py -v
```

## Guardrails

- No OpenAI/API calls.
- No single blended truth score.
- No public claim that PDS-1 proves truth.
- Keep outputs deterministic and JSON-first.
- Preserve existing station IDs.
- Keep all generated runtime files under ignored output folders.
- Do not force-push.

## Done Means

1. All tests pass.
2. New files are committed.
3. `git status` is clean except ignored runtime output.
4. Final response lists files changed and exact test command run.
