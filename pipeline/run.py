#!/usr/bin/env python3
from __future__ import annotations
import argparse,sys
from pathlib import Path
if __package__ is None or __package__=='': sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pipeline.stations import station_00_intake,station_03_claims,station_05_evidence,station_06_7q_forward,station_07_7q_reverse,station_09_objections,station_13_manifest
from pipeline.stations import station_04_claim_typing,station_08_pressure_test,station_10_score,station_11_report_export,station_12_finalize,station_14_unmatched
from pipeline.stations.common import utc_now
DEFAULT_STATIONS=['00','03','04','05','06','07','08','09','10','11','12','13','14']

def parse_args(): p=argparse.ArgumentParser(); p.add_argument('--input',required=True); p.add_argument('--stations',default=','.join(DEFAULT_STATIONS)); return p.parse_args()
def normalize_station(s:str)->str: v=s.strip(); return v.zfill(2) if v.isdigit() else v

def main()->int:
 a=parse_args(); req=[normalize_station(x) for x in a.stations.split(',') if x.strip()]
 if '13' not in req: req.append('13')
 paper_uuid=None; run_start=utc_now(); print(f"Running stations: {', '.join(req)}")
 for st in req:
  if st=='00': intake=station_00_intake.run(a.input); paper_uuid=intake.paper_uuid; print(f'00 Intake complete: {paper_uuid}')
  elif not paper_uuid: raise SystemExit(f'Station {st} requires 00')
  elif st=='03': print(f"03 Claims complete: {len(station_03_claims.run(paper_uuid).claims)} claims")
  elif st=='04': print(f"04 Claim typing complete: {len(station_04_claim_typing.run(paper_uuid))} rows")
  elif st=='05': print(f"05 Evidence complete: {len(station_05_evidence.run(paper_uuid).rows)} rows")
  elif st=='06': print(f"06 7Q Forward complete: {len(station_06_7q_forward.run(paper_uuid))} results")
  elif st=='07': print(f"07 7Q Reverse complete: {len(station_07_7q_reverse.run(paper_uuid))} results")
  elif st=='08': print(f"08 Pressure complete: {len(station_08_pressure_test.run(paper_uuid)['high_risk_claims'])} high-risk")
  elif st=='09': print(f"09 Objections complete: {len(station_09_objections.run(paper_uuid))} objections")
  elif st=='10': print(f"10 Score complete: {station_10_score.run(paper_uuid)['paper_score']}")
  elif st=='11': station_11_report_export.run(paper_uuid); print('11 Report export complete')
  elif st=='12': station_12_finalize.run(paper_uuid); print('12 Finalize complete')
  elif st=='13': print(f"13 Manifest complete: {station_13_manifest.run(paper_uuid,run_start=run_start).run_uuid}")
  elif st=='14': station_14_unmatched.run(paper_uuid); print('14 Unmatched report complete')
  else: raise SystemExit(f'Unknown station: {st}')
 return 0
if __name__=='__main__': raise SystemExit(main())
