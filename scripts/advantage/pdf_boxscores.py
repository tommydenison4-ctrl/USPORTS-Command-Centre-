"""Import official PDF gamebooks without substituting inferred player statistics.
Usage: python pdf_boxscores.py GAME_ID SOURCE_URL SAVED_PDF
Requires pdfplumber. Retains all published pages and validates individual yardage.
"""
import json,re,sys
from pathlib import Path
import pdfplumber
ROOT=Path(__file__).resolve().parents[2]
def extract(game_id,url,path):
    schedule=json.loads((ROOT/'data/national-schedule-usports.json').read_text())['games']
    g=next(g for g in schedule if g['id']==game_id)
    ids=[re.sub(r'[^a-z0-9]','',g[s].lower()) for s in ('away','home')]
    r={'id':game_id,'date':g['date'],'source':url,'teams':{},'teamTotals':{},'tables':[],'pages':[]}
    with pdfplumber.open(path) as pdf:
        for p in pdf.pages:
            text=p.extract_text() or '';r['pages'].append(text)
            for cat,label in [('passing','NET YARDS PASSING'),('rushing','NET YARDS RUSHING')]:
                m=re.search(r'^(\d+) '+label+r' (\d+)$',text,re.M)
                if m:
                    for id,y in zip(ids,m.groups()):r['teamTotals'].setdefault(id,{})[cat]=int(y)
            m=re.search(r'^(\d+) Total Offensive Plays (\d+)$',text,re.M)
            if m:
                for id,n in zip(ids,m.groups()):r['teamTotals'].setdefault(id,{})['plays']=int(n)
            if 'PASSING C-A YDS' not in text:continue
            for side,id in enumerate(ids):
                half=p.crop((side*p.width/2,0,(side+1)*p.width/2,p.height)).extract_text() or ''
                cat=None;rows={};sums={}
                for line in half.splitlines():
                    header=re.search(r'\b(PASSING|RUSHING|RECEIVING) (?:C-A|ATT|NO) YDS',line)
                    if header:
                        cat=header[1].lower();rows[cat]=[];sums[cat]=0;continue
                    if re.match(r'^[A-Z][A-Z ]+ (?:NO|FG)',line):cat=None
                    if not cat:continue
                    # Six terminal numeric fields for passing, five for rush/receive.
                    n=5;parts=line.rsplit(' ',n)
                    if len(parts)!=n+1:continue
                    name=parts[0];vals=parts[1:]
                    try:y=int(vals[1]);td=int(vals[3] if cat=='passing' else vals[4]);ints=int(vals[4]) if cat=='passing' else None
                    except ValueError:continue
                    sums[cat]+=y
                    if name.lower()!='team':rows[cat].append({'name':name,'yards':y,'touchdowns':td,'interceptions':ints})
                for category,players in rows.items():
                    expected=r['teamTotals'].get(id,{}).get('passing' if category=='receiving' else category)
                    if players and sums[category]==expected:r['teams'].setdefault(id,{})[category]=players
    if set(r['teamTotals'])!=set(ids) or not all('passing' in r['teams'].get(id,{}) and 'rushing' in r['teams'].get(id,{}) for id in ids):raise ValueError('PDF yardage reconciliation failed')
    # The national composite remains authoritative for game identity and final score.
    target=ROOT/'data/official-pdf-boxscores.json'
    records=json.loads(target.read_text()) if target.exists() else []
    records=[old for old in records if old['id']!=game_id]+[r]
    target.write_text(json.dumps(records,ensure_ascii=False))
    print('Validated PDF:',game_id)
if __name__=='__main__':extract(*sys.argv[1:])
