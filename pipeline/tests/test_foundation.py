import json
import re
import shutil
import uuid
from pathlib import Path

from pipeline.stations import station_00_intake, station_03_claims, station_13_manifest
from pipeline.stations.common import OUTPUT_ROOT, sha256_file


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "pipeline" / "tests" / "fixtures" / "sample-paper.html"


def cleanup(paper_uuid: str) -> None:
    shutil.rmtree(OUTPUT_ROOT / paper_uuid, ignore_errors=True)


def assert_uuid4(value: str) -> None:
    parsed = uuid.UUID(value)
    assert parsed.version == 4


def test_intake_generates_uuid():
    intake = station_00_intake.run(FIXTURE)
    try:
        assert_uuid4(intake.paper_uuid)
        assert (OUTPUT_ROOT / intake.paper_uuid / "00_intake.json").exists()
    finally:
        cleanup(intake.paper_uuid)


def test_intake_hashes_source():
    intake = station_00_intake.run(FIXTURE)
    try:
        assert intake.source_hash_sha256 == sha256_file(FIXTURE)
    finally:
        cleanup(intake.paper_uuid)


def test_intake_detects_format(tmp_path):
    html = tmp_path / "a.html"
    md = tmp_path / "a.md"
    txt = tmp_path / "a.txt"
    html.write_text("<h1>HTML</h1>", encoding="utf-8")
    md.write_text("# MD", encoding="utf-8")
    txt.write_text("TXT", encoding="utf-8")
    created = [station_00_intake.run(path) for path in [html, md, txt]]
    try:
        assert [item.format_detected for item in created] == ["html", "md", "txt"]
    finally:
        for item in created:
            cleanup(item.paper_uuid)


def test_intake_extracts_title():
    intake = station_00_intake.run(FIXTURE)
    try:
        assert intake.title == "Foundation Pipeline Fixture"
    finally:
        cleanup(intake.paper_uuid)


def test_claims_extracts_claims():
    intake = station_00_intake.run(FIXTURE)
    try:
        claim_set = station_03_claims.run(intake.paper_uuid)
        assert len(claim_set.claims) >= 8
    finally:
        cleanup(intake.paper_uuid)


def test_claims_have_uuids():
    intake = station_00_intake.run(FIXTURE)
    try:
        claim_set = station_03_claims.run(intake.paper_uuid)
        for claim in claim_set.claims:
            assert_uuid4(claim.claim_uuid)
    finally:
        cleanup(intake.paper_uuid)


def test_claims_have_spans():
    intake = station_00_intake.run(FIXTURE)
    try:
        claim_set = station_03_claims.run(intake.paper_uuid)
        assert all(claim.source_span_start < claim.source_span_end for claim in claim_set.claims)
    finally:
        cleanup(intake.paper_uuid)


def test_claims_exclude_questions():
    intake = station_00_intake.run(FIXTURE)
    try:
        claim_set = station_03_claims.run(intake.paper_uuid)
        assert all(not claim.claim_text.endswith("?") for claim in claim_set.claims)
    finally:
        cleanup(intake.paper_uuid)


def test_claims_human_readable():
    intake = station_00_intake.run(FIXTURE)
    try:
        station_03_claims.run(intake.paper_uuid)
        path = OUTPUT_ROOT / intake.paper_uuid / "03_claims_human.md"
        assert path.exists()
        assert "Section:" in path.read_text(encoding="utf-8")
    finally:
        cleanup(intake.paper_uuid)


def test_manifest_records_stations():
    intake = station_00_intake.run(FIXTURE)
    try:
        station_03_claims.run(intake.paper_uuid)
        manifest = station_13_manifest.run(intake.paper_uuid)
        assert "00_intake" in manifest.stations_completed
        assert "03_claims" in manifest.stations_completed
    finally:
        cleanup(intake.paper_uuid)


def test_manifest_hashes_files():
    intake = station_00_intake.run(FIXTURE)
    try:
        station_03_claims.run(intake.paper_uuid)
        manifest = station_13_manifest.run(intake.paper_uuid)
        assert "00_intake.json" in manifest.all_output_hashes
        assert re.fullmatch(r"[0-9a-f]{64}", manifest.all_output_hashes["00_intake.json"])
    finally:
        cleanup(intake.paper_uuid)


def test_full_pipeline_integration():
    intake = station_00_intake.run(FIXTURE)
    try:
        claim_set = station_03_claims.run(intake.paper_uuid)
        manifest = station_13_manifest.run(intake.paper_uuid)
        output_dir = OUTPUT_ROOT / intake.paper_uuid
        assert (output_dir / "00_intake.json").exists()
        assert (output_dir / "03_claims.json").exists()
        assert (output_dir / "13_manifest.json").exists()
        assert len(json.loads((output_dir / "03_claims.json").read_text(encoding="utf-8"))["claims"]) == len(claim_set.claims)
        assert manifest.paper_uuid == intake.paper_uuid
    finally:
        cleanup(intake.paper_uuid)
