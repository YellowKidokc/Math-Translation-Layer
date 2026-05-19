from __future__ import annotations

import re
import uuid
from pathlib import Path

from pipeline.models.types import Objection
from pipeline.stations.common import paper_output_dir, read_json, write_json


ABSOLUTES = re.compile(r"\b(always|never|proves|impossible|beyond doubt|only|all|none)\b", re.IGNORECASE)
TERMS_REQUIRING_DEFINITION = re.compile(r"\b(coherence|isomorphism|substrate|operator|phase transition|reference class)\b", re.IGNORECASE)


def add(objections: list[Objection], claim_uuid: str, objection_type: str, text: str, severity: str) -> None:
    objections.append(
        Objection(
            objection_uuid=str(uuid.uuid4()),
            claim_uuid=claim_uuid,
            objection_type=objection_type,
            objection_text=text,
            severity=severity,
        )
    )


def run(paper_uuid: str) -> list[Objection]:
    output_dir = paper_output_dir(paper_uuid)
    claims = read_json(output_dir / "03_claims.json")["claims"]
    evidence_rows = read_json(output_dir / "05_evidence.json")["rows"]
    forward = {row["claim_uuid"]: row for row in read_json(output_dir / "06_7q_forward.json")["results"]}
    evidence_by_claim: dict[str, list[dict]] = {}
    for row in evidence_rows:
        evidence_by_claim.setdefault(row["claim_uuid"], []).append(row)

    objections: list[Objection] = []
    for claim in claims:
        claim_uuid = claim["claim_uuid"]
        text = claim["claim_text"]
        fwd = forward.get(claim_uuid, {})
        lower = text.lower()
        evidence = evidence_by_claim.get(claim_uuid, [])
        has_missing_only = evidence and all(row["strength"] == "missing" for row in evidence)

        if ABSOLUTES.search(text):
            add(objections, claim_uuid, "overclaim", "Absolute language requires formal proof, source support, or narrowing.", "critical")
        if fwd.get("scope") == "physics/theology bridge" and not any(word in lower for word in ["maps", "bridge", "isomorphism", "register"]):
            add(objections, claim_uuid, "category_error", "Cross-domain claim needs explicit mapping justification.", "critical")
        if TERMS_REQUIRING_DEFINITION.search(text) and "means" not in lower and "defined" not in lower:
            add(objections, claim_uuid, "missing_definition", "Technical term appears without an immediate definition.", "minor")
        if fwd.get("identity") == "empirical" and has_missing_only:
            add(objections, claim_uuid, "empirical_gap", "Empirical-style claim has no nearby detected evidence.", "serious")
        if fwd.get("consequence") == "consequence not explicit" and any(word in lower for word in ["therefore", "implies", "so"]):
            add(objections, claim_uuid, "logical_gap", "Consequence language appears but the mechanism is weak.", "serious")
        if fwd.get("falsifiability") == "needs_test_condition" and any(word in lower for word in ["predict", "should", "must"]):
            add(objections, claim_uuid, "scope_violation", "Strong scope language needs an explicit test condition.", "serious")

    write_json(output_dir / "09_objections.json", {"paper_uuid": paper_uuid, "objections": [item.to_dict() for item in objections]})
    write_human(output_dir / "09_objections_human.md", paper_uuid, objections)
    return objections


def write_human(path: Path, paper_uuid: str, objections: list[Objection]) -> None:
    grouped = {
        "critical": [item for item in objections if item.severity == "critical"],
        "serious": [item for item in objections if item.severity == "serious"],
        "minor": [item for item in objections if item.severity == "minor"],
    }
    lines = [f"# Objection Report - {paper_uuid}", ""]
    for severity, title in [("critical", "Critical Objections"), ("serious", "Serious Objections"), ("minor", "Minor Objections")]:
        lines += [f"## {title}", ""]
        if not grouped[severity]:
            lines.append("- None detected.")
        for objection in grouped[severity]:
            lines.append(f"- `{objection.claim_uuid[:8]}` {objection.objection_text} ({objection.objection_type})")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")
