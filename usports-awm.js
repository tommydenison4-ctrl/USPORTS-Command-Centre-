window.US_AWM=(()=>{
 const data=window.AWM_DATA.USPORTS,A=window.AdvantageModel;
 const school=input=>typeof TEAM==='undefined'?null:TEAM[typeof input==='string'?input:input?.slug];
 const schoolLogo=t=>t&&String(t.logo||'').startsWith('data:')&&typeof REMOTE_TEAM_LOGOS!=='undefined'?(REMOTE_TEAM_LOGOS[t.slug]||t.logo):t?.logo;
 const forecast=g=>{
  if(g?.pendingParticipants||['cancelled','postponed'].includes(g?.status))return {available:false,reason:'A confirmed matchup and kickoff are required.'};
  const p=A.project(data,{...g,league:'USPORTS'});
  if(!p.available)return p;
  const away=school(g.away),home=school(g.home);
  return {...p,...(schoolLogo(away)?{awayLogo:schoolLogo(away)}:{}),...(schoolLogo(home)?{homeLogo:schoolLogo(home)}:{})};
 };
 const newsLogos=n=>'<span class="news-team-logos">'+[...new Set(n.teams||[])].map(id=>{const t=school(id);return t?A.logo(schoolLogo(t),t.short||t.name):''}).join('')+'</span>';

 function panel(g,d){
  const p=forecast(g),st=typeof LIVE_STORE!=='undefined'?LIVE_STORE.games?.[g.id]:null;
  // V113: the mounted national GameCast is the freshest verified state. The old
  // LIVE_STORE can lag behind it, so live probability must share the same snapshot
  // that paints the scoreboard.
  const gc=(window.V102_LIVE&&window.V102_LIVE.g?.id===g.id)?window.V102_LIVE.snap:null;
  const period=String(d?.status?.period??gc?.status?.period??gc?.status?.q??st?.q??'');
  const clock=String(d?.status?.clock??gc?.status?.clock??st?.clock??'');
  const awayRaw=d?.game?.awayScore??gc?.game?.awayScore??gc?.awayScore??st?.as,homeRaw=d?.game?.homeScore??gc?.game?.homeScore??gc?.homeScore??st?.hs;
  const awayScore=awayRaw===''||awayRaw==null?NaN:Number(awayRaw);
  const homeScore=homeRaw===''||homeRaw==null?NaN:Number(homeRaw);
  const q=Number(period.match(/[1-4]/)?.[0]);
  const t=clock.match(/^(\d+):(\d\d)$/);
  const complete=/final/i.test(period)||g?.status==='final';
  // The verified snapshot is the authority for kickoff. Do not wait for a separate
  // LIVE_STORE flag when the feed already has a score, period/clock, or live plays.
  const verifiedLive=complete||(
    Number.isFinite(awayScore)&&Number.isFinite(homeScore)&&
    !/^(pre|pregame|scheduled)$/i.test(period.trim())&&
    ((q>=1&&q<=4&&!!t)||/OT/i.test(period))
  );
  if(verifiedLive){
   const remaining=q&&t?(4-q)*900+Number(t[1])*60+Number(t[2]):null;
   // Start live probability at the frozen pregame prior, then move it from
   // verified score + time. AdvantageModel.live remains the richer path when
   // its inputs are complete; this fallback guarantees a usable live number
   // whenever the GameCast itself has a verified score/clock.
   let l=A.live(data,p,{awayScore,homeScore,remaining,complete});
   if(!l&&p?.available&&Number.isFinite(awayScore)&&Number.isFinite(homeScore)){
    if(complete){
     l={homeWin:homeScore===awayScore ? .5 : (homeScore>awayScore ? 1 : 0),final:true,mode:'Final result'};
    }else if(Number.isFinite(remaining)&&remaining>=0&&remaining<=3600&&Number.isFinite(p.home_win_prob)){
     const prior=Math.max(.001,Math.min(.999,p.home_win_prob));
     const priorLogit=Math.log(prior/(1-prior));
     const margin=homeScore-awayScore;
     const r=Math.max(0,Math.min(1,remaining/3600));
     // At kickoff with a 0-0 score, scoreShift is zero, so live === pregame.
     // As the game advances, the same scoring margin carries more information.
     const scoreScale=Math.max(2.75,10*Math.sqrt(r+.08));
     const scoreShift=margin/scoreScale;
     const homeWin=1/(1+Math.exp(-(priorLogit+scoreShift)));
     l={homeWin,final:false,mode:'Pregame prior + verified score and clock'};
    }
   }
   const liveCard=l
    ?`<section class="awm-card awm-live-only"><small>ADVANTAGE · LIVE WIN PROBABILITY</small><b>${A.esc(TEAM[g.home].short)} ${(l.homeWin*100).toFixed(1)}% · ${A.esc(TEAM[g.away].short)} ${((1-l.homeWin)*100).toFixed(1)}%</b></section>`
    :`<section class="awm-card awm-live-only"><small>ADVANTAGE · LIVE WIN PROBABILITY</small><b>Live probability updating</b></section>`;
   // Once kickoff is verified, pregame scenarios and projected player leaders disappear.
   // Actual team/player statistics are rendered by the live GameCast directly below.
   return '<div id="us-awm-panel" data-game-state="live">'+liveCard+'</div>';
  }
  const html=A.card(p,true,data)+(window.USScoreSimulation?.card(p)||'')+(window.US_PlayerLeaders?.card(window.US_PLAYER_DATA,g)||'')+(window.USGameCardDetails?.watch(g)||'')+(window.USGameCardDetails?.watchSchedule(g)||'');
  return '<div id="us-awm-panel" data-game-state="pregame">'+html+'</div>';
 }
 return {forecast,panel,newsLogos,card:g=>A.card(forecast(g)),data};
})();

// Load the season panels after the existing page has initialized.
(function(){
 async function panels(){if(window.AWM_BUNDLED)return;for(const file of ['season-watch-data.js', 'watch-media-data.js', 'season-watch.js', 'standings-data.js', 'news-data.js', 'usports-realtime.js', 'player-stats-usports-data.js', 'rankings-data.js', 'podcasts-data.js', 'football-tabs.js']){try{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=file+'?v=20261003featured1';script.onload=resolve;script.onerror=reject;document.head.append(script)})}catch(error){console.warn('Season panel unavailable:',file);break}}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',panels,{once:true});else panels();
})();

