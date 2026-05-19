from __future__ import annotations
import json,re,uuid
from datetime import datetime, timezone
from pathlib import Path

def run(paper_uuid:str, output_root:str='pipeline/output'):
    d=Path(output_root)/paper_uuid
    claims=json.loads((d/'03_claims.json').read_text())['claims']
    fwd={r['claim_uuid']:r for r in json.loads((d/'06_7q_forward.json').read_text())['results']}
    ev={}
    for r in json.loads((d/'05_evidence.json').read_text())['rows']: ev.setdefault(r['claim_uuid'],[]).append(r)
    objections=[]
    for c in claims:
      txt=c['claim_text']; cid=c['claim_uuid']; ident=fwd[cid]['identity']
      if re.search(r'\balways|never|proves|impossible\b',txt,re.I): objections.append(("overclaim","Absolute language without formal proof reference","critical"))
      if ident=='bridge' and not re.search(r'\bmap|mapping|isomorphism|correspond\b',txt,re.I): objections.append(("category_error","Cross-domain bridge without explicit mapping justification","critical"))
      if any(r['strength']=='missing' for r in ev.get(cid,[])): objections.append(("empirical_gap","Claim has missing evidence row","serious"))
      if fwd[cid]['mechanism']=='unstated' and fwd[cid]['consequence']=='explicit': objections.append(("logical_gap","Consequence stated without mechanism","serious"))
      for t,otxt,sev in objections[-4:]:
          pass
      for t,otxt,sev in [o for o in objections if False]:
          pass
      # append per-claim
      local=[]
      if re.search(r'\balways|never|proves|impossible\b',txt,re.I): local.append(("overclaim","Absolute language without formal proof reference","critical"))
      if ident=='bridge' and not re.search(r'\bmap|mapping|isomorphism|correspond\b',txt,re.I): local.append(("category_error","Cross-domain bridge without explicit mapping justification","critical"))
      if any(r['strength']=='missing' for r in ev.get(cid,[])): local.append(("empirical_gap","Claim has missing evidence row","serious"))
      if fwd[cid]['mechanism']=='unstated' and fwd[cid]['consequence']=='explicit': local.append(("logical_gap","Consequence stated without mechanism","serious"))
      if not local: local.append(("missing_definition","Potential term-definition gap","minor"))
      for t,txto,sev in local:
        objections.append({"objection_uuid":str(uuid.uuid4()),"claim_uuid":cid,"objection_type":t,"objection_text":txto,"severity":sev})
    payload={"paper_uuid":paper_uuid,"timestamp":datetime.now(timezone.utc).isoformat(),"objections":objections}
    (d/'09_objections.json').write_text(json.dumps(payload,indent=2))
    groups={"critical":[],"serious":[],"minor":[]}
    for o in objections: groups[o['severity']].append(o)
    lines=["## Critical Objections"]+[f"- [{o['claim_uuid'][:8]}]: {o['objection_text']} ({o['objection_type']})" for o in groups['critical']]
    lines+= ["\n## Serious Objections"]+[f"- [{o['claim_uuid'][:8]}]: {o['objection_text']} ({o['objection_type']})" for o in groups['serious']]
    lines+= ["\n## Minor Objections"]+[f"- [{o['claim_uuid'][:8]}]: {o['objection_text']} ({o['objection_type']})" for o in groups['minor']]
    (d/'09_objections_human.md').write_text("\n".join(lines)+"\n")
    return payload
