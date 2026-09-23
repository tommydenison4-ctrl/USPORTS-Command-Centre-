"""Reconstructed AWM V3. Prior-only features, chronological holdout, no market input."""
import json,math,re,statistics
from pathlib import Path
from collections import defaultdict
import numpy as np
from scipy.optimize import minimize
ROOT=Path(__file__).resolve().parent
import os,datetime
ASOF=os.environ.get('AWM_ASOF',datetime.datetime.now(datetime.timezone.utc).date().isoformat())
def sigmoid(x):return 1/(1+np.exp(-np.clip(x,-35,35)))
def fit(X,y,logistic=True):
 X=np.asarray(X,float);y=np.asarray(y,float);mu=X.mean(0);sd=X.std(0);sd[sd<1e-7]=1;Z=np.c_[np.ones(len(X)),(X-mu)/sd]
 if logistic:
  def loss(b):
   p=sigmoid(Z@b);return -np.mean(y*np.log(p+1e-12)+(1-y)*np.log(1-p+1e-12))+.015*np.dot(b[1:],b[1:])
  def grad(b):return Z.T@(sigmoid(Z@b)-y)/len(y)+np.r_[0,.03*b[1:]]
  b=minimize(loss,np.zeros(Z.shape[1]),jac=grad,method='BFGS').x
 else:b=np.linalg.solve(Z.T@Z+np.diag([0]+[12]*(Z.shape[1]-1)),Z.T@y)
 return dict(mean=mu.tolist(),scale=sd.tolist(),coef=b.tolist(),logistic=logistic)
def calc(m,x):
 v=m['coef'][0]+sum(b*(v-mu)/sd for b,v,mu,sd in zip(m['coef'][1:],x,m['mean'],m['scale']))
 return float(sigmoid(v)) if m['logistic'] else v
def canonical(s):
 s=re.sub('[^a-z]','',s.lower())
 aliases={'ott':'ottawa','tor':'toronto','wat':'waterloo','laur':'laurier','marauder':'mcmaster','stfrancisxavier':'stfx','stmarys':'saintmarys','mtallison':'mountallison'}
 for key in ['alberta','bishops','calgary','carleton','concordia','guelph','laval','laurier','manitoba','mcgill','mcmaster','montreal','ottawa','queens','regina','saskatchewan','sherbrooke','toronto','ubc','waterloo','western','windsor','york','acadia','stfx','saintmarys','mountallison']:
  if s.startswith(key):return key
 return aliases.get(s,s)
def clean(history,league):
 out={}
 for g in history:
  if g['date'][:10]>=ASOF:continue
  if league=='USPORTS' and not g['date'].startswith('2026-'):continue
  if league=='USPORTS':
   for side in ['away','home']:
    t=g[side];old=t['id'];t['id']=canonical(old)
    for p in g['plays']:
     if p['team']==old:p['team']=t['id']
   if any('team' in g[s]['id'] for s in ['away','home']):continue
  # Both sides need substantial eligible-play coverage. Never fill absent plays with zeros.
  if any(sum(p['team']==g[s]['id'] for p in g.get('plays',[]))<25 for s in ['away','home']):continue
  key=(g['date'][:10],g['away']['id'],g['home']['id'])
  if key not in out or len(g['plays'])>len(out[key]['plays']):out[key]=g
 return sorted(out.values(),key=lambda g:(g['date'],g['id']))
def aggregate(rows,side):
 plays=[p for g,own in rows for p in g['plays'] if (p['team']==g[own]['id'])==(side=='off')]
 if len(plays)<70:return None
 ys=[p['yards'] for p in plays];n=len(plays)
 return dict(ypp=sum(ys)/n,median=statistics.median(ys),expl=sum(p['yards']>=(20 if p['type']=='pass' else 15) for p in plays)/n,neg=sum(p['yards']<=0 for p in plays)/n,sack=sum(p.get('sack',False) for p in plays)/n,tempo=n/len(rows))
