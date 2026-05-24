#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
FIELDS=["equation","tts_short","tts_audio","review_flag","symbol","tts_word","context_note","use_when"]
def norm(s): return re.sub(r"\s+"," ",str(s or "")).strip()
def col_i(ref):
 m=re.match(r'([A-Z]+)',ref); n=0
 for ch in m.group(1): n=n*26+ord(ch)-64
 return n-1
def parse_xlsx(path,sheet_name):
 z=zipfile.ZipFile(path)
 shared=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  r=ET.fromstring(z.read('xl/sharedStrings.xml'))
  shared=[''.join(t.text or '' for t in si.iter(f'{NS}t')) for si in r.findall(f'{NS}si')]
 wb=ET.fromstring(z.read('xl/workbook.xml'))
 rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
 rel_map={r.attrib['Id']:r.attrib['Target'] for r in rels}
 target=None
 for s in wb.findall(f'.//{NS}sheet'):
  if s.attrib.get('name')==sheet_name: target='xl/'+rel_map[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]; break
 if not target: raise SystemExit(f'Sheet not found: {sheet_name}')
 ws=ET.fromstring(z.read(target)); rows=[]
 for row in ws.findall(f'.//{NS}row'):
  vals={}
  for c in row.findall(f'{NS}c'):
   i=col_i(c.attrib['r']); t=c.attrib.get('t'); v=c.find(f'{NS}v'); isel=c.find(f'{NS}is/{NS}t')
   text=(shared[int(v.text)] if (t=='s' and v is not None) else (isel.text if isel is not None else (v.text if v is not None else '')))
   vals[i]=text
  if vals: rows.append(vals)
 return rows

def main():
 a=argparse.ArgumentParser();a.add_argument('--workbook',required=True);a.add_argument('--sheet',default='MATH_TRANSLATION_MASTER');a.add_argument('--output',default='src/dictionaries/theophysics.json');a.add_argument('--report',default='workflow_output/workbook_export_report.json');args=a.parse_args()
 rows=parse_xlsx(args.workbook,args.sheet); headers=[norm(rows[0].get(i,'')).lower() for i in range(max(rows[0])+1)]; idx={h:i for i,h in enumerate(headers)}
 missing=[f for f in FIELDS if f not in idx]; out=[];dup=[];mal=[];sus=[];seen={}
 for rnum,row in enumerate(rows[1:],start=2):
  rec={f:norm(row.get(idx.get(f,-1),'')) for f in FIELDS}
  if not rec['equation']: mal.append({'row':rnum,'reason':'missing equation'}); continue
  if rec['equation'] in seen: dup.append({'row':rnum,'equation':rec['equation'],'first_row':seen[rec['equation']]}); continue
  seen[rec['equation']]=rnum
  if any(ord(ch)>127 for ch in rec['equation']): sus.append({'row':rnum,'equation':rec['equation']})
  out.append(rec)
 Path(args.output).write_text(json.dumps({'source':'workbook','sheet':args.sheet,'fields':FIELDS,'rows':out},ensure_ascii=False,indent=2),encoding='utf-8')
 rep={'missing_columns':missing,'duplicate_rows':dup,'malformed_rows':mal,'encoding_suspicious':sus,'exported_rows':len(out)}
 Path(args.report).parent.mkdir(parents=True,exist_ok=True);Path(args.report).write_text(json.dumps(rep,indent=2),encoding='utf-8');print(json.dumps(rep,indent=2))
if __name__=='__main__': main()
