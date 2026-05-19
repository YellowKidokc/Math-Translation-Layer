from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class PaperIntake:
    paper_uuid: str
    source_file: str
    source_hash_sha256: str
    format_detected: str
    intake_timestamp: str
    original_archived_path: str
    title: Optional[str]


@dataclass
class Claim:
    claim_uuid: str
    paper_uuid: str
    claim_text: str
    source_span_start: int
    source_span_end: int
    section_heading: Optional[str]
    paragraph_index: int
    claim_type: Optional[str]


@dataclass
class ClaimSet:
    paper_uuid: str
    claims: list[Claim]
    extraction_timestamp: str
    extractor_version: str


@dataclass
class RunManifest:
    run_uuid: str
    paper_uuid: str
    stations_completed: list[str]
    station_outputs: dict[str, str]
    source_hash: str
    run_start: str
    run_end: Optional[str]
    all_output_hashes: dict[str, str]


@dataclass
class EvidenceRow:
    evidence_uuid: str
    claim_uuid: str
    evidence_type: str
    evidence_text: str
    strength: str
    source: str


@dataclass
class EvidenceLedger:
    paper_uuid: str
    rows: list[EvidenceRow]
    timestamp: str


@dataclass
class SevenQForward:
    claim_uuid: str
    identity: str
    scope: str
    mechanism: str
    evidence: str
    dependency: str
    consequence: str
    falsifiability: str


@dataclass
class SevenQReverse:
    claim_uuid: str
    what_breaks_it: str
    rival_explanations: list[str]
    downgrade_conditions: list[str]


@dataclass
class Objection:
    objection_uuid: str
    claim_uuid: str
    objection_type: str
    objection_text: str
    severity: str


@dataclass
class PressureReport:
    paper_uuid: str
    forward_results: list[SevenQForward]
    reverse_results: list[SevenQReverse]
    objections: list[Objection]
    evidence_ledger: EvidenceLedger
