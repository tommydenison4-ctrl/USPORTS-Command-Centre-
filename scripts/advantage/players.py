"""Extract complete 2026 Sidearm and Presto individual tables; retain source and game date."""
import json, re, os, hashlib, datetime
from pathlib import Path
from bs4 import BeautifulSoup
import ingest, train, national
ROOT=Path(__file__).resolve().parents[2]
def presto_players(soup,g):
    record={'id':g['id'],'date':g['date'][:10],'source':g['source'],'teams':{},'teamTotals':{},'tables':[]}
    totals={}
    for tr in soup.select('tr'):
        cells=tr.find_all('td',recursive=False)
        if len(cells)!=3:continue
        label=cells[1].get_text(' ',strip=True).upper()
        category='passing' if label=='NET YARDS PASSING' else 'rushing' if label=='NET YARDS RUSHING' else None
        if category:
            vals=[c.get_text(strip=True) for c in (cells[0],cells[2])]
            if all(re.fullmatch(r'-?\d+',v) for v in vals):totals[category]=list(map(int,vals))
    for category,values in totals.items():
        for side,yards in zip(('away','home'),values):record['teamTotals'].setdefault(g[side]['id'],{})[category]=yards
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
            if rows and (not expected or category=='receiving' or team_yards==expected[side_index]):
                record['teams'].setdefault(g[side]['id'],{})[category]=rows
                record['teamTotals'].setdefault(g[side]['id'],{})[category]=team_yards
    return record

