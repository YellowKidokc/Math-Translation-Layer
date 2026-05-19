import json
import shutil
from pathlib import Path

from pipeline.stations import (
    station_00_intake,
    station_03_claims,
    station_05_evidence,
    station_06_7q_forward,
    station_07_7q_reverse,
    station_09_objections,
    station_13_manifest,
)
from pipeline.stations.common import OUTPUT_ROOT


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "pipeline" / "tests" / "fixtures" / "sample-paper.html"


def cleanup(paper_uuid: str) -> None:
    shutil.rmtree(OUTPUT_ROOT / paper_uuid, ignore_errors=True)


def run_through_claims():
    intake = station_00_intake.run(FIXTURE)
    station_03_claims.run(intake.paper_uuid)
    return intake


def run_through_pressure():
    intake = run_through_claims()
    station_05_evidence.run(intake.paper_uuid)
    station_06_7q_forward.run(intake.paper_uuid)
    station_07_7q_reverse.run(intake.paper_uuid)
    station_09_objections.run(intake.paper_uuid)
    return intake


def test_evidence_finds_citations():
    intake = run_through_claims()
    try:
        ledger = station_05_evidence.run(intake.paper_uuid)
        assert any(row.evidence_type in {"equation", "framework"} for row in ledger.rows)
    finally:
        cleanup(intake.paper_uuid)


def test_evidence_flags_missing(tmp_path):
    fixture = tmp_path / "plain.html"
    fixture.write_text("<h1>Plain</h1><p>This careful claim states that a local pattern can persist in a small domain.</p>", encoding="utf-8")
    intake = station_00_intake.run(fixture)
    try:
        station_03_claims.run(intake.paper_uuid)
        ledger = station_05_evidence.run(intake.paper_uuid)
        assert any(row.strength == "missing" for row in ledger.rows)
    finally:
        cleanup(intake.paper_uuid)


def test_7q_forward_fills_all_fields():
    intake = run_through_claims()
    try:
        station_05_evidence.run(intake.paper_uuid)
        results = station_06_7q_forward.run(intake.paper_uuid)
        assert results
        for result in results:
            assert all(
                getattr(result, field)
                for field in ["identity", "scope", "mechanism", "evidence", "dependency", "consequence", "falsifiability"]
            )
    finally:
        cleanup(intake.paper_uuid)


def test_7q_reverse_has_negation():
    intake = run_through_claims()
    try:
        station_05_evidence.run(intake.paper_uuid)
        station_06_7q_forward.run(intake.paper_uuid)
        results = station_07_7q_reverse.run(intake.paper_uuid)
        assert results
        assert all(result.what_breaks_it for result in results)
    finally:
        cleanup(intake.paper_uuid)


def test_objections_detect_overclaim(tmp_path):
    fixture = tmp_path / "overclaim.html"
    fixture.write_text(
        "<h1>Overclaim</h1><p>This paper proves beyond doubt that every rival framework is impossible without the reference class.</p>",
        encoding="utf-8",
    )
    intake = station_00_intake.run(fixture)
    try:
        station_03_claims.run(intake.paper_uuid)
        station_05_evidence.run(intake.paper_uuid)
        station_06_7q_forward.run(intake.paper_uuid)
        station_07_7q_reverse.run(intake.paper_uuid)
        objections = station_09_objections.run(intake.paper_uuid)
        assert any(objection.objection_type == "overclaim" for objection in objections)
    finally:
        cleanup(intake.paper_uuid)


def test_objections_severity_levels():
    intake = run_through_pressure()
    try:
        data = json.loads((OUTPUT_ROOT / intake.paper_uuid / "09_objections.json").read_text(encoding="utf-8"))
        severities = {item["severity"] for item in data["objections"]}
        assert severities <= {"critical", "serious", "minor"}
        assert severities
    finally:
        cleanup(intake.paper_uuid)


def test_full_adversarial_pipeline():
    intake = run_through_pressure()
    try:
        manifest = station_13_manifest.run(intake.paper_uuid)
        output_dir = OUTPUT_ROOT / intake.paper_uuid
        for filename in [
            "05_evidence.json",
            "06_7q_forward.json",
            "07_7q_reverse.json",
            "09_objections.json",
            "05_evidence_human.md",
            "06_7q_forward_human.md",
            "07_7q_reverse_human.md",
            "09_objections_human.md",
        ]:
            assert (output_dir / filename).exists()
        assert "09_objections" in manifest.stations_completed
    finally:
        cleanup(intake.paper_uuid)
