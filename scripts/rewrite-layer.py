#!/usr/bin/env python3
"""Generate dual-voice rewrite prompts or API rewrites for Theophysics HTML papers."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from bs4 import BeautifulSoup


SUPPORTED_EXTENSIONS = {".html", ".htm"}
TEMPLATE_NAMES = {
    "summary": "summary-prompt.txt",
    "college": "college-prompt.txt",
    "doctorate": "doctorate-prompt.txt",
}


@dataclass
class ExtractedDocument:
    source_file: str
    title: str
    body_text: str
    equations: list[str]
    word_count: int


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "untitled-paper"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def extract_title(soup: BeautifulSoup, source: Path) -> str:
    h1 = soup.find("h1")
    if h1 and h1.get_text(strip=True):
        return h1.get_text(" ", strip=True)
    if soup.title and soup.title.get_text(strip=True):
        return soup.title.get_text(" ", strip=True)
    return source.stem.replace("-", " ").replace("_", " ").title()


def extract_equations(raw_html: str, soup: BeautifulSoup) -> list[str]:
    equations: list[str] = []

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
    for element in soup.select(",".join(selectors)):
        tex = element.get("data-tex") or element.string or element.get_text(" ", strip=True)
        if tex:
            equations.append(tex)

    latex_patterns = [
        r"\$\$(.+?)\$\$",
        r"\\\[(.+?)\\\]",
        r"\\\((.+?)\\\)",
        r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)",
    ]
    for pattern in latex_patterns:
        for match in re.finditer(pattern, raw_html, flags=re.DOTALL):
            tex = re.sub(r"\s+", " ", match.group(1)).strip()
            if tex:
                equations.append(tex)

    deduped: list[str] = []
    seen: set[str] = set()
    for equation in equations:
        cleaned = re.sub(r"\s+", " ", equation).strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            deduped.append(cleaned)
    return deduped


def extract_document(path: Path) -> ExtractedDocument:
    raw = read_text(path)
    soup = BeautifulSoup(raw, "lxml")
    equations = extract_equations(raw, soup)
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()

    title = extract_title(soup, path)
    paragraphs = [
        re.sub(r"\s+", " ", paragraph.get_text(" ", strip=True)).strip()
        for paragraph in soup.find_all("p")
    ]
    body_text = "\n\n".join(paragraph for paragraph in paragraphs if paragraph)
    if not body_text:
        body_text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True)).strip()
    word_count = len(re.findall(r"\b[\w'-]+\b", body_text))
    return ExtractedDocument(
        source_file=str(path),
        title=title,
        body_text=body_text,
        equations=equations,
        word_count=word_count,
    )


def load_template(template_dir: Path, template_name: str) -> str:
    return (template_dir / template_name).read_text(encoding="utf-8")


def fill_template(template: str, document: ExtractedDocument) -> str:
    equation_list = "\n".join(f"- {equation}" for equation in document.equations) or "- None found"
    return (
        template.replace("{{TITLE}}", document.title)
        .replace("{{BODY_TEXT}}", document.body_text)
        .replace("{{EQUATION_LIST}}", equation_list)
    )


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


def call_openai(prompt: str, model: str) -> str:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise SystemExit("OpenAI package is not installed. Run pip install -r requirements.txt.") from exc
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required when --api is used.")
    client = OpenAI()
    response = client.responses.create(model=model, input=prompt)
    return response.output_text


def process_document(
    document: ExtractedDocument,
    output_dir: Path,
    template_dir: Path,
    use_api: bool,
    model: str,
) -> dict:
    slug = slugify(document.title)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_files: list[str] = []

    for voice, template_name in TEMPLATE_NAMES.items():
        template = load_template(template_dir, template_name)
        prompt = fill_template(template, document)
        if use_api:
            content = call_openai(prompt, model)
            output_path = output_dir / f"{slug}-{voice}.md"
        else:
            content = prompt
            output_path = output_dir / f"{slug}-{voice}-prompt.txt"
        output_path.write_text(content.strip() + "\n", encoding="utf-8")
        output_files.append(str(output_path))

    meta = {
        "documentUuid": str(uuid.uuid4()),
        "sourceFile": document.source_file,
        "extractedTitle": document.title,
        "equationCount": len(document.equations),
        "wordCount": document.word_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "outputFiles": output_files,
    }
    meta_path = output_dir / f"{slug}-meta.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate summary/college/doctorate rewrite prompts for HTML papers.")
    parser.add_argument("--input", help="Single HTML file to process.")
    parser.add_argument("--scan", help="Folder of HTML files to process recursively.")
    parser.add_argument("--output-dir", default="workflow_output/rewrite/", help="Output directory.")
    parser.add_argument("--template-dir", default="templates", help="Prompt template directory.")
    parser.add_argument("--api", action="store_true", help="Call OpenAI API and write generated Markdown.")
    parser.add_argument("--model", default="gpt-4.1-mini", help="OpenAI model when --api is used.")
    return parser.parse_args(list(argv))


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    output_dir = Path(args.output_dir).resolve()
    template_dir = Path(args.template_dir).resolve()
    if not template_dir.exists():
        raise SystemExit(f"Template directory not found: {template_dir}")
    metas = []
    for path in collect_inputs(args.input, args.scan):
        document = extract_document(path)
        metas.append(process_document(document, output_dir, template_dir, args.api, args.model))
    print(json.dumps({"processed": len(metas), "documents": metas}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())



