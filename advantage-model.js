(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.AdvantageModel=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const VERSION='AWM-V3-reconstructed-1';
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
 const sigmoid=x=>1/(1+Math.exp(-Math.max(-35,Math.min(35,x))));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const aliases={stfrancisxavier:'stfx',stmarys:'saintmarys',mtallison:'mountallison',miamifl:'miami',miamiflorida:'miami',ulm:'louisianamonroe',ulmonroe:'louisianamonroe',olemiss:'mississippi',uconn:'connecticut',fau:'floridaatlantic',fiu:'floridainternational',ucf:'ucf',usf:'southflorida',appstate:'appalachianstate',smu:'smu',byu:'byu',umass:'massachusetts',pitt:'pittsburgh',cal:'california',armywestpoint:'army'};
 const canon=s=>aliases[norm(s)]||norm(s);
 function calculate(m,x){if(!m||x.length!==m.mean.length||!x.every(finite))return null;let v=m.coef[0];x.forEach((n,i)=>v+=m.coef[i+1]*(n-m.mean[i])/m.scale[i]);return m.logistic?sigmoid(v):v;}
 function features(a,h,neutral=false){
  const expected={};for(const [side,t,o] of [['away',a,h],['home',h,a]]){const v={};for(const k of ['ypp','median','expl','neg','sack','tempo'])v[k]=(t.off[k]+o.defense[k])/2;v.explosives=v.expl*v.tempo;expected[side]=v;}
  const d=['ypp','median','explosives','neg','sack'].map(k=>expected.home[k]-expected.away[k]);d.push(neutral?0:1);
  const power=[(h.elo-a.elo)/400,neutral?0:1],form=[h.form-a.form,neutral?0:1];
  return {football:d,power,form,margin:[...d,power[0],form[0],power[0]*Math.abs(power[0])],total:[(a.pf+a.pa+h.pf+h.pa)/2,expected.away.tempo+expected.home.tempo,expected.away.explosives+expected.home.explosives],expected};
 }
 function team(data,input){
  if(input==null)return null;
  if(input&&typeof input==='object'&&input.id!=null){const exact=data.profiles?.[String(input.id)];if(exact)return exact;}
  const keys=(typeof input==='object'?[input.id,input.school,input.name,input.short,input.abbr]:[input]).filter(Boolean).map(canon);
  const matches=Object.values(data.profiles||{}).filter(p=>[p.id,p.name,p.short,p.abbr].some(x=>x&&keys.includes(canon(x))));return matches.length===1?matches[0]:null;
 }
 function project(data,game){
  if(!data||!game)return {available:false,reason:'Model data is not loaded.'};
  if(game.league&&game.league!==data.league)return {available:false,reason:'League does not match the model.'};
  const date=String(game.date||'').slice(0,10);
  const frozen=data.frozen?.[String(game.id||'')];if(frozen&&frozen.date===date&&frozen.league===data.league)return frozen;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return {available:false,reason:'A verified game date is required.'};
  if(date<data.asOf)return {available:false,reason:'No frozen pregame prediction was saved for this past game.'};
  const a=team(data,game.away),h=team(data,game.home);
  if(!a||!h)return {available:false,reason:'Insufficient verified play history for '+(!a?'the away team':'the home team')+'.'};
  if(a.id===h.id)return {available:false,reason:'Ambiguous matchup.'};
  if([a,h].some(p=>p.lastGame.slice(0,10)>=date))return {available:false,reason:'Post-kickoff data cannot enter a pregame prediction.'};
  const f=features(a,h,!!game.neutral),m=data.model;
  const components={football:calculate(m.football,f.football),power:calculate(m.power,f.power),form:calculate(m.form,f.form)};
  if(Object.values(components).some(x=>!finite(x)))return {available:false,reason:'Incomplete model inputs.'};
  const hp=.6*components.football+.35*components.power+.05*components.form;
  const margin=calculate(m.margin,f.margin),rawTotal=calculate(m.total,f.total);if(!finite(margin)||!finite(rawTotal))return {available:false,reason:'Incomplete score model inputs.'};const total=Math.max(0,rawTotal);
  const hs=Math.max(0,(total+margin)/2),as=Math.max(0,(total-margin)/2),age=Math.max(...[a,h].map(p=>(Date.parse(date)-Date.parse(p.lastGame))/86400000));
  return {available:true,league:data.league,gameId:String(game.id||''),date,asOf:data.asOf,modelVersion:data.modelVersion,awayName:a.name,homeName:h.name,away_score:as,home_score:hs,home_win_prob:hp,away_win_prob:1-hp,margin:hs-as,total:hs+as,marginInterval:[margin-m.marginInterval80,margin+m.marginInterval80],expected:f.expected,components,confidence:age>120?'Prior-season data':data.league==='USPORTS'?'Limited validation sample':'Historical-feed model',source:'Advantage Winner Model V3',sources:[...new Set([...a.sources,...h.sources])],profileDates:{away:a.lastGame,home:h.lastGame},powerGap:f.power[0],ageDays:age,report:m.report};
 }
 function scenario(data,p,side,target,turnoverDiff=0){
  if(!p?.available||!data.model.scenario||!['away','home'].includes(side))return null;
  const s=side==='home'?1:-1,own=p.expected[side],opp=p.expected[side==='home'?'away':'home'];
  for(let n=0;n<=Math.ceil(own.tempo);n++){
   const impact=s*(n-opp.explosives+2*turnoverDiff),med=s*(own.median-opp.median),neg=s*(own.neg-opp.neg);
   const hp=calculate(data.model.scenario,[impact,med,neg,p.powerGap]),prob=side==='home'?hp:1-hp;
   if(prob>=target)return n;
  }return null;
 }
 function countTail(n,mu,k){
  if(n<=0)return 1;if(!finite(mu)||mu<0)return null;
  let mass=k?Math.pow(k/(k+mu),k):Math.exp(-mu),cdf=mass;
  for(let i=1;i<n;i++){mass*=k?(i-1+k)/i*mu/(k+mu):mu/i;cdf+=mass;}return Math.max(0,Math.min(1,1-cdf));
 }
 function live(data,prior,state){
  if(!prior?.available||!state||!finite(state.awayScore)||!finite(state.homeScore))return null;
  if(state.complete)return {homeWin:state.homeScore===state.awayScore ? .5 : state.homeScore>state.awayScore?1:0,away:state.awayScore,home:state.homeScore,final:true};
  if(!finite(state.remaining)||state.remaining<=0||state.remaining>3600)return null;
  const a=state.metrics?.away,h=state.metrics?.home;
  const r=state.remaining/3600,f=1-r,p=prior.home_win_prob;
  const priorLogit=Math.log(Math.max(.001,p)/Math.max(.001,1-p))*r,score=(state.homeScore-state.awayScore)/Math.sqrt(Math.max(.03,r));
  const full=data.model.live&&a&&h&&[a.explosives,a.turnovers,a.median,a.neg,h.explosives,h.turnovers,h.median,h.neg].every(finite);
  const x=full?[priorLogit,score,(h.explosives-a.explosives+2*(a.turnovers-h.turnovers))*f,(h.median-a.median)*f,(h.neg-a.neg)*f,r]:[priorLogit,score,r];
  const probability=calculate(full?data.model.live:data.model.liveScore,x);if(probability===null)return null;
  return {homeWin:probability,away:state.awayScore+prior.away_score*r,home:state.homeScore+prior.home_score*r,final:false,mode:full?'Score + impact + efficiency':'Score and pregame prior; play metrics unavailable'};
 }
 function espnState(summary,g){
  const comp=summary?.header?.competitions?.[0],status=comp?.status,cs=comp?.competitors||[];
  const c={away:cs.find(x=>x.homeAway==='away'),home:cs.find(x=>x.homeAway==='home')};
  if(!c.away||!c.home||c.away.score==null||c.home.score==null||c.away.score===''||c.home.score==='')return null;
  if((g.liveEventId||g.id)&&summary.header?.id&&String(g.liveEventId||g.id)!==String(summary.header.id))return null;
  const state={awayScore:Number(c.away.score),homeScore:Number(c.home.score),complete:!!status?.type?.completed,period:status?.period,clock:status?.displayClock};
  const clock=String(state.clock||'').match(/^(\d+):(\d\d)$/);state.remaining=clock&&state.period>=1&&state.period<=4?(4-state.period)*900+Number(clock[1])*60+Number(clock[2]):null;
  const seen=new Set(),ps=[];
  for(const d of [...(summary.drives?.previous||[]),...(summary.drives?.current?[summary.drives.current]:[])])for(const p of d.plays||[]){
   if(seen.has(p.id))continue;seen.add(p.id);const label=p.type?.text||'',text=p.text||'';
   if(/kick|punt|field goal|extra point|conversion|penalty|timeout|end period|two-minute/i.test(label)||/no play|penalty/i.test(text))continue;
   const typ=/pass|sack|interception/i.test(label)?'pass':/rush|run|kneel/i.test(label)?'run':null;if(!typ||!finite(p.statYardage))continue;
   ps.push({team:String(p.start?.team?.id||d.team?.id||''),yards:/incomplete|interception/i.test(label)?0:p.statYardage,type:typ,turnover:!!p.isTurnover&&/intercept|fumble/i.test(text)});
  }
  state.metrics={};for(const side of ['away','home']){const pp=ps.filter(p=>p.team===String(c[side].team.id)),ys=pp.map(p=>p.yards).sort((a,b)=>a-b);if(!ys.length)continue;state.metrics[side]={explosives:pp.filter(p=>p.yards>=(p.type==='pass'?20:15)).length,turnovers:pp.filter(p=>p.turnover).length,median:(ys[Math.floor((ys.length-1)/2)]+ys[Math.floor(ys.length/2)])/2,neg:ys.filter(y=>y<=0).length/ys.length};}
  return state;
 }
 function card(p,detail=false,data=null){
  if(!p?.available)return `<section class="awm-card"><small>ADVANTAGE WINNER MODEL</small><b>Prediction unavailable</b><p>${esc(p?.reason||'Verified history is not yet available.')}</p></section>`;
  const home=p.home_win_prob>=.5,winner=home?p.homeName:p.awayName,prob=Math.max(p.home_win_prob,p.away_win_prob);
  let html=`<section class="awm-card"><small>ADVANTAGE WINNER MODEL · PREGAME</small><b>${esc(winner)} <span>${(prob*100).toFixed(1)}%</span></b><p>${esc(p.awayName)} ${p.away_score.toFixed(1)} – ${p.home_score.toFixed(1)} ${esc(p.homeName)}</p><div class="awm-bar"><i style="width:${p.away_win_prob*100}%"></i></div><p>Expected total ${p.total.toFixed(1)} · ${esc(p.confidence)} · Data through ${esc(p.asOf)}</p>`;
  if(detail){
   html+=`<div class="awm-metrics"><div><small>HOME MARGIN</small><b>${p.margin>=0?'+':''}${p.margin.toFixed(1)}</b></div><div><small>80% ERROR BAND</small><b>${p.marginInterval?p.marginInterval.map(x=>x.toFixed(1)).join(' to '):'Not supplied'}</b></div></div>`;
   if(p.expected)html+=`<table><thead><tr><th>Expected matchup</th><th>${esc(p.awayName)}</th><th>${esc(p.homeName)}</th></tr></thead><tbody>${[['tempo','Eligible plays'],['explosives','Explosive plays'],['median','Median yards'],['neg','Negative play rate']].map(([k,label])=>`<tr><td>${label}</td>${['away','home'].map(side=>`<td>${finite(p.expected[side]?.[k])?(p.expected[side][k]*(k==='neg'?100:1)).toFixed(1)+(k==='neg'?'%':''):'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
   if(p.requirements)html+='<details><summary>What we need to win · workbook targets</summary><p>Conditional explosive-play targets at even turnovers, copied from the original workbook. These are estimates, not guarantees.</p><table><thead><tr><th>Team</th><th>50%</th><th>60%</th><th>70%</th><th>80%</th><th>50% with +1 TO</th></tr></thead><tbody>'+['away','home'].map(side=>{const r=p.requirements[side];return `<tr><td>${esc(side==='away'?p.awayName:p.homeName)}</td>${r.targets.map(n=>`<td>${n}</td>`).join('')}<td>${r.plusOneTurnover50}</td></tr>`;}).join('')+'</tbody></table>'+['away','home'].map(side=>{const r=p.requirements[side];return `<p>${esc(side==='away'?p.awayName:p.homeName)}: median ${r.median.toFixed(1)} yards; negative-play ceiling ${(r.negativeCeiling*100).toFixed(1)}%; impact target ${r.impact}.</p>`;}).join('')+'</details>';
   if(data?.model.scenario&&p.powerGap!=null){html+='<details><summary>What we need to win</summary><p>Conditional scenario estimates, holding median yards and negative rate at the expected levels. These are not guarantees or causal thresholds.</p><table><thead><tr><th>Team / turnovers</th><th>50%</th><th>60%</th><th>70%</th><th>80%</th></tr></thead><tbody>';
    for(const side of ['away','home'])for(const to of [0,1])html+=`<tr><td>${esc(side==='home'?p.homeName:p.awayName)} / ${to?'+1':'even'}</td>${[.5,.6,.7,.8].map(t=>`<td>${scenario(data,p,side,t,to)??'—'}</td>`).join('')}</tr>`;
    html+='</tbody></table><p>Values are explosive counts. One turnover is worth two impact plays.</p></details>';
   }
   html+=`<details><summary>Model and source details</summary><p>${esc(p.modelVersion)}. ${p.components?'60% football matchup, 35% power, 5% current form.':'Frozen workbook result.'} Market lines are excluded. Forecast scores and targets are estimates, not observed statistics.</p>${p.report?`<p>Chronological holdout: ${p.report.testGames} games · Brier ${p.report.brier.toFixed(3)} · margin MAE ${p.report.marginMAE.toFixed(1)} points. Validation is limited to the collected games.</p>`:''}${(p.sources||[]).map((s,i)=>/^https:\/\//.test(s)?`<a href="${esc(s)}" target="_blank" rel="noopener">Gamebook ${i+1}</a> `:`<p>${esc(s)}</p>`).join('')}</details>`;
  }return html+'</section>';
 }
 return {VERSION,calculate,features,team,project,scenario,countTail,live,espnState,card,esc,canonical:canon};
});
