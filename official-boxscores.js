/* Published tables are retained verbatim as text; escaped before rendering. */
(function(){
 const canon=AdvantageModel.canonical,esc=AdvantageModel.esc;
 const find=g=>(window.US_PLAYER_DATA?.games||[]).find(r=>r.id===g.id||(r.date===g.date&&Object.keys(r.teams||{}).some(id=>canon(id)===canon(g.away))&&Object.keys(r.teams||{}).some(id=>canon(id)===canon(g.home))));
 const previous=window.showGame;let sequence=0;
 window.showGame=async function(id){
  const g=GAMES.find(g=>g.id===id);let r=g&&find(g);
  if(g?.status==='final'&&location.hash!=='#game='+id)history.pushState(null,'','#game='+id);
  const token=++sequence,hash=location.hash;
  if(r?.fullBoxscore){try{const response=await fetch(r.fullBoxscore,{cache:'no-cache'});if(response.ok){const full=await response.json();if(full.id===r.id)r=full}}catch{}if(token!==sequence||location.hash!==hash)return}
  if(!r&&g?.status==='final'){
   try{const response=await fetch('/api/final-games?date='+g.date.replace(/-/g,'').slice(0,8)+'&away='+encodeURIComponent(g.away)+'&home='+encodeURIComponent(g.home)+'&detail=1',{cache:'no-store'});const data=await response.json();const x=data.games?.[0];if(x?.final&&x.record&&x.awayScore!=null&&x.homeScore!=null){r={...x.record,id:g.id};g.awayScore=x.awayScore;g.homeScore=x.homeScore;window.US_PLAYER_DATA.games.push(r)}}catch{}
   if(token!==sequence||location.hash!==hash)return;
  }
  if(!r)return previous.apply(this,arguments);
  const a=TEAM[g.away],h=TEAM[g.home];
  const tables=(r.tables||[]).map(t=>'<details class="panel"><summary>'+esc(t.title)+'</summary><div class="football-scroll"><table class="statsTable"><tbody>'+t.rows.map(row=>'<tr>'+row.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>').join('');
  const pages=(r.pages||[]).map((p,i)=>'<details class="panel"><summary>Official gamebook · page '+(i+1)+'</summary><pre style="white-space:pre-wrap;overflow:auto">'+esc(p)+'</pre></details>').join('');
  const players=USPlayerBoxStats.html(r,TEAMS,esc);
  const legacy=!r.pages?.length&&!(typeof LIMITED_GAMES!=='undefined'&&LIMITED_GAMES[id])&&((typeof RICH_GAMES!=='undefined'&&RICH_GAMES[id])||(typeof BOX!=='undefined'&&(BOX[id]?.quarters||BOX[id]?.teamstats?.length)));
  if(legacy){const result=previous.apply(this,arguments);Promise.resolve(result).then(()=>{const host=document.querySelector('.v63-final-wrap,.gameView6,.gamePage,.espnGame');if(host&&!host.querySelector('.official-full-tables'))host.insertAdjacentHTML('beforeend','<section class="official-full-tables"><h2>Player box score</h2>'+players+'<h2>All published statistics</h2>'+tables+pages+'</section>')});return result}
  document.getElementById('app').innerHTML=shell('<div class="v63-final-wrap official-boxscore"><button class="back" onclick="goHome()">← All Scores</button><section class="gameHero6"><div class="match6"><div class="team6">'+logo(a,true)+'<h2>'+esc(a.name)+'</h2></div><div class="score6">'+g.awayScore+'–'+g.homeScore+'<small>FINAL · '+esc(g.date)+'</small></div><div class="team6 home"><h2>'+esc(h.name)+'</h2>'+logo(h,true)+'</div></div></section><a class="sourceBtn" href="'+esc(r.source)+'" target="_blank" rel="noopener">Official full box score ↗</a>'+players+'<h2>All published statistics</h2>'+tables+pages+'</div>','schedule');
 };
 window.OfficialBoxscores={find};
})();
