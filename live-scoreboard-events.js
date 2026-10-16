(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CanuScoreboardEvents=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const invalid=/no[ -]play|nullified|overturned|reversed|touchdown negated/i;
 function kind(label){return /^SCORE(?: \u2014 | UPDATE|$)/.test(label)?'score':/^(?:TURNOVER(?: \u2014 |$)|BLOCKED KICK)/.test(label)?'turnover':/^RED ZONE/.test(label)?'redzone':''}
 function score(text){
  if(invalid.test(text))return '';
  if(/touchdown|\bTD\b/i.test(text)){
   if(/block(?:ed)?.*(?:kick|punt|field goal)|(?:kick|punt|field goal).*block/i.test(text))return 'BLOCKED KICK RETURN TD';
   if(/intercept/i.test(text))return 'INTERCEPTION RETURN TD';
   if(/fumble.*recover|recover.*fumble/i.test(text))return 'FUMBLE RETURN TD';
   if(/kickoff|kick[ -]?off|kick return/i.test(text))return 'KICK RETURN TD';
   if(/punt/i.test(text))return 'PUNT RETURN TD';
   if(/pass|reception|receiv/i.test(text))return 'PASSING TD';
   if(/rush|run|ran/i.test(text))return 'RUSHING TD';
   return 'TOUCHDOWN';
  }
  if(/(?:field goal.*(?:GOOD|successful)|good field goal)/i.test(text)&&!/no good|not good|miss|block/i.test(text))return 'FIELD GOAL';
  if(/safety/i.test(text))return 'SAFETY';
  if(/rouge|single point|\bSINGLE\b/i.test(text))return 'SINGLE / ROUGE';
  if(/(?:two|2)[ -]point|conversion|convert|\bPAT\b|extra point/i.test(text)&&/good|success|complete/i.test(text)&&!/no good|not good|fail|miss/i.test(text))return /(?:two|2)[ -]point/i.test(text)?'TWO-POINT CONVERSION':'CONVERT';
  return '';
 }
 function event(previous,d,redZone=false,context={}){
  if(d?.status?.complete||/final|complete/i.test(d?.status?.period||''))return '';
  const play=d?.plays?.[0],text=String(play?.description||'');
  const increased=previous&&((d?.game?.awayScore!=null&&Number(d.game.awayScore)>previous.away)||(d?.game?.homeScore!=null&&Number(d.game.homeScore)>previous.home));
  const scoring=score(text);if(scoring)return 'SCORE \u2014 '+scoring;
  if(increased)return 'SCORE UPDATE';
  if(!invalid.test(text)){
   if(/intercept/i.test(text)&&!/dropped|nearly|almost/i.test(text))return 'TURNOVER \u2014 INTERCEPTION';
   if(/(?:turnover|ball over|turned over) on downs/i.test(text))return 'TURNOVER \u2014 ON DOWNS';
   if(/block(?:ed)?.*(?:kick|punt|field goal)|(?:kick|punt|field goal).*block/i.test(text))return 'BLOCKED KICK';
   if(/fumble/i.test(text)&&!context.ownRecovery&&(/\blost\b/i.test(text)||context.possessionChanged||context.opponentRecovery))return 'TURNOVER \u2014 FUMBLE RECOVERY';
  }
  return redZone?'RED ZONE':'';
 }
 function situation(s){const n=Number(s?.down),raw=s?.distance,goal=/^goal$/i.test(String(raw)),valid=raw!==null&&raw!==undefined&&String(raw).trim()!==''&&Number.isFinite(Number(raw))&&Number(raw)>0;const down=n>=1&&n<=3&&(goal||valid)?`${n}${n===1?'st':n===2?'nd':'rd'} & ${goal?'Goal':Number(raw)}`:'';const m=String(s?.spot||'').replace(/[\s-]/g,'').match(/^([A-Za-z]{2,8})(\d{1,2})$/);const spot=m&&+m[2]<=55?m[1].toUpperCase()+' '+Number(m[2]):'';return [down,spot?'Ball on '+spot:''].filter(Boolean).join(' \xb7 ')}
 return {kind,score,event,situation};
});
