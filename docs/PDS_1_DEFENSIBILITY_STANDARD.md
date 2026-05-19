# PDS-1: Paper Defensibility Standard

Status: governing build specification for the Paper Defensibility Snapshot system.
Date locked: 2026-05-19
Scope: Math Translation Layer / paper-grader / HTML audit snapshots.

## Core Boundary

PDS-1 is not a truth-scoring system. It is a paper defensibility standard: it measures how well a paper can survive claim reconstruction, evidence tracing, domain-boundary testing, equation auditing, hostile review, score-ledger inspection, dependency analysis, and repair planning.

The four tracks must never collapse into one verdict:

1. `Academic_Readiness` - external publishing rigor.
2. `Framework_Coherence` - internal fit inside Theophysics.
3. `Public_Communication` - clarity and safety for non-experts.
4. `Risk` - legal, reputational, empirical, overclaim, and orphan vulnerability.

Scores are audit trails, not verdicts. Every point must trace to a quote, section, bridge, flag, or explicit deduction.

## Canonical Workflow

A completed snapshot begins with `CLAIM_ARCH` and ends with `EIGHT_GAPS`:

```text
CLAIM_ARCH
-> EVIDENCE_CHAIN
-> KILL_ARCH
-> EQ_SEM
-> DOMAIN_BOUNDARY
-> REVIEWER_SEEDS
-> LEDGER_SCHEMA
-> OVERSTATE_PATTERN
-> BENCHMARK_ANCHOR
-> CROSS_DEP
-> EIGHT_GAPS
```

## Module Contracts

Every module returns the same object shape:

```json
{
  "findings": [],
  "score_events": [],
  "flags": [],
  "evidence_quotes": []
}
```

The ledger consumes module output. A module may emit additional typed fields, but it must not omit the base contract.

## Modules

### CLAIM_ARCH

Extract:

- `surface_claim` - what the sentence explicitly says.
- `buried_claim` - what it assumes without saying.
- `operational_claim` - what must be true for the claim to work.
- `rhetorical_load` - persuasion versus demonstration ratio.
- `domain_shift` - unbridged movement between physics, theology, information, formalism, analogy, metaphysics, or public communication.

### EVIDENCE_CHAIN

Evidence is not citation counting. Extract:

- `primary_source` - original data, experiment, text, or formal source.
- `secondary_source` - interpretation layer.
- `tertiary_source` - how the current paper uses the source.
- `evidence_bridge` - tested thing -> connection to exact claim -> remaining gap.
- `gap` - missing link.
- `counterevidence_present` - yes, no, or partial.

### KILL_ARCH

Extract:

- `stated_kill` - what the author says would weaken/destroy the claim.
- `implicit_kill` - what would actually weaken/destroy it.
- `testable_kill` - whether a real logical/empirical test can be designed.
- `rhetorical_armor` - real falsifiability versus honesty theater.

### EQ_SEM

For every equation, extract:

- `equation`
- `role`
- `status`: `DERIVED`, `PROPOSED`, `INTERPRETIVE`, `PRESENTATIONAL`, `SYMBOLIC_FORMALISM`, `OPERATIONAL_MODEL`, `ANALOGY`, or `RHETORICAL_MATH`
- `undefined_vars`
- `dimensional_status`: `defined`, `undefined`, `symbolic`, or `not_applicable`
- `derivation_present`: yes, no, or partial
- `computable`: yes, no, or conditional
- `physics_comparison`

### DOMAIN_BOUNDARY

Apply domain badges to claims and formal statements:

- `PHYSICS`
- `THEOLOGY`
- `FORMAL`
- `EMPIRICAL`
- `ANALOGY`
- `METAPHYSICS`
- `INFORMATION`
- `PUBLIC-COMM`

Track term drift, bridge presence, bridge quality, and drift risk.

### REVIEWER_SEEDS

Generate hostile-review boxes from at least five voices:

- `skeptical_physicist`
- `academic_philosopher`
- `information_theorist`
- `methodologist`
- `hostile_critic`

Reviewer boxes are required output, not optional commentary.

### LEDGER_SCHEMA

Every scored metric outputs:

```json
{
  "metric_id": "",
  "max_points": 0,
  "positive_points": [
    {
      "points": 0,
      "reason": "",
      "evidence_quote": "",
      "section": ""
    }
  ],
  "deductions": [
    {
      "points": 0,
      "reason": "",
      "evidence_quote": "",
      "section": ""
    }
  ],
  "fix_to_improve": ""
}
```

### OVERSTATE_PATTERN

Flag risky language:

- High risk: `proves`, `cannot be denied`, `mathematically proven`, `settled`, `definitive`, `impossible`, `refuted`, `destroyed`, `only`.
- Medium risk: `clearly`, `obviously`, `undeniably`, `must`, `cannot`.
- Safer alternatives: `suggests`, `appears`, `may`, `under conditions`, `creates explanatory pressure`.

High-risk language without a matching evidence bridge must be flagged and rewritten.

### BENCHMARK_ANCHOR

Explain what each score means relative to standards. A paper can be internally important and still score low on academic readiness.

### CROSS_DEP

Extract:

- `paper_id`
- `depends_on`
- `enables`
- `shared_claims_with`
- `term_drift_flags`
- `orphan_risk`

### EIGHT_GAPS

Every snapshot ends with the eight gaps:

1. Score separation.
2. Hostile reviewer.
3. Evidence bridge.
4. Domain badge.
5. Score ledger.
6. Equation semantics.
7. Overstatement.
8. Benchmark/risk context.

## HTML Overlay Priority

1. Four-score dashboard.
2. Hostile reviewer boxes.
3. Domain badges.
4. Evidence bridge lines.
5. Score ledger collapses.
6. Risk/vulnerability badge.
7. Equation status label.
8. Benchmark footer.

## Finished Snapshot Must Answer

- What is the claim?
- What is assumed?
- What evidence supports it?
- What bridge connects evidence to claim?
- What domain does each term operate in?
- What would kill the claim?
- What equation/status is being used?
- What would a hostile reviewer attack?
- What score events justify the rating?
- What downstream papers depend on it?
- What are the eight remaining gaps?

## Prompt Versioning Rule

Prompts are schemas. A prompt change is a schema change. Every prompt revision needs a version, a reason, and a compatibility note.
