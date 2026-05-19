import json
from pathlib import Path
from pipeline.stations import station_00_intake, station_03_claims, station_05_evidence, station_06_7q_forward, station_07_7q_reverse, station_09_objections

FIXTURE = "pipeline/tests/fixtures/sample-paper.html"

def _run():
    intake = station_00_intake.run(FIXTURE)
    station_03_claims.run(intake.paper_uuid)
    station_05_evidence.run(intake.paper_uuid)
    station_06_7q_forward.run(intake.paper_uuid)
    station_07_7q_reverse.run(intake.paper_uuid)
    station_09_objections.run(intake.paper_uuid)
    return intake.paper_uuid

def test_evidence_finds_citations():
    pid = _run()
    rows = json.loads((Path('pipeline/output')/pid/'05_evidence.json').read_text())['rows']
    assert any(r['evidence_type']=='citation' for r in rows)

def test_evidence_flags_missing():
    pid = _run()
    rows = json.loads((Path('pipeline/output')/pid/'05_evidence.json').read_text())['rows']
    assert any(r['strength']=='missing' for r in rows)

def test_7q_forward_fills_all_fields():
    pid = _run()
    rows = json.loads((Path('pipeline/output')/pid/'06_7q_forward.json').read_text())['results']
    assert all(all(v is not None for k,v in r.items()) for r in rows)

def test_7q_reverse_has_negation():
    pid = _run()
    rows = json.loads((Path('pipeline/output')/pid/'07_7q_reverse.json').read_text())['results']
    assert all(r['what_breaks_it'] for r in rows)

def test_objections_detect_overclaim():
    pid = _run()
    obs = json.loads((Path('pipeline/output')/pid/'09_objections.json').read_text())['objections']
    assert any(o['objection_type']=='overclaim' for o in obs)

def test_objections_severity_levels():
    pid = _run()
    obs = json.loads((Path('pipeline/output')/pid/'09_objections.json').read_text())['objections']
    assert any(o['severity']=='critical' for o in obs)

def test_full_adversarial_pipeline():
    pid = _run(); d=Path('pipeline/output')/pid
    assert (d/'05_evidence.json').exists() and (d/'06_7q_forward.json').exists() and (d/'07_7q_reverse.json').exists() and (d/'09_objections.json').exists()
