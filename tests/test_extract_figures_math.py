import importlib.util
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "extract-figures-math.py"
spec = importlib.util.spec_from_file_location("extract_figures_math", SCRIPT_PATH)
extract_module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(extract_module)


def _soup_from_fixture():
    from bs4 import BeautifulSoup

    fixture = Path("tests/fixtures/sample-article.html")
    return BeautifulSoup(fixture.read_text(encoding="utf-8"), "lxml")


def test_figure_extraction_from_fixture():
    soup = _soup_from_fixture()
    figures = extract_module.extract_figures(soup, "tests/fixtures/sample-article.html")
    assert len(figures) >= 3
    assert any(f["elementType"] == "img" for f in figures)
    assert any(f["altText"] == "MISSING — needs description" for f in figures)


def test_equation_extraction_finds_latex_blocks():
    soup = _soup_from_fixture()
    equations = extract_module._collect_equations_with_positions(soup)
    blob = "\n".join(eq for eq, _ in equations)
    assert "\\chi = G" in blob
    assert "x_{n+1}" in blob


def test_dictionary_matching_identifies_known_equation():
    dictionary = extract_module.load_dictionary()
    matched = extract_module.match_equation(
        r"\\chi = G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C",
        dictionary,
    )
    assert matched.matched is True
    assert matched.equationId is not None


def test_unmatched_equation_is_flagged():
    dictionary = extract_module.load_dictionary()
    unmatched = extract_module.match_equation(r"a^2 + b^2 = c^2 + z", dictionary)
    assert unmatched.matched is False
    assert unmatched.flag == "UNMATCHED — needs dictionary entry"


def test_math_appendix_contains_mathjax_cdn():
    html = extract_module.render_math_appendix(
        "Sample",
        [
            {
                "rawLatex": r"x+y",
                "matched": False,
                "narrative": None,
                "summary": None,
                "lawMapping": None,
            }
        ],
    )
    assert "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" in html
    assert "<!doctype html>" in html.lower()
