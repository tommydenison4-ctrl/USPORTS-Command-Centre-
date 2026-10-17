const LEAGUE='https://s1.rseq.ca/api/LeagueApi/GetLeagueDiffusion/?leagueId=d9538539-2732-439b-8521-02da4f3da6e8';
const SITE='https://rseq-stats-universitaire-football-stats-2026.vercel.app';
const team=require('../api/scoreboard').team;
const decode=s=>s.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0]==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&amp;/g,'&');
// StatCrew XML has attributes plus nested records. Do not resolve external entities.
function parseXml(xml){
 if(!/<fbgame\b/.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsupported game XML');
 const root={},stack=[root];
 for(const m of xml.matchAll(/<\/?[A-Za-z][^>]*>/g)){
  const tag=m[0];if(tag.startsWith('</')){stack.pop();continue;}
  const name=tag.match(/^<([\w:-]+)/)[1],node={};
  for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g))node[a[1]]=decode(a[3]);
  const parent=stack.at(-1);if(!parent)throw Error('Invalid game XML');
  if(parent[name]===undefined)parent[name]=node;else if(Array.isArray(parent[name]))parent[name].push(node);else parent[name]=[parent[name],node];
  if(!tag.endsWith('/>'))stack.push(node);
 }
 return root.fbgame;
}
async function get(url,headers={}){return fetch(url,{headers,signal:AbortSignal.timeout(8000),cache:'no-store'});}
let config;
async function load(expected){
 const r=await get(LEAGUE);if(!r.ok)return null;
 const league=await r.json(),g=league.RegularSeasonGames?.find(g=>g.GameDateText===expected.date&&team(g.VisitingTeamName)===expected.away&&team(g.HomeTeamName)===expected.home);
 if(!g?.BroadcastLiveStats)return null;
 const page=new URL(g.BroadcastLiveStats.trim());if(page.origin!==SITE)return null;
 const file=page.searchParams.get('fichier');if(!/^2026-\d{1,3}\.xml$/.test(file||''))return null;
 if(!config){const c=await get(SITE+'/commun.js');if(!c.ok)return null;const js=await c.text();const base=js.match(/const SB_URL\s*=\s*'([^']+)'/)?.[1],key=js.match(/const SB_ANON_KEY\s*=\s*'([^']+)'/)?.[1];if(!base||!key||new URL(base).hostname!=='oafyuxzybmoorrmxlaxt.supabase.co')return null;config={base,key};}
 const response=await get(config.base+'/storage/v1/object/donnees-matchs/'+encodeURIComponent(file),{apikey:config.key,Authorization:'Bearer '+config.key});
 if(!response.ok)return {page:page.href,error:'The official RSEQ gamebook is not available yet. Retrying automatically.'};
 const raw=parseXml(await response.text()),v=raw.venue;
 if(v?.date!==expected.date||team(v.visname)!==expected.away||team(v.homename)!==expected.home)throw Error('RSEQ game identity mismatch');
 return {page:page.href,raw,visitor:v.visname,home:v.homename,awayId:v.visid,homeId:v.homeid};
}
module.exports={load,parseXml};
