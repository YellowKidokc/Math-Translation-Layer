from __future__ import annotations

import re
import uuid
from pathlib import Path

from pipeline.models.types import EvidenceLedger, EvidenceRow
from pipeline.stations.common import clean_document_text, paper_output_dir, read_json, utc_now, write_json


PATTERNS = {
    "citation": re.compile(r"\([A-Z][A-Za-z]+,\s*\d{4}\)|\[\d+\]|doi:|arxiv:|ISBN", re.IGNORECASE),
    "equation": re.compile(r"\$[^$]+\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\\chi|\\cdot|=", re.IGNORECASE),
    "scripture": re.compile(r"\b(?:Genesis|Exodus|John|Romans|Matthew|Mark|Luke|Acts|Isaiah|Jeremiah)\s+\d+:\d+\b", re.IGNORECASE),
    "framework": re.compile(r"\b(?:Law\s+\d+|Axiom|Master Equation|chi|theorem|T\d+|closure)\b", re.IGNORECASE),
}


def context_for_claim(cleaned_text: str, claim: dict) -> str:
    start = max(0, int(claim["source_span_start"]) - 500)
    end = min(len(cleaned_text), int(claim["source_span_end"]) + 500)
    return cleaned_text[start:end]


def run(paper_uuid: str) -> EvidenceLedger:
    output_dir = paper_output_dir(paper_uuid)
    intake = read_json(output_dir / "00_intake.json")
    claim_set = read_json(output_dir / "03_claims.json")
    cleaned = clean_document_text(Path(intake["source_file"]), intake["format_detected"])
    rows: list[EvidenceRow] = []

    for claim in claim_set["claims"]:
        context = context_for_claim(cleaned, claim)
        found = False
        for evidence_type, pattern in PATTERNS.items():
            matches = [match.group(0) for match in pattern.finditer(context)]
            for text in matches[:5]:
                found = True
                rows.append(
                    EvidenceRow(
                        evidence_uuid=str(uuid.uuid4()),
                        claim_uuid=claim["claim_uuid"],
                        evidence_type=evidence_type,
                        evidence_text=text,
                        strength="moderate" if evidence_type in {"citation", "equation"} else "weak",
                        source=f"section:{claim.get('section_heading') or 'Untitled'}",
                    )
                )
        if not found:
            rows.append(
                EvidenceRow(
                    evidence_uuid=str(uuid.uuid4()),
                    claim_uuid=claim["claim_uuid"],
                    evidence_type="missing",
                    evidence_text="No nearby citation, equation, scripture, or framework reference detected.",
                    strength="missing",
                    source=f"section:{claim.get('section_heading') or 'Untitled'}",
                )
            )

    ledger = EvidenceLedger(paper_uuid=paper_uuid, rows=rows, timestamp=utc_now())
    write_json(output_dir / "05_evidence.json", ledger.to_dict())
    write_human(output_dir / "05_evidence_human.md", ledger)
    return ledger


def write_human(path: Path, ledger: EvidenceLedger) -> None:
    lines = [f"# Evidence Ledger - {ledger.paper_uuid}", ""]
    for row in ledger.rows:
        lines.append(f"- `{row.claim_uuid[:8]}` {row.evidence_type}/{row.strength}: {row.evidence_text}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
