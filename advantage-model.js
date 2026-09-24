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
  if(data.league==='USPORTS'&&(data.dataPolicy?.season!==2026||data.dataPolicy?.trainingSeason!==2026||!data.model))return {available:false,reason:data.modelStatus||'Only 2026 data is permitted. Verified 2026-only model inputs are not ready.'};
  const date=String(game.date||'').slice(0,10);
  const frozen=data.frozen?.[String(game.id||'')];if(frozen&&frozen.date===date&&frozen.league===data.league&&(data.league!=='USPORTS'||frozen.modelVersion?.includes('2026')))return frozen;
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
  return {available:true,league:data.league,gameId:String(game.id||''),date,asOf:data.asOf,modelVersion:data.modelVersion,awayName:a.name,homeName:h.name,away_score:as,home_score:hs,home_win_prob:hp,away_win_prob:1-hp,margin:hs-as,total:hs+as,marginInterval:finite(m.marginInterval80)?[margin-m.marginInterval80,margin+m.marginInterval80]:null,expected:f.expected,components,confidence:m.provisional?'Provisional · 2026 only · '+m.trainingGames+' training games':age>120?'Prior-season data':data.league==='USPORTS'?'Limited validation sample':'Historical-feed model',source:'Advantage Winner Model V3',sources:[...new Set([...a.sources,...h.sources])],profileDates:{away:a.lastGame,home:h.lastGame},powerGap:f.power[0],ageDays:age,report:m.report};
 }
 function scenario(data,p,side,target,turnoverDiff=0){
  if(!p?.available||!p.expected?.away||!p.expected?.home||!finite(p.powerGap)||!data?.model?.scenario||!['away','home'].includes(side))return null;
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

 function winGuide(data,p){
  const explanation='<p>A <b>big play</b> means a run of at least 15 yards or a pass of at least 20 yards. <b>Winning the turnover battle by one</b> means taking the ball away once more than you give it away.</p>';
  return '<section class="awm-win-guide"><h3>How each team can win</h3>'+explanation+['away','home'].map(side=>{
   const name=side==='away'?p.awayName:p.homeName,other=side==='away'?p.homeName:p.awayName,r=p.requirements?.[side],expected=p.expected?.[side];
   const even=r?.targets?.[1]??scenario(data,p,side,.6,0),extra=r?.plusOneTurnover50??scenario(data,p,side,.5,1),median=r?.median??expected?.median,neg=r?.negativeCeiling??expected?.neg;
   let text='<h4>How '+esc(name)+' can win</h4><ul>';
   text+=even!=null?'<li><b>Win with big plays:</b> aim for at least '+even+' big play'+(even===1?'':'s')+' if both teams give the ball away equally often. Under the model’s other assumptions, that is enough for about a 6-in-10 chance.</li>':'<li><b>Create the game-changing plays:</b> turn a few ordinary drives into scoring chances with long runs or passes. There is not enough evidence yet to attach a win percentage to a specific count.</li>';
   text+=extra!=null?'<li><b>Win by protecting the ball:</b> take it away once more than '+esc(other)+' does, and aim for at least '+extra+' big play'+(extra===1?'':'s')+'. The model puts that combination at roughly even chances or better.</li>':'<li><b>Give yourself an extra possession:</b> avoid interceptions and lost fumbles, and force '+esc(other)+' to make a mistake. This is a football game plan, not a measured probability boost.</li>';
   if(finite(median))text+='<li><b>Keep drives alive:</b> '+(r?'the workbook target':'the matchup baseline')+' is about '+median.toFixed(1)+' yards on a typical play. Use this as a typical-play benchmark, not a promise for every snap.</li>';
   if(finite(neg))text+='<li><b>Limit wasted plays:</b> '+(r?'keep plays that gain zero yards or lose yards to no more than about ':'the model expects about ')+Math.round(neg*10)+' out of every 10 plays'+(r?'.':' to gain no yards or lose yards; reducing those wasted plays helps keep drives alive.')+'</li>';
   return '<div class="awm-win-team">'+text+'</ul></div>';
  }).join('')+'<p><small>These examples assume the opponent makes its expected number of big plays and both teams otherwise perform as expected. Hitting a target does not guarantee a win.</small></p></section>';
 }

 function card(p,detail=false,data=null){
  if(!p?.available)return `<section class="awm-card"><small>ADVANTAGE WINNER MODEL</small><b>Prediction unavailable</b><p>${esc(p?.reason||'Verified history is not yet available.')}</p></section>`;
  const home=p.home_win_prob>=.5,winner=home?p.homeName:p.awayName,prob=Math.max(p.home_win_prob,p.away_win_prob);
  let html=`<section class="awm-card"><small>ADVANTAGE WINNER MODEL · PREGAME</small><b>${esc(winner)} <span>${(prob*100).toFixed(1)}%</span></b><p>${esc(p.awayName)} ${p.away_score.toFixed(1)} – ${p.home_score.toFixed(1)} ${esc(p.homeName)}</p><div class="awm-bar"><i style="width:${p.away_win_prob*100}%"></i></div><p>Expected total ${p.total.toFixed(1)} · ${esc(p.confidence)} · Data through ${esc(p.asOf)}</p>`;
  if(detail){
   if(data?.model?.provisional)html+='<p>Early-season estimate fitted only to 2026 games. The sample is small; win probabilities are not yet calibrated. No prior-season data is used.</p>';
   html+=`<div class="awm-metrics"><div><small>HOME MARGIN</small><b>${p.margin>=0?'+':''}${p.margin.toFixed(1)}</b></div><div><small>80% ERROR BAND</small><b>${p.marginInterval?p.marginInterval.map(x=>x.toFixed(1)).join(' to '):'Not supplied'}</b></div></div>`;
   if(p.expected)html+=`<table><thead><tr><th>Expected matchup</th><th>${esc(p.awayName)}</th><th>${esc(p.homeName)}</th></tr></thead><tbody>${[['tempo','Eligible plays'],['explosives','Explosive plays'],['median','Median yards'],['neg','Negative play rate']].map(([k,label])=>`<tr><td>${label}</td>${['away','home'].map(side=>`<td>${finite(p.expected[side]?.[k])?(p.expected[side][k]*(k==='neg'?100:1)).toFixed(1)+(k==='neg'?'%':''):'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
   html+=winGuide(data,p);
   html+=`<details><summary>Model and source details</summary><p>${esc(p.modelVersion)}. ${p.components?'60% football matchup, 35% power, 5% current form.':'Frozen workbook result.'} Market lines are excluded. Forecast scores and targets are estimates, not observed statistics.</p>${p.report?`<p>Chronological holdout: ${p.report.testGames} games · Brier ${p.report.brier.toFixed(3)} · margin MAE ${p.report.marginMAE.toFixed(1)} points. Validation is limited to the collected games.</p>`:''}${(p.sources||[]).map((s,i)=>/^https:\/\//.test(s)?`<a href="${esc(s)}" target="_blank" rel="noopener">Gamebook ${i+1}</a> `:`<p>${esc(s)}</p>`).join('')}</details>`;
  }return html+'</section>';
 }
 return {VERSION,calculate,features,team,project,scenario,winGuide,countTail,live,espnState,card,esc,canonical:canon};
});
