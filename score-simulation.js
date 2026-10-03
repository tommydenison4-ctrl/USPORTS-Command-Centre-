/* Score scenarios share the Advantage winner prior; they do not refit a winner model. */
(function(root){
 const A=root.AdvantageModel,cache=new Map(),N=10000;
 function random(seed){let s=2166136261;for(const c of seed)s=Math.imul(s^c.charCodeAt(0),16777619);return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
 function run(p){
  if(!p?.available||![p.home_win_prob,p.home_score,p.away_score].every(Number.isFinite)||p.home_win_prob<=0||p.home_win_prob>=1)return null;
  const key=JSON.stringify([p.gameId,p.modelVersion,p.home_win_prob,p.home_score,p.away_score]);if(cache.has(key))return cache.get(key);
  const rng=random(key),prob=p.home_win_prob,margin=p.home_score-p.away_score,total=p.home_score+p.away_score,logit=Math.log(prob/(1-prob));
  // A logistic margin has P(home wins)=sigmoid(location/scale). Use the
  // existing score/probability relationship, with a provisional 8-point scale
  // when the forecast is exactly even. Total variability is an explicit assumption.
  const scale=Math.abs(logit)>1e-8&&Math.abs(margin)>1e-8?Math.abs(margin/logit):8;
  const location=scale*logit,results=[],bins=[0,0,0,0,0,0],scores=new Map();let homeWins=0;
  for(let i=0;i<N;i++){
   const u=Math.max(1e-9,Math.min(1-1e-9,rng())),rawMargin=location+scale*Math.log(u/(1-u));
   const normal=Math.sqrt(-2*Math.log(Math.max(1e-9,rng())))*Math.cos(2*Math.PI*rng());
   const t=Math.max(1,Math.round(total+12*normal));
   const m=Math.sign(rawMargin||1)*Math.min(t,Math.max(1,Math.round(Math.abs(rawMargin))));
   let away=Math.max(0,Math.round((t-m)/2)),home=Math.max(0,Math.round((t+m)/2));
   if(away===home){if(m>0)home++;else away++} // Resolve rounded ties in the sampled winner's direction.
   const diff=home-away;if(diff>0)homeWins++;
   bins[diff<=-21?0:diff<=-8?1:diff<0?2:diff<=7?3:diff<=20?4:5]++;
   results.push({away,home});const k=away+'–'+home;scores.set(k,(scores.get(k)||0)+1);
  }
  const range=side=>{const values=results.map(r=>r[side]).sort((a,b)=>a-b);return [values[999],values[8999]]};
  const result={key,awayName:p.awayName,homeName:p.homeName,count:N,homeWins,awayWins:N-homeWins,bins,awayRange:range('away'),homeRange:range('home'),common:[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5),results,scale};
  if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function card(p){const s=run(p);if(!s)return '';const e=A.esc,labels=[p.awayName+' by 21+',p.awayName+' by 8–20',p.awayName+' by 1–7',p.homeName+' by 1–7',p.homeName+' by 8–20',p.homeName+' by 21+'];
  return '<section class="awm-card score-simulation"><small>MONTE CARLO · 10,000 GAMES</small><h3>Where the scores land</h3><p>'+e(p.awayName)+' wins '+s.awayWins.toLocaleString()+' · '+e(p.homeName)+' wins '+s.homeWins.toLocaleString()+'</p><p>Middle 80% of scores: '+e(p.awayName)+' '+s.awayRange.join('–')+' · '+e(p.homeName)+' '+s.homeRange.join('–')+'</p><div class="simulation-bars">'+labels.map((label,i)=>'<div class="simulation-row"><span>'+e(label)+'</span><meter min="0" max="10000" value="'+s.bins[i]+'" aria-label="'+e(label)+'"></meter><b>'+s.bins[i].toLocaleString()+' · '+(s.bins[i]/100).toFixed(1)+'%</b></div>').join('')+'</div><details><summary>Most frequent scores and simulation details</summary><p>Scores shown as '+e(p.awayName)+' – '+e(p.homeName)+'.</p>'+s.common.map(([score,n])=>'<p><b>'+score+'</b> · '+n+' games ('+(n/100).toFixed(1)+'%)</p>').join('')+'<button class="miniBtn" data-simulation-key="'+e(s.key)+'" onclick="USScoreSimulation.download(this.dataset.simulationKey)">Download all 10,000 scores ↓</button><p>Hypothetical outcomes using the same Advantage win probability and score forecast. Margin variation follows their logistic relationship; total-score variation assumes a 12-point standard deviation. Scores are rounded to whole points, bounded at zero, and rounded ties are resolved toward the sampled winner. These provisional score ranges are not validated confidence intervals. The simulation stays fixed between refreshes.</p></details></section>';
 }
 function csv(s){return 'Game,Away score,Home score,Home margin,Total\n'+s.results.map((r,i)=>[i+1,r.away,r.home,r.home-r.away,r.home+r.away].join(',')).join('\n')}
 function download(key){const s=cache.get(key);if(!s)return;const url=URL.createObjectURL(new Blob([csv(s)],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='usports-10000-score-simulations.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 root.USScoreSimulation={run,card,csv,download};
})(typeof globalThis!=='undefined'?globalThis:this);
