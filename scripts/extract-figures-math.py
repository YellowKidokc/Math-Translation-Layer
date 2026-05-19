#!/usr/bin/env python3
"""Extract figure catalogs and standalone math appendices from Theophysics HTML."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from bs4 import BeautifulSoup, Tag


SUPPORTED_EXTENSIONS = {".html", ".htm"}
MATHJAX_CDN = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "untitled-paper"


def normalize_latex(value: str) -> str:
    normalized = html.unescape(value or "")
    normalized = re.sub(r"\s+", " ", normalized).strip()
    while "\\\\" in normalized:
        normalized = normalized.replace("\\\\", "\\")
    normalized = normalized.replace("S_{eff}", "S_eff")
    return normalized


def load_dictionary(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_title(soup: BeautifulSoup, source: Path) -> str:
    h1 = soup.find("h1")
    if h1 and h1.get_text(strip=True):
        return h1.get_text(" ", strip=True)
    if soup.title and soup.title.get_text(strip=True):
        return soup.title.get_text(" ", strip=True)
    return source.stem.replace("-", " ").replace("_", " ").title()


def nearest_heading(element: Tag) -> str:
    for sibling in element.find_all_previous(["h1", "h2", "h3", "h4", "h5", "h6"], limit=1):
        text = sibling.get_text(" ", strip=True)
        if text:
            return text
    return ""


def nearest_paragraph(element: Tag) -> str:
    candidates = list(element.find_all_previous("p", limit=1)) + list(element.find_all_next("p", limit=1))
    for paragraph in candidates:
        text = re.sub(r"\s+", " ", paragraph.get_text(" ", strip=True)).strip()
        if text:
            return text[:100]
    return ""


def figure_record(element: Tag, source_file: str, position: int) -> dict:
    element_type = element.name
    src = element.get("src") or ""
    if element_type == "picture":
        img = element.find("img")
        if img:
            src = img.get("src") or ""
    inline_hash = ""
    if element_type == "svg":
        inline_hash = hashlib.sha256(str(element).encode("utf-8")).hexdigest()
    figcaption = element.find("figcaption") if element_type == "figure" else None
    img_for_alt = element.find("img") if element_type in {"figure", "picture"} else element
    alt = ""
    if isinstance(img_for_alt, Tag):
        alt = img_for_alt.get("alt") or ""
    return {
        "figureUuid": str(uuid.uuid4()),
        "sourceFile": source_file,
        "elementType": element_type,
        "src": src or (f"inline-svg-sha256:{inline_hash}" if inline_hash else ""),
        "alt": alt if alt else "MISSING - needs description",
        "caption": figcaption.get_text(" ", strip=True) if figcaption else "",
        "surroundingContext": {
            "nearestHeading": nearest_heading(element),
            "nearestParagraph": nearest_paragraph(element),
        },
        "position": position,
    }


def extract_figures(soup: BeautifulSoup, source_file: str) -> list[dict]:
    figures: list[dict] = []
    for index, element in enumerate(soup.find_all(["img", "figure", "svg", "picture"]), start=1):
        if element.name == "img" and element.find_parent(["figure", "picture"]):
            continue
        figures.append(figure_record(element, source_file, index))
    return figures


def extract_equations(raw_html: str, soup: BeautifulSoup) -> list[dict]:
    equations: list[dict] = []
    seen: set[str] = set()

    def add(raw_latex: str, position: int) -> None:
        cleaned = normalize_latex(raw_latex)
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            equations.append(
                {
                    "equationUuid": str(uuid.uuid4()),
                    "rawLatex": cleaned,
                    "position": position,
                }
            )

    selectors = [
        ".math",
        ".MathJax",
        ".MathJax_Display",
        ".equation",
        ".equation-block",
        "[data-tex]",
        "script[type='math/tex']",
        "script[type='math/tex; mode=display']",
        "math",
        "mjx-container",
    ]
    position = 1
    for element in soup.select(",".join(selectors)):
        tex = element.get("data-tex") or element.string or element.get_text(" ", strip=True)
        add(tex, position)
        position += 1

    latex_patterns = [
        r"\$\$(.+?)\$\$",
        r"\\\[(.+?)\\\]",
        r"\\\((.+?)\\\)",
        r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)",
    ]
    for pattern in latex_patterns:
        for match in re.finditer(pattern, raw_html, flags=re.DOTALL):
            add(match.group(1), position)
            position += 1
    return equations


def match_equation(raw_latex: str, dictionary: dict) -> dict:
    latex = normalize_latex(raw_latex)
    for entry in dictionary.get("equations", []):
        for pattern in entry.get("patterns", []):
            try:
                if re.search(pattern, latex, flags=re.IGNORECASE):
                    return {
                        "matched": True,
                        "equationId": entry.get("equationId", ""),
                        "title": entry.get("title", ""),
                        "narrative": entry.get("narrative", ""),
                        "summary": entry.get("summary", ""),
                        "lawMapping": entry.get("lawMapping", entry.get("law", "")),
                    }
            except re.error:
                continue
    return {
        "matched": False,
        "equationId": "",
        "title": "UNMATCHED - needs dictionary entry",
        "narrative": "UNMATCHED - needs dictionary entry",
        "summary": "UNMATCHED - needs dictionary entry",
        "lawMapping": "",
    }


def enrich_equations(equations: list[dict], dictionary: dict, source_file: str) -> list[dict]:
    enriched: list[dict] = []
    for equation in equations:
        match = match_equation(equation["rawLatex"], dictionary)
        enriched.append({**equation, "sourceFile": source_file, **match})
    return enriched


def render_math_appendix(title: str, source_file: str, equations: list[dict]) -> str:
    toc = "\n".join(
        f'<li><a href="#eq-{idx}">{idx}. {html.escape(eq.get("title") or "Equation")}</a></li>'
        for idx, eq in enumerate(equations, start=1)
    )
    blocks = []
    for idx, eq in enumerate(equations, start=1):
        badge = '<span class="badge unmatched">UNMATCHED</span>' if not eq.get("matched") else '<span class="badge matched">MATCHED</span>'
        law = f"<p><strong>Law mapping:</strong> {html.escape(str(eq.get('lawMapping') or 'Not specified'))}</p>"
        blocks.append(
            f"""
            <section class="equation-card" id="eq-{idx}">
              <div class="card-header"><h2>{idx}. {html.escape(eq.get('title') or 'Equation')}</h2>{badge}</div>
              <div class="math-display">\\[{html.escape(eq['rawLatex'])}\\]</div>
              <p><strong>English translation:</strong> {html.escape(eq.get('narrative') or '')}</p>
              <p><strong>Summary:</strong> {html.escape(eq.get('summary') or '')}</p>
              {law}
              <p class="meta">Equation UUID: {html.escape(eq['equationUuid'])}</p>
            </section>
            """
        )
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)} - Math Appendix</title>
  <script src="{MATHJAX_CDN}" async></script>
  <style>
    body {{ background: #08080c; color: #b8bcc6; font-family: Inter, Segoe UI, sans-serif; margin: 0; padding: 32px; }}
    main {{ max-width: 980px; margin: 0 auto; }}
    h1, h2 {{ color: #f4f0e8; }}
    a {{ color: #e8a912; }}
    .source, .meta {{ color: #7f8491; font-size: 0.9rem; }}
    .equation-card {{ border: 1px solid rgba(232, 169, 18, 0.28); border-radius: 18px; padding: 22px; margin: 18px 0; background: rgba(255,255,255,0.035); }}
    .card-header {{ display: flex; justify-content: space-between; gap: 16px; align-items: center; }}
    .badge {{ border-radius: 999px; padding: 4px 10px; font-size: 0.75rem; letter-spacing: 0.08em; }}
    .matched {{ color: #0f1b12; background: #9be28f; }}
    .unmatched {{ color: #1e1200; background: #e8a912; }}
    .math-display {{ color: #f4f0e8; overflow-x: auto; padding: 12px 0; }}
  </style>
</head>
<body>
<main>
  <h1>{html.escape(title)} - Math Appendix</h1>
  <p class="source">Source: {html.escape(source_file)}</p>
  <h2>Table of Contents</h2>
  <ol>{toc}</ol>
  {''.join(blocks)}
</main>
</body>
</html>
"""


