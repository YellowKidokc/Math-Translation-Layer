from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

def run(paper_uuid:str, output_root:str='pipeline/output'):
    d=Path(output_root)/paper_uuid
    claims=json.loads((d/'03_claims.json').read_text())['claims']
    fwd={r['claim_uuid']:r for r in json.loads((d/'06_7q_forward.json').read_text())['results']}
    out=[]
    for c in claims:
        ident=fwd[c['claim_uuid']]['identity']
        if ident=='mathematical': rivals=['Could be coincidental structural similarity']
        elif ident=='theological': rivals=['Alternative tradition interprets differently']
        elif ident=='bridge': rivals=['Analogy rather than isomorphism']
        else: rivals=['Confounding variable / selection bias']
        out.append({"claim_uuid":c['claim_uuid'],"what_breaks_it":f"If not ({c['claim_text']}), then the proposed conclusion fails.","rival_explanations":rivals,"downgrade_conditions":["limited dataset","narrow scope","unverified assumptions"]})
    payload={"paper_uuid":paper_uuid,"timestamp":datetime.now(timezone.utc).isoformat(),"results":out}
    (d/'07_7q_reverse.json').write_text(json.dumps(payload,indent=2))
    (d/'07_7q_reverse_human.md').write_text("\n".join([f"- {r['claim_uuid'][:8]}: {r['what_breaks_it']}" for r in out])+"\n")
    return payload
