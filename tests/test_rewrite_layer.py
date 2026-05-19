import importlib.util
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "rewrite-layer.py"
FIXTURE = ROOT / "tests" / "fixtures" / "sample-article.html"


def load_module():
    spec = importlib.util.spec_from_file_location("rewrite_layer", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_html_parsing_extracts_title_and_body():
    module = load_module()
    document = module.extract_document(FIXTURE)
    assert document.title == "Sample Theophysics Article"
    assert "coherence requires" in document.body_text
    assert "physical attractors" in document.body_text
    assert document.word_count > 20


def test_equation_extraction_finds_mathjax_and_latex_blocks():
    module = load_module()
    document = module.extract_document(FIXTURE)
    assert len(document.equations) >= 4
    assert any("\\chi" in equation for equation in document.equations)
    assert any("log_2" in equation for equation in document.equations)
    assert any("x_{n+1}" in equation for equation in document.equations)
    assert any("E = mc^2" in equation for equation in document.equations)


def test_template_filling_replaces_all_placeholders():
    module = load_module()
    document = module.extract_document(FIXTURE)
    template = (ROOT / "templates" / "summary-prompt.txt").read_text(encoding="utf-8")
    filled = module.fill_template(template, document)
    assert "{{" not in filled
    assert "Sample Theophysics Article" in filled
    assert "\\chi" in filled


def test_meta_json_contains_required_fields(tmp_path):
    module = load_module()
    output_dir = tmp_path / "rewrite"
    result = module.main(
        [
            "--input",
            str(FIXTURE),
            "--output-dir",
            str(output_dir),
            "--template-dir",
            str(ROOT / "templates"),
        ]
    )
    assert result == 0
    meta_files = list(output_dir.glob("*-meta.json"))
    assert len(meta_files) == 1
    meta = json.loads(meta_files[0].read_text(encoding="utf-8"))
    for field in [
        "documentUuid",
        "sourceFile",
        "extractedTitle",
        "equationCount",
        "wordCount",
        "timestamp",
        "outputFiles",
    ]:
        assert field in meta
    assert re.fullmatch(r"[0-9a-f-]{36}", meta["documentUuid"])
    assert meta["equationCount"] >= 4
    assert len(meta["outputFiles"]) == 3
    for output_file in meta["outputFiles"]:
        assert Path(output_file).exists()
        assert Path(output_file).read_text(encoding="utf-8").strip()
