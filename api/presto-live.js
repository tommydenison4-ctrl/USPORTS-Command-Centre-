const SOURCES = {
  '2026-09-06-mcmaster-guelph': {
    page: 'https://oua.ca/sports/fball/2026-27/boxscores/20260906_zejw.xml',
    fallbackEvent: 'zejwko398jziv641',
    fallbackHash: 'jaZCLnq6vCM3X/A8apbO3cnD8QKyJYUz',
    awayId: 'MAC',
    homeId: 'GUE'
  }
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
function findTeamScore(data,teamId){ let best=null; walk(data,(o,path)=>{ const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr).toUpperCase(); if(id!==teamId.toUpperCase())return; for(const key of ['score','points','pts','total','totpts','tot_points']) if(o[key]!=null){ const n=num(o[key]); if(n!=null&&n>=0&&n<200){ const rank=/scores|team|dnp/.test(path.toLowerCase())?3:1; if(!best||rank>best.rank) best={value:n,rank}; } } }); return best?.value??null; }
function flattenPlays(data){ const out=[],seen=new Set(); walk(data?.plays,(o)=>{ if(Array.isArray(o))return; const desc=o.description??o.desc??o.text??o.play??o.summary??o.pbp; if(typeof desc!=='string'||desc.trim().length<4)return; const clock=text(o.clock??o.time??o.gameclock??o.game_clock), q=text(o.qtr??o.quarter??o.period??o.q), key=`${q}|${clock}|${desc}`; if(seen.has(key))return; seen.add(key); out.push({q,clock,description:desc.trim(),type:text(o.type??o.result??'PLAY').toUpperCase()}); }); return out.slice(-80).reverse(); }
function flattenDrives(data){ const out=[]; walk(data?.drives,(o)=>{ if(Array.isArray(o))return; const plays=num(o.plays??o.playCount??o.numplays),yards=num(o.yards??o.yds??o.netyards),team=text(o.team??o.teamId??o.team_id??o.id),result=text(o.result??o.end??o.summary??o.outcome),time=text(o.time??o.elapsed??o.top); if(plays!=null||yards!=null||result||time)out.push({team,plays,yards,result,time}); }); return out.slice(-24).reverse(); }
function teamAndPlayerStats(data){ const teamStats=[],playerStats=[]; walk(data?.team,(o,path)=>{ if(Array.isArray(o))return; const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr),name=text(o.name||o.player||o.fullname||o.full_name); const statKeys=Object.keys(o).filter(k=>/^(yds|yards|att|cmp|comp|td|int|rec|car|rush|pass|tkl|tack|sack|fg|xp|punt)/i.test(k)); if(!statKeys.length)return; const stats={}; statKeys.slice(0,24).forEach(k=>{if(['string','number'].includes(typeof o[k]))stats[k]=o[k]}); if(name&&!/^MAC$|^GUE$/i.test(name))playerStats.push({team:id,name,stats,path}); else if(id)teamStats.push({team:id,stats,path}); }); return {teamStats:teamStats.slice(0,30),playerStats:playerStats.slice(0,140)}; }
function normalize(data,source){ const status=data?.status||{},ps=teamAndPlayerStats(data); return {source:data?.source||'PrestoSports',version:data?.version||null,platformId:data?.platformId||null,lastUpdated:data?.network?.lastUpdated||data?.generated||new Date().toISOString(),status:{complete:text(status.complete).toUpperCase()==='Y',period:periodLabel(status),clock:text(status.clock),running:text(status.running)},game:{awayId:source.awayId,homeId:source.homeId,awayScore:findTeamScore(data,source.awayId),homeScore:findTeamScore(data,source.homeId)},plays:flattenPlays(data),drives:flattenDrives(data),teamStats:ps.teamStats,playerStats:ps.playerStats,rawKeys:Object.keys(data||{})}; }

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
  const patterns=[
    /liveupdate\?e=([^&"'<>\\]+)&h=([^"'<>\\\s]+)/i,
    /liveupdate\?e=([^&"'<>\\]+)&amp;h=([^"'<>\\\s]+)/i,
    /["']e["']\s*:\s*["']([^"']+)["'][\s\S]{0,300}?["']h["']\s*:\s*["']([^"']+)["']/i
  ];
  for(const p of patterns){ const m=html.match(p); if(m) return {event:decodeURIComponent(m[1]),hash:decodeURIComponent(m[2])}; }
  return null;
}
async function bootstrap(source){
  const r=await fetch(source.page,{redirect:'follow',headers:{...BASE_HEADERS,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Upgrade-Insecure-Requests':'1','Sec-Fetch-Site':'none','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'}});
  const html=await r.text();
  return {status:r.status,ok:r.ok,cookie:cookieHeader(r),found:discover(html),sample:html.slice(0,120)};
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
  const game=String(req.query.game||''),source=SOURCES[game];
  if(!source) return send(res,404,{ok:false,error:'No verified Presto source registered for this game',game});
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
      if(lr.ok&&lr.json){
        return send(res,200,{ok:true,game,upstreamStatus:lr.status,cadenceSeconds:10,sourcePage:source.page,bootstrapStatus:boot.status,credentialMode:c.kind,data:normalize(lr.json,source)});
      }
    }catch(e){ attempts.push({kind:c.kind,status:null,error:String(e?.message||e)}); }
  }
  return send(res,502,{ok:false,game,error:'OUA/Presto did not return usable live JSON to the Vercel function',sourcePage:source.page,bootstrapStatus:boot.status,bootstrapOk:boot.ok,discoveredCredentials:!!boot.found,attempts});
};
