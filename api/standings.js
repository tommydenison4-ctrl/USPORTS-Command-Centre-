const TEAMS=[{"slug": "carleton", "name": "Carleton", "conference": "OUA", "url": "https://goravens.ca/sports/football/schedule/2026"}, {"slug": "guelph", "name": "Guelph", "conference": "OUA", "url": "https://gryphons.ca/sports/football/schedule/2026"}, {"slug": "mcmaster", "name": "McMaster", "conference": "OUA", "url": "https://marauders.ca/sports/football/schedule/2026"}, {"slug": "ottawa", "name": "Ottawa", "conference": "OUA", "url": "https://teams.geegees.ca/sports/fball/2026-27/schedule/2026-27"}, {"slug": "queens", "name": "Queen's", "conference": "OUA", "url": "https://gogaelsgo.com/sports/football/schedule/2026-2027"}, {"slug": "toronto", "name": "Toronto", "conference": "OUA", "url": "https://varsityblues.ca/sports/football/schedule/2026"}, {"slug": "waterloo", "name": "Waterloo", "conference": "OUA", "url": "https://athletics.uwaterloo.ca/sports/football/schedule/2026-27"}, {"slug": "western", "name": "Western", "conference": "OUA", "url": "https://westernmustangs.ca/sports/football/schedule/2026"}, {"slug": "windsor", "name": "Windsor", "conference": "OUA", "url": "https://golancers.ca/sports/football/schedule/2026"}, {"slug": "laurier", "name": "Laurier", "conference": "OUA", "url": "https://laurierathletics.com/sports/football/schedule/2026"}, {"slug": "york", "name": "York", "conference": "OUA", "url": "https://yorkulions.ca/sports/football/schedule/2026"}, {"slug": "bishops", "name": "Bishop's", "conference": "RSEQ", "url": "https://gaiters.ca/sports/football/schedule/2026-27"}, {"slug": "concordia", "name": "Concordia", "conference": "RSEQ", "url": "https://stingers.ca/football/schedule/2026"}, {"slug": "laval", "name": "Laval", "conference": "RSEQ", "url": "https://rougeetor.ulaval.ca/sports/football/"}, {"slug": "mcgill", "name": "McGill", "conference": "RSEQ", "url": "https://mcgillathletics.ca/sports/football/schedule/2026-27"}, {"slug": "montreal", "name": "Montr\u00e9al", "conference": "RSEQ", "url": "https://carabins.umontreal.ca/football/"}, {"slug": "sherbrooke", "name": "Sherbrooke", "conference": "RSEQ", "url": "https://www.usherbrooke.ca/vertetor/sports/"}, {"slug": "acadia", "name": "Acadia", "conference": "AUS", "url": "https://acadiaathletics.ca/sports/fball/2026-27/schedule/2026-27"}, {"slug": "mount-allison", "name": "Mount Allison", "conference": "AUS", "url": "https://mountiepride.ca/sports/fball/2026-27/schedule/2026-27"}, {"slug": "saint-marys", "name": "Saint Mary's", "conference": "AUS", "url": "https://www.smuhuskies.ca/sports/fball/2026-27/schedule/2026-27"}, {"slug": "stfx", "name": "StFX", "conference": "AUS", "url": "https://www.goxgo.ca/sports/fball/2026-27/schedule/2026-27"}, {"slug": "alberta", "name": "Alberta", "conference": "CW", "url": "https://bearsandpandas.ca/sports/football/schedule/2026"}, {"slug": "calgary", "name": "Calgary", "conference": "CW", "url": "https://godinos.com/sports/football/schedule/2026"}, {"slug": "manitoba", "name": "Manitoba", "conference": "CW", "url": "https://gobisons.ca/sports/football/schedule/2026"}, {"slug": "regina", "name": "Regina", "conference": "CW", "url": "https://www.reginacougars.com/sports/football/schedule/2026"}, {"slug": "saskatchewan", "name": "Saskatchewan", "conference": "CW", "url": "https://huskies.usask.ca/sports/football/schedule/2026-27"}, {"slug": "ubc", "name": "UBC", "conference": "CW", "url": "https://gothunderbirds.ca/sports/football/schedule/2026-27"}];
const SOURCES={OUA:'https://oua.ca/sports/fball/2026-27/standings',CW:'https://canadawest.org/sports/fball/2026-27/standings',AUS:'https://www.atlanticuniversitysport.com/sports/fball/2026-27/standings',RSEQ:'https://s1.rseq.ca/api/LeagueApi/GetLeagueDiffusion/?leagueId=d9538539-2732-439b-8521-02da4f3da6e8'};
const cache=new Map(),clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();
const norm=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
function rowFor(conf,name,record,position){const t=TEAMS.find(t=>t.conference===conf&&norm(t.name)===norm(name));if(!t||!['w','l','t','g','pf','pa'].every(k=>Number.isInteger(record[k])&&record[k]>=0)||record.g!==record.w+record.l+record.t)return null;return {...t,url:SOURCES[conf],record,position,season:2026};}
function parseStandings(text,conf){
 if(conf==='RSEQ'){
  const j=JSON.parse(text);if(j.SchoolYearYears!=='2026-2027'||j.SportName!=='Football')throw Error('Wrong season or sport');
  return (j.Standings||[]).map(x=>rowFor(conf,x.TeamName,{w:x.Wins,l:x.Losses,t:x.Draws,g:x.GamesPlayed,pf:x.PointsFor,pa:x.PointsAgaints},x.Position)).filter(Boolean);
 }
 const title=clean(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);if(!/\b2026\b/.test(title)||!/football.*standings/i.test(title))throw Error('Wrong standings season');
 for(const table of text.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
  const cells=s=>[...s.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(m=>clean(m[1]));
  const headers=cells(table[1].match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)?.[1]||'').map(x=>x.toUpperCase());if(!headers.includes('GP')||!headers.includes('PF'))continue;
  const out=[];const body=table[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'';
  for(const tr of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const c=cells(tr[1]),value=k=>c[headers.indexOf(k)],num=k=>/^\d+$/.test(value(k)||'')?Number(value(k)):NaN;
   const wl=(value('W-L')||'').match(/^(\d+)-(\d+)(?:-(\d+))?$/),record={w:wl?+wl[1]:num('W'),l:wl?+wl[2]:num('L'),t:wl?+(wl[3]||0):headers.includes('T')?num('T'):0,g:num('GP'),pf:num('PF'),pa:num('PA')};
   const row=rowFor(conf,c[0],record,out.length+1);if(row)out.push(row);
  }return out;
 }return [];
}
async function load(conf){
 const now=Date.now(),previous=cache.get(conf);if(previous&&now-previous.time<55000)return previous.rows;
 const checkedAt=new Date().toISOString();try{
  const r=await fetch(SOURCES[conf],{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json,text/html'}});if(!r.ok)throw Error('Source HTTP '+r.status);
  const rows=parseStandings(await r.text(),conf);if(rows.length!==TEAMS.filter(t=>t.conference===conf).length)throw Error('Incomplete conference standings');
  rows.forEach(r=>Object.assign(r,{checkedAt,verifiedAt:checkedAt,stale:false}));cache.set(conf,{time:now,rows});return rows;
 }catch(e){return (previous?.rows||TEAMS.filter(t=>t.conference===conf).map(t=>({...t,url:SOURCES[conf],record:null}))).map(r=>({...r,checkedAt,stale:true,error:String(e.message)}));}
}
export default async function handler(req,res){
 const rows=(await Promise.all(Object.keys(SOURCES).map(load))).flat();
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
 res.status(200).json({ok:true,season:2026,checkedAt:new Date().toISOString(),nextRefreshSeconds:60,rows});
}
