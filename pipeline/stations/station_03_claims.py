from __future__ import annotations

import json
import re
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import spacy
from bs4 import BeautifulSoup

from pipeline.models.types import Claim, ClaimSet

TRANSITIONS = ("However,", "Therefore,", "In this section", "As we", "Next,", "Note that", "See also")
NLP = spacy.load("en_core_web_sm")


def _sections_from_html(text: str):
    soup = BeautifulSoup(text, "lxml")
    sections = []
    current = {"heading": "Document", "paragraphs": []}
    for el in soup.find_all(["h1", "h2", "h3", "p"]):
        if el.name in {"h1", "h2", "h3"}:
            if current["paragraphs"]:
                sections.append(current)
            current = {"heading": el.get_text(" ", strip=True), "paragraphs": []}
        else:
            p = " ".join(el.get_text(" ", strip=True).split())
            if p:
                current["paragraphs"].append(p)
    if current["paragraphs"]:
        sections.append(current)
    return sections


def _sections_from_md(text: str):
    sections, current = [], {"heading": "Document", "paragraphs": []}
    for block in re.split(r"\n\s*\n", text):
        lines = [l for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        if lines[0].startswith("#"):
            if current["paragraphs"]:
                sections.append(current)
            current = {"heading": lines[0].lstrip("#").strip(), "paragraphs": [" ".join(lines[1:]).strip()] if len(lines)>1 else []}
        else:
            current["paragraphs"].append(" ".join(lines).strip())
    if current["paragraphs"]:
        sections.append(current)
    return sections


def _is_claim(sent) -> bool:
    txt = sent.text.strip()
    if not txt or txt.endswith("?") or len(txt.split()) < 8:
        return False
    if any(txt.startswith(t) for t in TRANSITIONS):
        return False
    lower = txt.lower()
    if re.match(r"^[A-Za-z0-9 _-]+\s+(is|means|refers to)\s+", txt) and not re.search(r"\b(causes?|leads? to|therefore|implies|equals|predicts?)\b", lower):
        return False
    has_subj = any(t.dep_ in {"nsubj", "nsubjpass"} for t in sent)
    has_verb = any(t.pos_ in {"VERB", "AUX"} for t in sent)
    return has_subj and has_verb


def run(paper_uuid: str, output_root: str = "pipeline/output") -> ClaimSet:
    paper_dir = Path(output_root) / paper_uuid
    intake = json.loads((paper_dir / "00_intake.json").read_text(encoding="utf-8"))
    source = Path(intake["source_file"])
    text = source.read_text(encoding="utf-8")
    fmt = intake["format_detected"]
    sections = _sections_from_html(text) if fmt == "html" else (_sections_from_md(text) if fmt == "md" else [{"heading":"Document","paragraphs":[p for p in text.split("\n\n") if p.strip()]}])

    cleaned_text = "\n\n".join([p for s in sections for p in s["paragraphs"]])
    claims: list[Claim] = []
    cursor = 0
    human = []
    for s in sections:
        heading = s["heading"]
        block_lines = [f"## Section: {heading}"]
        n = 0
        for i, para in enumerate(s["paragraphs"]):
            doc = NLP(para)
            for sent in doc.sents:
                if not _is_claim(sent):
                    continue
                txt = sent.text.strip()
                start = cleaned_text.find(txt, cursor)
                if start < 0:
                    start = cleaned_text.find(txt)
                end = start + len(txt)
                cursor = max(cursor, end)
                c = Claim(str(uuid.uuid4()), paper_uuid, txt, start, end, heading, i, None)
                claims.append(c)
                n += 1
                block_lines.append(f'{n}. [{c.claim_uuid[:8]}] "{txt}" (para {i}, chars {start}-{end})')
        if len(block_lines) > 1:
            human.append("\n".join(block_lines))

    out = ClaimSet(paper_uuid=paper_uuid, claims=claims, extraction_timestamp=datetime.now(timezone.utc).isoformat(), extractor_version="station_03_v1")
    (paper_dir / "03_claims.json").write_text(json.dumps({**asdict(out), "claims": [asdict(c) for c in claims]}, indent=2), encoding="utf-8")
    (paper_dir / "03_claims_human.md").write_text("\n\n".join(human) + "\n", encoding="utf-8")
    return out
