/* Home-team coverage is tied to the game ID; stale requests cannot cross matchups. */
(()=>{
 const cache=new Map(),esc=AdvantageModel.esc;
 let busy=false;
 async function mount(){
  if(busy)return;
  const match=location.hash.match(/^#(?:game|live)=(.+)$/),g=match&&(typeof GAMES!=='undefined'?GAMES:[]).find(g=>g.id===match[1]);
  const host=document.querySelector('.official-boxscore,.v63-final-wrap,.v64-wrap,.gameView6,.gamePage,.espnGame,.v102-live');
  if(!g||g.status!=='final'||!host||host.querySelector('#game-home-recap'))return;
  busy=true;
  try{
   let recap=cache.get(g.id);if(!cache.has(g.id)){const r=await fetch('/api/game-recap?game='+encodeURIComponent(g.id));if(!r.ok)return;const body=await r.json();if(body.gameId!==g.id)return;recap=body.recap;cache.set(g.id,recap)}
   if(location.hash!==match[0]||!host.isConnected||!recap)return;
   let url;try{url=new URL(recap.url);if(url.protocol!=='https:')return}catch{return}
   const t=typeof TEAM!=='undefined'?TEAM[g.home]:null;
   const markup='<section class="panel game-home-recap" id="game-home-recap" data-game-id="'+esc(g.id)+'"><header><img class="box-team-logo" src="/api/team-logo?team='+esc(g.home)+'" alt=""><div><small>HOME TEAM · GAME RECAP</small><h2>'+esc(t?.short||g.home)+' game summary</h2></div></header><p>'+(!recap.paraphrased?'“':'')+esc(recap.summary)+(!recap.paraphrased?'”':'')+'</p><footer><span>'+esc(recap.source)+' · '+esc(recap.date)+'</span><a class="sourceBtn" href="'+esc(url.href)+'" target="_blank" rel="noopener">Read the full recap ↗</a></footer></section>';
   const anchor=host.querySelector('#game-podcast-reaction,.gameHero6,.v102-score,.boxHero');(anchor||host).insertAdjacentHTML(anchor?'afterend':'beforeend',markup);
  }catch{}finally{busy=false;if(location.hash!==match[0])queueMicrotask(mount)}
 }
 let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;mount()})}}).observe(document.getElementById('app'),{childList:true,subtree:true});window.addEventListener('hashchange',mount);window.addEventListener('canu-game-final',mount);mount();
})();
