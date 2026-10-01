(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.USNationalSchedule=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 function merge(previous,payload){
  if(!Array.isArray(payload?.games)||!payload.games.length)return previous;
  const saved=new Map(previous.map(g=>[g.id,g]));
  return payload.games.map(g=>{
   const old=saved.get(g.id)||{};
   const next={...old,...g,venue:g.venue||old.venue||'',time:g.time||old.time||''};
   // Retain verified final hydration if the current index temporarily omits scores.
   if(old.status==='final'&&Number.isFinite(old.awayScore)&&Number.isFinite(old.homeScore)&&
      (!Number.isFinite(g.awayScore)||!Number.isFinite(g.homeScore))){
    Object.assign(next,{status:'final',awayScore:old.awayScore,homeScore:old.homeScore});
   }
   return next;
  });
 }
 return {merge};
});
