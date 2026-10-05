"""Match award candidates to official roster bios; retain only verified headshots."""
import json,re,unicodedata,concurrent.futures,datetime
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
BIO_SOURCES={'mcgill:jerrymomo':'https://mcgillathletics.ca/sports/football/roster/jerry-momo/14884'}
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 U-Sports-Football-Independent-Media/1.0'}),timeout=25) as r:return BeautifulSoup(r.read(),'html.parser')
def collect(player,sources):
    name=player['name'];team=player['teamId'];slug={'saintmarys':'saint-marys','mountallison':'mount-allison'}.get(team,team)
    base=sources[slug]['url'];soup=fetch(base);key=norm(name)
    if slug=='laval':
        alignment=next((urljoin(base,a['href']) for a in soup.select('a[href]') if '/sports/football/alignement/' in a['href']),None)
        if alignment:base=alignment;soup=fetch(base)
    matches=[a for a in soup.select('a[href]') if norm(a.get_text(' ',strip=True))==key]
    urls=list(dict.fromkeys(urljoin(base,a['href']) for a in matches))
    if slug=='laval':urls=list(dict.fromkeys(urljoin(base,a['href']) for a in soup.select('a[href]') if '/athletes/' in a['href'] and key in norm(a.get_text(' ',strip=True))))
    if team+':'+key in BIO_SOURCES:urls=[BIO_SOURCES[team+':'+key]]
    if len(urls)!=1:raise ValueError('No unique official roster bio for '+name)
    bio=urls[0];page=fetch(bio)
    identity=' '.join(n.get_text(' ',strip=True) for n in page.select('h1,h2,title'))
    if key not in norm(identity):raise ValueError('Bio identity did not match '+name)
    images=page.select('.sidearm-roster-player-image img, .player-headshot img, .player-image img, .roster-player-image img')
    if not images:images=[i for i in page.select('img') if key in norm(i.get('alt',''))]
    image=next((i.get('data-src') or i.get('src') for i in images if i.get('data-src') or i.get('src')),None)
    if not image:
        title=page.select_one('meta[property="og:title"]');og=page.select_one('meta[property="og:image"]')
        if title and og and key in norm(title.get('content','')):image=og.get('content')
    if not image:raise ValueError('No official bio headshot found for '+name)
    image=urljoin(bio,image)
    if not image.startswith('https://'):raise ValueError('Unsupported image URL')
    return team+':'+key,dict(name=name,teamId=team,headshot=image,bio=bio)
def build():
    target=ROOT/'data/watch-media.json';prior=json.loads(target.read_text(encoding='utf-8')) if target.exists() else {'players':{}}
    sources=json.loads((ROOT/'roster-sources.json').read_text(encoding='utf-8'))
    watch=json.loads((ROOT/'data/season-watch.json').read_text(encoding='utf-8'))['USPORTS'];players=watch['players']
    result={'asOf':watch['asOf'],'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'players':{},'errors':{}}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(collect,p,sources):p for p in players}
        for job in concurrent.futures.as_completed(jobs):
            p=jobs[job];key=p['teamId']+':'+norm(p['name'])
            try:k,value=job.result();result['players'][k]=value
            except Exception as e:
                result['errors'][key]=str(e)
                if key in prior['players']:result['players'][key]=prior['players'][key]
    target.write_text(json.dumps(result,ensure_ascii=True),encoding='utf-8')
    (ROOT/'watch-media-data.js').write_text('window.SEASON_WATCH_MEDIA='+json.dumps(result).replace('<','\\u003c')+';',encoding='utf-8')
    print('Official headshots:',len(result['players']),'/',len(players),'errors:',result['errors'])
if __name__=='__main__':build()
