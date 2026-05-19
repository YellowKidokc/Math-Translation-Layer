from __future__ import annotations

import re
from pathlib import Path

from pipeline.models.types import SevenQForward
from pipeline.stations.common import paper_output_dir, read_json, write_json


def claim_identity(text: str) -> str:
    lower = text.lower()
    if any(term in lower for term in ["data", "measured", "citation", "experiment"]):
        return "empirical"
    if any(term in lower for term in ["god", "grace", "christ", "theological"]):
        return "theological"
    if any(term in lower for term in ["equation", "equals", "theorem", "formal"]):
        return "mathematical/formal"
    if any(term in lower for term in ["maps", "analogy", "across domains", "bridge"]):
        return "bridge/isomorphism"
    return "conceptual"


def claim_scope(text: str) -> str:
    lower = text.lower()
    physics = any(term in lower for term in ["phase", "signal", "entropy", "equation", "physics"])
    theology = any(term in lower for term in ["god", "grace", "christ", "theological"])
    if physics and theology:
        return "physics/theology bridge"
    if physics:
        return "physics/information"
    if theology:
        return "theology"
    return "framework/meta"


def mechanism(text: str) -> str:
    match = re.search(r"\b(because|therefore|causes|leads to|requires|using|when|if)\b.*", text, re.IGNORECASE)
    return match.group(0) if match else "mechanism not explicit"


def dependency(text: str) -> str:
    match = re.search(r"\b(if|when|given|assuming|requires)\b[^.]+", text, re.IGNORECASE)
    return match.group(0) if match else "dependency not explicit"


def consequence(text: str) -> str:
    match = re.search(r"\b(then|implies|means|therefore|so)\b[^.]+", text, re.IGNORECASE)
    return match.group(0) if match else "consequence not explicit"


def run(paper_uuid: str) -> list[SevenQForward]:
    output_dir = paper_output_dir(paper_uuid)
    claims = read_json(output_dir / "03_claims.json")["claims"]
    evidence_rows = read_json(output_dir / "05_evidence.json")["rows"]
    evidence_by_claim: dict[str, list[dict]] = {}
    for row in evidence_rows:
        evidence_by_claim.setdefault(row["claim_uuid"], []).append(row)

    results: list[SevenQForward] = []
    for claim in claims:
        rows = evidence_by_claim.get(claim["claim_uuid"], [])
        types = sorted({row["evidence_type"] for row in rows if row["evidence_type"] != "missing"})
        falsifiability = "testable" if any(word in claim["claim_text"].lower() for word in ["predicts", "downgraded", "reject", "if"]) else "needs_test_condition"
        results.append(
            SevenQForward(
                claim_uuid=claim["claim_uuid"],
                identity=claim_identity(claim["claim_text"]),
                scope=claim_scope(claim["claim_text"]),
                mechanism=mechanism(claim["claim_text"]),
                evidence=f"{len(rows)} evidence row(s): {', '.join(types) or 'missing'}",
                dependency=dependency(claim["claim_text"]),
                consequence=consequence(claim["claim_text"]),
                falsifiability=falsifiability,
            )
        )
    write_json(output_dir / "06_7q_forward.json", {"paper_uuid": paper_uuid, "results": [item.to_dict() for item in results]})
    write_human(output_dir / "06_7q_forward_human.md", paper_uuid, results)
    return results


def write_human(path: Path, paper_uuid: str, results: list[SevenQForward]) -> None:
    lines = [f"# 7Q Forward - {paper_uuid}", ""]
    for result in results:
        lines += [
            f"## Claim {result.claim_uuid[:8]}",
            f"- Identity: {result.identity}",
            f"- Scope: {result.scope}",
            f"- Mechanism: {result.mechanism}",
            f"- Evidence: {result.evidence}",
            f"- Dependency: {result.dependency}",
            f"- Consequence: {result.consequence}",
            f"- Falsifiability: {result.falsifiability}",
            "",
        ]
    path.write_text("\n".join(lines), encoding="utf-8")