def profile(rows,elo):
 rows=rows[-8:];off=aggregate(rows,'off');de=aggregate(rows,'def')
 if len(rows)<2 or not off or not de:return None
 margins=[g[s]['score']-g['away' if s=='home' else 'home']['score'] for g,s in rows]
 return dict(off=off,defense=de,elo=elo,form=float(np.mean([np.clip(x,-28,28) for x in margins[-3:]])),pf=float(np.mean([g[s]['score'] for g,s in rows])),pa=float(np.mean([g['away' if s=='home' else 'home']['score'] for g,s in rows])),games=len(rows),lastGame=rows[-1][0]['date'],sources=list(dict.fromkeys(g['source'] for g,s in rows)))
def features(a,h,neutral=False):
 exp={}
 for side,t,o in [('away',a,h),('home',h,a)]:
  v={k:(t['off'][k]+o['defense'][k])/2 for k in ['ypp','median','expl','neg','sack','tempo']};v['explosives']=v['expl']*v['tempo'];exp[side]=v
 d=[exp['home'][k]-exp['away'][k] for k in ['ypp','median','explosives','neg','sack']]+[0 if neutral else 1]
 power=[(h['elo']-a['elo'])/400,0 if neutral else 1];form=[h['form']-a['form'],0 if neutral else 1]
 return dict(football=d,power=power,form=form,margin=d+power[:1]+form[:1]+[power[0]*abs(power[0])],total=[(a['pf']+a['pa']+h['pf']+h['pa'])/2,exp['away']['tempo']+exp['home']['tempo'],exp['away']['explosives']+exp['home']['explosives']],expected=exp)
def forecast(m,f):return .6*calc(m['football'],f['football'])+.35*calc(m['power'],f['power'])+.05*calc(m['form'],f['form'])
def realized(g):
 a=g['away'].get('stats');h=g['home'].get('stats')
 if not a or not h:return None
 at,ht=a['turnovers'],h['turnovers']
 if g['league']=='USPORTS':
  at,ht=g['away'].get('verifiedTurnovers'),g['home'].get('verifiedTurnovers')
  if at is None or ht is None:return None
 return [h['explosives']-a['explosives']+2*(at-ht),h['median']-a['median'],h['negatives']/h['plays']-a['negatives']/a['plays']]
def live_features(p,g,idx):
 ps=g['plays'][:idx+1];last=ps[-1];remain=last.get('remaining');q=last.get('q')
 if remain is None or q is None or q>4 or not isinstance(last.get('as'),(int,float)) or not isinstance(last.get('hs'),(int,float)):return None
 f=1-remain/3600;ss=[]
 for side in ['away','home']:
  pp=[x for x in ps if x['team']==g[side]['id']];ys=[x['yards'] for x in pp]
  if not ys:return None
  ss.append([sum(x['yards']>=(20 if x['type']=='pass' else 15) for x in pp),sum(x.get('turnover',False) for x in pp),statistics.median(ys),sum(y<=0 for y in ys)/len(ys)])
 a,h=ss
 return [math.log(max(.001,p)/max(.001,1-p))*(1-f),(last['hs']-last['as'])/math.sqrt(max(.03,1-f)),(h[0]-a[0]+2*(a[1]-h[1]))*f,(h[2]-a[2])*f,(h[3]-a[3])*f,1-f]
