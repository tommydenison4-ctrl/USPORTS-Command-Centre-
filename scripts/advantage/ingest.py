import os
import argparse, concurrent.futures as cf, datetime as dt, hashlib, json, re, time,subprocess
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlencode
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup

BASE=Path(__file__).resolve().parent
CACHE=Path(os.environ.get('AWM_CACHE_DIR',str(BASE/'feed-cache'))); CACHE.mkdir(exist_ok=True)
import os,datetime
ASOF=os.environ.get('AWM_ASOF',datetime.datetime.now(datetime.timezone.utc).date().isoformat())
errors=[]
def fetch(url):
    path=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.txt')
    def valid(text):
        return bool(text.strip()) and 'awsWafCookieDomainList' not in text and 'AwsWafIntegration' not in text
    if path.exists() and path.stat().st_size>0 and ('/summary?' in url or '/boxscore/' in url or time.time()-path.stat().st_mtime<1800):
        cached=path.read_text(encoding='utf-8')
        if valid(cached):return cached
    for attempt in range(3):
        try:
            try:
                with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'text/html,application/json;q=0.9,*/*;q=0.8'}),timeout=25) as response:
                    text=response.read().decode('utf-8',errors='replace')
                if not valid(text):raise ValueError('Official response was empty or challenged')
            except Exception:
                if urlparse(url).hostname=='en.usports.ca':
                    relay='https://canufootball.com/api/national-source?'+urlencode({'path':urlparse(url).path+('?' + urlparse(url).query if urlparse(url).query else '')})
                    with urlopen(Request(relay,headers={'User-Agent':'National stats refresh'}),timeout=30) as response:
                        text=response.read().decode('utf-8',errors='replace')
                else:
                    text=subprocess.check_output(['curl','--fail','--location','--silent','--show-error','--max-time','25','--user-agent','Mozilla/5.0',url],stderr=subprocess.DEVNULL).decode('utf-8',errors='replace')
            if not valid(text):raise ValueError('Source returned an empty response or security challenge: '+url)
            path.write_text(text,encoding='utf-8');return text
        except Exception:
            if attempt==2:raise
            time.sleep(1+attempt)
def batch(fn, items):
    out=[]
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(fn,x):x for x in items}
        for f in cf.as_completed(jobs):
            try:
                v=f.result()
                if v is not None:out.append(v)
            except Exception as e:errors.append({'item':str(jobs[f]),'error':str(e)[:180]})
    return out
