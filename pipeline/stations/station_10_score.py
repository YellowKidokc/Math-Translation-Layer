from __future__ import annotations
from pipeline.stations.common import paper_output_dir, read_json, write_json

def run(paper_uuid:str)->dict:
 obs=read_json(paper_output_dir(paper_uuid)/'09_objections.json')['objections']
 score=max(0,100-len(obs)*5)
 out={'paper_uuid':paper_uuid,'paper_score':score}
 write_json(paper_output_dir(paper_uuid)/'10_score.json',out); return out
