const SOURCES = [
  // OUA
  {team:'mcmaster',source:'McMaster Athletics',url:'https://marauders.ca/sports/football'},
  {team:'guelph',source:'Guelph Athletics',url:'https://gryphons.ca/sports/football'},
  {team:'waterloo',source:'Waterloo Athletics',url:'https://athletics.uwaterloo.ca/sports/football'},
  {team:'carleton',source:'Carleton Athletics',url:'https://goravens.ca/varsity/football/'},
  {team:'laurier',source:'Laurier Athletics',url:'https://laurierathletics.com/sports/football'},
  {team:'windsor',source:'Windsor Lancers',url:'https://golancers.ca/sports/football'},
  {team:'western',source:'Western Mustangs',url:'https://westernmustangs.ca/sports/football'},
  {team:'york',source:'York Athletics',url:'https://yorkulions.ca/sports/football'},
  {team:'toronto',source:'Toronto Varsity Blues',url:'https://varsityblues.ca/sports/football'},
  {team:'queens',source:"Queen's Athletics",url:'https://gogaelsgo.com/sports/football'},
  {team:'ottawa',source:'Ottawa Gee-Gees',url:'https://geegees.ca/sports/football'},
  // RSEQ
  {team:'bishops',source:"Bishop's Athletics",url:'https://gaiters.ca/sports/football'},
  {team:'mcgill',source:'McGill Athletics',url:'https://mcgillathletics.ca/sports/football'},
  {team:'concordia',source:'Concordia Stingers',url:'https://stingers.ca/football/'},
  {team:'laval',source:'Laval Rouge et Or',url:'https://rougeetor.ulaval.ca/sports/football/'},
  {team:'montreal',source:'Montréal Carabins',url:'https://carabins.umontreal.ca/football/'},
  {team:'sherbrooke',source:'Sherbrooke Vert & Or',url:'https://www.usherbrooke.ca/vertetor/sports/football/'},
  // AUS
  {team:'acadia',source:'Acadia Athletics',url:'https://acadiaathletics.ca/sports/fball/index'},
  {team:'mount-allison',source:'Mount Allison Athletics',url:'https://mountiepride.ca/sports/fball/index'},
  {team:'saint-marys',source:"Saint Mary's Athletics",url:'https://smuhuskies.ca/sports/fball/index'},
  {team:'stfx',source:'StFX Athletics',url:'https://goxgo.ca/sports/fball/index'},
  // Canada West
  {team:'calgary',source:'Calgary Dinos',url:'https://godinos.com/sports/football'},
  {team:'ubc',source:'UBC Thunderbirds',url:'https://gothunderbirds.ca/sports/football'},
  {team:'manitoba',source:'Manitoba Bisons',url:'https://gobisons.ca/sports/football'},
  {team:'saskatchewan',source:'Saskatchewan Huskies',url:'https://huskies.usask.ca/sports/football'},
  {team:'regina',source:'Regina Rams',url:'https://www.reginacougars.com/sports/football'},
  {team:'alberta',source:'Alberta Golden Bears',url:'https://bearsandpandas.ca/sports/football'}
];

const VERIFIED_BOOTSTRAP = [
  {teams:['laurier'],date:'2026-09-09',title:'Golden Hawks football ranked #5 nationally heading into Week 3',source:'Laurier Athletics',url:'https://laurierathletics.com/news/2026/9/9/football-golden-hawks-football-ranked-5-nationally-heading-into-week-3.aspx',type:'official'},
  {teams:['laurier','windsor'],date:'2026-09-09',title:"#9 Windsor snaps #4 Laurier's 17-game regular-season win streak",source:'Laurier Athletics',url:'https://laurierathletics.com/news/2026/9/9/football-9-windsor-snaps-4-lauriers-17-game-regular-season-win-streak.aspx',type:'official'},
  {teams:['western'],date:'2026-09-09',title:'Mustangs Recap: Sept. 4-6',source:'Western Mustangs',url:'https://westernmustangs.ca/news/2026/9/9/mustangs-recap-sept-4-6.aspx',type:'official'},
  {teams:['mcmaster'],date:'2026-09-08',title:'Marauder Minute (August 31-September 6, 2026)',source:'McMaster Athletics',url:'https://marauders.ca/news/2026/9/8/media-marauder-minute-august-31-september-6-2026.aspx',type:'official'},
  {teams:['laurier'],date:'2026-09-08',title:'Goetz, Hughes, and Jackson named Laurier football Players of the Week',source:'Laurier Athletics',url:'https://laurierathletics.com/news/2026/9/8/football-goetz-hughes-and-jackson-named-laurier-football-players-of-the-week.aspx',type:'official'},
  {teams:['york','western'],date:'2026-09-06',title:'Lions lose first game of 2026 to Mustangs',source:'York Athletics',url:'https://yorkulions.ca/news/2026/9/6/football-lions-lose-first-game-of-2026-to-mustangs.aspx',type:'official'},
  {teams:['western','york'],date:'2026-09-06',title:'Mustangs dominate York 78-7 in season opener',source:'Western Mustangs',url:'https://westernmustangs.ca/news/2026/9/6/football-mustangs-dominate-york-78-7-in-season-opener.aspx',type:'official'},
  {teams:['western'],date:'2026-09-06',title:'Michael Faulds: Coming Home',source:'Western Mustangs',url:'https://westernmustangs.ca/news/2026/9/6/football-michael-faulds-coming-home.aspx',type:'official'},
  {teams:['mcmaster','guelph'],date:'2026-09-06',title:'Marauders stifle Gryphons in 20-11 victory',source:'McMaster Athletics',url:'https://marauders.ca/news/2026/9/6/football-marauders-stifle-gryphons-in-20-11-victory.aspx',type:'official'}
];

