/* Relocate existing panels; keep their players, links and data handlers intact. */
(()=>{const app=document.getElementById('app');if(!app)return;let queued=false;
 function mount(){const page=app.querySelector('.awm-pregame'),grid=page?.querySelector('.pregame-summary-layout');if(!grid)return;const left=grid.querySelector('.pregame-left'),middle=grid.querySelector('.pregame-main'),right=grid.querySelector('.pregame-sidebar');if(!left||!middle||!right)return;
  for(const [selector,destination] of [['#game-podcast-reaction',left],['.awm-player-leaders',left],['#canu-game-day',right],['#canu-community-game',middle]]){const panel=app.querySelector(selector);if(panel&&!destination.contains(panel))destination.append(panel)}
 }
 new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;mount()})}}).observe(app,{childList:true,subtree:true});window.addEventListener('hashchange',mount);mount();
})();
