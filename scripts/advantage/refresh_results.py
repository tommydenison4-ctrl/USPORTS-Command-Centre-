"""Advance verified result features without discarding previously verified plays."""
import copy
from collections import defaultdict
import numpy as np
import national, train

def update(previous, source, history):
    result=copy.deepcopy(previous)
    finals=[national.history_game(g) for g in source['schedule']
            if g.get('status')=='final' and not g.get('exhibition') and g['date']<=train.ASOF]
    finals.sort(key=lambda g:(g['date'],g['id']))
    rows=defaultdict(list);elo=defaultdict(lambda:1500.0);plays=defaultdict(list)
    for g in history:
        for side in ('away','home'):plays[g[side]['id']].append((g,side))
    for g in finals:
        a,h=g['away']['id'],g['home']['id']
        probability=1/(1+10**((elo[a]-elo[h])/400))
        outcome=.5 if g['home']['score']==g['away']['score'] else int(g['home']['score']>g['away']['score'])
        delta=20*(outcome-probability);elo[h]+=delta;elo[a]-=delta
        for side in ('away','home'):rows[g[side]['id']].append((g,side))
    for tid,p in result['profiles'].items():
        games=rows[tid]
        if not games:raise ValueError('Missing verified results for '+tid)
        margins=[g[s]['score']-g['home' if s=='away' else 'away']['score'] for g,s in games]
        p.update(elo=elo[tid],form=float(np.mean([np.clip(x,-28,28) for x in margins[-3:]])),
                 pf=float(np.mean([g[s]['score'] for g,s in games])),
                 pa=float(np.mean([g['home' if s=='away' else 'away']['score'] for g,s in games])),
                 resultGames=len(games),lastGame=games[-1][0]['date'],
                 resultSources=list(dict.fromkeys(g.get('boxscore') or g['source'] for g,s in games)))
        # A subset of newly reachable gamebooks must not replace broader coverage.
        if len(plays[tid])>=p['games']:
            fresh=train.profile(plays[tid],elo[tid],games)
            if fresh:
                for key in ('off','defense','games','sources'):p[key]=fresh[key]
                p['playStatsAsOf']=plays[tid][-1][0]['date']
    result.update(asOf=train.ASOF,schedule=source['schedule'])
    result['coverage'].update(resultGames=len(finals),availableOfficialGamebooks=len(history),
        refreshPolicy='Verified final results are current. Previously verified play metrics are retained when official gamebooks are temporarily unavailable.')
    print('Updated',len(finals),'verified finals; preserved broader play coverage and coefficients',flush=True)
    return result
