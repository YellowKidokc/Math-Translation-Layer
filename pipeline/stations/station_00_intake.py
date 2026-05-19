from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from pipeline.models.types import PaperIntake
from pipeline.stations.common import detect_format, extract_title, paper_output_dir, sha256_file, utc_now, write_json


def run(input_path: str | Path) -> PaperIntake:
    source = Path(input_path).expanduser().resolve()
    if not source.exists() or not source.is_file():
        raise FileNotFoundError(f"Input file not found: {source}")

    fmt = detect_format(source)
    paper_uuid = str(uuid.uuid4())
    output_dir = paper_output_dir(paper_uuid)
    archive_dir = output_dir / "original"
    archive_dir.mkdir(parents=True, exist_ok=True)
    archived = archive_dir / source.name
    shutil.copy2(source, archived)

    intake = PaperIntake(
        paper_uuid=paper_uuid,
        source_file=str(source),
        source_hash_sha256=sha256_file(source),
        format_detected=fmt,
        intake_timestamp=utc_now(),
        original_archived_path=str(archived),
        title=extract_title(source, fmt),
    )
    write_json(output_dir / "00_intake.json", intake.to_dict())
    return intake
