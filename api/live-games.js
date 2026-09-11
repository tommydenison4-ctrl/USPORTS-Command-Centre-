const LIVE_SOURCE_CACHE=globalThis.__LIVE_SOURCE_CACHE||(globalThis.__LIVE_SOURCE_CACHE=new Map());
const HEADERS={
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'Accept-Language':'en-CA,en;q=0.9','Cache-Control':'no-cache','Pragma':'no-cache'
};
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(body));}
function dec(s=''){return s.replace(/&amp;/g,'&').replace(/&#x2F;/gi,'/').replace(/&#47;/g,'/');}
function one(html,re){const m=html.match(re);return m?dec(m[1]):'';}
function boolVal(v){return String(v).toLowerCase()==='true';}
function cookieHeader(r){try{if(typeof r.headers.getSetCookie==='function'){const a=r.headers.getSetCookie();if(a?.length)return a.map(x=>x.split(';')[0]).join('; ');}}catch{} const raw=r.headers.get('set-cookie');return raw?raw.split(/,(?=[^;,]+=)/).map(x=>x.split(';')[0]).join('; '):'';}
async function getText(url){const r=await fetch(url,{redirect:'follow',headers:{...HEADERS,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});return {status:r.status,ok:r.ok,text:await r.text(),cookie:cookieHeader(r),url:r.url||url};}
function metaFromHtml(html,page){
  html=dec(html||'');
  const event=one(html,/conf\.eventId\s*=\s*['"]([^'"]+)['"]/i);
  const hash=one(html,/conf\.eventIdHashCode\s*=\s*['"]([^'"]+)['"]/i);
  const visitor=one(html,/conf\.visitor\s*=\s*['"]([^'"]*)['"]/i);
  const home=one(html,/conf\.home\s*=\s*['"]([^'"]*)['"]/i);
  const pregame=one(html,/conf\.pregame\s*=\s*([^;\n]+)/i).trim();
  const final=one(html,/conf\.statusFinal\s*=\s*['"]?([^;'"\n]+)['"]?/i).trim();
  const visitorLogo=one(html,/conf\.visitorTeamLogo\s*=\s*['"]([^'"]*)['"]/i);
  const homeLogo=one(html,/conf\.homeTeamLogo\s*=\s*['"]([^'"]*)['"]/i);
  return {page,event,hash,visitor,home,pregame:boolVal(pregame),final:boolVal(final),visitorLogo,homeLogo};
}
async function fetchLive(meta,cookie=''){
  if(!meta.event||!meta.hash)return null;
  const origin=new URL(meta.page).origin;
  const u=new URL('/action/sports/liveupdate',origin);u.searchParams.set('e',meta.event);u.searchParams.set('h',meta.hash);
  const headers={...HEADERS,'Accept':'application/json,text/plain,*/*','X-Requested-With':'XMLHttpRequest','Referer':meta.page,'Origin':origin}; if(cookie)headers.Cookie=cookie;
  const r=await fetch(u,{headers,redirect:'follow'});const body=await r.text();let j=null;try{j=JSON.parse(body)}catch{};return {status:r.status,json:j};
}
function lastScore(j){const rows=Array.isArray(j?.scores?.score)?j.scores.score:[];if(!rows.length)return {away:0,home:0};const x=rows[rows.length-1]||{};const a=Number(x.vscore),h=Number(x.hscore);return {away:Number.isFinite(a)?a:0,home:Number.isFinite(h)?h:0};}
function period(j){let p=Array.isArray(j?.status?.period)?j.status.period[0]:j?.status?.period;p=String(p||'').trim();return /^\d+$/.test(p)?`Q${p}`:p.toUpperCase();}
function isActuallyLive(meta,j){if(meta.final)return false;const complete=String(j?.status?.complete||'').toUpperCase()==='Y';if(complete)return false;const p=period(j),clock=String(j?.status?.clock||'');return meta.pregame===false && (!!p||!!clock||Array.isArray(j?.plays?.play)||Array.isArray(j?.scores?.score));}
async function scanSchedule(scheduleUrl,date){
  const s=await getText(scheduleUrl);if(!s.ok)return [];
  const origin=new URL(scheduleUrl).origin;
  const set=new Set();
  const html=dec(s.text||'');
  // Presto pages can expose the live-stat XML as absolute, root-relative, or
  // season-relative hrefs. Do not require one specific host/path shape.
  const patterns=[
    new RegExp(`https?:\\/\\/[^"'<>\\s]+\\/sports\\/fball\\/[^"'<>\\s]+\\/boxscores\\/${date}_[A-Za-z0-9_-]+\\.xml`,'gi'),
    new RegExp(`\\/sports\\/fball\\/[^"'<>\\s]+\\/boxscores\\/${date}_[A-Za-z0-9_-]+\\.xml`,'gi'),
    new RegExp(`(?:href|data-url|data-link)=["']([^"']*boxscores\\/${date}_[A-Za-z0-9_-]+\\.xml[^"']*)["']`,'gi')
  ];
  for(const re of patterns){
    for(const m of html.matchAll(re)){
      let u=(m[1]||m[0]||'').replace(/^(?:href|data-url|data-link)=["']?/i,'').replace(/["']$/,'');
      try{u=new URL(u,origin).href;}catch{continue;}
      set.add(u);
    }
  }
  return [...set];
}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'GET only'});
  const date=String(req.query.date||'20260906').replace(/\D/g,'').slice(0,8);
  const scheduleUrls=[
    'https://en.usports.ca/sports/fball/2026-27/schedule',
    'https://oua.ca/sports/fball/2026-27/schedule',
    'https://www.atlanticuniversitysport.com/sports/fball/2026-27/schedule',
    'https://atlanticuniversitysport.com/sports/fball/2026-27/schedule',
    'https://aus.prestosports.com/sports/fball/2026-27/schedule',
    'https://smuhuskies.ca/sports/fball/2026-27/schedule',
    'https://www.smuhuskies.ca/sports/fball/2026-27/schedule',
    'https://smu.prestosports.com/sports/fball/2026-27/schedule',
    'https://smu.prestosports.com/sports/fball/index',
    'https://mountiepride.ca/sports/fball/2026-27/schedule',
    'https://mountiepriderefresh2023.prestosports.com/sports/fball/2026-27/schedule',
    'https://mountiepriderefresh2023.prestosports.com/sports/fball/index',
    'https://www.mountiepride.ca/sports/fball/2026-27/schedule'
  ];
  let pages=[];for(const u of scheduleUrls){try{pages.push(...await scanSchedule(u,date));}catch{}}
  pages=[...new Set(pages)].slice(0,20);
  const candidates=[];
  const games=(await Promise.all(pages.map(async page=>{
    try{
      const b=await getText(page);if(!b.ok)return null;const meta=metaFromHtml(b.text,page);if(!meta.event||!meta.hash)return null;
      const candidate={boxId:(page.match(/\/([^/]+)\.xml$/)||[])[1]||'',page,visitor:meta.visitor||'Away',home:meta.home||'Home',visitorLogo:meta.visitorLogo,homeLogo:meta.homeLogo};
      candidates.push(candidate);
      LIVE_SOURCE_CACHE.set([date,String(meta.visitor).toLowerCase(),String(meta.home).toLowerCase()].join('|'),{t:Date.now(),v:candidate});
      if(meta.final)return null;
      const live=await fetchLive(meta,b.cookie);if(!live?.json||live.json.error||!isActuallyLive(meta,live.json))return null;const sc=lastScore(live.json);return {...candidate,awayScore:sc.away,homeScore:sc.home,period:period(live.json),clock:String(live.json?.status?.clock||''),lastUpdated:String(live.json?.network?.lastUpdated||'')};
    }catch{return null;}
  }))).filter(Boolean);
  // Warm-instance fallback: if upstream schedule discovery flickers, keep returning the
  // last proven source candidates instead of making clients forget a working page.
  if(!candidates.length){for(const [k,o] of LIVE_SOURCE_CACHE){if(k.startsWith(date+'|')&&Date.now()-o.t<6*60*60*1000)candidates.push(o.v)}}
  send(res,200,{ok:true,date,count:games.length,games,candidates:[...new Map(candidates.map(x=>[x.page,x])).values()]});
};
