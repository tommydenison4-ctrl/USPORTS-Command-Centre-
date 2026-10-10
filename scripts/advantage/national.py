"""National composite index and Presto adapter; both feed the existing AWM schema."""
import copy, hashlib, json, re, unicodedata
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
COMPOSITE = 'https://en.usports.ca/sports/fball/composite'
TEAMS = json.loads((ROOT/'data/usports-teams.json').read_text())
def norm(value):
    return re.sub('[^a-z0-9]', '', unicodedata.normalize('NFKD', str(value)).encode('ascii','ignore').decode().lower())
ALIASES = {norm(t[k]): t for t in TEAMS for k in ('slug','short','name','abbr')}
for alias, slug in {'St. Francis Xavier':'stfx','St. Marys':'saint-marys','Mt. Allison':'mount-allison','UBC Thunderbirds':'ubc','Bishops University':'bishops','Universite de Montreal':'montreal'}.items():
    ALIASES[norm(alias)] = next(t for t in TEAMS if t['slug']==slug)
def team(value):
    key=norm(value)
    if key in ALIASES:return ALIASES[key]
    matches=[t for t in TEAMS if key.startswith(norm(t['short'])) or key.startswith(norm(t['slug']))]
    return matches[0] if len(matches)==1 else None

def parse_composite(html, date):
    soup=BeautifulSoup(html,'html.parser');games=[];unresolved=[]
    for event in soup.select('.event-row'):
        participants=event.select('.list-events-participants')
        if len(participants)!=2:continue
        names=[p.select_one('.team-name') for p in participants]
        if any(n is None for n in names):raise ValueError('Composite participant has no name')
        raw=[n.get('title') or re.sub(r'^(at|vs\.?)[\s]+','',n.get_text(' ',strip=True)) for n in names]
        teams=[team(n) for n in raw]
        if not all(teams):
            # Unassigned playoff opponents and the East/West showcase remain indexed,
            # but cannot acquire a fabricated university identity or forecast.
            known_placeholder=all(t or re.search(r'#|winner|champion|^Team (East|West)$',name,re.I) for t,name in zip(teams,raw))
            if not known_placeholder:raise ValueError('Unknown composite school: '+', '.join(raw))
            status_node=event.select_one('.cal-status')
            label=status_node.get_text(' ',strip=True) if status_node else ''
            event_key=hashlib.sha256(str(event).encode()).hexdigest()[:12]
            conf=next((c for c in ('OUA','RSEQ','AUS','CW') if any(c in name for name in raw)),'USPORTS')
            unresolved.append(dict(id=f'{date}-pending-{event_key}',league='USPORTS',date=date,away=raw[0],home=raw[1],teams=raw,conference=conf,status='pending',time=label,awayScore=None,homeScore=None,neutral=False,venue='',note='Participants not yet assigned to university teams',source=COMPOSITE+'?d='+date,boxscore=None,pendingParticipants=True));continue
        away,home=teams
        status=event.select_one('.cal-status');status=status.get_text(' ',strip=True) if status else ''
        final=bool(re.search(r'\bfinal\b',status,re.I))
        scores=[]
        for p in participants:
            score=p.select_one('.team-result');value=score.get_text(strip=True) if score else ''
            scores.append(int(value) if value.isdigit() else None)
        links=[urljoin(COMPOSITE,a['href']) for a in event.select('a[href]') if re.search(r'boxscores/|/boxscore/',a['href'])]
        note=event.select_one('.event-notes, .event-note, .event-location')
        games.append(dict(id=f"{date}-{away['slug']}-{home['slug']}",league='USPORTS',date=date,
            away=away['slug'],home=home['slug'],conference=home['conference'] if home['conference']==away['conference'] else 'USPORTS',
            time=status if not final else '',status='final' if final else 'cancelled' if re.search('cancel',status,re.I) else 'postponed' if re.search('postpon',status,re.I) else 'scheduled',
            awayScore=scores[0] if final else None,homeScore=scores[1] if final else None,
            neutral=bool(names[1].select_one('.va') and names[1].select_one('.va').get_text(strip=True).lower().startswith('vs')),
            exhibition='exhibition' in event.get('class',[]) or 'exhibition' in event.get_text(' ',strip=True).lower(),
            venue='',note=note.get_text(' ',strip=True) if note else '',source=COMPOSITE+'?d='+date,boxscore=links[0] if links else None,boxscores=links))
    return games,unresolved