function stripTags(s=''){
  return s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/&ndash;|&#8211;/g,'–').replace(/&mdash;|&#8212;/g,'—').replace(/\s+/g,' ').trim();
}
function abs(base,href){ try{return new URL(href,base).href}catch{return ''} }
function isoDate(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` }
function dateFromUrl(url){
  let m=url.match(/\/(?:news\/)?(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})(?:\/|[-_])/i);
  return m?isoDate(m[1],m[2],m[3]):'';
}
function dateFromText(text=''){
  let m=text.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/); if(m)return isoDate(m[1],m[2],m[3]);
  m=text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/); if(m)return isoDate(m[3],m[1],m[2]);
  const mons={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,sep:9,sept:9,september:9,oct:10,nov:11,dec:12};
  m=text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:,)?\s+(20\d{2})\b/i);
  if(m)return isoDate(m[3],mons[m[1].toLowerCase().replace('.','')],m[2]);
  return '';
}
function cutoff(days){ const d=new Date(); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()-days); return d.toISOString().slice(0,10); }
function looksFootball(title,context=''){
  const s=(title+' '+context).toLowerCase();
  if(/soccer|basketball|volleyball|hockey|rugby|baseball|softball|track|cross country|golf|swim|lacrosse/.test(s) && !/football/.test(s)) return false;
  return /football|gridiron|quarterback|touchdown|touchdowns|kickoff|mustang|marauder|warrior|raven|gryphon|lancer|lion|golden hawk|gael|gee-gee|dino|thunderbird|bison|husk|ram|golden bear|rouge et or|carabin|vert & or|gaiter|stinger|mountie|x-men|x-men|xmen/.test(s);
}
function parsePage(html,row,minDate){
  const {team,source,url:base}=row; const out=[]; const seen=new Set();
  const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(html))){
    const href=m[1]; if(!href||href.startsWith('#')||href.startsWith('javascript:'))continue;
    const url=abs(base,href); if(!url||seen.has(url))continue;
    let title=stripTags(m[2]);
    const start=Math.max(0,m.index-650), end=Math.min(html.length,re.lastIndex+650);
    const chunk=html.slice(start,end), context=stripTags(chunk);
    if(title.length<8){
      const tm=chunk.match(/(?:title|headline|sidearm-card-title|s-title)[^>]*>\s*(?:<[^>]+>)*([^<]{8,220})/i);
      if(tm)title=stripTags(tm[1]);
    }
    if(title.length<8||title.length>240||/^(read more|details|story|football|schedule|roster|news|more)$/i.test(title))continue;
    if(!looksFootball(title,context))continue;
    let date=dateFromUrl(url)||dateFromText(context);
    if(!date||date<minDate)continue;
    // Prefer actual story/article URLs; reject utility/navigation links.
    if(!/news|article|story|actualit|nouvelle|football|fball|sports/i.test(url))continue;
    seen.add(url); out.push({teams:[team],date,title,source,url,type:'official'});
  }
  return out.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
}
function candidateUrls(row){
  const u=new URL(row.url); const root=u.origin;
  const urls=[row.url];
  // Sidearm and Presto sites commonly expose recent stories on these routes even when the sport landing page is JS-heavy.
  ['/sports/football/archives','/sports/football/news','/news','/sports/fball/index'].forEach(path=>urls.push(root+path));
  return [...new Set(urls)];
}
async function fetchHtml(url){
  const ac=new AbortController(); const t=setTimeout(()=>ac.abort(),6500);
  try{
    const r=await fetch(url,{signal:ac.signal,headers:{'user-agent':'Mozilla/5.0 (compatible; U-Sports-Football-News/3.0; +https://usports.ca)','accept':'text/html,application/xhtml+xml','accept-language':'en-CA,en;q=0.9,fr-CA;q=0.8'}});
    const text=await r.text(); return {status:r.status,text:r.ok?text:''};
  }catch(e){return {status:0,text:'',error:e?.name||'fetch_error'}} finally{clearTimeout(t)}
}
async function fetchOne(row,minDate){
  const urls=candidateUrls(row); const stories=[]; let bestStatus=0; let error=null;
  for(const url of urls){
    const got=await fetchHtml(url); bestStatus=Math.max(bestStatus,got.status||0); if(got.error)error=got.error;
    if(got.text){
      const parsed=parsePage(got.text,{...row,url},minDate);
      for(const x of parsed) if(!stories.some(y=>y.url===x.url)) stories.push(x);
      if(stories.length>=12) break;
    }
  }
  return {team:row.team,source:row.source,url:row.url,status:bestStatus,error,stories:stories.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12)};
}
async function pooled(items,limit,fn){
  const out=new Array(items.length); let next=0;
  async function worker(){while(true){const i=next++; if(i>=items.length)return; out[i]=await fn(items[i]);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker)); return out;
}
export default async function handler(req,res){
  const days=Math.max(3,Math.min(30,Number(req.query.days||14))); const minDate=cutoff(days);
  const results=await pooled(SOURCES,8,s=>fetchOne(s,minDate));
  const map=new Map();
  [...VERIFIED_BOOTSTRAP,...results.flatMap(x=>x.stories)].forEach(x=>{if(x.date>=minDate&&x.url&&!map.has(x.url))map.set(x.url,x)});
  const stories=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
  // A short CDN cache keeps the scrape continuous without hammering 27 school sites for every visitor.
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=120');
  res.status(200).json({ok:true,generatedAt:new Date().toISOString(),minDate,nextRefreshSeconds:60,stories,sourceStatus:results.map(x=>({team:x.team,source:x.source,status:x.status,count:x.stories.length,error:x.error||null}))});
}
