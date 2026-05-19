# PDS-1 Station Map

This map reconciles the legacy `X:\paper-proof-grader\pipeline.py`, `X:\paper-proof-grader\OUTPUT_CONTRACT.md`, and the modular build in this repository.

## Canonical Station Numbering

`OUTPUT_CONTRACT.md` does not renumber stations. The canonical stations remain:

| Station | Name | Current MTL status | Primary outputs |
|---|---|---|---|
| 00 | Intake | Implemented | `00_intake.json` |
| 01 | Text Normalization | Pending | `normalized-text.md` |
| 02 | Structure | Pending | `structure-map.json` |
| 03 | Claim Extraction | Implemented | `03_claims.json`, `03_claims_human.md` |
| 04 | Claim Typing | Pending | enriched claim ledger |
| 05 | Evidence Ledger | Implemented | `05_evidence.json`, `05_evidence_human.md` |
| 06 | 7Q Forward | Implemented heuristic | `06_7q_forward.json`, `06_7q_forward_human.md` |
| 07 | 7Q Reverse | Implemented heuristic | `07_7q_reverse.json`, `07_7q_reverse_human.md` |
| 08 | Formal Routing | Pending | `formal-target-map.json`, `formal-target-map.md` |
| 09 | Objection | Implemented | `09_objections.json`, `09_objections_human.md` |
| 10 | Score/Readiness | Pending | four-score ledger and readiness decision |
| 11 | Report Export | Pending | `paper-grade.md/.html/.json/.xlsx` |
| 12 | Vector/Index | Pending | `vector-summary.jsonl` |
| 13 | Manifest/Provenance | Implemented basic | `13_manifest.json`, `13_manifest_human.md` |
| 14 | Comms/Handoff | Pending | `run-summary.md`, comms-ready post |

## Reconciliation Decision

- `X:\paper-proof-grader\pipeline.py` is the richer legacy monolith and reference behavior.
- `D:\Github\Math-Translation-Layer\pipeline` is the modular stationized build target.
- `OUTPUT_CONTRACT.md` is the canonical station/output contract.
- PDS-1 is the governing rubric and dashboard standard layered over the station contract.

## Next Build Order

1. Add PDS-1 shared schemas and type contracts.
2. Implement Station 04 Claim Typing.
3. Implement Station 08 Formal Routing to Lean/proof targets.
4. Implement Station 10 Four-Score Ledger and Readiness Decision.
5. Implement Station 11 JSON/MD/HTML/XLSX export.
6. Implement Station 12 Vector/Index.
7. Implement Station 14 Comms/Handoff.
8. Add HTML audit overlays from PDS-1.
