from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "pipeline" / "output"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def detect_format(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".html", ".htm"}:
        return "html"
    if suffix in {".md", ".markdown"}:
        return "md"
    if suffix == ".txt":
        return "txt"
    raise ValueError(f"Unsupported input format: {path.suffix}")


def extract_title(path: Path, fmt: str) -> str | None:
    text = path.read_text(encoding="utf-8", errors="replace")
    if fmt == "html":
        soup = BeautifulSoup(text, "lxml")
        h1 = soup.find("h1")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(" ", strip=True)
        if soup.title and soup.title.get_text(strip=True):
            return soup.title.get_text(" ", strip=True)
    if fmt == "md":
        for line in text.splitlines():
            if line.startswith("# "):
                return line[2:].strip()
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped[:160]
    return None


def clean_document_text(path: Path, fmt: str) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    if fmt == "html":
        soup = BeautifulSoup(raw, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            tag.decompose()
        parts: list[str] = []
        for element in soup.find_all(["h1", "h2", "h3", "p", "li"]):
            text = re.sub(r"\s+", " ", element.get_text(" ", strip=True)).strip()
            if not text:
                continue
            if element.name in {"h1", "h2", "h3"}:
                level = {"h1": "#", "h2": "##", "h3": "###"}[element.name]
                parts.append(f"{level} {text}")
            else:
                parts.append(text)
        return "\n\n".join(parts)
    return raw.replace("\r\n", "\n").replace("\r", "\n")


def paper_output_dir(paper_uuid: str) -> Path:
    return OUTPUT_ROOT / paper_uuid