def collect_inputs(input_path: str | None, scan_path: str | None) -> list[Path]:
    if not input_path and not scan_path:
        raise SystemExit("Provide --input <file> or --scan <folder>.")
    paths: list[Path] = []
    if input_path:
        path = Path(input_path).expanduser().resolve()
        if not path.exists() or not path.is_file():
            raise SystemExit(f"Input file not found: {path}")
        paths.append(path)
    if scan_path:
        folder = Path(scan_path).expanduser().resolve()
        if not folder.exists() or not folder.is_dir():
            raise SystemExit(f"Scan folder not found: {folder}")
        paths.extend(
            sorted(path for path in folder.rglob("*") if path.suffix.lower() in SUPPORTED_EXTENSIONS)
        )
    return paths


def process_file(path: Path, output_dir: Path, dictionary: dict) -> dict:
    raw = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(raw, "lxml")
    title = extract_title(soup, path)
    slug = slugify(title)
    output_dir.mkdir(parents=True, exist_ok=True)

    figures = extract_figures(soup, str(path))
    equations = enrich_equations(extract_equations(raw, soup), dictionary, str(path))

    figures_path = output_dir / f"{slug}-figures.json"
    math_catalog_path = output_dir / f"{slug}-math-catalog.json"
    appendix_path = output_dir / f"{slug}-math-appendix.html"

    figures_path.write_text(json.dumps(figures, ensure_ascii=False, indent=2), encoding="utf-8")
    math_catalog_path.write_text(json.dumps(equations, ensure_ascii=False, indent=2), encoding="utf-8")
    appendix_path.write_text(render_math_appendix(title, str(path), equations), encoding="utf-8")

    return {
        "sourceFile": str(path),
        "title": title,
        "figureCount": len(figures),
        "equationCount": len(equations),
        "outputs": [str(figures_path), str(math_catalog_path), str(appendix_path)],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract figure catalogs and math appendices from HTML papers.")
    parser.add_argument("--input", help="Single HTML file to process.")
    parser.add_argument("--scan", help="Folder of HTML files to process recursively.")
    parser.add_argument("--output-dir", default="workflow_output/extracted/", help="Output directory.")
    parser.add_argument("--dictionary", default="src/dictionaries/theophysics.json", help="Theophysics dictionary JSON path.")
    return parser.parse_args(list(argv))


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    dictionary = load_dictionary(Path(args.dictionary).resolve())
    output_dir = Path(args.output_dir).resolve()
    results = [process_file(path, output_dir, dictionary) for path in collect_inputs(args.input, args.scan)]
    print(json.dumps({"processed": len(results), "documents": results}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

