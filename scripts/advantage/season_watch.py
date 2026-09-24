"""2026 offensive award watch from sourced box scores, not award voting odds."""
import json,os,datetime,hashlib
from pathlib import Path
from collections import defaultdict
import ingest
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
ASOF=os.environ.get('AWM_ASOF',datetime.datetime.now(datetime.timezone.utc).date().isoformat())
def entries(node):
    yield from node.get('standings',{}).get('entries',[])
    for child in node.get('children',[]):yield from entries(child)
def build():
    leagues=json.loads((ROOT/'data/advantage-leagues.json').read_text());bundle={}
    cache=Path(os.environ.get('AWM_CACHE_DIR',str(ingest.CACHE)))
    for league in leagues:
        players={};games=set();teams=set();eligible=None;eligibility_source=None
        profiles=json.loads((ROOT/('data/advantage-'+league.lower()+'.json')).read_text())['profiles']
        if league=='NCAA':
            eligibility_source='https://site.api.espn.com/apis/v2/sports/football/college-football/standings?season=2026&group=80'
            standings=json.loads(ingest.fetch(eligibility_source))
            eligible=sorted({str(e['team']['id']) for e in entries(standings)})
            if len(eligible)<120:raise ValueError('FBS membership feed incomplete')
        def add(team,name,pid,date,source,category,yards,td,interceptions=0):
            key=str(team['id'])+':'+str(pid)
            p=players.setdefault(key,dict(name=name,team=team.get('displayName',team.get('name',team['id'])),teamId=str(team['id']),stats={},sources=set(),dates=set()))
            row=p['stats'].setdefault(category,dict(yards=0,touchdowns=0,interceptions=0,games=set()))
            if source in row['games']:return
            row['yards']+=yards;row['touchdowns']+=td;row['interceptions']+=interceptions;row['games'].add(source)
            p['sources'].add(source);p['dates'].add(date);games.add(source);teams.add(str(team['id']))
        if league=='USPORTS':
            import train
            h=Path(os.environ.get('AWM_HISTORY_DIR',str(BASE)))/'usports-history.json'
            verified=train.clean(json.loads(h.read_text())['history'],'USPORTS')
            result={'season':2026,'asOf':ASOF,'games':[dict(date=g['date'][:10],away=g['away']['id'],home=g['home']['id'],awayScore=g['away']['score'],homeScore=g['home']['score'],source=g['source']) for g in verified if g.get('complete') and g['date'].startswith('2026-')]}
            (ROOT/'data/verified-results-usports.json').write_text(json.dumps(result,allow_nan=False))
            source=json.loads((ROOT/'data/player-leaders-usports.json').read_text())
            for g in source['games']:
                if not '2026-08-01'<=g['date']<ASOF:continue
                for team,cats in g['teams'].items():
                    for cat,rows in cats.items():
                        for r in rows:
                            if r.get('touchdowns') is not None and (cat!='passing' or r.get('interceptions') is not None):add({'id':team,'name':profiles.get(team,{}).get('name',team)},r['name'],r['name'].lower(),g['date'],g['source'],cat,r['yards'],r['touchdowns'],r.get('interceptions') or 0)
        else:
            history=Path(os.environ.get('AWM_HISTORY_DIR',str(BASE)))/(league.lower()+'-history.json')
            for g in json.loads(history.read_text())['history']:
                date=g['date'][:10]
                if not '2026-08-01'<=date<ASOF or not g.get('complete'):continue
                src=g['source'];path=cache/(hashlib.sha256(src.encode()).hexdigest()+'.txt')
                j=json.loads(path.read_text() if path.exists() else ingest.fetch(src))
                for b in j.get('boxscore',{}).get('players',[]):
                    team=b['team']
                    if eligible is not None and str(team['id']) not in eligible:continue
                    for cat in b.get('statistics',[]):
                        name=cat['name']
                        if name not in ['passing','rushing','receiving']:continue
                        for r in cat.get('athletes',[]):
                            vals=dict(zip(cat.get('keys',[]),r.get('stats',[])))
                            try:
                                y=float(vals[name+'Yards']);td=float(vals[name+'Touchdowns']);ints=float(vals['interceptions']) if name=='passing' else 0
                            except (KeyError,ValueError,TypeError):continue
                            a=r['athlete'];add(team,a['displayName'],a['id'],date,src,name,y,td,ints)
        rows=[]
        stat_rows=[]
        for p in players.values():
            n=len(p['dates'])

            score=0
            for cat,v in p['stats'].items():
                score+=v['yards']/(25 if cat=='passing' else 10)+v['touchdowns']*(4 if cat=='passing' else 6)-v['interceptions']*2
                v['games']=len(v['games'])
            p.update(games=n,score=round(score/n,2),sources=sorted(p['sources']),firstGame=min(p['dates']),lastGame=max(p['dates']));del p['dates']
            stat_rows.append(p)
            if n>=2:rows.append(p)
        leaders={}
        for category in ['passing','rushing','receiving']:
            eligible_rows=[p for p in stat_rows if category in p['stats']]
            eligible_rows.sort(key=lambda p:(-p['stats'][category]['yards'],p['name']))
            leaders[category]=[dict(name=p['name'],team=p['team'],teamId=p['teamId'],games=p['stats'][category]['games'],yards=p['stats'][category]['yards'],touchdowns=p['stats'][category]['touchdowns'],lastGame=p['lastGame'],sources=p['sources'][-2:]) for p in eligible_rows[:50]]
        stats={'season':2026,'asOf':ASOF,'coveredGames':len(games),'coveredTeams':len(teams),'categories':leaders}
        (ROOT/('data/player-stats-'+league.lower()+'.json')).write_text(json.dumps(stats,allow_nan=False))
        rows.sort(key=lambda p:(-p['score'],p['name']))
        bundle[league]={'season':2026,'asOf':ASOF,'players':rows[:10],'coveredGames':len(games),'coveredTeams':len(teams),'eligibleTeamIds':eligible,'eligibilitySource':eligibility_source,'method':'Offensive production per recorded appearance: passing yards / 25 + rushing and receiving yards / 10 + passing TD × 4 + rushing and receiving TD × 6 − interceptions × 2. At least two recorded game appearances. Not an award-voting model; defense and special teams are not scored. Missing box scores may change the order.'}
    (ROOT/'data/season-watch.json').write_text(json.dumps(bundle,allow_nan=False))
    (ROOT/'season-watch-data.js').write_text('window.SEASON_WATCH='+json.dumps(bundle,allow_nan=False).replace('<','\\u003c')+';')
    print({k:{'players':len(v['players']),'games':v['coveredGames'],'teams':v['coveredTeams']} for k,v in bundle.items()})
if __name__=='__main__':build()
