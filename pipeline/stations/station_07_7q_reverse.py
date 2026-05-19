from __future__ import annotations

from pathlib import Path

from pipeline.models.types import SevenQReverse
from pipeline.stations.common import paper_output_dir, read_json, write_json


def rivals(identity: str) -> list[str]:
    if "mathematical" in identity:
        return ["Could be coincidental structural similarity", "Could require a weaker formal model"]
    if "theological" in identity:
        return ["Alternative tradition interprets differently", "Claim may depend on revelation rather than derivation"]
    if "bridge" in identity:
        return ["Analogy rather than isomorphism", "Shared language may hide category mismatch"]
    if "empirical" in identity:
        return ["Confounding variable", "Selection bias or insufficient sample"]
    return ["Alternative conceptual framing", "Claim may be rhetorical rather than structural"]


def run(paper_uuid: str) -> list[SevenQReverse]:
    output_dir = paper_output_dir(paper_uuid)
    claims = read_json(output_dir / "03_claims.json")["claims"]
    forward = {row["claim_uuid"]: row for row in read_json(output_dir / "06_7q_forward.json")["results"]}
    results: list[SevenQReverse] = []
    for claim in claims:
        fwd = forward.get(claim["claim_uuid"], {})
        results.append(
            SevenQReverse(
                claim_uuid=claim["claim_uuid"],
                what_breaks_it=f"If the core assertion is false or too broad, then this claim must be narrowed: {claim['claim_text']}",
                rival_explanations=rivals(fwd.get("identity", "")),
                downgrade_conditions=[
                    "Evidence remains local rather than general.",
                    "Mechanism is not explicit enough to carry the claimed scope.",
                ],
            )
        )
    write_json(output_dir / "07_7q_reverse.json", {"paper_uuid": paper_uuid, "results": [item.to_dict() for item in results]})
    write_human(output_dir / "07_7q_reverse_human.md", paper_uuid, results)
    return results


def write_human(path: Path, paper_uuid: str, results: list[SevenQReverse]) -> None:
    lines = [f"# 7Q Reverse - {paper_uuid}", ""]
    for result in results:
        lines += [
            f"## Claim {result.claim_uuid[:8]}",
            f"- What breaks it: {result.what_breaks_it}",
            f"- Rival explanations: {', '.join(result.rival_explanations)}",
            f"- Downgrade conditions: {', '.join(result.downgrade_conditions)}",
            "",
        ]
    path.write_text("\n".join(lines), encoding="utf-8")
