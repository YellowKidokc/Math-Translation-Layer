from __future__ import annotations
import csv,json,zipfile
from xml.sax.saxutils import escape
from pipeline.stations.common import paper_output_dir, read_json

def write_simple_xlsx(path, headers, row):
 sheet_rows=[headers,row]
 sheet_xml=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
 for r,vals in enumerate(sheet_rows,1):
  sheet_xml.append(f'<row r="{r}">')
  for c,v in enumerate(vals,1):
   col=chr(64+c); sheet_xml.append(f'<c r="{col}{r}" t="inlineStr"><is><t>{escape(str(v))}</t></is></c>')
  sheet_xml.append('</row>')
 sheet_xml.append('</sheetData></worksheet>')
 with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
  z.writestr('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  z.writestr('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="paper_grade" sheetId="1" r:id="rId1"/></sheets></workbook>')
  z.writestr('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
  z.writestr('xl/worksheets/sheet1.xml',''.join(sheet_xml))

def run(paper_uuid:str)->dict:
 outdir=paper_output_dir(paper_uuid); score=read_json(outdir/'10_score.json'); objections=read_json(outdir/'09_objections.json')['objections']
 report={'paper_uuid':paper_uuid,'score':score['paper_score'],'objection_count':len(objections)}
 (outdir/'11_paper_grade.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
 (outdir/'11_paper_grade.md').write_text(f"# Paper Grade\n\nScore: {report['score']}\n",encoding='utf-8')
 (outdir/'11_paper_grade.html').write_text(f"<h1>Paper Grade</h1><p>Score: {report['score']}</p>",encoding='utf-8')
 with (outdir/'11_paper_grade.csv').open('w',newline='',encoding='utf-8') as f: csv.writer(f).writerows([['paper_uuid','score','objection_count'],[paper_uuid,report['score'],report['objection_count']]])
 write_simple_xlsx(outdir/'11_paper_grade.xlsx',['paper_uuid','score','objection_count'],[paper_uuid,report['score'],report['objection_count']])
 return report
