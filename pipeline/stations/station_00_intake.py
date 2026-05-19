from __future__ import annotations

import hashlib
import json
import re
import shutil
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

from pipeline.models.types import PaperIntake


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def _detect_format(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in {".html", ".htm"}:
        return "html"
    if ext in {".md", ".markdown"}:
        return "md"
    return "txt"


def _extract_title(path: Path, fmt: str) -> str | None:
    text = path.read_text(encoding="utf-8")
    if fmt == "html":
        soup = BeautifulSoup(text, "lxml")
        n = soup.find("h1") or soup.find("title")
        return n.get_text(strip=True) if n else None
    if fmt == "md":
        for line in text.splitlines():
            if line.strip().startswith("# "):
                return line.strip()[2:].strip()
    for line in text.splitlines():
        if line.strip():
            return line.strip()
    return None


def run(source_file: str, output_root: str = "pipeline/output") -> PaperIntake:
    source = Path(source_file)
    fmt = _detect_format(source)
    paper_uuid = str(uuid.uuid4())
    paper_dir = Path(output_root) / paper_uuid
    orig_dir = paper_dir / "original"
    orig_dir.mkdir(parents=True, exist_ok=True)
    archived = orig_dir / source.name
    shutil.copy2(source, archived)

    intake = PaperIntake(
        paper_uuid=paper_uuid,
        source_file=str(source),
        source_hash_sha256=_sha256(source),
        format_detected=fmt,
        intake_timestamp=datetime.now(timezone.utc).isoformat(),
        original_archived_path=str(archived),
        title=_extract_title(source, fmt),
    )
    (paper_dir / "00_intake.json").write_text(json.dumps(asdict(intake), indent=2), encoding="utf-8")
    return intake
