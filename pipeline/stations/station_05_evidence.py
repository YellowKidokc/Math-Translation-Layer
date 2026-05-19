from __future__ import annotations
import json,re,uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from pipeline.models.types import EvidenceLedger, EvidenceRow

PATTERNS = {
    "citation": [r"\([A-Z][A-Za-z]+,\s*\d{4}\)", r"\[\d+\]", r"doi:\S+", r"arxiv:\S+", r"ISBN\s*[:\d-]+"],
    "scripture": [r"\b(?:Genesis|John|Romans|Matthew)\s+\d+:\d+\b"],
    "framework": [r"\bLaw\s+\d+\b", r"\bAxiom\b", r"\bMaster Equation\b", r"\bchi\b"],
    "equation": [r"\\\[.*?\\\]", r"\$\$.*?\$\$", r"\$[^$]+\$"],
}

def run(paper_uuid: str, output_root: str = "pipeline/output"):
    d=Path(output_root)/paper_uuid
    claims=json.loads((d/"03_claims.json").read_text())
    source=Path(json.loads((d/"00_intake.json").read_text())["source_file"]).read_text(encoding="utf-8")
    rows=[]
    for c in claims["claims"]:
        text=c["claim_text"]
        found=0
        for et, pats in PATTERNS.items():
            for p in pats:
                for m in re.findall(p, source, flags=re.IGNORECASE|re.DOTALL):
                    if m and (m in text or et in {"citation","scripture","framework","equation"}):
                        rows.append(EvidenceRow(str(uuid.uuid4()), c["claim_uuid"], et, str(m)[:200], "moderate", "document").__dict__)
                        found+=1
                        break
                if found:
                    break
            if found:
                break
        if not found:
            rows.append(EvidenceRow(str(uuid.uuid4()), c["claim_uuid"], "data", "No nearby evidence found", "missing", "heuristic").__dict__)
    out=EvidenceLedger(paper_uuid=paper_uuid, rows=[EvidenceRow(**r) for r in rows], timestamp=datetime.now(timezone.utc).isoformat())
    (d/"05_evidence.json").write_text(json.dumps({"paper_uuid":paper_uuid,"rows":rows,"timestamp":out.timestamp},indent=2))
    human=["# Station 05 Evidence"]+[f"- {r['claim_uuid'][:8]} {r['evidence_type']} ({r['strength']}): {r['evidence_text']}" for r in rows]
    (d/"05_evidence_human.md").write_text("\n".join(human)+"\n")
    return out
