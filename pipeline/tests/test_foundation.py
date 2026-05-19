import hashlib, json, re
from pathlib import Path
from pipeline.stations import station_00_intake, station_03_claims, station_13_manifest

FIXTURE = "pipeline/tests/fixtures/sample-paper.html"

def _is_uuid4(s):
    return bool(re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", s))

def test_intake_generates_uuid():
    intake = station_00_intake.run(FIXTURE)
    assert _is_uuid4(intake.paper_uuid)

def test_intake_hashes_source():
    intake = station_00_intake.run(FIXTURE)
    expect = hashlib.sha256(Path(FIXTURE).read_bytes()).hexdigest()
    assert intake.source_hash_sha256 == expect

def test_intake_detects_format():
    assert station_00_intake._detect_format(Path("a.html")) == "html"
    assert station_00_intake._detect_format(Path("a.md")) == "md"
    assert station_00_intake._detect_format(Path("a.txt")) == "txt"

def test_intake_extracts_title():
    intake = station_00_intake.run(FIXTURE)
    assert intake.title == "Foundational Theophysics Claims"

def test_claims_extracts_claims():
    intake = station_00_intake.run(FIXTURE)
    claims = station_03_claims.run(intake.paper_uuid)
    assert len(claims.claims) >= 3

def test_claims_have_uuids():
    intake = station_00_intake.run(FIXTURE)
    claims = station_03_claims.run(intake.paper_uuid)
    assert all(_is_uuid4(c.claim_uuid) for c in claims.claims)

def test_claims_have_spans():
    intake = station_00_intake.run(FIXTURE)
    claims = station_03_claims.run(intake.paper_uuid)
    assert all(c.source_span_start < c.source_span_end for c in claims.claims)

def test_claims_exclude_questions():
    intake = station_00_intake.run(FIXTURE)
    claims = station_03_claims.run(intake.paper_uuid)
    assert all(not c.claim_text.endswith("?") for c in claims.claims)

def test_claims_human_readable():
    intake = station_00_intake.run(FIXTURE)
    station_03_claims.run(intake.paper_uuid)
    p = Path("pipeline/output") / intake.paper_uuid / "03_claims_human.md"
    assert p.exists() and p.read_text().strip()

def test_manifest_records_stations():
    intake = station_00_intake.run(FIXTURE)
    station_03_claims.run(intake.paper_uuid)
    m = station_13_manifest.run(intake.paper_uuid)
    assert "00" in m.stations_completed and "03" in m.stations_completed

def test_manifest_hashes_files():
    intake = station_00_intake.run(FIXTURE)
    station_03_claims.run(intake.paper_uuid)
    m = station_13_manifest.run(intake.paper_uuid)
    assert "00_intake.json" in m.all_output_hashes

def test_full_pipeline_integration():
    intake = station_00_intake.run(FIXTURE)
    station_03_claims.run(intake.paper_uuid)
    station_13_manifest.run(intake.paper_uuid)
    d = Path("pipeline/output") / intake.paper_uuid
    assert (d / "00_intake.json").exists()
    assert (d / "03_claims.json").exists()
    assert (d / "13_manifest.json").exists()
