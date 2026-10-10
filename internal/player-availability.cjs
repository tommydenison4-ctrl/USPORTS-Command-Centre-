const A=require('../advantage-model.js');
const watch=require('../data/season-watch.json').USPORTS;
const reports=require('../data/player-availability-usports.json').reports;
const norm=A.canonical;
// Explicit, sourced game-specific reports only. Statistical absence is not evidence.
function missing(game,at=new Date().toISOString(),pool=watch,entries=reports){
 if(!game||game.status==='final'||!pool||pool.asOf>game.date)return [];
 const top=(pool.players||[]).slice(0,10),latest=new Map();
 for(const r of entries){
  if(r.gameId!==game.id||r.date!==game.date||r.verified!==true||r.sourceType!=='official-team'||!/^https:\/\//.test(r.source||'')||!Number.isFinite(Date.parse(r.confirmedAt))||Date.parse(r.confirmedAt)>Date.parse(at)||r.confirmedAt.slice(0,10)<pool.asOf)continue;
  const side=['away','home'].find(s=>norm(game[s])===norm(r.teamId));if(!side)continue;
  const p=top.find(p=>norm(p.teamId)===norm(r.teamId)&&norm(p.name)===norm(r.player));if(!p)continue;
  const key=norm(r.teamId)+':'+norm(p.name),old=latest.get(key);
  if(!old||Date.parse(old.confirmedAt)<Date.parse(r.confirmedAt))latest.set(key,{...r,side,player:p.name,profile:p});
 }
 return [...latest.values()].filter(r=>r.status==='out');
}
function adjust(prior,game,at,pool=watch,entries=reports){
 if(!prior?.available||!Number.isFinite(prior.home_win_prob)||prior.availabilityAdjusted)return prior;
 const absent=missing(game,at,pool,entries);if(!absent.length)return prior;
 // Provisional impact prior, scaled by role and verified season production.
 // Kept server-side; this is not a fitted injury-effect claim.
 let shift=0;for(const r of absent){const p=r.profile,qb=!!p.stats?.passing,production=Math.max(0,Math.min(1,p.productionNormalized||0));shift+=(r.side==='away'?1:-1)*(qb?.45:.22)*(.5+.5*production);}
 shift=Math.max(-.9,Math.min(.9,shift));
 const p=Math.max(.001,Math.min(.999,prior.home_win_prob)),hp=1/(1+Math.exp(-(Math.log(p/(1-p))+shift)));
 const total=prior.total??prior.away_score+prior.home_score,delta=total*(hp-prior.home_win_prob),home=Math.max(0,Math.min(total,prior.home_score+delta));
 return {...prior,home_win_prob:hp,away_win_prob:1-hp,home_score:home,away_score:total-home,margin:2*home-total,total,availabilityAdjusted:true,availability:absent.map(r=>({player:r.player,teamId:r.teamId,side:r.side,status:'out',source:r.source,confirmedAt:r.confirmedAt})),modelVersion:prior.modelVersion+'+availability-v1'};
}
module.exports={missing,adjust};
