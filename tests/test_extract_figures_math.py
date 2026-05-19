import importlib.util
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "extract-figures-math.py"
FIXTURE = ROOT / "tests" / "fixtures" / "sample-article.html"
DICTIONARY = ROOT / "src" / "dictionaries" / "theophysics.json"


def load_module():
    spec = importlib.util.spec_from_file_location("extract_figures_math", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_figure_extraction_from_fixture_with_images():
    module = load_module()
    soup = module.BeautifulSoup(FIXTURE.read_text(encoding="utf-8"), "lxml")
    figures = module.extract_figures(soup, str(FIXTURE))
    assert len(figures) >= 4
    assert any(item["alt"] == "Coherence flow diagram" for item in figures)
    assert any(item["alt"] == "MISSING - needs description" for item in figures)
    assert any(item["caption"] == "A sample figure caption." for item in figures)


def test_equation_extraction_finds_latex_blocks():
    module = load_module()
    raw = FIXTURE.read_text(encoding="utf-8")
    soup = module.BeautifulSoup(raw, "lxml")
    equations = module.extract_equations(raw, soup)
    assert len(equations) >= 4
    assert any("\\chi" in equation["rawLatex"] for equation in equations)
    assert any("x_{n+1}" in equation["rawLatex"] for equation in equations)
    assert any("E = mc^2" in equation["rawLatex"] for equation in equations)


def test_dictionary_matching_identifies_master_equation():
    module = load_module()
    dictionary = module.load_dictionary(DICTIONARY)
    match = module.match_equation(
        r"\chi = G \cdot M \cdot E \cdot S_eff \cdot T \cdot K \cdot R \cdot Q \cdot F \cdot C",
        dictionary,
    )
    assert match["matched"] is True
    assert match["equationId"] == "master-equation-local"


def test_unmatched_equations_get_flagged():
    module = load_module()
    dictionary = module.load_dictionary(DICTIONARY)
    match = module.match_equation(r"Z = mystery + 42", dictionary)
    assert match["matched"] is False
    assert "UNMATCHED" in match["title"]


def test_math_appendix_html_contains_mathjax_and_equation_blocks(tmp_path):
    module = load_module()
    result = module.main(
        [
            "--input",
            str(FIXTURE),
            "--output-dir",
            str(tmp_path),
            "--dictionary",
            str(DICTIONARY),
        ]
    )
    assert result == 0
    appendix = tmp_path / "sample-theophysics-article-math-appendix.html"
    catalog = tmp_path / "sample-theophysics-article-math-catalog.json"
    figures = tmp_path / "sample-theophysics-article-figures.json"
    assert appendix.exists()
    assert catalog.exists()
    assert figures.exists()
    html = appendix.read_text(encoding="utf-8")
    assert module.MATHJAX_CDN in html
    assert "equation-card" in html
    catalog_data = json.loads(catalog.read_text(encoding="utf-8"))
    assert any(item["matched"] for item in catalog_data)
    assert any(not item["matched"] for item in catalog_data)
