"""Write game previews from sourced results; keep data notes out of the story."""
import json
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/'data'/name).read_text())
def slug(s):return {'mountallison':'mount-allison','saintmarys':'saint-marys'}.get(s,s)
def day(s):return date.fromisoformat(s).strftime('%B %d').replace(' 0',' ')
def join(items):return ', '.join(items[:-1])+' and '+items[-1] if len(items)>1 else items[0]
def build():
    schedule=read('national-schedule-usports.json');results=read('verified-results-usports.json');watch=read('season-watch.json')['USPORTS'];profiles=read('advantage-usports.json')['profiles']
    profiles={slug(p['id']):p for p in profiles} if isinstance(profiles,list) else {slug(k):v for k,v in profiles.items()}
    cutoff=min(schedule['asOf'],results['asOf'],watch['asOf']);reports=read('preview-reporting.json');edits=read('preview-editorial.json');games=[]
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
            name=profiles[t]['name'];rows=sorted([r for r in past if t in [slug(r['away']),slug(r['home'])]],key=lambda r:r['date']);w=l=pf=pa=0;recent=[]
            for r in rows:
                own,opp,other=(r['awayScore'],r['homeScore'],slug(r['home'])) if slug(r['away'])==t else (r['homeScore'],r['awayScore'],slug(r['away']))
                w+=own>opp;l+=own<opp;pf+=own;pa+=opp
                source(r['source'],day(r['date'])+' · '+profiles.get(slug(r['away']),{'name':r['away']})['name']+' at '+profiles.get(slug(r['home']),{'name':r['home']})['name'])
                recent.append({'own':own,'opp':opp,'other':profiles.get(other,{'name':other})['name'],'won':own>opp,'date':r['date']})
            n=len(rows);record=f'{w}–{l}';text=f'{name} is {record}.'
            if n:
                last=recent[-1];text=f"{name} ({record}) last played on {day(last['date'])}, {'beating' if last['won'] else 'losing to'} {last['other']} {max(last['own'],last['opp'])}–{min(last['own'],last['opp'])}."
                previous=recent[-3:-1]
                if previous:text+=' Before that, '+('it won ' if all(r['won'] for r in previous) else 'its results were ')+join([f"{max(r['own'],r['opp'])}–{min(r['own'],r['opp'])} {'over' if r['won'] else 'against'} {r['other']}" if all(r['won'] for r in previous) else f"a {max(r['own'],r['opp'])}–{min(r['own'],r['opp'])} {'win over' if r['won'] else 'loss to'} {r['other']}" for r in previous])+'.'
                text+=f' Through {n} games, {name} is scoring {pf/n:.1f} points a game and giving up {pa/n:.1f}.'
            return {'name':name,'w':w,'l':l,'n':n,'pf':pf/n if n else None,'pa':pa/n if n else None,'text':text}
        away,home=team(a),team(h);an,hn=away['name'],home['name']
        edit=edits['games'].get(g['id']) if edits['asOf']<=cutoff else None
        article_date=edits['asOf'] if edit else cutoff
        lead=f"{an} heads to {hn} on {day(g['date'])}, with both teams looking to pick up a conference win. {an} is {away['w']}–{away['l']}; {hn} is {home['w']}–{home['l']}."
        paragraphs=[lead,away['text'],home['text']]
        meetings=[r for r in past if {slug(r['away']),slug(r['home'])}=={a,h}]
        if meetings:
            r=meetings[-1];winner=slug(r['away']) if r['awayScore']>r['homeScore'] else slug(r['home']);loser=h if winner==a else a
            paragraphs.append(f"{profiles[winner]['name']} won the last meeting {max(r['awayScore'],r['homeScore'])}–{min(r['awayScore'],r['homeScore'])} on {day(r['date'])}.")
        candidates=[p for p in watch['players'] if slug(p['teamId']) in [a,h] and p.get('lastGame','9999')<min(g['date'],cutoff)][:2]
        if candidates:
            bits=[]
            for p in candidates:
                stats=p.get('stats',{});cat=next((c for c in ['passing','rushing','receiving'] if stats.get(c,{}).get('yards',0)>0),None)
                line=f"{p['name']} of {p['team']}"
                if cat:line+=f" has {'thrown for' if cat=='passing' else 'rushed for' if cat=='rushing' else 'caught passes for'} {stats[cat]['yards']:,} yards in {stats[cat]['games']} games"
                bits.append(line)
                for url in p.get('sources',[]):source(url,p['name']+' · player statistics')
            paragraphs.append('. '.join(bits)+'. '+('Both are' if len(bits)>1 else candidates[0]['name']+' is')+" on CanUFootball’s Hec Crighton Watch.")
        report=reports.get(g['id'])
        if report and report['published']<=cutoff and report['validThrough']>=cutoff:
            paragraphs.append(report['summary']);source(report['url'],report['publisher']+' · pregame reporting')
        if edit:
            paragraphs=edit['paragraphs']
            sources=edit['sources']
        # Coverage belongs in the source drawer, rather than repeated caveats in every paragraph.
        notes=['Records and team scoring use regular-season results completed before '+day(article_date)+'. Exhibitions are excluded.','Player totals use the available box scores and may be incomplete. The Hec Crighton Watch is CanUFootball’s own list.']
        games.append({'id':g['id'],'away':g['away'],'home':g['home'],'date':g['date'],'conference':g['conference'],'asOf':article_date,'title':edit['title'] if edit else f'{an} at {hn}','paragraphs':paragraphs,'notes':notes,'sources':sources})
    payload={'asOf':cutoff,'method':'Based on official results, available player box scores and credited school reporting. Team averages are not adjusted for strength of schedule.','games':games}
    (ROOT/'data/game-previews.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n');(ROOT/'game-previews-data.js').write_text('window.US_GAME_PREVIEWS='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
    print(f'Published {len(games)} previews; updated {cutoff}')
if __name__=='__main__':build()
