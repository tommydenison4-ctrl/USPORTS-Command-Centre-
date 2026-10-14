"""Only publisher YouTube timestamps; RSS and video clocks are never mixed."""
import datetime as dt
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
FEED = 'https://feeds.soundcloud.com/users/soundcloud:users:501236826/sounds.rss'
CHANNEL = 'https://www.youtube.com/@atthe55podcast/videos'
# Explicit broadcast week prevents a later episode being attached to old fixtures.
TARGET = {'from': '2026-10-15', 'through': '2026-10-18', 'seaTitle': 'Sea to Sea Week 7', 'ouaTitle': 'Week 8 Preview'}
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=40) as r:
        return r.read(5_000_001).decode('utf-8')
def embedded(text, name):
    m = re.search(r'var '+name+r' = (.*?);</script>', text)
    if not m: raise ValueError('Publisher metadata unavailable')
    return json.loads(m.group(1))
def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)
def clock(v):
    n = 0
    for p in v.split(':'): n = n * 60 + int(p)
    return n
def chapters(text):
    result = []
    for line in text.splitlines():
        m = re.match(r'^\s*(?:(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]?\s*(.+?)|(.+?)\s*[-–]\s*(\d{1,2}:\d{2}(?::\d{2})?))\s*$', line)
        if m: result.append({'label': m[2] or m[3], 'start': clock(m[1] or m[4])})
    return sorted(result, key=lambda c: c['start'])
def norm(s):
    import unicodedata
    s = ''.join(c for c in unicodedata.normalize('NFKD', s.lower()) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]', '', s)
ALIASES = {'toronto':['UofT','Toronto'], 'queens':["Queen's",'Queens'], 'saint-marys':["Saint Mary's",'SMU'], 'stfx':['StFX','St. FX'], 'bishops':["Bishop's"], 'mount-allison':['Mount Allison','MtA']}
def team(s, slug): return norm(s) in {norm(slug), *(norm(x) for x in ALIASES.get(slug, []))}
def run():
    rss = ET.fromstring(fetch(FEED)); items = {}
    from email.utils import parsedate_to_datetime
    for x in rss.findall('./channel/item'):
        date = parsedate_to_datetime(x.findtext('pubDate')).date().isoformat()
        if '2026-10-14' <= date <= min(TARGET['through'], dt.datetime.now(dt.timezone.utc).date().isoformat()): items.setdefault(x.findtext('title'), x)
    listing = embedded(fetch(CHANNEL), 'ytInitialData'); videos = {}
    for o in walk(listing):
        v = o.get('lockupViewModel', {}); title = v.get('metadata', {}).get('lockupMetadataViewModel', {}).get('title', {}).get('content')
        if title: videos[title] = v.get('contentId')
    source = json.loads((ROOT/'data/podcast-segment-sources.json').read_text())
    games = json.loads((ROOT/'data/advantage-schedule-usports.json').read_text())
    state = {'target':TARGET, 'checkedDate':dt.datetime.now(dt.timezone.utc).date().isoformat(), 'sources':[FEED,CHANNEL], 'shows':{}}
    for key, title in [('sea','Sea to Sea Week 7'),('oua','Week 8 Preview')]:
        item = items.get(title); vid = videos.get(title)
        state['shows'][key] = {'title':title, 'status':'not-released' if item is None and not vid else 'awaiting-verified-chapters'}
        if item is None or not vid: continue
        url = 'https://www.youtube.com/watch?v='+vid
        p = embedded(fetch(url), 'ytInitialPlayerResponse'); v = p.get('videoDetails', {})
        if v.get('title') != title or v.get('channelId') != 'UCgGYz9dXWelySRitNe3yNsQ' or not p.get('playabilityStatus',{}).get('playableInEmbed'): raise ValueError('Unverified video')
        from email.utils import parsedate_to_datetime
        date = parsedate_to_datetime(item.findtext('pubDate')).date().isoformat()
        if not '2026-10-14' <= date <= TARGET['through']: continue
        cs = chapters(v.get('shortDescription','')); duration = int(v['lengthSeconds']); eid = '2026-'+key+'-preview-week-'+('7' if key=='sea' else '8')
        ep = {'id':eid,'episode':title,'published':date,'durationSeconds':duration,'url':url,'videoId':vid,'sourceChapters':url,'chapters':cs}
        added=[]
        for g in games:
            if not TARGET['from'] <= g['date'] <= TARGET['through'] or g.get('exhibition'): continue
            for i,c in enumerate(cs):
                conf={'aus':'AUS','rseq':'RSEQ','canwest':'CW','canadawest':'CW'}.get(norm(c['label']))
                pair=re.split(r'\s*(?:@| at | vs\.? )\s*', c['label'], flags=re.I)
                match = key=='sea' and conf==g['conference']
                match = match or (key=='oua' and g['conference']=='OUA' and len(pair)==2 and team(pair[0],g['away']) and team(pair[1],g['home']))
                end=cs[i+1]['start'] if i+1<len(cs) else duration
                if match and 0<=c['start']<end<=duration:
                    added.append({'episodeId':eid,'gameId':g['id'],'label':g['away'].replace('-',' ').title()+' at '+g['home'].replace('-',' ').title(),'start':c['start'],'end':end,'kind':'preview','scope':'conference' if key=='sea' else 'game','conference':g['conference'],'endsAtEpisodeEnd':end==duration})
        if added:
            source['episodes']=[e for e in source['episodes'] if e['id']!=eid]+[ep]
            source['segments']=[s for s in source['segments'] if s['episodeId']!=eid]+added
            state['shows'][key]={'title':title,'status':'verified','url':url,'published':date,'games':len(added)}
    # Preserve all existing reaction players and refresh only verified preview entries.
    (ROOT/'data/podcast-segment-sources.json').write_text(json.dumps(source,indent=2)+'\n')
    seed=ROOT/'podcast-game-segments-data.js'; old=json.loads(seed.read_text().split('=',1)[1].strip().rstrip(';'))
    old.update(source);old['previewStatus']=state
    seed.write_text('window.US_PODCAST_GAME_SEGMENTS='+json.dumps(old,separators=(',',':')).replace('<','\\u003c')+';\n')
    (ROOT/'data/podcast-preview-status.json').write_text(json.dumps(state,indent=2)+'\n')
    print(json.dumps(state))
if __name__=='__main__': run()
