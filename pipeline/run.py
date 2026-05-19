from __future__ import annotations
import argparse, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import argparse
from pipeline.stations import station_00_intake, station_03_claims, station_05_evidence, station_06_7q_forward, station_07_7q_reverse, station_09_objections, station_13_manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--stations", default="00,03,05,06,07,09,13")
    args = parser.parse_args()
    requested=[s.strip() for s in args.stations.split(",") if s.strip()]

    paper_uuid=None
    if "00" in requested:
        intake=station_00_intake.run(args.input)
        paper_uuid=intake.paper_uuid
        print(f"[00] {paper_uuid}")
    if paper_uuid is None:
        raise ValueError("Station 00 must run to establish paper_uuid")
    if "03" in requested:
        station_03_claims.run(paper_uuid); print("[03]")
    if "05" in requested:
        station_05_evidence.run(paper_uuid); print("[05]")
    if "06" in requested:
        station_06_7q_forward.run(paper_uuid); print("[06]")
    if "07" in requested:
        station_07_7q_reverse.run(paper_uuid); print("[07]")
    if "09" in requested:
        station_09_objections.run(paper_uuid); print("[09]")
    station_13_manifest.run(paper_uuid); print("[13]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())