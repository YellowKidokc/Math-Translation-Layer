# MTL GTQ Fix Report

## What changed
- Added workbook exporter script (`scripts/export-workbook-dictionary.py`) to regenerate runtime dictionary JSON from workbook sheet `MATH_TRANSLATION_MASTER`.
- Improved HTML extraction to prefer `article.story`/article/main and strip chrome/sidebar elements.
- Improved equation normalization/deduplication to collapse bracket wrappers and equivalent forms.
- Added Station 04 claim typing and wired it into `pipeline/run.py` before Station 08.
- Added Station 11 exports including real `11_paper_grade.xlsx`.
- Added GTQ-shaped fixture and smoke-oriented tests.

## What still fails
- Workbook path in local Windows location is not available in this Linux CI/container; run exporter locally with `--workbook` path.
- Station 14 unmatched equation report is currently minimal placeholder.

## Workbook authority
- Runtime dictionary can now be regenerated from the merged workbook using exporter output JSON.

## Regenerate dictionary JSON
```bash
python scripts/export-workbook-dictionary.py --workbook /path/to/MATH_TRANSLATION_TABLE_MERGED_MASTER_2026-05-24.xlsx --output src/dictionaries/theophysics.json --report workflow_output/workbook_export_report.json
```

## Run GTQ smoke test
```bash
python -m pytest tests/test_rewrite_layer.py tests/test_extract_figures_math.py pipeline/tests -v
python -m pipeline.run --input tests/fixtures/gtq-shaped.html --stations 00,03,04,05,06,07,08,09,10,11,12,13,14
```