def metrics(plays):
    if not plays:return None
    ys=sorted(p['yards'] for p in plays);n=len(ys)
    return {'plays':n,'yards':sum(ys),'median':(ys[(n-1)//2]+ys[n//2])/2,
      'explosives':sum(p['yards']>=(20 if p['type']=='pass' else 15) for p in plays),
      'negatives':sum(p['yards']<=0 for p in plays),'turnovers':sum(p.get('turnover',False) for p in plays),
      'sacks':sum(p.get('sack',False) for p in plays),'passes':sum(p['type']=='pass' for p in plays)}
def text_play(text):
    low=text.lower()
    if re.search(r'no play|no-play|penalty|punt|kickoff|field goal|extra point|conversion|\bpat\b',low):return None
    typ='pass' if re.search(r'pass|sack|spike',low) else 'run' if re.search(r'rush|run for|kneel',low) else None
    if not typ:return None
    yard=re.search(r'(?:for|loss of|gain of)\s+(-?\d+)\s+yards?',low)
    if re.search(r'incomplete|intercept|no gain|spike',low):yards=0
    elif yard:yards=int(yard[1])*(-1 if ('loss of' in yard[0] or 'for loss' in low) else 1)
    else:return None
    return {'yards':yards,'type':typ,'sack':'sack' in low,'turnover':'intercept' in low or bool(re.search(r'fumble.*(?:lost|recovered by)',low))}
def espn_event(e,league):
    c=e['competitions'][0];s=c.get('status',e.get('status',{}))
    cs={x['homeAway']:x for x in c['competitors']}
    if not all(k in cs for k in ['away','home']):return None
    g={'id':e['id'],'league':league,'date':e['date'],'neutral':c.get('neutralSite',False),'complete':bool(s.get('type',{}).get('completed'))}
    for side in ['away','home']:
        x=cs[side];t=x['team'];g[side]={'id':str(t['id']),'name':t['displayName'],'short':t.get('location',t['displayName']),'abbr':t.get('abbreviation'),'logo':t.get('logo'),'score':float(x['score']) if g['complete'] else None}
    return g
def espn_summary(g):
    slug='nfl' if g['league']=='NFL' else 'college-football'
    url=f'https://site.api.espn.com/apis/site/v2/sports/football/{slug}/summary?event={g["id"]}'
    j=json.loads(fetch(url));g['source']=url
    cs=j.get('header',{}).get('competitions',[{}])[0].get('competitors',[])
    g['quarters']={side:[x.get('value') for x in next((c for c in cs if c.get('homeAway')==side),{}).get('linescores',[])[:4]] for side in ['away','home']}
    drives=j.get('drives',{}).get('previous',[])
    if j.get('drives',{}).get('current'):drives.append(j['drives']['current'])
    allplays=[];seen=set()
    for d in drives:
        for p in d.get('plays',[]):
            if p.get('id') in seen:continue
            seen.add(p.get('id'));label=p.get('type',{}).get('text','');text=p.get('text','')
            if re.search(r'kick|punt|field goal|extra point|conversion|penalty|timeout|end period|two-minute',label,re.I) or re.search(r'no play|penalty',text,re.I):continue
            typ='pass' if re.search(r'pass|sack|interception',label,re.I) else 'run' if re.search(r'rush|run|kneel',label,re.I) else None
            if not typ:continue
            y=p.get('statYardage')
            if not isinstance(y,(int,float)):continue
            tid=str(p.get('start',{}).get('team',{}).get('id') or d.get('team',{}).get('id',''))
            if tid not in [g['away']['id'],g['home']['id']]:continue
            # Interception return yards do not count as offensive production.
            if re.search(r'incomplete|interception',label,re.I):y=0
            q=p.get('period',{}).get('number',0);clock=p.get('clock',{}).get('displayValue','0:00')
            parts=clock.split(':');sec=int(parts[0])*60+int(parts[-1]) if len(parts)==2 else 0
            allplays.append({'id':str(p['id']),'team':tid,'type':typ,'yards':y,'turnover':bool(p.get('isTurnover')) and bool(re.search(r'intercept|fumble',text,re.I)), 'sack':bool(re.search(r'sack',label,re.I)), 'q':q,'remaining':max(0,(4-q)*900+sec),'as':p.get('awayScore'), 'hs':p.get('homeScore')})
    for side in ['away','home']:
        g[side]['stats']=metrics([p for p in allplays if p['team']==g[side]['id']])
    g['plays']=allplays
    return g
def ingest_espn(league):
    slug='nfl' if league=='NFL' else 'college-football'
    if league=='NFL':urls=[f'https://site.api.espn.com/apis/site/v2/sports/football/{slug}/scoreboard?dates={year}&limit=1000' for year in range(int(ASOF[:4])-2,int(ASOF[:4])+1)]
    else:urls=[f'https://site.api.espn.com/apis/site/v2/sports/football/{slug}/scoreboard?dates={year}&week={week}&seasontype=2&groups=80&limit=200' for year in range(int(ASOF[:4])-2,int(ASOF[:4])+1) for week in range(1,16)]
    js=batch(lambda u:json.loads(fetch(u)),urls);events={e['id']:e for j in js for e in j.get('events',[])}
    games=[espn_event(e,league) for e in events.values() if e.get('season',{}).get('type')!=1]
    games=[g for g in games if g]
    history=[g for g in games if g['complete'] and g['date'][:10]<ASOF]
    schedule=[g for g in games if not g['complete'] and g['date'][:10]>=ASOF]
    print(league,'found',len(history),'completed',len(schedule),'scheduled',flush=True)
    history=batch(espn_summary,history)
    return history,schedule
def sidearm(url):
    soup=BeautifulSoup(fetch(url),'html.parser');head=soup.select_one('.box-score-header')
    if not head:return None
    date=soup.find('dt',string=re.compile(r'^Date:'))
    if not date:return None
    date=dt.datetime.strptime(date.find_next_sibling('dd').get_text(strip=True),'%m/%d/%Y').date().isoformat()
    if date>ASOF:return None
    g={'id':url,'league':'USPORTS','date':date+'T00:00:00Z','source':url,'complete':True,'neutral':False}
    for side in ['away','home']:
        el=head.select_one('.team.'+side)
        if not el or not el.select_one('.score'):return None
        name=el.img.get('alt','').replace(' logo','').strip()
        if not el.select_one('.score').get_text(strip=True).isdigit():return None
        g[side]={'id':name,'name':name,'short':name,'score':int(el.select_one('.score').get_text(strip=True))}
    g['quarters']={side:[int(td.get_text(strip=True)) for td in tr.find_all('td')[1:5]] for side,tr in zip(['away','home'],head.select('table tbody tr')) if all(td.get_text(strip=True).isdigit() for td in tr.find_all('td')[1:5])}
    allplays=[]
    for table in soup.select('#play-by-play table'):
        cap=table.find('caption')
        if not cap:continue
        team=cap.get_text(' ',strip=True).split(' at ')[0]
        if team not in [g['away']['name'],g['home']['name']]:continue
        for tr in table.select('tbody tr'):
            td=tr.find_all('td')
            if len(td)!=2:continue
            p=text_play(td[-1].get_text(' ',strip=True))
            if p:
                # Lost fumbles need opposing recovery; same-team recoveries are not giveaways.
                txt=td[-1].get_text(' ',strip=True)
                if 'fumble' in txt.lower():p['turnover']=False
                p.update(team=team,id=str(len(allplays)));allplays.append(p)
    for side in ['away','home']:g[side]['stats']=metrics([p for p in allplays if p['team']==g[side]['id']])
    ints=lost=None
    for tr in soup.select('#team-stats tr'):
        cells=tr.find_all(['td','th']);values=[c.get_text(' ',strip=True) for c in cells]
        if len(values)<3:continue
        if 'Comp.-Att.-Int.' in values[0]:ints=[re.findall(r'\d+',v) for v in values[1:3]]
        if 'Fumbles - Lost' in values[0]:lost=[re.findall(r'\d+',v) for v in values[1:3]]
    for i,side in enumerate(['away','home']):
        g[side]['verifiedTurnovers']=int(ints[i][-1])+int(lost[i][-1]) if ints and lost and all(ints) and all(lost) else None
    g['plays']=allplays
    return g
def sidearm_history():
    sources=json.loads((BASE.parents[1]/'roster-sources.json').read_text());urls=[]
    for row in sources.values():
        if row.get('adapter')!='sidearm':continue
        root=row['url'].split('/sports/')[0]
        for year in [2026]:
            suffix=f'{year}-{year+1}' if 'gogaelsgo' in root else f'{year}-{str(year+1)[-2:]}' if any(t in root for t in ['uwaterloo','mcgill','gaiters']) else str(year)
            urls.append(root+'/sports/football/schedule/'+suffix)
    def links(u):
        soup=BeautifulSoup(fetch(u),'html.parser')
        return [urljoin(u,a['href']) for a in soup.select('a[href]') if re.search(r'/sports/football/stats/.*/boxscore/\d+',a['href'])]
    pages=set(p for arr in batch(links,urls) for p in arr)
    print('USPORTS discovered',len(pages),'gamebooks',flush=True)
    games=batch(sidearm,sorted(pages));unique={}
    for g in games:
        k=(g['date'][:10],g['away']['name'],g['home']['name'])
        if k not in unique or len(g['plays'])>len(unique[k]['plays']):unique[k]=g
    return list(unique.values()),[]
def ingest_usports():
    import national
    schedule,unresolved=national.discover(fetch,batch,int(ASOF[:4]))
    completed=[g for g in schedule if g['status']=='final' and g['date']<=ASOF]
    # U SPORTS official composite and its linked gamebooks are the sole source.
    # Missing gamebooks remain indexed as finals; no school-site substitutions.
    presto_games=batch(lambda g:national.presto(g,fetch,text_play,metrics),[g for g in completed if g.get('boxscore')])
    by_id={g['id']:g for g in presto_games if g}
    unique=[]
    for g in completed:
        record=by_id.get(g['id'])
        if record is None:continue
        # Composite scores are authoritative and must match the official gamebook.
        if any(record[side]['score']!=g[side+'Score'] for side in ('away','home')):continue
        if not all(record[side].get('stats') for side in ('away','home')):continue
        unique.append(record)
    national.save_schedule(schedule,unresolved,ASOF)
    print('Official U SPORTS:',len(schedule),'indexed games;',len(unique),
          'complete play-by-play gamebooks;',
          len(completed)-len(unique),'finals awaiting usable gamebook',flush=True)
    return sorted(unique,key=lambda g:g['id']),schedule+unresolved

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('league',choices=['NFL','NCAA','USPORTS']);args=parser.parse_args()
    h,s=ingest_usports() if args.league=='USPORTS' else ingest_espn(args.league)
    out={'league':args.league,'asOf':ASOF,'history':h,'schedule':s,'errors':errors}
    (BASE/(args.league.lower()+'-history.json')).write_text(json.dumps(out))
    print(args.league,'saved',len(h),'history games;',len(errors),'source failures',flush=True)
