from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass
class PaperIntake:
    paper_uuid: str
    source_file: str
    source_hash_sha256: str
    format_detected: str
    intake_timestamp: str
    original_archived_path: str
    title: str | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Claim:
    claim_uuid: str
    paper_uuid: str
    claim_text: str
    source_span_start: int
    source_span_end: int
    section_heading: str | None
    paragraph_index: int
    claim_type: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ClaimSet:
    paper_uuid: str
    claims: list[Claim]
    extraction_timestamp: str
    extractor_version: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "paper_uuid": self.paper_uuid,
            "claims": [claim.to_dict() for claim in self.claims],
            "extraction_timestamp": self.extraction_timestamp,
            "extractor_version": self.extractor_version,
        }


@dataclass
class RunManifest:
    run_uuid: str
    paper_uuid: str
    stations_completed: list[str]
    station_outputs: dict[str, str]
    source_hash: str
    run_start: str
    run_end: str | None
    all_output_hashes: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EvidenceRow:
    evidence_uuid: str
    claim_uuid: str
    evidence_type: str
    evidence_text: str
    strength: str
    source: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EvidenceLedger:
    paper_uuid: str
    rows: list[EvidenceRow]
    timestamp: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "paper_uuid": self.paper_uuid,
            "rows": [row.to_dict() for row in self.rows],
            "timestamp": self.timestamp,
        }


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

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SevenQReverse:
    claim_uuid: str
    what_breaks_it: str
    rival_explanations: list[str]
    downgrade_conditions: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Objection:
    objection_uuid: str
    claim_uuid: str
    objection_type: str
    objection_text: str
    severity: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PressureReport:
    paper_uuid: str
    forward_results: list[SevenQForward]
    reverse_results: list[SevenQReverse]
    objections: list[Objection]
    evidence_ledger: EvidenceLedger

    def to_dict(self) -> dict[str, Any]:
        return {
            "paper_uuid": self.paper_uuid,
            "forward_results": [result.to_dict() for result in self.forward_results],
            "reverse_results": [result.to_dict() for result in self.reverse_results],
            "objections": [objection.to_dict() for objection in self.objections],
            "evidence_ledger": self.evidence_ledger.to_dict(),
        }
