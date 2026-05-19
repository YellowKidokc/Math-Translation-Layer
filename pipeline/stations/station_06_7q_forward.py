from __future__ import annotations
import json,re
from datetime import datetime, timezone
from pathlib import Path

def _identity(t):
    s=t.lower()
    if any(k in s for k in ["god","church","theology","grace"]): return "theological"
    if any(k in s for k in ["=","equation","integral","chi","\\"]): return "mathematical"
    if any(k in s for k in ["data","measure","experiment","observe"]): return "empirical"
    return "bridge"

def run(paper_uuid:str, output_root:str="pipeline/output"):
    d=Path(output_root)/paper_uuid
    claims=json.loads((d/"03_claims.json").read_text())["claims"]
    rows=json.loads((d/"05_evidence.json").read_text())["rows"]
    by_claim={}
    for r in rows: by_claim.setdefault(r["claim_uuid"],[]).append(r)
    out=[]
    for c in claims:
        txt=c["claim_text"]
        ev=by_claim.get(c["claim_uuid"],[])
        identity=_identity(txt)
        scope="both" if identity=="bridge" else ("theology" if identity=="theological" else "physics")
        mechanism="causal" if re.search(r"because|therefore|causes|leads to",txt,re.I) else "unstated"
        dependency="conditional" if re.search(r"\bif|when|given|assuming\b",txt,re.I) else "implicit"
        consequence="explicit" if re.search(r"\bthen|implies|means|therefore\b",txt,re.I) else "implicit"
        fals="testable" if re.search(r"\bmeasure|predict|rate|increase|decrease\b",txt,re.I) else "needs_test_condition"
        out.append({"claim_uuid":c["claim_uuid"],"identity":identity,"scope":scope,"mechanism":mechanism,"evidence":f"{len(ev)} evidence rows: {', '.join(sorted(set([e['evidence_type'] for e in ev]))) if ev else 'none'}","dependency":dependency,"consequence":consequence,"falsifiability":fals})
    payload={"paper_uuid":paper_uuid,"timestamp":datetime.now(timezone.utc).isoformat(),"results":out}
    (d/"06_7q_forward.json").write_text(json.dumps(payload,indent=2))
    (d/"06_7q_forward_human.md").write_text("\n".join([f"- {r['claim_uuid'][:8]} | {r['identity']} | {r['falsifiability']}" for r in out])+"\n")
    return payload