def build():
    source=json.loads(Path(__file__).with_name('usports-history.json').read_text())
    games=[];unresolved=[]
    for indexed in source['schedule']:
        if indexed.get('status')!='final' or indexed['date']>train.ASOF:continue
        if not indexed.get('boxscore'):
            unresolved.append(indexed['id'])
            continue
        g=national.history_game(indexed)
        g['source']=indexed['boxscore']
        games.append(g)
    previous_path=ROOT/'data/player-leaders-usports.json'
    previous=json.loads(previous_path.read_text()) if previous_path.exists() else {'games':[]}
    saved={(r['date'],r['source']):r for r in previous['games']}
    saved_by_id={r['id']:r for r in previous['games'] if r.get('id')}
    out=[]; errors=[]
    for indexed in source['schedule']:
        retained=saved_by_id.get(indexed.get('id'))
        if indexed.get('status')=='final' and not indexed.get('boxscore') and retained and all(retained.get(side+'Score')==indexed[side+'Score'] for side in ('away','home')):
            out.append(retained)
    for g in games:
        retained=saved_by_id.get(g['id'])
        if retained and retained.get('date')==g['date'][:10] and all(retained.get(side+'Score')==g[side]['score'] for side in ('away','home')):
            out.append(retained)
            continue
        try:
            soup=BeautifulSoup(ingest.fetch(g['source']),'html.parser')
            if '/boxscores/' in g['source']:
                names=[national.team(n.get_text(' ',strip=True)) for n in soup.select('.stats-header')]
                ids=[national.norm(t['slug']) for t in names if t]
                if ids[:2]!=[g['away']['id'],g['home']['id']]:raise ValueError('Box score participants do not match index')
            record=presto_players(soup,g) if '/boxscores/' in g['source'] else {'id':g['id'],'date':g['date'][:10],'source':g['source'],'teams':{},'teamTotals':{},'tables':[]}
            for category in ['passing','rushing','receiving']:
                tables=soup.select('#individual-'+category+' table')
                if len(tables)!=2:continue
                for side,t in zip(['away','home'],tables):
                    headers=[re.sub(r'[^a-z]','',h.get_text().lower()) for h in t.select('thead th')]
                    field='net' if category=='rushing' else 'yds'
                    if field not in headers:continue
                    yi=headers.index(field); rows=[];team_yards=0
                    for tr in t.select('tbody tr'):
                        cells=tr.find_all(['td','th'],recursive=False)
                        if len(cells)<=yi:continue
                        name=cells[0].get_text(' ',strip=True); val=cells[yi].get_text(strip=True)
                        if name.lower() in ['totals','total'] or not re.fullmatch(r'-?\d+',val):continue
                        team_yards+=int(val)
                        if name.lower()=='team':continue
                        tdi=headers.index('td') if 'td' in headers else None
                        td=cells[tdi].get_text(strip=True) if tdi is not None and len(cells)>tdi else ''
                        rows.append({'name':name,'yards':int(val),'touchdowns':int(td) if td.isdigit() else None,'interceptions':int(cells[headers.index('int')].get_text(strip=True)) if category=='passing' and 'int' in headers and cells[headers.index('int')].get_text(strip=True).isdigit() else None})
                    totals=t.select('tfoot tr td')
                    if len(totals)<=yi or not re.fullmatch(r'-?\d+',totals[yi].get_text(strip=True)):continue
                    if team_yards!=int(totals[yi].get_text(strip=True)):continue
                    record['teamTotals'].setdefault(g[side]['id'],{})[category]=team_yards
                    record['teams'].setdefault(g[side]['id'],{})[category]=rows
            for tr in soup.select('tr'):
                cells=tr.find_all(['td','th'],recursive=False)
                if len(cells)!=3:continue
                key=cells[0].get('id','');label=cells[1].get_text(' ',strip=True).upper()
                values=None
                if key=='offense-plays':values=[cells[1].get_text(strip=True),cells[2].get_text(strip=True)]
                elif label.startswith('TOTAL OFFENSIVE PLAYS'):values=[cells[0].get_text(' ',strip=True).split()[0],cells[2].get_text(' ',strip=True).split()[0]]
                if values and all(v.isdigit() for v in values):
                    for side,v in zip(('away','home'),values):record['teamTotals'].setdefault(g[side]['id'],{})['plays']=int(v)
            # Preserve every published table, including defense, special teams and scoring.
            for table in soup.select('table'):
                if table.find('table'):continue
                rows=[[c.get_text(' ',strip=True) for c in tr.find_all(['td','th'],recursive=False)] for tr in table.select('tr')]
                rows=[r for r in rows if r]
                if not rows:continue
                title=table.find('caption') or table.find_previous(['h2','h3','h4'])
                record['tables'].append({'title':title.get_text(' ',strip=True) if title else 'Official box score','rows':rows})
            if record['teams']:out.append(record)
            elif g['id'] in saved_by_id:out.append(saved_by_id[g['id']])
        except Exception as e:
            errors.append({'source':g['source'],'error':str(e)})
            if g['id'] in saved_by_id:out.append(saved_by_id[g['id']])
    pdf_path=ROOT/'data/official-pdf-boxscores.json'
    for record in json.loads(pdf_path.read_text()) if pdf_path.exists() else []:
        out=[g for g in out if g.get('id')!=record['id']]+[record]
        unresolved=[id for id in unresolved if id!=record['id']]
    imported={g['id'] for g in out if g.get('id')}
    unresolved=sorted(g['id'] for g in source['schedule'] if g.get('status')=='final' and g['date']<=train.ASOF and g['id'] not in imported)
    boxes=ROOT/'data/boxscores';boxes.mkdir(exist_ok=True)
    compact=[]
    index_by_id={g['id']:g for g in source['schedule']}
    for record in out:
        indexed=index_by_id.get(record['id'])
        # Keep the published recent drive rows alongside the summary tables.
        if indexed and indexed.get('boxscore') and record['date']>=str(datetime.date.fromisoformat(train.ASOF)-datetime.timedelta(days=1)):
            cached=ingest.CACHE/(hashlib.sha256((indexed['boxscore']+'?view=plays').encode()).hexdigest()+'.txt')
            if cached.exists():
                if not record.get('tables') and record.get('fullBoxscore'):
                    full=ROOT/record['fullBoxscore']
                    if full.exists():record=json.loads(full.read_text())
                soup=BeautifulSoup(cached.read_text(),'html.parser')
                identities=[national.norm(t['slug']) for n in soup.select('.stats-header') if (t:=national.team(n.get_text(' ',strip=True)))]
                if identities[:2]==[national.norm(indexed['away']),national.norm(indexed['home'])]:
                    drive=None;drive_rows=[];drives=[]
                    for tr in soup.select('table tr'):
                        cells=tr.find_all(['td','th'],recursive=False)
                        values=[re.sub(r'\s+',' ',c.get_text(' ',strip=True)) for c in cells]
                        if not values:continue
                        if tr.find('th') and re.match(r'.+ at \d{1,2}:\d{2}$',values[0]):
                            if drive and drive_rows:drives.append({'title':'Drive · '+drive,'rows':[['Down & distance','Play']]+drive_rows})
                            drive=values[0];drive_rows=[]
                        elif drive and len(values)==2:drive_rows.append(values)
                    if drive and drive_rows:drives.append({'title':'Drive · '+drive,'rows':[['Down & distance','Play']]+drive_rows})
                    if drives:record['tables']=[t for t in record.get('tables',[]) if not t['title'].startswith('Drive · ')]+drives

        if indexed and indexed.get('status')=='final':
            record.update(away=indexed['away'],home=indexed['home'],awayScore=indexed['awayScore'],homeScore=indexed['homeScore'],final=True)
        if record.get('tables') or record.get('pages'):
            (boxes/(record['id']+'.json')).write_text(json.dumps(record))
            record['fullBoxscore']='data/boxscores/'+record['id']+'.json'
            record['format']='pdf' if record.get('pages') else 'html'
        compact.append({k:v for k,v in record.items() if k not in ('tables','pages')})
    out=compact
    data={'season':2026,'asOf':train.ASOF,'method':'Mean yards in available complete 2026 team box scores before kickoff; zero for absent category rows. Candidates must appear in the latest available game. Lineups are unconfirmed.','games':out,'errors':errors,'unresolvedGames':unresolved}
    (ROOT/'data/player-leaders-usports.json').write_text(json.dumps(data))
    (ROOT/'player-leaders-data.js').write_text('window.US_PLAYER_DATA='+json.dumps(data)+';\n')
    print('Player box scores:',len(out),'errors:',len(errors))
if __name__=='__main__':build()
