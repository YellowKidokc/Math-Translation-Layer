from __future__ import annotations
from pipeline.stations.common import paper_output_dir, read_json, write_json, utc_now

def run(paper_uuid:str)->list[dict]:
 claims=read_json(paper_output_dir(paper_uuid)/'03_claims.json')['claims']
 out=[]
 for c in claims:
  t=c['claim_text'].lower();ctype='mechanistic' if any(x in t for x in ['requires','causes','leads to']) else ('equational' if any(x in t for x in ['equation','equals','log_2','\\']) else 'descriptive')
  domains=[d for d,k in [('physics','entropy' in t or 'signal' in t),('theology','god' in t or 'grace' in t),('formal','equation' in t or '=' in c['claim_text'])] if k]
  over=[w for w in ['always','never','proves','impossible','all','none'] if w in t]
  risk='high' if over else ('medium' if 'bridge' in t or 'maps' in t else 'low')
  out.append({'claim_uuid':c['claim_uuid'],'claim_type':ctype,'domain_badges':domains or ['general'],'equation_semantics_needed':ctype=='equational','overstatement_flags':over,'public_comm_risk':risk,'recommended_next_station':'05'})
 write_json(paper_output_dir(paper_uuid)/'04_claim_typing.json',{'paper_uuid':paper_uuid,'timestamp':utc_now(),'rows':out}); return out
