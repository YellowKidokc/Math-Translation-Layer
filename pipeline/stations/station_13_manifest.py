from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from pipeline.models.types import RunManifest


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def run(paper_uuid: str, output_root: str = "pipeline/output") -> RunManifest:
    paper_dir = Path(output_root) / paper_uuid
    intake = json.loads((paper_dir / "00_intake.json").read_text(encoding="utf-8"))
    outputs = sorted([p for p in paper_dir.iterdir() if p.is_file() and p.suffix in {".json", ".md"}])
    all_hashes = {p.name: _sha256(p) for p in outputs}
    station_outputs = {p.name.split("_")[0]: str(p) for p in outputs if p.name[:2].isdigit()}
    stations_completed = sorted(station_outputs.keys(), key=int)

    manifest = RunManifest(
        run_uuid=str(uuid.uuid4()),
        paper_uuid=paper_uuid,
        stations_completed=stations_completed,
        station_outputs=station_outputs,
        source_hash=intake["source_hash_sha256"],
        run_start=intake["intake_timestamp"],
        run_end=datetime.now(timezone.utc).isoformat(),
        all_output_hashes=all_hashes,
    )
    (paper_dir / "13_manifest.json").write_text(json.dumps(asdict(manifest), indent=2), encoding="utf-8")

    claims_count = 0
    cpath = paper_dir / "03_claims.json"
    if cpath.exists():
        claims_count = len(json.loads(cpath.read_text(encoding="utf-8")).get("claims", []))
    human = [
        f"- Paper: {intake.get('title')}",
        f"- Paper UUID: {paper_uuid}",
        f"- Run UUID: {manifest.run_uuid}",
        f"- Stations completed: {', '.join(stations_completed)}",
        f"- Claims extracted: {claims_count}",
        "- File integrity:",
    ]
    human += [f"  - {k}: {v}" for k, v in all_hashes.items()]
    (paper_dir / "13_manifest_human.md").write_text("\n".join(human) + "\n", encoding="utf-8")
    return manifest
