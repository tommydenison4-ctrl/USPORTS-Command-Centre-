const saved=require('../data/verified-results-usports.json').games;
const live=require('../api/presto-live');
const teams=require('../data/usports-teams.json');
const key=g=>g.date+'-'+g.away+'-'+g.home;
function createLoader(store){
 const finals=new Map(saved.map(g=>[key(g),g]));let checked=0,inflight;
 return async games=>{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto'}).format(new Date());
  const targets=games.filter(g=>!finals.has(g.id)&&g.date<=today);
  if(!targets.length)return [...finals.values()];
  if(inflight){await inflight;return [...finals.values()]}
  if(Date.now()-checked<15000)return [...finals.values()];
  checked=Date.now();
  inflight=(async()=>{for(let start=0;start<targets.length;start+=4)await Promise.all(targets.slice(start,start+4).map(async g=>{
   const path='canu/consensus/v1/results/'+g.id+'.json';
   try{
    const cached=await store.read(path);if(cached?.id===g.id&&cached.final===true&&cached.source&&Number.isFinite(cached.awayScore)&&Number.isFinite(cached.homeScore)){finals.set(g.id,cached);return}
    let body;
    await live({method:'GET',query:{game:g.id,page:g.boxscore||'',discover:'1',date:g.date.replace(/-/g,''),away:g.away,home:g.home,awayId:teams.find(t=>t.slug===g.away)?.abbr||'',homeId:teams.find(t=>t.slug===g.home)?.abbr||''}},{setHeader(){},end(text){body=JSON.parse(text)}});
    const d=body?.data,identity=d?.identity;
    if(!body?.ok||identity?.gameId!==g.id||identity.date!==g.date||identity.away!==g.away||identity.home!==g.home||d.status?.complete!==true)return;
    const {awayScore,homeScore}=d.game||{};if(!Number.isInteger(awayScore)||!Number.isInteger(homeScore)||awayScore<0||homeScore<0)return;
    const result={id:g.id,date:g.date,away:g.away,home:g.home,awayScore,homeScore,final:true,source:body.page||body.officialPage,verifiedAt:new Date().toISOString()};
    if(!result.source)return;
    try{await store.put(path,result)}catch{const existing=await store.read(path);if(existing?.final){finals.set(g.id,existing);return}}
    finals.set(g.id,result);
   }catch(e){console.warn('Leaderboard final check unavailable',g.id,e.name||'Error')}
  }))})();
  try{await inflight}finally{inflight=null}
  return [...finals.values()];
 };
}
module.exports={createLoader};
