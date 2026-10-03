/* Follow verified finals immediately, and retry published stats without moving the page. */
(function(root){
 const pending=new Map(),states=new Map(),valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
 const games=()=>typeof GAMES!=='undefined'?GAMES:[];
 const canonical=root.AdvantageModel.canonical;
 function matches(r,g){return r?.date===g.date.slice(0,10)&&[g.away,g.home].every(t=>Object.keys(r.teams||{}).some(k=>canonical(k)===canonical(t)))}
 function record(g){return (root.US_PLAYER_DATA?.games||[]).find(r=>matches(r,g))}
 function complete(r,g){return matches(r,g)&&[g.away,g.home].every(t=>{const k=Object.keys(r.teams).find(k=>canonical(k)===canonical(t));return ['passing','rushing','receiving'].every(c=>Array.isArray(r.teams[k][c]))})&&!!(r.tables?.length||r.fullBoxscore)}
 function mount(g,r){const hash=location.hash;if(hash!=='#game='+g.id&&hash!=='#live='+g.id)return;const host=document.querySelector('.v102-live,.v63-final-wrap,.gameView6,.gamePage,.espnGame');if(!host||host.classList.contains('official-boxscore')||host.querySelector('.official-full-tables,#auto-final-boxscore'))return;
  const section=document.createElement('section');section.id='auto-final-boxscore';section.className='panel';section.innerHTML='<h2>Final box score</h2><a class="sourceBtn" target="_blank" rel="noopener" href="'+root.AdvantageModel.esc(r.source)+'">Official full box score ↗</a>'+root.USPlayerBoxStats.html(r,typeof TEAMS!=='undefined'?TEAMS:[],root.AdvantageModel.esc);(host.querySelector('.v102-score,.gameHero6')||host).insertAdjacentElement(host.querySelector('.v102-score,.gameHero6')?'afterend':'beforeend',section);
 }
 function accept(g,x){if(!x?.final||!valid(x.awayScore)||!valid(x.homeScore)||!matches(x.record,g))return false;const r={...x.record,id:g.id};if(Number(x.awayScore)!==Number(g.awayScore)||Number(x.homeScore)!==Number(g.homeScore))return false;
  const rows=root.US_PLAYER_DATA.games,i=rows.findIndex(r=>matches(r,g));if(i<0)rows.push(r);else rows[i]=r;
  if(typeof BOX!=='undefined')BOX[g.id]={...(BOX[g.id]||{}),leaders:x.leaders||BOX[g.id]?.leaders,source:r.source};
  root.USGameCardDetails?.decorate();if(complete(r,g))mount(g,r);return complete(r,g);
 }
 async function request(g,force=false){if(!g||g.status!=='final')return false;const existing=record(g);if(complete(existing,g)){if(existing.tables?.length)mount(g,existing);return true}if(pending.has(g.id))return pending.get(g.id);const prior=states.get(g.id);if(!force&&prior!==undefined&&Date.now()-prior<10000)return false;states.set(g.id,Date.now());
  const work=fetch('/api/final-games?date='+g.date.replace(/-/g,'')+'&away='+encodeURIComponent(g.away)+'&home='+encodeURIComponent(g.home)+'&detail=1',{cache:'no-store',signal:AbortSignal.timeout(25000)}).then(r=>r.ok?r.json():null).then(j=>{const x=j?.games?.find(x=>matches(x.record,g));return x?accept(g,x):false}).catch(()=>false).finally(()=>pending.delete(g.id));pending.set(g.id,work);return work;
 }
 function sweep(){if(document.visibilityState==='hidden')return;const today=root.USFeatured?.today()||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const visible=new Set([...document.querySelectorAll('.gameCard[data-game-id]')].map(c=>c.dataset.gameId));for(const g of games())if(g.status==='final'&&(g.date===today||visible.has(g.id)||['#game='+g.id,'#live='+g.id].includes(location.hash)))request(g)}
 root.USFinalBoxscores={request,accept,complete,sweep};setInterval(sweep,10000);root.addEventListener('hashchange',sweep);root.addEventListener('online',sweep);document.addEventListener('visibilitychange',sweep);sweep();
})(typeof globalThis!=='undefined'?globalThis:this);