def provisional(league,source,history,samples,rows,elo,names):
 if len(samples)<8 or len(set(s['y'] for s in samples))<2:raise ValueError('Insufficient 2026 prior-only training examples')
 m={k:fit([s['f'][k] for s in samples],[s['y'] for s in samples]) for k in ['football','power','form']}
 for k in ['margin','total']:
  m[k]=fit([s['f'][k] for s in samples],[s['g']['home']['score']+(-1 if k=='margin' else 1)*s['g']['away']['score'] for s in samples],False)
 m.update(scenario=None,live=None,liveScore=None,marginInterval80=None,report=None,provisional=True,trainingGames=len(samples),trainedThrough=samples[-1]['g']['date'][:10],trainingDates=[s['g']['date'][:10] for s in samples],trainingSources=[s['g']['source'] for s in samples])
 profiles={tid:{**names[tid],**p,'season':2026} for tid in rows if (p:=profile(rows[tid],elo[tid]))}
 out=dict(league=league,asOf=ASOF,modelVersion='AWM-V3-2026-provisional-1',dataPolicy={'season':2026,'trainingSeason':2026},model=m,profiles=profiles,schedule=source['schedule'],frozen={},coverage={'completedGames':len(history),'profileTeams':len(profiles)},method='Provisional 2026-only fit. Prior-only game features; 60/35/5 blend. No older-season coefficients, external market inputs or validated accuracy claims. Small-sample probabilities are uncalibrated estimates.')
 (ROOT/(league.lower()+'-model.json')).write_text(json.dumps(out,allow_nan=False))
 (ROOT/(league.lower()+'-holdout.json')).write_text('[]')
 print(league,'provisional model:',len(samples),'2026-only prior-game examples;',len(profiles),'profiles')
 return out

