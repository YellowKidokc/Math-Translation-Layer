import importlib.util
import json
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "rewrite-layer.py"
spec = importlib.util.spec_from_file_location("rewrite_layer", SCRIPT_PATH)
rewrite_layer = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(rewrite_layer)


def test_parse_html_extracts_title_and_body():
    fixture = Path("tests/fixtures/sample-article.html")
    content = rewrite_layer.parse_html(fixture)

    assert content.title == "Convergence and Grace in Dynamic Systems"
    assert "stable behavior over time" in content.body_text
    assert "boundary conditions" in content.body_text


def test_equation_extraction_finds_mathjax_and_latex_blocks():
    fixture = Path("tests/fixtures/sample-article.html")
    content = rewrite_layer.parse_html(fixture)

    assert len(content.equations) >= 2
    eq_blob = "\n".join(content.equations)
    assert "x_{n+1}" in eq_blob
    assert "E = mc^2" in eq_blob


def test_template_fill_replaces_all_placeholders():
    fixture = Path("tests/fixtures/sample-article.html")
    content = rewrite_layer.parse_html(fixture)
    template = rewrite_layer.load_template("summary")
    filled = rewrite_layer.fill_template(template, content)

    assert filled.strip()
    assert "{{TITLE}}" not in filled
    assert "{{BODY_TEXT}}" not in filled
    assert "{{EQUATION_LIST}}" not in filled


def test_meta_json_contains_required_fields(tmp_path):
    fixture = Path("tests/fixtures/sample-article.html")
    _, meta_path = rewrite_layer.write_outputs_for_paper(fixture, tmp_path, use_api=False, model=None)
    meta = json.loads(meta_path.read_text(encoding="utf-8"))

    required = {
        "documentUuid",
        "sourceFile",
        "extractedTitle",
        "equationCount",
        "wordCount",
        "timestamp",
        "outputFiles",
    }
    assert required.issubset(meta.keys())
    assert meta["equationCount"] >= 2
    assert meta["wordCount"] > 0
    assert len(meta["outputFiles"]) == 3
