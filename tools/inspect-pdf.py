"""Render index / contact sheets and structural checks for the offline PDF."""
from pathlib import Path
import json,re,unicodedata,hashlib
from pypdf import PdfReader
import pdfplumber
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'output/pdf-qa';out.mkdir(parents=True,exist_ok=True)
pdf=ROOT/'dist/downloads/ai-workflow-handbook.pdf';reader=PdfReader(pdf)
pageinfo=[];links=[];outliers=[];alltext=[];javascript_actions=[]
with pdfplumber.open(pdf) as doc:
    for i,page in enumerate(doc.pages):
        text=page.extract_text() or '';alltext.append(text)
        lines=text.splitlines();pageinfo.append({'page':i+1,'characters':len(text),'first_lines':lines[:5],'last_lines':lines[-3:]})
        for c in page.chars:
            if c['x0']<15 or c['x1']>page.width-15 or c['top']<10 or c['bottom']>page.height-10:
                outliers.append({'page':i+1,'char':c['text'],'x0':round(c['x0'],2),'x1':round(c['x1'],2),'top':round(c['top'],2),'bottom':round(c['bottom'],2)})
for i,page in enumerate(reader.pages):
    for a in page.get('/Annots',[]):
        a=a.get_object()
        if a.get('/Subtype')=='/Link':
            action=a.get('/A')
            links.append({'page':i+1,'uri':str(action.get('/URI')) if action and action.get('/URI') else None,'destination':str(a.get('/Dest') or (action or {}).get('/D'))})
        if a.get('/A') and a['/A'].get('/S')=='/JavaScript':javascript_actions.append(i+1)
joined='\n'.join(alltext)
(out/'extracted-text.txt').write_text(joined,encoding='utf8')
(out/'page-index.json').write_text(json.dumps(pageinfo,ensure_ascii=False,indent=2),encoding='utf8')
root=reader.trailer['/Root'];open_action=root.get('/OpenAction');names=root.get('/Names',{})
has_js=bool(javascript_actions or names.get('/JavaScript') or (hasattr(open_action,'get') and open_action.get('/S')=='/JavaScript'))
norm=lambda t:re.sub(r'[\W_]+','',unicodedata.normalize('NFKC',str(t)))
normal=norm(joined);course=json.loads((ROOT/'content/course.json').read_text(encoding='utf-8-sig'))
answers=[{'module':m['id'],'exercise':i+1,'present':norm(q['answer']) in normal} for m in course['modules'] for i,q in enumerate(m.get('exercises',[]))]
quiz=[{'module':m['id'],'question':i+1,'present':norm(q['explanation']) in normal} for m in course['modules'] for i,q in enumerate(m.get('quiz',[]))]
sources=[{'id':s['id'],'present':norm(s['title']) in normal} for s in course['sources']]
report={'pages':len(reader.pages),'bytes':pdf.stat().st_size,'page_size':'A4','text_characters':len(joined),'answer_headings':joined.count('参考答案'),'rubric_headings':joined.count('自评量表'),'external_links':len([x for x in links if x['uri']]),'internal_links':len([x for x in links if not x['uri']]),'named_destinations':len(reader.named_destinations),'near_edge_characters':outliers,'replacement_character_count':joined.count('\ufffd'),'javascript':has_js,'open_action':'page /Fit view, not JavaScript','empty_pages':[p['page'] for p in pageinfo if p['characters']==0],'cover_characters':pageinfo[0]['characters'],'open_answers':answers,'quiz_explanations':quiz,'source_titles':sources,'pdf_sha256':hashlib.sha256(pdf.read_bytes()).hexdigest()}
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
(out/'links.json').write_text(json.dumps(links,ensure_ascii=False,indent=2),encoding='utf8')
imgs=sorted((out/'pages').glob('page-*.png'))[:len(reader.pages)]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
for offset in range(0,len(imgs),12):
    group=imgs[offset:offset+12];sheet=Image.new('RGB',(1400,3*530),'#dfe5e9');draw=ImageDraw.Draw(sheet)
    for j,p in enumerate(group):
        im=Image.open(p).convert('RGB');im.thumbnail((330,480))
        x=(j%4)*350+10;y=(j//4)*530+36
        sheet.paste(im,(x,y));draw.text((x,y-28),f'Page {offset+j+1}',font=font,fill='#25323e')
    sheet.save(out/f'contact-{offset//12+1:02d}.jpg',quality=90)
print(json.dumps(report,ensure_ascii=False,indent=2))
