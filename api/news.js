const SOURCES = [
  ['mcmaster','McMaster Athletics','https://marauders.ca/sports/football'],
  ['guelph','Guelph Athletics','https://gryphons.ca/sports/football'],
  ['waterloo','Waterloo Athletics','https://athletics.uwaterloo.ca/sports/football'],
  ['carleton','Carleton Athletics','https://goravens.ca/varsity/football/'],
  ['laurier','Laurier Athletics','https://laurierathletics.com/sports/football'],
  ['windsor','Windsor Lancers','https://golancers.ca/sports/football'],
  ['western','Western Mustangs','https://westernmustangs.ca/sports/football'],
  ['york','York Athletics','https://yorkulions.ca/sports/football'],
  ['toronto','Toronto Varsity Blues','https://varsityblues.ca/sports/football'],
  ['queens',"Queen's Athletics",'https://gogaelsgo.com/sports/football'],
  ['ottawa','Ottawa Gee-Gees','https://geegees.ca/sports/football'],
  ['bishops',"Bishop's Athletics",'https://gaiters.ca/sports/football'],
  ['mcgill','McGill Athletics','https://mcgillathletics.ca/sports/football'],
  ['concordia','Concordia Athletics','https://stingers.ca/football/'],
  ['calgary','Calgary Dinos','https://godinos.com/sports/football'],
  ['ubc','UBC Thunderbirds','https://gothunderbirds.ca/sports/football'],
  ['manitoba','Manitoba Bisons','https://gobisons.ca/sports/football'],
  ['saskatchewan','Saskatchewan Huskies','https://huskies.usask.ca/sports/football'],
  ['regina','Regina Rams','https://www.reginacougars.com/sports/football'],
  ['alberta','Alberta Golden Bears','https://bearsandpandas.ca/sports/football']
];

// Fresh verified bootstrap records keep the feed current even if one school blocks server-side listing-page requests.
const VERIFIED_BOOTSTRAP = [
  {teams:['mcmaster'],date:'2026-09-08',title:'Marauder Minute (August 31-September 6, 2026)',source:'McMaster Athletics',url:'https://marauders.ca/news/2026/9/8/media-marauder-minute-august-31-september-6-2026.aspx',type:'official'},
  {teams:['laurier'],date:'2026-09-09',title:'Golden Hawks football ranked #5 nationally heading into Week 3',source:'Laurier Athletics',url:'https://laurierathletics.com/news/2026/9/9/football-golden-hawks-football-ranked-5-nationally-heading-into-week-3.aspx',type:'official'},
  {teams:['laurier','windsor'],date:'2026-09-09',title:"#9 Windsor snaps #4 Laurier's 17-game regular-season win streak",source:'Laurier Athletics',url:'https://laurierathletics.com/news/2026/9/9/football-9-windsor-snaps-4-lauriers-17-game-regular-season-win-streak.aspx',type:'official'}
];

function stripTags(s=''){
  return s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function abs(base,href){ try{return new URL(href,base).href}catch{return ''} }
function dateFromUrl(url){
  let m=url.match(/\/news\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//i);
  if(!m) return '';
  return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
}
function cutoff(days){ const d=new Date(); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()-days); return d.toISOString().slice(0,10); }
function parsePage(html,team,source,base,minDate){
  const out=[]; const seen=new Set();
  // SIDEARM and similar athletics pages expose dated news URLs in ordinary anchors.
  const re=/<a\b[^>]*href=["']([^"']*\/news\/20\d{2}\/\d{1,2}\/\d{1,2}\/[^"'#?]+(?:\.aspx)?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(html))){
    const url=abs(base,m[1]); const date=dateFromUrl(url); if(!date||date<minDate||seen.has(url)) continue;
    let title=stripTags(m[2]);
    if(title.length<8){
      const start=Math.max(0,m.index-350), end=Math.min(html.length,re.lastIndex+350);
      const chunk=html.slice(start,end);
      const tm=chunk.match(/(?:title|sidearm-card-title|s-title)[^>]*>\s*(?:<[^>]+>)*([^<]{8,180})/i);
      if(tm) title=stripTags(tm[1]);
    }
    if(title.length<8 || /^(read more|details|story|football)$/i.test(title)) continue;
    // Keep football-specific stories. Listing pages sometimes contain all-sport cards.
    const context=stripTags(html.slice(Math.max(0,m.index-250),Math.min(html.length,re.lastIndex+250))).toLowerCase();
    if(!/football|gridiron|marauder|warrior|raven|gryphon|lancer|mustang|lion|golden hawk|gael|gee-gee|dino|thunderbird|bison|husk|ram|golden bear/.test((title+' '+context).toLowerCase())) continue;
    seen.add(url); out.push({teams:[team],date,title,source,url,type:'official'});
  }
  return out.slice(0,8);
}
async function fetchOne(row,minDate){
  const [team,source,url]=row; const ac=new AbortController(); const t=setTimeout(()=>ac.abort(),4500);
  try{
    const r=await fetch(url,{signal:ac.signal,headers:{'user-agent':'Mozilla/5.0 U-Sports-Football-News/1.0','accept':'text/html,application/xhtml+xml'}});
    const text=await r.text();
    return {team,source,url,status:r.status,stories:r.ok?parsePage(text,team,source,url,minDate):[]};
  }catch(e){ return {team,source,url,status:0,error:e?.name||'fetch_error',stories:[]}; }
  finally{clearTimeout(t)}
}
export default async function handler(req,res){
  const days=Math.max(3,Math.min(30,Number(req.query.days||14))); const minDate=cutoff(days);
  const results=await Promise.all(SOURCES.map(s=>fetchOne(s,minDate)));
  const map=new Map();
  [...VERIFIED_BOOTSTRAP,...results.flatMap(x=>x.stories)].forEach(x=>{
    if(x.date>=minDate && !map.has(x.url)) map.set(x.url,x);
  });
  const stories=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
  res.status(200).json({ok:true,generatedAt:new Date().toISOString(),minDate,stories,sourceStatus:results.map(x=>({team:x.team,source:x.source,status:x.status,count:x.stories.length,error:x.error||null}))});
}
