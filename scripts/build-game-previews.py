"""Publish original, source-traceable previews from the verified pregame snapshot."""
import json, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def read(name): return json.loads((ROOT/'data'/name).read_text())
def slug(s): return {'mountallison':'mount-allison','saintmarys':'saint-marys'}.get(s,s)
def build():
    schedule=read('national-schedule-usports.json'); results=read('verified-results-usports.json')
    watch=read('season-watch.json')['USPORTS']; profiles=read('advantage-usports.json')['profiles']
    profiles={slug(p['id']):p for p in profiles} if isinstance(profiles,list) else {slug(k):v for k,v in profiles.items()}
    cutoff=min(schedule['asOf'],results['asOf'],watch['asOf'])
    reports=read('preview-reporting.json')
    games=[]
    for g in schedule['games']:
        if g['date']<cutoff or g['status']!='scheduled' or g.get('exhibition') or g.get('pendingParticipants'):continue
        a,h=slug(g['away']),slug(g['home'])
        if a not in profiles or h not in profiles:continue
        sources=[]
        def source(url,label):
            if not any(s['url']==url for s in sources):sources.append({'url':url,'label':label})
        source(g['source'],'Official national schedule')
        past=[r for r in results['games'] if r['date']<min(g['date'],cutoff) and not r.get('exhibition')]
        def team(t):
            name=profiles[t]['name'];rows=sorted([r for r in past if t in [slug(r['away']),slug(r['home'])]],key=lambda r:r['date'])
            w=l=pf=pa=0
            for r in rows:
                own,opp=(r['awayScore'],r['homeScore']) if slug(r['away'])==t else (r['homeScore'],r['awayScore'])
                w+=own>opp;l+=own<opp;pf+=own;pa+=opp
                source(r['source'],r['date']+' · '+profiles.get(slug(r['away']),{'name':r['away']})['name']+' at '+profiles.get(slug(r['home']),{'name':r['home']})['name'])
            recent=[]
            for r in rows[-3:]:
                own,opp,other=(r['awayScore'],r['homeScore'],slug(r['home'])) if slug(r['away'])==t else (r['homeScore'],r['awayScore'],slug(r['away']))
                recent.append(f"a {own}–{opp} {'win over' if own>opp else 'loss to' if own<opp else 'tie with'} {profiles.get(other,{'name':other})['name']} on {r['date'][5:]}")
            recent_text='; '.join(recent)
            n=len(rows)
            text=f"{name} enters this snapshot at {w}–{l}"
            if n:text+=f", scoring {pf/n:.1f} points per game and allowing {pa/n:.1f} across {n} verified regular-season results."
            else:text+='. No verified regular-season results are available in this snapshot.'
            if recent:text+=f" Its last {len(recent)} recorded outings were {recent_text}."
            return {'name':name,'w':w,'l':l,'n':n,'pf':pf/n if n else None,'pa':pa/n if n else None,'text':text}
        away,home=team(a),team(h)
        paragraphs=[f"{away['name']} visits {home['name']} in {dict(CW='Canada West',AUS='AUS',RSEQ='RSEQ',OUA='OUA').get(g['conference'],g['conference'])} on {g['date']}. The records and production below describe games completed before {cutoff}; they are a pregame baseline, with the site's numerical forecast presented separately.",away['text'],home['text']]
        if away['n'] and home['n']:
            higher=away if away['pf']>home['pf'] else home; lower=away if away['pa']<home['pa'] else home
            paragraphs.append(f"The scoring comparison puts {higher['name']} ahead in points per game, while {lower['name']} has allowed fewer points per game. Those measures describe different sides of the matchup: sustaining drives matters for the attack, while preventing short fields and finishing defensive possessions can change the scoring balance. These are unadjusted averages against different schedules, so they do not establish how either team will perform against this opponent.")
        meetings=[r for r in past if {slug(r['away']),slug(r['home'])}=={a,h}]
        if meetings:
            r=meetings[-1]; winner=slug(r['away']) if r['awayScore']>r['homeScore'] else slug(r['home'])
            paragraphs.append(f"The earlier regular-season meeting on {r['date']} finished {profiles[slug(r['away'])]['name']} {r['awayScore']}, {profiles[slug(r['home'])]['name']} {r['homeScore']}. {profiles[winner]['name']} therefore has a successful reference point against this opponent, although the intervening results are also relevant to assessing the return game.")
        if away['w']!=home['w']:
            leader=away if away['w']>home['w'] else home;trailer=home if leader is away else away
            paragraphs.append(f"{leader['name']} has {leader['w']-trailer['w']} more conference wins than {trailer['name']} in the verified results. A win for the trailing team would narrow that gap; a win for the team ahead would widen it. Different numbers of games played and conference tiebreak rules can still affect the eventual standings order.")
        stat=[]
        for t in [a,h]:
            p=profiles[t]
            if p.get('lastGame','9999')<min(g['date'],cutoff) and p.get('games',0) and p.get('off',{}).get('ypp') is not None and p.get('defense',{}).get('ypp') is not None:
                stat.append(f"{p['name']} averages {p['off']['ypp']:.1f} yards per offensive play and allows {p['defense']['ypp']:.1f} in the available play-by-play sample ({p['games']} games)")
                for url in p.get('sources',[]):source(url,p['name']+' · play-by-play source')
        if stat:paragraphs.append('; '.join(stat)+'. Play-by-play coverage can differ from the complete results sample; these figures measure observed production, not projected yardage.')
        candidates=[(i+1,p) for i,p in enumerate(watch['players']) if slug(p['teamId']) in [a,h] and p.get('lastGame','9999')<min(g['date'],cutoff)][:2]
        if candidates:
            bits=[]
            for rank,p in candidates:
                stats=p.get('stats',{});cat=next((c for c in ['passing','rushing','receiving'] if stats.get(c,{}).get('yards',0)>0),None)
                line=f"{p['name']} ({p['team']}) appears in CanUFootball's Hec Crighton Watch"
                if cat:line+=f", with {stats[cat]['yards']:,} {cat} yards in {stats[cat]['games']} covered games"
                bits.append(line)
                for url in p.get('sources',[]):source(url,p['name']+' · player statistics')
            paragraphs.append('; '.join(bits)+'. This is the site’s statistical watch, not official award voting or confirmation of the starting lineup. Player totals reflect covered box scores.')
        else:paragraphs.append('Neither team has a listed player in the current CanUFootball Hec Crighton Watch snapshot used here. That absence is not a player availability report; the watch is the site’s statistical assessment rather than official award voting.')
        report=reports.get(g['id'])
        if report and report['published']<=cutoff and report['validThrough']>=cutoff:
            paragraphs.append(report['summary']);source(report['url'],report['publisher']+' · pregame reporting')
        paragraphs.append('The result will add a win and a loss to the conference race. Exact playoff seeds and clinching scenarios require the conference’s current tiebreak calculations, which are not established by this snapshot. The key question is whether the recent scoring and defensive patterns carry into this matchup; prior results alone cannot settle it.')
        games.append({'id':g['id'],'away':g['away'],'home':g['home'],'date':g['date'],'conference':g['conference'],'asOf':cutoff,'title':f"{away['name']} at {home['name']}: the matchup",'paragraphs':paragraphs,'sources':sources})
    payload={'asOf':cutoff,'method':'Original editorial synthesis of verified regular-season results, available play-by-play, CanUFootball Hec Crighton Watch, and attributed reporting. No predictions are presented as facts.','games':games}
    (ROOT/'data/game-previews.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'game-previews-data.js').write_text('window.US_GAME_PREVIEWS='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
    print(f"Published {len(games)} previews across {sorted(set(g['conference'] for g in games))}; cutoff {cutoff}")
if __name__=='__main__':build()
