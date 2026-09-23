"""Refresh prior-only team histories without refitting the approved coefficient version."""
import json,sys,subprocess,os,datetime
from pathlib import Path
from collections import defaultdict
import train
ROOT=Path(__file__).resolve().parents[2]
leagues=json.loads((ROOT/'data/advantage-leagues.json').read_text())
# Snapshot before fetching new results, so a later refresh cannot rewrite a kickoff prior.
subprocess.run(['node',str(Path(__file__).with_name('snapshots.cjs')),'freeze'],check=True)
for league in leagues:
 subprocess.run([sys.executable,str(Path(__file__).with_name('ingest.py')),league],check=True)
 source=json.loads(Path(__file__).with_name(league.lower()+'-history.json').read_text())
 target=ROOT/'data'/('advantage-'+league.lower()+'.json');old=json.loads(target.read_text())
 history=train.clean(source['history'],league)
 if len(history)<old['coverage']['completedGames']*.95:raise RuntimeError(league+': source coverage regressed; previous data retained')
 rows=defaultdict(list);elo=defaultdict(lambda:1500.);names={}
 for g in history:
  a,h=g['away']['id'],g['home']['id'];prob=1/(1+10**((elo[a]-elo[h])/400));y=.5 if g['home']['score']==g['away']['score'] else int(g['home']['score']>g['away']['score']);delta=20*(y-prob);elo[h]+=delta;elo[a]-=delta
  for side in ['away','home']:
   tid=g[side]['id'];rows[tid].append((g,side));names[tid]={k:v for k,v in g[side].items() if k in ['id','name','short','abbr','logo']}
 profiles={tid:{**names[tid],**p} for tid in rows if (p:=train.profile(rows[tid],elo[tid]))}
 if any(tid not in profiles for tid in old['profiles']):raise RuntimeError(league+': missing existing team histories; previous data retained')
 old.update(asOf=train.ASOF,profiles=profiles,coverage={'completedGames':len(history),'profileTeams':len(profiles),'sourceFailures':source['errors']})
 if source['schedule']:old['schedule']=source['schedule']
 target.write_text(json.dumps(old,allow_nan=False))
subprocess.run(['node',str(Path(__file__).with_name('snapshots.cjs')),'build'],check=True)
print('Updated profiles and saved forecasts. Model coefficients and historical validation are unchanged.')