def train(league):
 source=json.loads((ROOT/(league.lower()+'-history.json')).read_text());history=clean(source['history'],league)
 elo=defaultdict(lambda:1500.);rows=defaultdict(list);samples=[];names={};dates=defaultdict(list)
 for g in history:dates[g['date'][:10]].append(g)
 for date,games in sorted(dates.items()):
  for g in games:
   a,h=g['away']['id'],g['home']['id'];ap=profile(rows[a],elo[a]);hp=profile(rows[h],elo[h])
   if ap and hp and g['away']['score']!=g['home']['score']:samples.append(dict(g=g,f=features(ap,hp,g['neutral']),y=int(g['home']['score']>g['away']['score'])))
  for g in games:
   a,h=g['away']['id'],g['home']['id'];p=1/(1+10**((elo[a]-elo[h])/400));y=.5 if g['home']['score']==g['away']['score'] else int(g['home']['score']>g['away']['score']);delta=20*(y-p);elo[h]+=delta;elo[a]-=delta
   for side in ['away','home']:
    tid=g[side]['id'];rows[tid].append((g,side));names[tid]={k:v for k,v in g[side].items() if k in ['id','name','short','abbr','logo']}
 if len(samples)<40:return provisional(league,source,history,samples,rows,elo,names)
 cut=samples[int(len(samples)*.75)]['g']['date'][:10];training=[s for s in samples if s['g']['date'][:10]<cut];hold=[s for s in samples if s['g']['date'][:10]>=cut]
 m={k:fit([s['f'][k] for s in training],[s['y'] for s in training]) for k in ['football','power','form']}
 m['margin']=fit([s['f']['margin'] for s in training],[s['g']['home']['score']-s['g']['away']['score'] for s in training],False)
 m['total']=fit([s['f']['total'] for s in training],[s['g']['home']['score']+s['g']['away']['score'] for s in training],False)
 rr=[s for s in training if realized(s['g'])]
 m['scenario']=fit([realized(s['g'])+[s['f']['power'][0]] for s in rr],[s['y'] for s in rr]) if len(rr)>40 else None
 if m['scenario'] and m['scenario']['coef'][1]<=0:m['scenario']=None
 live=[]
 for s in training:
  p=forecast(m,s['f']);seen=set()
  for i,play in enumerate(s['g']['plays']):
   bucket=int((3600-play.get('remaining',3600))/600)
   if bucket<1 or bucket in seen:continue
   x=live_features(p,s['g'],i)
   if x:live.append((x,s['y']));seen.add(bucket)
 m['live']=fit([x for x,y in live],[y for x,y in live]) if len(live)>=80 else None
 def score_rows(ss):
  out=[]
  for s in ss:
   g=s['g'];qs=g.get('quarters',{});p=forecast(m,s['f']);a=qs.get('away',[]);h=qs.get('home',[])
   if len(a)<4 or len(h)<4 or any(x is None for x in a+h):continue
   for q in [1,2,3]:
    r=1-q/4;out.append(([math.log(p/(1-p))*r,(sum(h[:q])-sum(a[:q]))/math.sqrt(r),r],s['y']))
  return out
 ls=score_rows(training);m['liveScore']=fit([x for x,y in ls],[y for x,y in ls]) if len(ls)>80 else None
 ps=np.array([forecast(m,s['f']) for s in hold]);ys=np.array([s['y'] for s in hold]);res=np.array([s['g']['home']['score']-s['g']['away']['score']-calc(m['margin'],s['f']['margin']) for s in hold])
 report=dict(trainingGames=len(training),testGames=len(hold),testStart=cut,testEnd=hold[-1]['g']['date'][:10],accuracy=float(np.mean((ps>=.5)==ys)),brier=float(np.mean((ps-ys)**2)),logLoss=float(-np.mean(ys*np.log(ps)+(1-ys)*np.log(1-ps))),marginMAE=float(np.mean(abs(res))),baselineBrier=float(np.mean((np.mean([s['y'] for s in training])-ys)**2)),sourceFailures=len(source['errors']))
 report['probabilityBuckets']=[{'range':[float(lo),float(lo+.1)],'count':int(sum((ps>=lo)&(ps<lo+.1))),'observedHomeWinRate':float(np.mean(ys[(ps>=lo)&(ps<lo+.1)])) if sum((ps>=lo)&(ps<lo+.1)) else None} for lo in np.arange(0,1,.1)]
 if m['liveScore']:
  testlive=score_rows(hold);report['scoreOnlyLiveSnapshots']=len(testlive);report['scoreOnlyLiveBrier']=float(np.mean([(calc(m['liveScore'],x)-y)**2 for x,y in testlive]))
 livehold=[]
 if m['live']:
  for s,p in zip(hold,ps):
   seen=set()
   for i,play in enumerate(s['g']['plays']):
    bucket=int((3600-play.get('remaining',3600))/600)
    if bucket<1 or bucket in seen:continue
    x=live_features(p,s['g'],i)
    if x:livehold.append((calc(m['live'],x),s['y']));seen.add(bucket)
  report['liveSnapshots']=len(livehold);report['liveBrier']=float(np.mean([(p-y)**2 for p,y in livehold])) if livehold else None
 m['marginInterval80']=float(np.quantile(abs(res),.8));m['trainedThrough']=training[-1]['g']['date'][:10];m['report']=report
 m['trainingDates']=[s['g']['date'][:10] for s in training]
 profiles={tid:{**names[tid],**p,'season':2026} for tid in rows if (p:=profile(rows[tid],elo[tid]))}
 counts=[g[side]['stats']['explosives'] for g in history for side in ['away','home'] if g[side].get('stats')];mean=np.mean(counts);var=np.var(counts);m['explosiveDispersion']=float(mean**2/(var-mean)) if var>mean else None
 out=dict(league=league,asOf=ASOF,modelVersion='AWM-V3-2026-only-1',dataPolicy={'season':2026,'trainingSeason':2026},model=m,profiles=profiles,schedule=source['schedule'],coverage={'completedGames':len(history),'profileTeams':len(profiles)},method='Master Spec v1.0 architecture; coefficients reconstructed from historical feeds. No betting-market inputs. Scenario targets are descriptive conditional estimates, not validated causal winning requirements.')
 (ROOT/(league.lower()+'-model.json')).write_text(json.dumps(out,allow_nan=False))
 (ROOT/(league.lower()+'-holdout.json')).write_text(json.dumps([{'id':s['g']['id'],'date':s['g']['date'],'homeWinProbability':float(p),'homeWon':s['y'],'source':s['g']['source']} for s,p in zip(hold,ps)]))
 print(league,json.dumps(report),flush=True)
if __name__=='__main__':
 import sys
 for league in sys.argv[1:] or ['NFL','NCAA','USPORTS']:train(league)
