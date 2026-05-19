#!/usr/bin/env python3
"""Rewrite layer for Theophysics HTML papers.

Generates three audience-specific outputs per paper plus metadata sidecar.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Tuple

from bs4 import BeautifulSoup


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT_DIR / "workflow_output" / "rewrite"
TEMPLATE_DIR = ROOT_DIR / "templates"
TEMPLATE_MAP = {
    "summary": "summary-prompt.txt",
    "college": "college-prompt.txt",
    "doctorate": "doctorate-prompt.txt",
}


@dataclass
class PaperContent:
    title: str
    body_text: str
    equations: List[str]


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return slug or "untitled-paper"


def extract_equations(soup: BeautifulSoup) -> List[str]:
    equations: List[str] = []

    selectors = [
        ".MathJax", "script[type='math/tex']", "script[type='math/tex; mode=display']",
        "span.math", "div.math", "math", "mjx-container",
    ]
    for selector in selectors:
        for node in soup.select(selector):
            text = " ".join(node.get_text(" ", strip=True).split())
            if text:
                equations.append(text)

    raw_text = soup.get_text("\n")
    for match in re.findall(r"\$\$(.+?)\$\$", raw_text, flags=re.DOTALL):
        cleaned = " ".join(match.split())
        if cleaned:
            equations.append(cleaned)
    for match in re.findall(r"\\\[(.+?)\\\]", raw_text, flags=re.DOTALL):
        cleaned = " ".join(match.split())
        if cleaned:
            equations.append(cleaned)

    deduped = []
    seen = set()
    for eq in equations:
        if eq not in seen:
            seen.add(eq)
            deduped.append(eq)
    return deduped


def parse_html(path: Path) -> PaperContent:
    html = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "lxml")

    title_node = soup.find("title") or soup.find("h1")
    title = title_node.get_text(strip=True) if title_node else path.stem

    paragraphs = [" ".join(p.get_text(" ", strip=True).split()) for p in soup.find_all("p")]
    paragraphs = [p for p in paragraphs if p]
    body_text = "\n\n".join(paragraphs)

    equations = extract_equations(soup)

    return PaperContent(title=title, body_text=body_text, equations=equations)


def load_template(name: str) -> str:
    template_path = TEMPLATE_DIR / TEMPLATE_MAP[name]
    return template_path.read_text(encoding="utf-8")


def fill_template(template: str, content: PaperContent) -> str:
    equation_list = "\n".join(f"- {eq}" for eq in content.equations) if content.equations else "- None"
    return (
        template.replace("{{TITLE}}", content.title)
        .replace("{{BODY_TEXT}}", content.body_text)
        .replace("{{EQUATION_LIST}}", equation_list)
    )


def generate_with_api(prompt: str, model: str) -> str:
    from openai import OpenAI

    client = OpenAI()
    response = client.responses.create(
        model=model,
        input=prompt,
    )
    return response.output_text.strip()


def discover_inputs(single_input: str | None, scan_dir: str | None) -> List[Path]:
    if bool(single_input) == bool(scan_dir):
        raise ValueError("Provide exactly one of --input or --scan")

    if single_input:
        path = Path(single_input)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"Input file not found: {single_input}")
        return [path]

    base = Path(scan_dir)  # type: ignore[arg-type]
    if not base.exists() or not base.is_dir():
        raise FileNotFoundError(f"Scan directory not found: {scan_dir}")
    return sorted([p for p in base.iterdir() if p.is_file() and p.suffix.lower() in {".html", ".htm"}])


def write_outputs_for_paper(source_path: Path, output_dir: Path, use_api: bool, model: str | None) -> Tuple[List[str], Path]:
    content = parse_html(source_path)
    slug = slugify(source_path.stem)
    output_files: List[str] = []

    for level in ["summary", "college", "doctorate"]:
        template = load_template(level)
        filled = fill_template(template, content)
        suffix = "md" if use_api else "txt"
        output_path = output_dir / f"{slug}-{level}.{suffix}"

        if use_api:
            if not model:
                raise ValueError("--model is required when --api is used")
            result = generate_with_api(filled, model)
            output_path.write_text(result + "\n", encoding="utf-8")
        else:
            output_path.write_text(filled + "\n", encoding="utf-8")

        output_files.append(str(output_path))

    meta = {
        "documentUuid": str(uuid.uuid4()),
        "sourceFile": str(source_path),
        "extractedTitle": content.title,
        "equationCount": len(content.equations),
        "wordCount": len(content.body_text.split()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "outputFiles": output_files,
    }
    meta_path = output_dir / f"{slug}-meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return output_files, meta_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate rewrite-layer outputs from Theophysics HTML papers.")
    parser.add_argument("--input", help="Single HTML file to process")
    parser.add_argument("--scan", help="Directory containing HTML files to process")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output directory")
    parser.add_argument("--api", action="store_true", help="Generate rewrites via OpenAI API")
    parser.add_argument("--model", help="Model name for --api mode")

    args = parser.parse_args()
    inputs = discover_inputs(args.input, args.scan)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for input_path in inputs:
        write_outputs_for_paper(input_path, output_dir, args.api, args.model)

    print(f"Processed {len(inputs)} file(s) into {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
