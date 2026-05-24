from __future__ import annotations
from pipeline.stations.common import paper_output_dir, write_json

def run(paper_uuid:str)->dict:
 out={'paper_uuid':paper_uuid,'status':'finalized'}
 write_json(paper_output_dir(paper_uuid)/'12_finalize.json',out); return out
