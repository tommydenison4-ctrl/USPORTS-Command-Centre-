const SOURCE_DEF = {
  page: 'https://oua.ca/sports/fball/2026-27/boxscores/20260906_zejw.xml',
  fallbackEvent: 'zejwko398jziv641',
  fallbackHash: 'jaZCLnq6vCM3X/A8apbO3cnD8QKvJYUz',
  awayId: 'MAC',
  homeId: 'GUE'
};
const SOURCES = {
  '2026-09-06-mcmaster-guelph': SOURCE_DEF,
  '20260906_zejw': SOURCE_DEF,
  'zejw': SOURCE_DEF
};
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}
function text(v){ return v == null ? '' : String(v); }
function num(v){ const n=Number(String(v??'').replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:null; }
function walk(root, cb, path='$', seen=new WeakSet()){
  if(!root||typeof root!=='object'||seen.has(root)) return; seen.add(root); cb(root,path);
  if(Array.isArray(root)) root.forEach((v,i)=>walk(v,cb,`${path}[${i}]`,seen));
  else Object.entries(root).forEach(([k,v])=>walk(v,cb,`${path}.${k}`,seen));
}
function periodLabel(status){ const raw=Array.isArray(status?.period)?status.period[0]:status?.period; const p=text(raw).trim(); if(!p)return''; return /^\d+$/.test(p)?`Q${p}`:p.toUpperCase(); }
function numericScore(v){
  if(v==null) return null;
  if(typeof v==='number') return Number.isFinite(v)&&v>=0&&v<200?v:null;
  if(typeof v==='string' && /^\s*\d{1,3}\s*$/.test(v)){ const n=Number(v); return n<200?n:null; }
  return null;
}
function scoreFromSideNode(node){
  if(node==null) return null;
  const direct=numericScore(node); if(direct!=null) return direct;
  if(Array.isArray(node)){
    // Quarter-by-quarter arrays are common in line-score payloads. If no explicit
    // total is present, sum plausible quarter values.
    const vals=node.map(x=>numericScore(x)).filter(x=>x!=null);
    if(vals.length && vals.length===node.length && vals.every(x=>x<=60)) return vals.reduce((a,b)=>a+b,0);
    let best=null;
    for(const x of node){ const n=scoreFromSideNode(x); if(n!=null) best=n; }
    return best;
  }
  if(typeof node==='object'){
    for(const k of ['total','score','points','pts','totpts','tot_points','teamScore','team_score']){
      const n=numericScore(node[k]); if(n!=null) return n;
    }
    // Line-score objects can be q1/q2/q3/q4/ot without a total.
    const qvals=Object.entries(node).filter(([k])=>/^(?:q|quarter|period)?[1-9]|ot\d*$/i.test(k)).map(([,v])=>numericScore(v)).filter(v=>v!=null);
    if(qvals.length>=2) return qvals.reduce((a,b)=>a+b,0);
  }
  return null;
}
function extractScorePair(data,source){
  const scores=data?.scores;
  const aliases={
    away:[source.awayId,'away','visitor','vis','v','awayteam','visitorTeam'],
    home:[source.homeId,'home','host','h','hometeam','homeTeam']
  };
  const out={away:null,home:null};
  if(scores && typeof scores==='object'){
    for(const side of ['away','home']){
      for(const a of aliases[side]){
        for(const [k,v] of Object.entries(scores)){
          if(String(k).toLowerCase()===String(a).toLowerCase()){
            const n=scoreFromSideNode(v); if(n!=null){ out[side]=n; break; }
          }
        }
        if(out[side]!=null) break;
      }
    }
    if(Array.isArray(scores)){
      for(const o of scores){
        if(!o||typeof o!=='object') continue;
        const vh=text(o.vh||o.side||o.homeAway||o.home_away).toUpperCase();
        const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr).toUpperCase();
        const n=scoreFromSideNode(o); if(n==null) continue;
        if(vh==='V'||vh==='A'||id===source.awayId.toUpperCase()) out.away=n;
        if(vh==='H'||id===source.homeId.toUpperCase()) out.home=n;
      }
    }
  }
  // Look for explicit home/visitor scoreboard fields anywhere in the payload.
  walk(data,(o,path)=>{
    if(Array.isArray(o)) return;
    const low=path.toLowerCase();
    const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr).toUpperCase();
    const vh=text(o.vh||o.side||o.homeAway||o.home_away).toUpperCase();
    const n=scoreFromSideNode(o);
    if(n!=null){
      if(out.away==null && (id===source.awayId.toUpperCase()||vh==='V'||vh==='A'||/visitor|away/.test(low))) out.away=n;
      if(out.home==null && (id===source.homeId.toUpperCase()||vh==='H'||/home|host/.test(low))) out.home=n;
    }
    for(const [k,v] of Object.entries(o)){
      const sv=numericScore(v); if(sv==null) continue;
      const key=k.toLowerCase();
      if(out.away==null && /^(?:visitor|vis|away)(?:score|points|pts)?$/.test(key)) out.away=sv;
      if(out.home==null && /^(?:home|host)(?:score|points|pts)?$/.test(key)) out.home=sv;
    }
  });
  return out;
}
function findTeamScore(data,teamId,source){
  const pair=extractScorePair(data,source);
  return teamId.toUpperCase()===source.awayId.toUpperCase()?pair.away:pair.home;
}
function flattenPlays(data){ const out=[],seen=new Set(); walk(data?.plays,(o)=>{ if(Array.isArray(o))return; const desc=o.description??o.desc??o.text??o.play??o.summary??o.pbp; if(typeof desc!=='string'||desc.trim().length<4)return; const clock=text(o.clock??o.time??o.gameclock??o.game_clock), q=text(o.qtr??o.quarter??o.period??o.q), key=`${q}|${clock}|${desc}`; if(seen.has(key))return; seen.add(key); out.push({q,clock,description:desc.trim(),type:text(o.type??o.result??'PLAY').toUpperCase()}); }); return out.slice(-80).reverse(); }
function flattenDrives(data){ const out=[]; walk(data?.drives,(o)=>{ if(Array.isArray(o))return; const plays=num(o.plays??o.playCount??o.numplays),yards=num(o.yards??o.yds??o.netyards),team=text(o.team??o.teamId??o.team_id??o.id),result=text(o.result??o.end??o.summary??o.outcome),time=text(o.time??o.elapsed??o.top); if(plays!=null||yards!=null||result||time)out.push({team,plays,yards,result,time}); }); return out.slice(-24).reverse(); }
function teamAndPlayerStats(data){ const teamStats=[],playerStats=[]; walk(data?.team,(o,path)=>{ if(Array.isArray(o))return; const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr),name=text(o.name||o.player||o.fullname||o.full_name); const statKeys=Object.keys(o).filter(k=>/^(yds|yards|att|cmp|comp|td|int|rec|car|rush|pass|tkl|tack|sack|fg|xp|punt)/i.test(k)); if(!statKeys.length)return; const stats={}; statKeys.slice(0,24).forEach(k=>{if(['string','number'].includes(typeof o[k]))stats[k]=o[k]}); if(name&&!/^MAC$|^GUE$/i.test(name))playerStats.push({team:id,name,stats,path}); else if(id)teamStats.push({team:id,stats,path}); }); return {teamStats:teamStats.slice(0,30),playerStats:playerStats.slice(0,140)}; }
function normalize(data,source){ const status=data?.status||{},ps=teamAndPlayerStats(data); return {source:data?.source||'PrestoSports',version:data?.version||null,platformId:data?.platformId||null,lastUpdated:data?.network?.lastUpdated||data?.generated||new Date().toISOString(),status:{complete:text(status.complete).toUpperCase()==='Y',period:periodLabel(status),clock:text(status.clock),running:text(status.running)},game:{awayId:source.awayId,homeId:source.homeId,awayScore:findTeamScore(data,source.awayId,source),homeScore:findTeamScore(data,source.homeId,source)},plays:flattenPlays(data),drives:flattenDrives(data),teamStats:ps.teamStats,playerStats:ps.playerStats,rawKeys:Object.keys(data||{})}; }
function isLivePayload(json){ return !!(json && typeof json==='object' && !json.error && (json.status || json.plays || json.drives || json.team || json.scores || json.source==='PrestoSports')); }

