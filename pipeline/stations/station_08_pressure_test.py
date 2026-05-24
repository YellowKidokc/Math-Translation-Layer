from __future__ import annotations
from pipeline.stations.common import paper_output_dir, read_json, write_json

def run(paper_uuid:str)->dict:
 rows=read_json(paper_output_dir(paper_uuid)/'04_claim_typing.json')['rows']
 out={'paper_uuid':paper_uuid,'high_risk_claims':[r['claim_uuid'] for r in rows if r['public_comm_risk']=='high']}
 write_json(paper_output_dir(paper_uuid)/'08_pressure_test.json',out); return out
