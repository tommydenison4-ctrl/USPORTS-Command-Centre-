/* Enrich schedule cards without replacing their navigation or live score updates. */
(()=>{
 const A=AdvantageModel,e=A.esc;
 // Event links verified on OUA.tv's Upcoming football listing on 2026-10-03.
 const events={
  '2026-10-03-laurier-waterloo':'5237','2026-10-03-guelph-toronto':'5236','2026-10-03-queens-western':'5235','2026-10-03-york-windsor':'5238',
  '2026-10-04-carleton-ottawa':'5239','2026-10-09-toronto-mcmaster':'5240','2026-10-10-ottawa-york':'5241','2026-10-10-windsor-queens':'5242','2026-10-10-western-carleton':'5243',
  '2026-10-17-york-toronto':'5246','2026-10-17-western-ottawa':'5245','2026-10-17-guelph-queens':'5244','2026-10-17-carleton-laurier':'5248','2026-10-17-mcmaster-waterloo':'5247',
  '2026-10-24-windsor-guelph':'5253','2026-10-24-toronto-carleton':'5251','2026-10-24-waterloo-york':'5252','2026-10-24-laurier-western':'5250','2026-10-24-queens-mcmaster':'5249'
 };
 const key=g=>String(g.date).slice(0,10)+'-'+g.away+'-'+g.home;
 const teamName=t=>typeof TEAM!=='undefined'?TEAM[t]?.short||t:t;
 function watchSchedule(g){const games=(typeof GAMES!=='undefined'?GAMES:[]).filter(x=>events[key(x)]&&x.date>=String(g.date).slice(0,10)&&x.status!=='final');return games.length?'<details class="game-watch-list"><summary>Upcoming OUA.tv football games</summary>'+games.map(x=>'<p><a target="_blank" rel="noopener" href="https://oua.tv/select-package/'+events[key(x)]+'">'+e(x.date.slice(0,10))+' · '+e(teamName(x.away))+' at '+e(teamName(x.home))+' ↗</a></p>').join('')+'</details>':''}

 function watch(g){if(String(g.conference).toUpperCase()!=='OUA'||g.exhibition||g.pendingParticipants||['cancelled','postponed'].includes(g.status))return '';
  const event=events[key(g)];
  return '<div class="game-watch"><a href="https://oua.tv/'+(event?'select-package/'+event:'upcoming')+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">Watch on OUA.tv ↗</a></div>';
 }
 function decorate(){for(const card of document.querySelectorAll('.gameCard[data-game-id]')){
  const g=(typeof GAMES!=='undefined'?GAMES:[]).find(x=>x.id===card.dataset.gameId);if(!g)continue;
  const final=g.status==='final',body=window.V102_LIVE?.isLive(g.id)?'':US_PlayerLeaders.compact(window.US_PLAYER_DATA,g,final,typeof BOX!=='undefined'?BOX[g.id]?.leaders:null);
  const current=card.querySelector('.schedule-card-leaders');
  if(body){if(!current){const host=document.createElement('div');host.className='schedule-card-leaders';host.innerHTML=body;host._leaderBody=body;(card.querySelector('.gameAction')||card).insertAdjacentElement(card.querySelector('.gameAction')?'beforebegin':'beforeend',host)}else if(current._leaderBody!==body){current.innerHTML=body;current._leaderBody=body}}else current?.remove();
  // The final-score detail hydrator can also render leaders. Keep one consistent list.
  if(body)card.querySelector('.v113-final-leaders')?.remove();
  const badge=card.querySelector('.attached-video-badge'),has=window.USGameHighlights?.has(g.id);
  if(has&&!badge){const link=document.createElement('a');link.className='attached-video-badge';link.href='#'+(final?'game':'live')+'='+encodeURIComponent(g.id);link.setAttribute('aria-label','Video clips attached');link.title='Video clips attached';link.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="5" width="14" height="14" rx="2"/><path d="M16 9l6-3v12l-6-3z"/></svg> Video';link.onclick=ev=>{ev.stopPropagation()};card.querySelector('.gameTop')?.append(link)}else if(!has)badge?.remove();
  const old=card.querySelector('.game-watch');if(!final&&!old){const html=watch(g);if(html)card.querySelector('.gameAction')?.insertAdjacentHTML('beforebegin',html)}else if(final)old?.remove();
 }}
 let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
 window.USGameCardDetails={watch,watchSchedule,decorate,events};new MutationObserver(schedule).observe(document.getElementById('app'),{subtree:true,childList:true});window.addEventListener('storage',schedule);window.addEventListener('hashchange',schedule);schedule();
})();
