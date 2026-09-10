const HEADERS={
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'Accept-Language':'en-CA,en;q=0.9','Cache-Control':'no-cache','Pragma':'no-cache'
};
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=30, s-maxage=60, stale-while-revalidate=300');res.end(JSON.stringify(body));}
function dec(s=''){return String(s).replace(/&amp;/g,'&').replace(/&#x2F;/gi,'/').replace(/&#47;/g,'/');}
function one(html,re){const m=String(html||'').match(re);return m?dec(m[1]):'';}
function boolVal(v){return String(v).toLowerCase()==='true';}
function cookieHeader(r){try{if(typeof r.headers.getSetCookie==='function'){const a=r.headers.getSetCookie();if(a?.length)return a.map(x=>x.split(';')[0]).join('; ');}}catch{} const raw=r.headers.get('set-cookie');return raw?raw.split(/,(?=[^;,]+=)/).map(x=>x.split(';')[0]).join('; '):'';}
async function getText(url){const r=await fetch(url,{redirect:'follow',headers:{...HEADERS,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});return {status:r.status,ok:r.ok,text:await r.text(),cookie:cookieHeader(r),url:r.url||url};}
function metaFromHtml(html,page){html=dec(html||'');return {page,event:one(html,/conf\.eventId\s*=\s*['"]([^'"]+)['"]/i),hash:one(html,/conf\.eventIdHashCode\s*=\s*['"]([^'"]+)['"]/i),visitor:one(html,/conf\.visitor\s*=\s*['"]([^'"]*)['"]/i),home:one(html,/conf\.home\s*=\s*['"]([^'"]*)['"]/i),final:boolVal(one(html,/conf\.statusFinal\s*=\s*['"]?([^;'"\n]+)['"]?/i).trim()),visitorLogo:one(html,/conf\.visitorTeamLogo\s*=\s*['"]([^'"]*)['"]/i),homeLogo:one(html,/conf\.homeTeamLogo\s*=\s*['"]([^'"]*)['"]/i)};}
async function fetchLive(meta,cookie=''){if(!meta.event||!meta.hash)return null;const origin=new URL(meta.page).origin,u=new URL('/action/sports/liveupdate',origin);u.searchParams.set('e',meta.event);u.searchParams.set('h',meta.hash);const headers={...HEADERS,'Accept':'application/json,text/plain,*/*','X-Requested-With':'XMLHttpRequest','Referer':meta.page,'Origin':origin};if(cookie)headers.Cookie=cookie;const r=await fetch(u,{headers,redirect:'follow'});const body=await r.text();let j=null;try{j=JSON.parse(body)}catch{}return {status:r.status,json:j};}
async function scanSchedule(scheduleUrl,date){const s=await getText(scheduleUrl);if(!s.ok)return [];const origin=new URL(scheduleUrl).origin;const re=new RegExp(`(?:https?:\\/\\/[^"'<>\\s]+)?\\/sports\\/fball\\/2026-27\\/boxscores\\/${date}_[A-Za-z0-9]+\\.xml`,'gi');const set=new Set();for(const m of s.text.matchAll(re)){let u=m[0];if(u.startsWith('/'))u=origin+u;set.add(u);}return [...set];}
function score(j){const rows=Array.isArray(j?.scores?.score)?j.scores.score:[];for(let i=rows.length-1;i>=0;i--){const a=Number(rows[i]?.vscore),h=Number(rows[i]?.hscore);if(Number.isFinite(a)&&Number.isFinite(h))return {away:a,home:h};}return {away:null,home:null};}
function quarters(j){const rows=Array.isArray(j?.scores?.score)?j.scores.score:[];const away=[0,0,0,0],home=[0,0,0,0];let pv=0,ph=0,seen=false;for(const r of rows){const q=Number(Array.isArray(r.qtr)?r.qtr[0]:r.qtr);const v=Number(r.vscore),h=Number(r.hscore);if(!(q>=1&&q<=4)||!Number.isFinite(v)||!Number.isFinite(h))continue;away[q-1]+=Math.max(0,v-pv);home[q-1]+=Math.max(0,h-ph);pv=v;ph=h;seen=true;}return seen?{away,home}:null;}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/university|universite|ravens|warriors|marauders|gryphons|golden hawks|lancers|mustangs|lions|gaels|gee gees|gee-gees/g,'').replace(/[^a-z0-9]/g,'');}
function matches(meta,away,home){if(!away&&!home)return true;const av=norm(meta.visitor),hm=norm(meta.home),a=norm(away),h=norm(home);return (!a||av.includes(a)||a.includes(av))&&(!h||hm.includes(h)||h.includes(hm));}
function scalarLeaves(root,prefix='',out=[],depth=0){if(depth>5||root==null)return out;if(['string','number'].includes(typeof root)){out.push({path:prefix,value:root});return out;}if(Array.isArray(root))return out;if(typeof root!=='object')return out;for(const [k,v] of Object.entries(root)){if(/player|roster|individual/i.test(k))continue;scalarLeaves(v,prefix?`${prefix}.${k}`:k,out,depth+1);}return out;}
function teamObjects(j){const arr=Array.isArray(j?.team)?j.team:(j?.team&&typeof j.team==='object'?Object.values(j.team):[]);return arr.filter(x=>x&&typeof x==='object');}
function pickTeam(arr,side){return arr.find(o=>String(o.vh||o.side||o.homeAway||'').toUpperCase()===(side==='away'?'V':'H'))||arr[side==='away'?0:1]||null;}
function pick(leaves,patterns){for(const re of patterns){const x=leaves.find(r=>re.test(r.path));if(x&&x.value!==''&&x.value!=null)return x.value;}return null;}
function compactStats(j){const arr=teamObjects(j),a=pickTeam(arr,'away'),h=pickTeam(arr,'home');if(!a||!h)return [];const al=scalarLeaves(a),hl=scalarLeaves(h);const defs=[
 ['First Downs',[/first.*down/i]],['Rushing Yards',[/rush.*yd/i,/rushing.*yard/i]],['Passing Yards',[/pass.*yd/i,/passing.*yard/i]],['Total Offense',[/total.*off/i,/offense.*yd/i,/total.*yard/i]],['Passing',[/pass.*(?:comp|cmp).*att/i,/comp.*att/i]],['Rushing Attempts',[/rush.*att/i]],['Third Down',[/third.*down/i,/3rd.*down/i]],['Fourth Down',[/fourth.*down/i,/4th.*down/i]],['Turnovers',[/turnover/i]],['Penalties',[/penalt/i]],['Sacks',[/sack/i]],['Time of Possession',[/time.*possession/i,/poss.*time/i]]
 ];
 const out=[];for(const [label,pats] of defs){const av=pick(al,pats),hv=pick(hl,pats);if(av!=null||hv!=null)out.push([label,av??'—',hv??'—']);}return out;
}
function plays(j){const a=Array.isArray(j?.plays?.play)?j.plays.play:[];return a.slice(-24).reverse().map(p=>({q:String(p.qtr||p.quarter||''),clock:String(p.clock||''),description:String(p.description||p.desc||p.text||'')})).filter(x=>x.description);}
function drives(j){const a=Array.isArray(j?.drives?.drive)?j.drives.drive:[];return a.slice(-16).reverse().map(d=>({team:String(d.team||''),plays:d.plays??'',yards:d.yards??d.yds??'',result:String(d.result||''),time:String(d.time||d.top||'')}));}


/* V60: verified completed-game registry for Sept. 6 OUA finals.
   These official Sidearm box scores are preferred before any Presto schedule discovery,
   so historical scorecards and box pages always hydrate deterministically. */
const SIDEARM_FINALS={
  '20260906|mcmaster|guelph':{
    page:'https://marauders.ca/sports/football/stats/2026/university-of-guelph/boxscore/14054',
    visitor:'McMaster',home:'Guelph',awayScore:20,homeScore:11,
    quarters:{away:[2,8,6,4],home:[0,7,4,0]},
    teamStats:[['First Downs',23,12],['Rushing Yards',47,71],['Passing Yards',281,255],['Total Offense',328,326],['Passing','27-45-0','15-32-1'],['Rushing Attempts',20,15],['Penalties','10-80','12-123'],['Sacks','6-43','0-0'],['Time of Possession','31:23','28:37'],['Field Goals','1-2','1-1']],
    leaders:{pass:[['Lucas Barresi','mcmaster',281],['Tristan Aboud','guelph',255]],rush:[['Micah DuChene','mcmaster',46],['Caleb Sargeant','guelph',84]],receive:[['Nathan Denkers','mcmaster',66],['Ethan Garwe','guelph',119]]},
    visitorLogo:'https://marauders.ca/images/logos/site/site.png',
    homeLogo:'https://marauders.ca/images/logos/Guelph_2025.png'
  },
  '20260906|waterloo|carleton':{
    page:'https://athletics.uwaterloo.ca/sports/football/stats/2026-27/carleton-ravens/boxscore/9405',
    visitor:'Waterloo',home:'Carleton',awayScore:31,homeScore:26,
    quarters:{away:[10,14,0,7],home:[0,20,0,6]},
    teamStats:[['First Downs',36,20],['Rushing Yards',205,50],['Passing Yards',352,386],['Total Offense',557,436],['Passing','29-51-0','25-41-1'],['Rushing Attempts',34,17],['Penalties','15-180','9-81'],['Time of Possession','36:16','23:44'],['Field Goals','1-1','2-2']],
    leaders:{pass:[['Nick Orr','waterloo',352],['Elijah Barnes','carleton',386]],rush:[['Ethan Miller','waterloo',85],['Keyshawn Reid','carleton',23]],receive:[['Evan Basalyga','waterloo',112],['Dante Spadaccini','carleton',118]]},
    visitorLogo:'https://athletics.uwaterloo.ca/images/logos/site/site.png',
    homeLogo:'https://athletics.uwaterloo.ca/images/2026/6/4/Carleton.png'
  },
  '20260906|laurier|windsor':{
    page:'https://laurierathletics.com/sports/football/stats/2026/windsor/boxscore/10586',
    visitor:'Laurier',home:'Windsor',awayScore:37,homeScore:48,
    quarters:{away:[7,14,6,10],home:[9,7,10,22]},
    teamStats:[['First Downs',19,28],['Rushing Yards',33,457],['Passing Yards',288,267],['Total Offense',321,724],['Passing','23-41-1','21-33-1'],['Rushing Attempts',20,26],['Penalties','4-0','6-0'],['Sacks','0-0','2-14'],['Time of Possession','39:58','30:42'],['Field Goals','1-3','0-1']],
    leaders:{pass:[['Will Russell','laurier',288],['Kareame Cotton','windsor',267]],rush:[['Tayshaun Jackson','laurier',33],['Weagbe Mombo','windsor',211]],receive:[['Ryan Hughes','laurier',143],['Nathan Smith','windsor',102]]},
    visitorLogo:'https://laurierathletics.com/images/logos/site/site.png',
    homeLogo:'https://laurierathletics.com/images/logos/x4.png'
  },
  '20260906|york|western':{
    page:'https://yorkulions.ca/sports/football/stats/2026/western-mustangs/boxscore/8017',
    visitor:'York',home:'Western',awayScore:7,homeScore:78,
    quarters:{away:[0,0,7,0],home:[17,21,21,19]},
    teamStats:[['First Downs',14,33],['Rushing Yards',19,317],['Passing Yards',156,510],['Total Offense',175,827],['Passing','19-29-3','29-33-0'],['Rushing Attempts',16,31],['Penalties','3-10','7-98'],['Sacks','2-15','3-13'],['Time of Possession','26:23','33:37']],
    leaders:{pass:[['Maurice Sodja','york',156],['Jerome Rancourt','western',339]],rush:[['Rex Walker','york',31],['Ethan Dolby','western',97]],receive:[['Zack Smith','york',44],['Nik Shewchuk','western',139]]},
    visitorLogo:'https://yorkulions.ca/images/logos/site/site.png',
    homeLogo:'https://westernmustangs.ca/images/logos/site/site.png'
  }
};
function slugish(s=''){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/university|universite|golden hawks|ravens|warriors|marauders|gryphons|lancers|mustangs|lions|gaels|gee gees|gee-gees/g,'').replace(/[^a-z0-9]/g,'');}
function sidearmFallback(date,away,home,detail){
  const key=`${date}|${slugish(away)}|${slugish(home)}`;
  const g=SIDEARM_FINALS[key]; if(!g)return null;
  return {page:g.page,boxId:'sidearm',visitor:g.visitor,home:g.home,visitorLogo:g.visitorLogo,homeLogo:g.homeLogo,final:true,awayScore:g.awayScore,homeScore:g.homeScore,
    ...(detail?{quarters:g.quarters,teamStats:g.teamStats,leaders:g.leaders,plays:[],drives:[],lastUpdated:'verified-final'}:{})};
}

