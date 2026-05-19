from __future__ import annotations

import re
import uuid
from pathlib import Path

from pipeline.models.types import Claim, ClaimSet
from pipeline.stations.common import clean_document_text, paper_output_dir, read_json, utc_now, write_json


EXTRACTOR_VERSION = "station_03_claims.0.1"
TRANSITION_PREFIXES = (
    "however,",
    "therefore,",
    "in this section",
    "as we",
    "next,",
    "note that",
    "see also",
)
CLAIM_PATTERNS = re.compile(
    r"\b(is|are|was|were|means|requires|causes|leads to|maps to|equals|implies|predicts|proves|shows|demonstrates|must|cannot|can|will|should|states|functions)\b",
    re.IGNORECASE,
)


def sentence_split(text: str) -> list[tuple[str, int, int]]:
    try:
        import spacy

        try:
            nlp = spacy.load("en_core_web_sm")
        except OSError:
            nlp = spacy.blank("en")
            nlp.add_pipe("sentencizer")
        doc = nlp(text)
        return [(sent.text.strip(), sent.start_char, sent.end_char) for sent in doc.sents if sent.text.strip()]
    except Exception:
        results: list[tuple[str, int, int]] = []
        for match in re.finditer(r"[^.!?]+[.!?]", text, flags=re.MULTILINE):
            sentence = match.group(0).strip()
            if sentence:
                results.append((sentence, match.start(), match.end()))
        return results


def is_claim(sentence: str) -> bool:
    stripped = sentence.strip()
    lower = stripped.lower()
    if stripped.endswith("?"):
        return False
    if len(re.findall(r"\b\w+\b", stripped)) < 8:
        return False
    if any(lower.startswith(prefix) for prefix in TRANSITION_PREFIXES):
        return False
    if not CLAIM_PATTERNS.search(stripped):
        return False
    return True


def split_sections(cleaned_text: str) -> list[dict]:
    sections: list[dict] = []
    current = {"heading": None, "paragraphs": []}
    for block in re.split(r"\n\s*\n", cleaned_text):
        stripped = block.strip()
        if not stripped:
            continue
        heading_match = re.match(r"^#{1,6}\s+(.+)$", stripped)
        if heading_match:
            if current["heading"] is not None or current["paragraphs"]:
                sections.append(current)
            current = {"heading": heading_match.group(1).strip(), "paragraphs": []}
        else:
            current["paragraphs"].append(stripped)
    if current["heading"] is not None or current["paragraphs"]:
        sections.append(current)
    return sections


def run(paper_uuid: str) -> ClaimSet:
    output_dir = paper_output_dir(paper_uuid)
    intake = read_json(output_dir / "00_intake.json")
    source = Path(intake["source_file"])
    cleaned = clean_document_text(source, intake["format_detected"])
    claims: list[Claim] = []

    for section in split_sections(cleaned):
        heading = section["heading"]
        for paragraph_index, paragraph in enumerate(section["paragraphs"], start=1):
            paragraph_start = cleaned.find(paragraph)
            for sentence, local_start, local_end in sentence_split(paragraph):
                if not is_claim(sentence):
                    continue
                source_start = paragraph_start + local_start if paragraph_start >= 0 else local_start
                source_end = paragraph_start + local_end if paragraph_start >= 0 else local_end
                claims.append(
                    Claim(
                        claim_uuid=str(uuid.uuid4()),
                        paper_uuid=paper_uuid,
                        claim_text=sentence,
                        source_span_start=source_start,
                        source_span_end=source_end,
                        section_heading=heading,
                        paragraph_index=paragraph_index,
                    )
                )

    claim_set = ClaimSet(
        paper_uuid=paper_uuid,
        claims=claims,
        extraction_timestamp=utc_now(),
        extractor_version=EXTRACTOR_VERSION,
    )
    write_json(output_dir / "03_claims.json", claim_set.to_dict())
    write_human_claims(output_dir / "03_claims_human.md", claim_set)
    return claim_set


def write_human_claims(path: Path, claim_set: ClaimSet) -> None:
    lines = [f"# Claim Extraction - {claim_set.paper_uuid}", ""]
    current_section = object()
    for index, claim in enumerate(claim_set.claims, start=1):
        if claim.section_heading != current_section:
            current_section = claim.section_heading
            lines += ["", f"## Section: {claim.section_heading or 'Untitled'}", ""]
        short = claim.claim_uuid.split("-")[0]
        lines.append(
            f"{index}. [{short}] \"{claim.claim_text}\" "
            f"(para {claim.paragraph_index}, chars {claim.source_span_start}-{claim.source_span_end})"
        )
    path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
