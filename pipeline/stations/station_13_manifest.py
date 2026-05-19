from __future__ import annotations

import uuid
from pathlib import Path

from pipeline.models.types import RunManifest
from pipeline.stations.common import paper_output_dir, read_json, sha256_file, utc_now, write_json


STATION_FILES = {
    "00_intake": "00_intake.json",
    "03_claims": "03_claims.json",
    "05_evidence": "05_evidence.json",
    "06_7q_forward": "06_7q_forward.json",
    "07_7q_reverse": "07_7q_reverse.json",
    "09_objections": "09_objections.json",
    "13_manifest": "13_manifest.json",
}


def run(paper_uuid: str, run_start: str | None = None) -> RunManifest:
    output_dir = paper_output_dir(paper_uuid)
    intake = read_json(output_dir / "00_intake.json")
    station_outputs: dict[str, str] = {}
    stations_completed: list[str] = []
    for station, filename in STATION_FILES.items():
        path = output_dir / filename
        if path.exists() and station != "13_manifest":
            stations_completed.append(station)
            station_outputs[station] = str(path)

    all_hashes = {
        str(path.relative_to(output_dir)): sha256_file(path)
        for path in sorted(output_dir.rglob("*"))
        if path.is_file()
    }
    manifest = RunManifest(
        run_uuid=str(uuid.uuid4()),
        paper_uuid=paper_uuid,
        stations_completed=stations_completed,
        station_outputs=station_outputs,
        source_hash=intake["source_hash_sha256"],
        run_start=run_start or intake["intake_timestamp"],
        run_end=utc_now(),
        all_output_hashes=all_hashes,
    )
    write_json(output_dir / "13_manifest.json", manifest.to_dict())
    write_human_manifest(output_dir / "13_manifest_human.md", manifest, intake)
    return manifest


def write_human_manifest(path: Path, manifest: RunManifest, intake: dict) -> None:
    lines = [
        "# Run Manifest",
        "",
        f"- Paper: {intake.get('title') or 'Untitled'}",
        f"- Paper UUID: {manifest.paper_uuid}",
        f"- Run UUID: {manifest.run_uuid}",
        f"- Source hash: `{manifest.source_hash}`",
        f"- Stations completed: {', '.join(manifest.stations_completed) or 'none'}",
        "",
        "## File Integrity",
        "",
        "| File | SHA-256 |",
        "|---|---|",
    ]
    for filename, digest in manifest.all_output_hashes.items():
        lines.append(f"| `{filename}` | `{digest}` |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
