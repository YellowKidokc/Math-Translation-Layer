#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,os,re,sys,uuid
from dataclasses import dataclass
from datetime import datetime,timezone
from pathlib import Path
from typing import Iterable
from bs4 import BeautifulSoup,Tag
SUPPORTED_EXTENSIONS={'.html','.htm'}
TEMPLATE_NAMES={'summary':'summary-prompt.txt','college':'college-prompt.txt','doctorate':'doctorate-prompt.txt'}
@dataclass
class ExtractedDocument: source_file:str; title:str; body_text:str; equations:list[str]; word_count:int

def slugify(v:str)->str: return re.sub(r'[^a-zA-Z0-9]+','-',v.lower()).strip('-') or 'untitled-paper'
def read_text(p:Path)->str: return p.read_text(encoding='utf-8',errors='replace')
def extract_title(soup:BeautifulSoup,src:Path)->str:
 h1=soup.find('h1');
 return (h1.get_text(' ',strip=True) if h1 and h1.get_text(strip=True) else (soup.title.get_text(' ',strip=True) if soup.title and soup.title.get_text(strip=True) else src.stem.replace('-',' ').replace('_',' ').title()))

def normalize_eq(t:str)->str:
 t=re.sub(r'^\\\[(.*)\\\]$',r'\1',t.strip(),flags=re.DOTALL); t=re.sub(r'^\\\((.*)\\\)$',r'\1',t.strip(),flags=re.DOTALL)
 return re.sub(r'\s+',' ',t).strip()

def extract_equations(raw:str,soup:BeautifulSoup)->list[str]:
 eq=[]
 for el in soup.select('.math,.MathJax,.MathJax_Display,.equation,.equation-block,[data-tex],script[type="math/tex"],script[type="math/tex; mode=display"],math,mjx-container'):
  tex=el.get('data-tex') or el.string or el.get_text(' ',strip=True)
  if tex: eq.append(tex)
 for pat in [r'\$\$(.+?)\$\$',r'\\\[(.+?)\\\]',r'\\\((.+?)\\\)',r'(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)']:
  eq.extend(m.group(1) for m in re.finditer(pat,raw,flags=re.DOTALL))
 out=[];seen=set()
 for e in eq:
  c=normalize_eq(e)
  if c and c not in seen: seen.add(c); out.append(c)
 return out

def pick_container(soup:BeautifulSoup)->Tag:
 return soup.select_one('article.story') or soup.select_one('main article') or soup.find('article') or soup.find('main') or soup.body or soup

def extract_document(path:Path)->ExtractedDocument:
 raw=read_text(path); soup=BeautifulSoup(raw,'lxml'); equations=extract_equations(raw,soup); c=pick_container(soup)
 for sel in ['nav','header','footer','aside','script','style','noscript','audio','video','.audio-dock','.media-controls','.tab-controls','.sidebar','.chrome','.menu','.tabs','.controls']:
  [n.decompose() for n in c.select(sel)]
 title=extract_title(soup,path)
 blocks=[re.sub(r'\s+',' ',n.get_text(' ',strip=True)).strip() for n in c.find_all(['h2','h3','p','li','blockquote','figcaption'])]
 body='\n\n'.join(b for b in blocks if b) or re.sub(r'\s+',' ',c.get_text(' ',strip=True)).strip()
 return ExtractedDocument(str(path),title,body,equations,len(re.findall(r"\b[\w'-]+\b",body)))

def load_template(d:Path,n:str)->str:return (d/n).read_text(encoding='utf-8')
def fill_template(t:str,d:ExtractedDocument)->str:
 eq='\n'.join(f'- {e}' for e in d.equations) or '- None found'
 return t.replace('{{TITLE}}',d.title).replace('{{BODY_TEXT}}',d.body_text).replace('{{EQUATION_LIST}}',eq)
def collect_inputs(i:str|None,s:str|None)->list[Path]:
 if not i and not s: raise SystemExit('Provide --input <file> or --scan <folder>.')
 ps=[]
 if i: p=Path(i).expanduser().resolve(); ps.append(p)
 if s: ps.extend(sorted(p for p in Path(s).expanduser().resolve().rglob('*') if p.suffix.lower() in SUPPORTED_EXTENSIONS))
 return ps
def call_openai(prompt:str,model:str)->str:
 from openai import OpenAI
 if not os.getenv('OPENAI_API_KEY'): raise SystemExit('OPENAI_API_KEY is required when --api is used.')
 return OpenAI().responses.create(model=model,input=prompt).output_text

def process_document(d:ExtractedDocument,o:Path,t:Path,use_api:bool,m:str)->dict:
 slug=slugify(d.title); o.mkdir(parents=True,exist_ok=True); files=[]
 for voice,name in TEMPLATE_NAMES.items():
  prompt=fill_template(load_template(t,name),d); content=call_openai(prompt,m) if use_api else prompt; out=o/f'{slug}-{voice}{".md" if use_api else "-prompt.txt"}'
  out.write_text(content.strip()+'\n',encoding='utf-8'); files.append(str(out))
 meta={'documentUuid':str(uuid.uuid4()),'sourceFile':d.source_file,'extractedTitle':d.title,'equationCount':len(d.equations),'wordCount':d.word_count,'timestamp':datetime.now(timezone.utc).isoformat(),'outputFiles':files}
 (o/f'{slug}-meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8'); return meta

def parse_args(argv:Iterable[str])->argparse.Namespace:
 p=argparse.ArgumentParser(); p.add_argument('--input'); p.add_argument('--scan'); p.add_argument('--output-dir',default='workflow_output/rewrite/'); p.add_argument('--template-dir',default='templates'); p.add_argument('--api',action='store_true'); p.add_argument('--model',default='gpt-4.1-mini'); return p.parse_args(list(argv))
def main(argv:Iterable[str]|None=None)->int:
 a=parse_args(sys.argv[1:] if argv is None else argv); o=Path(a.output_dir).resolve(); t=Path(a.template_dir).resolve(); metas=[]
 for p in collect_inputs(a.input,a.scan): metas.append(process_document(extract_document(p),o,t,a.api,a.model))
 print(json.dumps({'processed':len(metas),'documents':metas},indent=2)); return 0
if __name__=='__main__': raise SystemExit(main())
