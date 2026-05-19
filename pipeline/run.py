#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path


if __package__ is None or __package__ == "":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.stations import (
    station_00_intake,
    station_03_claims,
    station_05_evidence,
    station_06_7q_forward,
    station_07_7q_reverse,
    station_09_objections,
    station_13_manifest,
)
from pipeline.stations.common import utc_now


DEFAULT_STATIONS = ["00", "03", "05", "06", "07", "09", "13"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local paper-grader station pipeline.")
    parser.add_argument("--input", required=True, help="Input paper path.")
    parser.add_argument("--stations", default=",".join(DEFAULT_STATIONS), help="Comma-separated station IDs.")
    return parser.parse_args()


def normalize_station(station: str) -> str:
    value = station.strip()
    return value.zfill(2) if value.isdigit() else value


def main() -> int:
    args = parse_args()
    requested = [normalize_station(station) for station in args.stations.split(",") if station.strip()]
    if "13" not in requested:
        requested.append("13")

    paper_uuid: str | None = None
    run_start = utc_now()
    print(f"Running stations: {', '.join(requested)}")
    for station in requested:
        if station == "00":
            intake = station_00_intake.run(args.input)
            paper_uuid = intake.paper_uuid
            print(f"00 Intake complete: {paper_uuid}")
        elif station == "03":
            if not paper_uuid:
                raise SystemExit("Station 03 requires Station 00 in this first runner.")
            claim_set = station_03_claims.run(paper_uuid)
            print(f"03 Claims complete: {len(claim_set.claims)} claims")
        elif station == "05":
            if not paper_uuid:
                raise SystemExit("Station 05 requires Station 00 in this first runner.")
            ledger = station_05_evidence.run(paper_uuid)
            print(f"05 Evidence complete: {len(ledger.rows)} rows")
        elif station == "06":
            if not paper_uuid:
                raise SystemExit("Station 06 requires Station 00 in this first runner.")
            results = station_06_7q_forward.run(paper_uuid)
            print(f"06 7Q Forward complete: {len(results)} results")
        elif station == "07":
            if not paper_uuid:
                raise SystemExit("Station 07 requires Station 00 in this first runner.")
            results = station_07_7q_reverse.run(paper_uuid)
            print(f"07 7Q Reverse complete: {len(results)} results")
        elif station == "09":
            if not paper_uuid:
                raise SystemExit("Station 09 requires Station 00 in this first runner.")
            objections = station_09_objections.run(paper_uuid)
            print(f"09 Objections complete: {len(objections)} objections")
        elif station == "13":
            if not paper_uuid:
                raise SystemExit("Station 13 requires Station 00 in this first runner.")
            manifest = station_13_manifest.run(paper_uuid, run_start=run_start)
            print(f"13 Manifest complete: {manifest.run_uuid}")
        else:
            raise SystemExit(f"Unknown or unavailable station: {station}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
