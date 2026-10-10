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
  const tableTitle=t=>{if(/scoring summary/i.test(t.rows?.[0]?.join(' ')))return 'Scoring summary';if(t.rows?.[0]?.[0]==='Scoring')return 'Scoring by quarter';if(t.title==='Official box score'||[a.short,h.short].includes(t.title))return (t.rows?.[0]?.join(' · ')||t.title).slice(0,90);return t.title};
  const tables=(r.tables||[]).map(t=>'<details class="panel published-stat-table"><summary>'+esc(tableTitle(t))+'</summary><div class="football-scroll"><table class="statsTable"><tbody>'+t.rows.map((row,i)=>'<tr>'+row.map(cell=>'<'+(i===0?'th':'td')+'>'+esc(cell)+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('')+'</tbody></table></div></details>').join('');
  const pages=(r.pages||[]).map((p,i)=>'<details class="panel published-stat-table"><summary>Official gamebook · page '+(i+1)+'</summary><pre style="white-space:pre-wrap;overflow:auto">'+esc(p)+'</pre></details>').join('');
  const players=USPlayerBoxStats.html(r,TEAMS,esc);
  const renderTable=(rows,cls='')=>'<div class="football-scroll"><table class="statsTable '+cls+'"><thead><tr>'+rows[0].map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(row=>'<tr>'+row.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const quarter=(r.tables||[]).find(t=>/score by quarter|scoring by quarter/i.test(t.title));
  const stats=(r.tables||[]).find(t=>/^team statistics$/i.test(t.title));
  const totals=r.teamTotals||{};
  const names=[a.short,h.short];
  let group='';const comparisonRows=stats?stats.rows.map((row,i)=>{if(row.length<3){group=row[0];return null}return i===0?['Statistic',...names]:[(group?group+' · ':'')+row[0],...row.slice(1)]}).filter(Boolean):[];
  let comparison=comparisonRows.length?renderTable(comparisonRows):'';
  if(!comparison){const away=totals[g.away],home=totals[g.home];if(away&&home)comparison=renderTable([['Statistic',...names],['Passing yards',away.passing??'—',home.passing??'—'],['Rushing yards',away.rushing??'—',home.rushing??'—'],['Plays',away.plays??'—',home.plays??'—']]);}
  const mainStats=comparison?'<details class="postgame-team-stats"><summary>Team statistics</summary>'+comparison+'</details>':'';
  const raw=(r.tables||[]).filter(t=>t!==quarter&&t!==stats);
  const playTables=raw.filter(t=>/drive|at \d|quarter #|game start|yardline/i.test(t.title));
  const playLabels=new Set(playTables);
  const more=raw.filter(t=>!playLabels.has(t)&&!/(passing|rushing|receiving)$/i.test(t.title));
  const details=list=>list.map(t=>'<details class="published-stat-table"><summary>'+esc(tableTitle(t))+'</summary>'+renderTable(t.rows)+'</details>').join('');
  document.getElementById('app').innerHTML=shell('<div class="v63-final-wrap official-boxscore postgame-page"><button class="back" onclick="goHome()">← All Scores</button><section class="gameHero6"><div class="match6"><div class="team6">'+logo(a,true)+'<h2>'+esc(a.name)+'</h2></div><div class="score6">'+g.awayScore+'–'+g.homeScore+'<small>FINAL · '+esc(g.date)+'</small></div><div class="team6 home"><h2>'+esc(h.name)+'</h2>'+logo(h,true)+'</div></div>'+(quarter?renderTable(quarter.rows.map((row,i)=>i?[String(row[0]).replace(/^Winner\s+/,'').replace(/^[A-Z]{2,4}\s+/,''),...row.slice(1)]:['Team','1','2','3','4','T']),'postgame-quarter'):'')+'</section><nav class="postgame-tabs" aria-label="Game views"><button type="button" data-postgame-tab="summary" aria-pressed="true">Summary</button><button type="button" data-postgame-tab="box" aria-pressed="false">Box Score</button><button type="button" data-postgame-tab="plays" aria-pressed="false">Play-by-Play</button></nav><section data-postgame-panel="box" hidden><div class="postgame-player-grid">'+players+'</div>'+mainStats+'<details class="postgame-more"><summary>Defense, special teams &amp; more</summary>'+details(more)+pages+'</details><a class="postgame-source" href="'+esc(r.source)+'" target="_blank" rel="noopener">Official full box score ↗</a></section><section data-postgame-panel="summary"><div class="postgame-summary-content"></div></section><section data-postgame-panel="plays" hidden><h2>Drives &amp; play-by-play</h2>'+(details(playTables)||'<p>Play-by-play is not available for this game.</p>')+'</section></div>','schedule');

 };
 window.OfficialBoxscores={find};
})();
