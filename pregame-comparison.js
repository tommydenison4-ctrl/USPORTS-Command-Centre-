/* Show the original saved forecast alongside the verified result. */
(function(root){
 function html(g,p){
  if(g?.status!=='final'||!p?.available||!p.permanent||p.gameId!==g.id||p.date!==g.date)return '';
  const e=root.AdvantageModel.esc,n=v=>Number.isFinite(v)?v.toFixed(1):'—';
  const a=p.awayName,h=p.homeName;
  return '<section id="locked-pregame-comparison" class="panel awm-card" data-game-id="'+e(g.id)+'"><small>LOCKED PREGAME PREDICTION</small><h3>Prediction vs. final score</h3><div class="football-scroll"><table class="statsTable"><thead><tr><th>Team</th><th>Predicted score</th><th>Final score</th><th>Pregame win chance</th></tr></thead><tbody>'+[[a,p.away_score,g.awayScore,p.away_win_prob],[h,p.home_score,g.homeScore,p.home_win_prob]].map(([name,expected,actual,prob])=>'<tr><td>'+e(name)+'</td><td>'+n(expected)+'</td><td>'+e(actual??'—')+'</td><td>'+n(Number.isFinite(prob)?prob*100:NaN)+'%</td></tr>').join('')+'</tbody></table></div><p>Original pregame forecast · saved '+e(String(p.lockedAt||p.asOf||'').slice(0,10))+'. Kept unchanged after kickoff.</p></section>';
 }
 function decorate(){
  const match=location.hash.match(/^#(?:game|live)=(.+)$/);if(!match||typeof GAMES==='undefined')return;
  const g=GAMES.find(x=>x.id===decodeURIComponent(match[1]));if(!g||g.status!=='final')return;
  const p=root.US_AWM?.forecast(g),body=html(g,p);if(!body)return;
  const app=document.getElementById('app');if(!app)return;
  const old=app.querySelector('#locked-pregame-comparison');if(old?.dataset.gameId===g.id&&old._forecastBody===body)return;
  if(old){old.outerHTML=body;app.querySelector('#locked-pregame-comparison')._forecastBody=body;return;}
  const anchor=app.querySelector('.gameHero6,.v102-score,.gameHero,.game-hero');
  if(anchor)anchor.insertAdjacentHTML('afterend',body);else{const host=app.querySelector('.v63-final-wrap,.gameView6,.gamePage,.espnGame,.v102-live');if(!host)return;host.insertAdjacentHTML('beforeend',body);}
  const added=app.querySelector('#locked-pregame-comparison');if(added)added._forecastBody=body;
 }
 let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}
 root.USPregameComparison={html,decorate};
 if(typeof MutationObserver!=='undefined'){const app=document.getElementById('app');if(app)new MutationObserver(queue).observe(app,{childList:true,subtree:true,characterData:true});}
 root.addEventListener('hashchange',queue);queue();
})(window);
