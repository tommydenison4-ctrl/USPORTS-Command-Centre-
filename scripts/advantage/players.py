"""Extract complete 2026 Sidearm individual tables; retain source and game date."""
import json, re, os
from pathlib import Path
from bs4 import BeautifulSoup
import ingest, train
ROOT=Path(__file__).resolve().parents[2]
def build():
    source=json.loads(Path(__file__).with_name('usports-history.json').read_text())
    games=train.clean(source['history'],'USPORTS'); out=[]; errors=[]
    for g in games:
        try:
            soup=BeautifulSoup(ingest.fetch(g['source']),'html.parser')
            record={'date':g['date'][:10],'source':g['source'],'teams':{}}
            for category in ['passing','rushing','receiving']:
                tables=soup.select('#individual-'+category+' table')
                if len(tables)!=2:continue
                for side,t in zip(['away','home'],tables):
                    headers=[re.sub(r'[^a-z]','',h.get_text().lower()) for h in t.select('thead th')]
                    field='net' if category=='rushing' else 'yds'
                    if field not in headers:continue
                    yi=headers.index(field); rows=[]
                    for tr in t.select('tbody tr'):
                        cells=tr.find_all(['td','th'],recursive=False)
                        if len(cells)<=yi:continue
                        name=cells[0].get_text(' ',strip=True); val=cells[yi].get_text(strip=True)
                        if name.lower() in ['team','totals','total'] or not re.fullmatch(r'-?\d+',val):continue
                        rows.append({'name':name,'yards':int(val)})
                    totals=t.select('tfoot tr td')
                    if len(totals)<=yi or not re.fullmatch(r'-?\d+',totals[yi].get_text(strip=True)):continue
                    if sum(r['yards'] for r in rows)!=int(totals[yi].get_text(strip=True)):continue
                    record['teams'].setdefault(g[side]['id'],{})[category]=rows
            if record['teams']:out.append(record)
        except Exception as e:errors.append({'source':g['source'],'error':str(e)})
    data={'season':2026,'asOf':train.ASOF,'method':'Mean yards in available complete 2026 team box scores before kickoff; zero for absent category rows. Candidates must appear in the latest available game. Lineups are unconfirmed.','games':out,'errors':errors}
    (ROOT/'data/player-leaders-usports.json').write_text(json.dumps(data))
    (ROOT/'player-leaders-data.js').write_text('window.US_PLAYER_DATA='+json.dumps(data)+';\n')
    print('Player box scores:',len(out),'errors:',len(errors))
if __name__=='__main__':build()
