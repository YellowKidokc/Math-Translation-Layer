#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT_DIR / "workflow_output" / "extracted"
DICTIONARY_PATH = ROOT_DIR / "src" / "dictionaries" / "theophysics.json"
MATHJAX_CDN = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"


@dataclass
class EquationRecord:
    equationUuid: str
    rawLatex: str
    position: int
    matched: bool
    equationId: str | None = None
    title: str | None = None
    narrative: str | None = None
    summary: str | None = None
    lawMapping: str | None = None
    flag: str | None = None


def slugify(text: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-") or "untitled-paper"


def load_dictionary() -> list[dict[str, Any]]:
    data = json.loads(DICTIONARY_PATH.read_text(encoding="utf-8"))
    return data.get("equations", [])


def discover_inputs(single_input: str | None, scan_dir: str | None) -> list[Path]:
    if bool(single_input) == bool(scan_dir):
        raise ValueError("Provide exactly one of --input or --scan")
    if single_input:
        p = Path(single_input)
        if not p.is_file():
            raise FileNotFoundError(f"Input file not found: {single_input}")
        return [p]
    d = Path(scan_dir or "")
    if not d.is_dir():
        raise FileNotFoundError(f"Scan directory not found: {scan_dir}")
    return sorted([p for p in d.iterdir() if p.is_file() and p.suffix.lower() in {".html", ".htm"}])


def _nearest_heading(el) -> str:
    for prev in el.find_all_previous(["h1", "h2", "h3", "h4", "h5", "h6"]):
        txt = prev.get_text(" ", strip=True)
        if txt:
            return txt
    return ""


def _nearest_paragraph_snippet(el) -> str:
    p = el.find_previous("p") or el.find_next("p")
    if not p:
        return ""
    text = " ".join(p.get_text(" ", strip=True).split())
    return text[:100]


def extract_figures(soup: BeautifulSoup, source_file: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    nodes = soup.find_all(["img", "figure", "svg", "picture"])
    for idx, node in enumerate(nodes, start=1):
        tag = node.name
        src = ""
        if tag == "img":
            src = node.get("src", "")
        elif tag == "figure":
            img = node.find("img")
            src = img.get("src", "") if img else ""
        elif tag == "picture":
            img = node.find("img")
            src = img.get("src", "") if img else ""
        elif tag == "svg":
            src = "inline-svg:" + hashlib.sha256(str(node).encode("utf-8")).hexdigest()[:16]

        alt_text = ""
        if tag in {"img", "figure", "picture"}:
            img = node if tag == "img" else node.find("img")
            if img:
                alt_text = (img.get("alt") or "").strip()
        if not alt_text:
            alt_text = "MISSING — needs description"

        cap_node = node.find("figcaption") if tag == "figure" else None
        caption = cap_node.get_text(" ", strip=True) if cap_node else ""

        records.append(
            {
                "figureUuid": str(uuid.uuid4()),
                "sourceFile": source_file,
                "elementType": tag,
                "src": src,
                "altText": alt_text,
                "caption": caption,
                "surroundingContext": {
                    "nearestHeading": _nearest_heading(node),
                    "nearestParagraph": _nearest_paragraph_snippet(node),
                },
                "position": idx,
            }
        )
    return records


def _collect_equations_with_positions(soup: BeautifulSoup) -> list[tuple[str, int]]:
    equations: list[tuple[str, int]] = []
    idx = 0
    for node in soup.descendants:
        if not getattr(node, "name", None):
            continue
        idx += 1
        if node.name in {"math", "mjx-container"}:
            txt = " ".join(node.get_text(" ", strip=True).split())
            if txt:
                equations.append((txt, idx))
        elif node.name == "span" and "math" in (node.get("class") or []):
            txt = " ".join(node.get_text(" ", strip=True).split())
            if txt:
                equations.append((txt, idx))
        elif node.name == "script" and str(node.get("type", "")).startswith("math/tex"):
            txt = " ".join(node.get_text(" ", strip=True).split())
            if txt:
                equations.append((txt, idx))

    raw = soup.get_text("\n")
    for m in re.finditer(r"\$\$(.+?)\$\$", raw, flags=re.DOTALL):
        equations.append((" ".join(m.group(1).split()), 100000 + m.start()))
    for m in re.finditer(r"\$(.+?)\$", raw, flags=re.DOTALL):
        equations.append((" ".join(m.group(1).split()), 200000 + m.start()))

    # de-dupe by latex text preserving first appearance
    out: list[tuple[str, int]] = []
    seen = set()
    for latex, pos in sorted(equations, key=lambda t: t[1]):
        if latex and latex not in seen:
            seen.add(latex)
            out.append((latex, pos))
    return out


def match_equation(latex: str, dictionary_equations: list[dict[str, Any]]) -> EquationRecord:
    for entry in dictionary_equations:
        patterns = entry.get("patterns", [])
        for pat in patterns:
            try:
                if re.search(pat, latex):
                    return EquationRecord(
                        equationUuid=str(uuid.uuid4()),
                        rawLatex=latex,
                        position=0,
                        matched=True,
                        equationId=entry.get("equationId"),
                        title=entry.get("title"),
                        narrative=entry.get("narrative"),
                        summary=entry.get("summary"),
                        lawMapping=entry.get("lawMapping"),
                    )
            except re.error:
                continue
    return EquationRecord(
        equationUuid=str(uuid.uuid4()),
        rawLatex=latex,
        position=0,
        matched=False,
        flag="UNMATCHED — needs dictionary entry",
    )


def extract_math_catalog(soup: BeautifulSoup, dictionary_equations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    catalog: list[dict[str, Any]] = []
    for latex, position in _collect_equations_with_positions(soup):
        rec = match_equation(latex, dictionary_equations)
        rec.position = position
        catalog.append(rec.__dict__)
    return catalog


def render_math_appendix(title: str, equations: list[dict[str, Any]]) -> str:
    toc = "\n".join(
        f'<li><a href="#eq-{i+1}">Equation {i+1}: {e.get("title") or "Unmatched"}</a></li>' for i, e in enumerate(equations)
    )
    body = []
    for i, e in enumerate(equations, start=1):
        badge = '<span class="badge">UNMATCHED</span>' if not e.get("matched") else ""
        law = e.get("lawMapping") or "N/A"
        narrative = e.get("narrative") or "No translation available."
        summary = e.get("summary") or "No summary available."
        body.append(
            f'''<section id="eq-{i}" class="eq-card">
<h2>Equation {i} {badge}</h2>
<div class="latex">\\[{e.get("rawLatex", "")}\\]</div>
<p><strong>English translation:</strong> {narrative}</p>
<p><strong>One-line summary:</strong> {summary}</p>
<p><strong>Law mapping:</strong> {law}</p>
</section>'''
        )

    return f"""<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>{title} - Math Appendix</title>
  <style>
    body {{ background: #08080c; color: #f4f4f8; font-family: Inter, Arial, sans-serif; padding: 2rem; }}
    a {{ color: #e8a912; }}
    h1, h2 {{ color: #e8a912; }}
    .eq-card {{ border: 1px solid #2a2a33; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; background: #111118; }}
    .badge {{ background: #7f1d1d; color: #fff; border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.8rem; }}
    .latex {{ font-size: 1.1rem; margin: 0.8rem 0; }}
  </style>
  <script>
    window.MathJax = {{ tex: {{ inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] }} }};
  </script>
  <script id=\"MathJax-script\" async src=\"{MATHJAX_CDN}\"></script>
</head>
<body>
  <h1>{title} — Math Appendix</h1>
  <h2>Table of Contents</h2>
  <ol>{toc}</ol>
  {''.join(body)}
</body>
</html>"""


def process_file(path: Path, output_dir: Path, dictionary_equations: list[dict[str, Any]]) -> None:
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "lxml")
    title_node = soup.find("title") or soup.find("h1")
    title = title_node.get_text(strip=True) if title_node else path.stem
    slug = slugify(path.stem)

    figures = extract_figures(soup, str(path))
    math_catalog = extract_math_catalog(soup, dictionary_equations)

    fig_path = output_dir / f"{slug}-figures.json"
    math_json_path = output_dir / f"{slug}-math-catalog.json"
    appendix_path = output_dir / f"{slug}-math-appendix.html"

    fig_path.write_text(json.dumps(figures, indent=2), encoding="utf-8")
    math_json_path.write_text(json.dumps(math_catalog, indent=2), encoding="utf-8")
    appendix_path.write_text(render_math_appendix(title, math_catalog), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract figures and math appendix from HTML papers")
    parser.add_argument("--input", help="Single HTML file")
    parser.add_argument("--scan", help="Directory of HTML files")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output directory")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    dictionary_equations = load_dictionary()
    files = discover_inputs(args.input, args.scan)
    for f in files:
        process_file(f, output_dir, dictionary_equations)

    print(f"Processed {len(files)} file(s) into {output_dir} at {datetime.now(timezone.utc).isoformat()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
