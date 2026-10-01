"""Extract complete 2026 Sidearm and Presto individual tables; retain source and game date."""
import json, re, os
from pathlib import Path
from bs4 import BeautifulSoup
import ingest, train
ROOT=Path(__file__).resolve().parents[2]
def presto_players(soup,g):
    record={'date':g['date'][:10],'source':g['source'],'teams':{}}
    totals={}
    for tr in soup.select('tr'):
        cells=tr.find_all('td',recursive=False)
        if len(cells)!=3:continue
        label=cells[1].get_text(' ',strip=True).upper()
        category='passing' if label=='NET YARDS PASSING' else 'rushing' if label=='NET YARDS RUSHING' else None
        if category:
            vals=[c.get_text(strip=True) for c in (cells[0],cells[2])]
            if all(re.fullmatch(r'-?\d+',v) for v in vals):totals[category]=list(map(int,vals))
    for category in ('passing','rushing','receiving'):
        tables=[]
        for table in soup.select('table'):
            if table.find('table'):continue
            headers=[h.get_text(' ',strip=True).lower() for h in table.select('th')]
            if headers and headers[0]==category and 'yds' in headers:tables.append((table,headers))
        if len(tables)!=2:continue
        for side_index,(side,(table,headers)) in enumerate(zip(('away','home'),tables)):
            rows=[];team_yards=0
            for tr in table.select('tr'):
                cells=tr.find_all('td',recursive=False)
                if len(cells)!=len(headers):continue
                values=[c.get_text(' ',strip=True) for c in cells];name=values[0]
                try:
                    yards=int(values[headers.index('yds')]);td=int(values[headers.index('td')]);ints=int(values[headers.index('int')]) if category=='passing' else None
                except (ValueError,IndexError):continue
                if name.lower() in ('total','totals'):continue
                team_yards+=yards
                if name.lower()=='team':continue
                rows.append(dict(name=name,yards=yards,touchdowns=td,interceptions=ints))
            expected=totals.get('passing' if category=='receiving' else category)
            if rows and expected and team_yards==expected[side_index]:record['teams'].setdefault(g[side]['id'],{})[category]=rows
    return record

def build():
    source=json.loads(Path(__file__).with_name('usports-history.json').read_text())
    games=train.clean(source['history'],'USPORTS'); out=[]; errors=[]
    for g in games:
        try:
            soup=BeautifulSoup(ingest.fetch(g['source']),'html.parser')
            record=presto_players(soup,g) if '/boxscores/' in g['source'] else {'date':g['date'][:10],'source':g['source'],'teams':{}}
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
                        tdi=headers.index('td') if 'td' in headers else None
                        td=cells[tdi].get_text(strip=True) if tdi is not None and len(cells)>tdi else ''
                        rows.append({'name':name,'yards':int(val),'touchdowns':int(td) if td.isdigit() else None,'interceptions':int(cells[headers.index('int')].get_text(strip=True)) if category=='passing' and 'int' in headers and cells[headers.index('int')].get_text(strip=True).isdigit() else None})
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