module.exports=async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{ok:false,error:'GET only'});
 const date=String(req.query.date||'').replace(/\D/g,'').slice(0,8);if(date.length!==8)return send(res,400,{ok:false,error:'date=YYYYMMDD required'});
 const away=String(req.query.away||''),home=String(req.query.home||''),detail=String(req.query.detail||'')==='1';
 const direct=sidearmFallback(date,away,home,detail);
 if(direct)return send(res,200,{ok:true,date,count:1,games:[direct],mode:'verified-completed-registry'});
 const scheduleUrls=['https://en.usports.ca/sports/fball/2026-27/schedule','https://oua.ca/sports/fball/2026-27/schedule'];
 let pages=[];for(const u of scheduleUrls){try{pages.push(...await scanSchedule(u,date));}catch{}}pages=[...new Set(pages)].slice(0,30);
 const games=[];
 for(const page of pages){try{const b=await getText(page);if(!b.ok)continue;const meta=metaFromHtml(b.text,page);if(!meta.event||!meta.hash||!matches(meta,away,home))continue;const live=await fetchLive(meta,b.cookie);const j=live?.json;if(!j||j.error)continue;const sc=score(j);games.push({page,boxId:(page.match(/\/([^/]+)\.xml$/)||[])[1]||'',visitor:meta.visitor,home:meta.home,visitorLogo:meta.visitorLogo,homeLogo:meta.homeLogo,final:meta.final||String(j?.status?.complete||'').toUpperCase()==='Y',awayScore:sc.away,homeScore:sc.home,...(detail?{quarters:quarters(j),teamStats:compactStats(j),plays:plays(j),drives:drives(j),lastUpdated:String(j?.network?.lastUpdated||'')}:{})});if(detail&&away&&home)break;}catch{}}
 if(!games.length){const fb=sidearmFallback(date,away,home,detail);if(fb)games.push(fb);}
 send(res,200,{ok:true,date,count:games.length,games});
};
