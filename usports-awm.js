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
  let html=A.card(p,true,data)+(window.US_PlayerLeaders?.card(window.US_PLAYER_DATA,g)||'');
  if(st?._realLive){
   const q=Number(String(d?.status?.period||st.q||'').match(/[1-4]/)?.[0]);
   const t=String(d?.status?.clock||st.clock||'').match(/^(\d+):(\d\d)$/);
   const as=d?.game?.awayScore??st.as,hs=d?.game?.homeScore??st.hs;
   const l=A.live(data,p,{awayScore:as,homeScore:hs,remaining:q&&t?(4-q)*900+Number(t[1])*60+Number(t[2]):null,complete:/final/i.test(d?.status?.period||st.q||'')});
   html=`<section class="awm-card"><small>ADVANTAGE · LIVE WIN PROBABILITY</small>${l?`<b>${A.esc(TEAM[g.home].short)} ${(l.homeWin*100).toFixed(1)}% · ${A.esc(TEAM[g.away].short)} ${((1-l.homeWin)*100).toFixed(1)}%</b><p>${A.esc(l.mode||'Final result')}</p>`:'<b>Live probability unavailable</b><p>A frozen prior and verified score/clock are required.</p>'}</section>`+html;
  }return '<div id="us-awm-panel">'+html+'</div>';
 }
 return {forecast,panel,newsLogos,card:g=>A.card(forecast(g)),data};
})();

// Load the season panels after the existing page has initialized.
(function(){
 async function panels(){if(window.AWM_BUNDLED)return;for(const file of ['season-watch-data.js', 'season-watch.js', 'standings-data.js', 'news-data.js', 'usports-realtime.js', 'player-stats-usports-data.js', 'rankings-data.js', 'football-tabs.js']){try{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=file+'?v=20261002original4';script.onload=resolve;script.onerror=reject;document.head.append(script)})}catch(error){console.warn('Season panel unavailable:',file);break}}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',panels,{once:true});else panels();
})();