const BASE_HEADERS={
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'Accept-Language':'en-CA,en;q=0.9',
  'Cache-Control':'no-cache','Pragma':'no-cache'
};
function cookieHeader(r){
  try{ if(typeof r.headers.getSetCookie==='function'){ const a=r.headers.getSetCookie(); if(a?.length)return a.map(x=>x.split(';')[0]).join('; '); } }catch{}
  const raw=r.headers.get('set-cookie'); return raw?raw.split(/,(?=[^;,]+=)/).map(x=>x.split(';')[0]).join('; '):'';
}
function htmlDecode(s=''){ return s.replace(/&amp;/g,'&').replace(/&#x2F;/gi,'/').replace(/&#47;/g,'/'); }
function discover(html){
  html=htmlDecode(html||'');
  // Presto's football page exposes the event id and its hash separately in the
  // bootstrap config. Prefer that explicit pair because the liveupdate URL itself
  // may contain only the `e` parameter.
  const confEvent = html.match(/conf\.eventId\s*=\s*['"]([^'"]+)['"]/i);
  const confHash = html.match(/conf\.eventIdHashCode\s*=\s*['"]([^'"]+)['"]/i);
  if(confEvent && confHash) return {event:confEvent[1], hash:confHash[1]};

  const patterns=[
    /liveupdate\?e=([^&"'<>\\]+)&h=([^"'<>\\\s]+)/i,
    /liveupdate\?e=([^&"'<>\\]+)&amp;h=([^"'<>\\\s]+)/i,
    /liveupdate[^\n]{0,300}?[?&]e(?:=|%3D)([^&"'<>\\\s]+)[&%][^\n]{0,80}?h(?:=|%3D)([^"'<>\\\s&]+)/i,
    /["']e["']\s*:\s*["']([^"']+)["'][\s\S]{0,500}?["']h["']\s*:\s*["']([^"']+)["']/i,
    /["']event["']\s*:\s*["']([^"']+)["'][\s\S]{0,500}?["'](?:hash|h)["']\s*:\s*["']([^"']+)["']/i
  ];
  for(const p of patterns){ const m=html.match(p); if(m) return {event:decodeURIComponent(m[1]),hash:decodeURIComponent(m[2])}; }
  return null;
}
async function bootstrap(source){
  const r=await fetch(source.page,{redirect:'follow',headers:{...BASE_HEADERS,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Upgrade-Insecure-Requests':'1','Sec-Fetch-Site':'none','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'}});
  const html=await r.text();
  const found=discover(html); const li=html.toLowerCase().indexOf('liveupdate'); const ei=html.toLowerCase().indexOf('zejwko'); return {status:r.status,ok:r.ok,cookie:cookieHeader(r),found,sample:html.slice(0,120),liveupdateSnippet:li>=0?html.slice(Math.max(0,li-180),li+500):'',eventSnippet:ei>=0?html.slice(Math.max(0,ei-180),ei+500):''};
}
async function fetchLive(source,creds,cookie=''){
  const u=new URL('https://oua.ca/action/sports/liveupdate'); u.searchParams.set('e',creds.event); u.searchParams.set('h',creds.hash);
  const headers={...BASE_HEADERS,'Accept':'application/json,text/plain,*/*','X-Requested-With':'XMLHttpRequest','Referer':source.page,'Origin':'https://oua.ca','Sec-Fetch-Site':'same-origin','Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'empty'};
  if(cookie) headers.Cookie=cookie;
  const r=await fetch(u,{method:'GET',redirect:'follow',headers}); const body=await r.text();
  let json=null; try{json=JSON.parse(body)}catch{}
  return {status:r.status,ok:r.ok,json,body:body.slice(0,240),url:u.toString()};
}

module.exports=async function handler(req,res){
  if(req.method==='OPTIONS') return send(res,200,{ok:true});
  if(req.method!=='GET') return send(res,405,{ok:false,error:'GET only'});
  const requestedGame=String(req.query.game||'');
  const source=SOURCES[requestedGame];
  const game = source ? '2026-09-06-mcmaster-guelph' : requestedGame;
  if(!source) return send(res,404,{ok:false,error:'No verified Presto source registered for this game',game:requestedGame,accepted:['2026-09-06-mcmaster-guelph','20260906_zejw','zejw']});
  let boot={status:null,ok:false,cookie:'',found:null,sample:''}, attempts=[];
  try{ boot=await bootstrap(source); }catch(e){ boot.error=String(e?.message||e); }
  const candidates=[];
  if(boot.found) candidates.push({...boot.found,kind:'discovered'});
  candidates.push({event:source.fallbackEvent,hash:source.fallbackHash,kind:'verified-fallback'});
  const unique=candidates.filter((x,i,a)=>a.findIndex(y=>y.event===x.event&&y.hash===x.hash)===i);
  for(const c of unique){
    try{
      const lr=await fetchLive(source,c,boot.cookie||'');
      attempts.push({kind:c.kind,status:lr.status,url:lr.url,body:lr.body});
      if(lr.ok&&isLivePayload(lr.json)){
        return send(res,200,{ok:true,game,upstreamStatus:lr.status,cadenceSeconds:10,sourcePage:source.page,bootstrapStatus:boot.status,credentialMode:c.kind,data:normalize(lr.json,source)});
      }
      if(lr.json?.error){ attempts[attempts.length-1].upstreamError=String(lr.json.error); }
    }catch(e){ attempts.push({kind:c.kind,status:null,error:String(e?.message||e)}); }
  }
  return send(res,502,{ok:false,game,error:'OUA/Presto returned a response, but it was not a usable live-stat payload',sourcePage:source.page,bootstrapStatus:boot.status,bootstrapOk:boot.ok,discoveredCredentials:!!boot.found,bootstrapLiveupdateSnippet:boot.liveupdateSnippet||'',bootstrapEventSnippet:boot.eventSnippet||'',attempts});
};