def discover(fetch,batch,season):
    html=fetch(COMPOSITE)
    dates=set(re.findall(r'composite\\?d=('+str(season)+r'-\\d{2}-\\d{2})',html))
    # Landing-page links can lag behind recently completed dates.
    import datetime as dt
    import os
    today=dt.date.fromisoformat(os.environ.get('AWM_ASOF',dt.datetime.now(dt.timezone.utc).date().isoformat()))
    dates.update((today-dt.timedelta(days=offset)).isoformat() for offset in range(0,10)
                 if (today-dt.timedelta(days=offset)).year==season)
    dates=sorted(dates)
    if not dates:raise ValueError('National composite returned no season dates; retaining last verified schedule')
    # Retain previously verified dates if a single national composite page times out.
    # Fresh successful dates can still advance without discarding older verified results.
    pages=batch(lambda date:(date,parse_composite(fetch(COMPOSITE+'?d='+date),date)),dates)
    fetched={date:(rows,unknown) for date,(rows,unknown) in pages}
    missing=set(dates)-set(fetched)
    previous_path=ROOT/'data/national-schedule-usports.json'
    previous=json.loads(previous_path.read_text()) if previous_path.exists() else {}
    previous_dates={date for date in (g.get('date') for g in previous.get('games',[])) if date}
    if missing-previous_dates:
        raise ValueError('National composite missing unverified dates: '+', '.join(sorted(missing-previous_dates)))
    games={};unresolved=[]
    for date,(rows,unknown) in sorted(fetched.items()):
        for g in rows:games[g['id']]=g
        unresolved.extend(unknown)
    for g in previous.get('games',[]):
        if g.get('date') in missing:games[g['id']]=g
    unresolved.extend(g for g in previous.get('unresolved',[]) if g.get('date') in missing)
    if missing:print('Retained verified fallback dates:',', '.join(sorted(missing)),flush=True)
    conferences={g['conference'] for g in games.values()}
    if not {'OUA','RSEQ','AUS','CW'}<=conferences:raise ValueError('National composite is missing a conference')
    return sorted(games.values(),key=lambda g:(g['date'],g['id'])),unresolved

def history_game(g):
    out=copy.deepcopy(g)
    out['complete']=g['status']=='final'
    for side in ('away','home'):
        t=team(g[side]);out[side]={'id':norm(t['slug']),'name':t['short'],'short':t['short'],'abbr':t['abbr'],'score':g[side+'Score']}
    out['plays']=[]
    return out

def presto(g, fetch, text_play, metrics):
    out=history_game(g);url=g['boxscore']
    if not url or not all(isinstance(out[s]['score'],int) for s in ('away','home')):return None
    summary=BeautifulSoup(fetch(url),'html.parser')
    soup=BeautifulSoup(fetch(url+'?view=plays'),'html.parser')
    # Verify the gamebook identity before associating its plays with the index game.
    header=soup.select('.stats-header')
    names=[team(n.get_text(' ',strip=True)) for n in header]
    ids=[norm(t['slug']) for t in names if t]
    if ids[:2]!=[out['away']['id'],out['home']['id']]:return None
    possession=None;plays=[]
    for tr in soup.select('table tr'):
        th=tr.find('th');label=th.get_text(' ',strip=True) if th else ''
        match=re.match(r'(.+?) at \d{1,2}:\d{2}$',label)
        if match:
            t=team(match[1]);possession=norm(t['slug']) if t else None
            continue
        cells=tr.find_all('td',recursive=False)
        if len(cells)!=2 or possession not in ids[:2]:continue
        # Only actual down/distance rows, not drive summaries or scoring recaps.
        if not re.match(r'\s*[1-4](?:st|nd|rd|th)\s+and\s+',cells[0].get_text(' ',strip=True)):continue
        text=cells[1].get_text(' ',strip=True);p=text_play(text)
        if p:
            if 'fumble' in text.lower():p['turnover']=False # verified totals below; no invented recoveries
            p.update(id=str(len(plays)),team=possession);plays.append(p)
    out.update(plays=plays,source=url)
    ints=lost=None
    for tr in summary.select('tr'):
        cells=tr.find_all('td',recursive=False)
        if len(cells)!=3:continue
        label=cells[1].get_text(' ',strip=True).lower()
        if 'had' in label and 'intercepted' in label:ints=[re.findall(r'\d+',cells[i].get_text(' ',strip=True))[-1:] for i in (0,2)]
        if 'fumbles:' in label and 'lost' in label:lost=[re.findall(r'\d+',cells[i].get_text(' ',strip=True))[-1:] for i in (0,2)]
    for i,side in enumerate(('away','home')):
        out[side]['stats']=metrics([p for p in plays if p['team']==out[side]['id']])
        out[side]['verifiedTurnovers']=int(ints[i][0])+int(lost[i][0]) if ints and lost and all(ints+lost) else None
    return out

def save_schedule(games,unresolved,asof):
    payload={'source':COMPOSITE,'asOf':asof,'games':games,'unresolved':unresolved,'pendingGames':unresolved}
    (ROOT/'data/national-schedule-usports.json').write_text(json.dumps(payload,ensure_ascii=False))
    (ROOT/'data/advantage-schedule-usports.json').write_text(json.dumps(games,ensure_ascii=False))
    (ROOT/'national-schedule-data.js').write_text('window.US_NATIONAL_SCHEDULE='+json.dumps(payload,ensure_ascii=False).replace('<','\\u003c')+';\n')
