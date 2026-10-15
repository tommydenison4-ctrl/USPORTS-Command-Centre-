/* Public fan names and locked choices, revealed only after kickoff. */
window.USScoreboardPicks=(()=>{
 const states=new Map(),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const team=s=>typeof TEAM!=='undefined'?TEAM[s]?.short||s:s;
 function body(s){
  if(s.error)return '<p role="status">Fan picks could not be loaded.</p><button type="button" data-picks-retry>Try again</button>';
  if(!s.data)return '<p role="status">Loading fan picks…</p>';
  const d=s.data;if(!d.available)return '<p>'+esc(d.message||'Picks will appear at kickoff.')+'</p>';
  if(!d.total)return '<p>No picks were saved for this game.</p>';
  return '<p class="scoreboard-picks-total">'+d.total+' pick'+(d.total===1?'':'s')+' · Locked at kickoff</p>'+(d.picks.length?'<ul>'+d.picks.map(p=>'<li><span><strong>'+esc(p.name)+'</strong><small>#'+esc(p.tag)+'</small></span><b>'+esc(team(p.winner))+'</b></li>').join('')+'</ul>':'')+(d.anonymous?'<p>'+d.anonymous+' anonymous pick'+(d.anonymous===1?'':'s')+' included in the totals.</p>':'');
 }
 function control(g,reveal){if(!reveal||g.exhibition||g.pendingParticipants)return '';const s=states.get(g.id)||{};return '<details class="scoreboard-picks" data-scoreboard-picks="'+esc(g.id)+'" '+(s.open?'open':'')+'><summary aria-label="See fan picks for '+esc(team(g.away)+' at '+team(g.home))+'">Who picked whom</summary><div class="scoreboard-picks-body">'+body(s)+'</div></details>'}
 async function load(id,force=false){let s=states.get(id)||{};states.set(id,s);if(s.loading||s.data&&!force)return;s.loading=true;s.error=false;paint(id);
  try{const r=await fetch('/api/fan-consensus?view=game-picks&gameId='+encodeURIComponent(id),{cache:'no-store',signal:AbortSignal.timeout(20000)}),d=await r.json();if(!r.ok||!d.ok||d.gameId!==id)throw Error();s.data=d}catch{s.error=true}finally{s.loading=false;paint(id)}
 }
 function paint(id){for(const n of document.querySelectorAll('[data-scoreboard-picks]'))if(n.dataset.scoreboardPicks===id)n.querySelector('.scoreboard-picks-body').innerHTML=body(states.get(id)||{})}
 document.addEventListener('toggle',e=>{const n=e.target;if(!n.matches?.('[data-scoreboard-picks]'))return;const id=n.dataset.scoreboardPicks,s=states.get(id)||{};s.open=n.open;states.set(id,s);if(n.open)load(id)},true);
 document.addEventListener('click',e=>{const retry=e.target.closest('[data-picks-retry]');if(retry){e.preventDefault();load(retry.closest('[data-scoreboard-picks]').dataset.scoreboardPicks,true)}});
 return {control};
})();
