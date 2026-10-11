/* Keep award/championship watches and aggregate player leaderboards in sync with the
   most recently verified server-generated 2026 data, without manufacturing live stats. */
(()=>{
 let busy=false,last='';
 async function update(){
  if(busy||document.visibilityState==='hidden')return;
  busy=true;
  try{
   const urls=['/data/season-watch.json','/data/advantage-usports.json','/data/player-stats-usports.json'];
   const results=await Promise.all(urls.map(async u=>{const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(u+' '+r.status);return r.json()}));
   const [watch,model,stats]=results;const w=watch?.USPORTS;
   if(w?.season!==2026||model?.dataPolicy?.season!==2026||stats?.season!==2026)return;
   const stamp=JSON.stringify(results);
   if(last===stamp)return;last=stamp;
   window.SEASON_WATCH=window.SEASON_WATCH||{};window.SEASON_WATCH.USPORTS=w;
   window.AWM_DATA=window.AWM_DATA||{};window.AWM_DATA.USPORTS=model;
   window.FOOTBALL_STATS=window.FOOTBALL_STATS||{};window.FOOTBALL_STATS.USPORTS=stats;
   window.SeasonWatch?.refresh?.();
   window.dispatchEvent(new CustomEvent('canu-verified-player-stats',{detail:{asOf:stats.asOf,coveredGames:stats.coveredGames}}));
  }catch(err){console.warn('Verified watch refresh retained last good data',err)}
  finally{busy=false}
 }
 setInterval(update,60000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')update()});
 update();
})();
