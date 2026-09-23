window.US_AWM=(()=>{
 const data=window.AWM_DATA.USPORTS,A=window.AdvantageModel;
 const forecast=g=>A.project(data,{...g,league:'USPORTS'});
 function panel(g,d){
  const p=forecast(g),st=typeof LIVE_STORE!=='undefined'?LIVE_STORE.games?.[g.id]:null;
  let html=A.card(p,true,data);
  if(st?._realLive){
   const q=Number(String(d?.status?.period||st.q||'').match(/[1-4]/)?.[0]);
   const t=String(d?.status?.clock||st.clock||'').match(/^(\d+):(\d\d)$/);
   const as=d?.game?.awayScore??st.as,hs=d?.game?.homeScore??st.hs;
   const l=A.live(data,p,{awayScore:as,homeScore:hs,remaining:q&&t?(4-q)*900+Number(t[1])*60+Number(t[2]):null,complete:/final/i.test(d?.status?.period||st.q||'')});
   html=`<section class="awm-card"><small>ADVANTAGE · LIVE WIN PROBABILITY</small>${l?`<b>${A.esc(TEAM[g.home].short)} ${(l.homeWin*100).toFixed(1)}% · ${A.esc(TEAM[g.away].short)} ${((1-l.homeWin)*100).toFixed(1)}%</b><p>${A.esc(l.mode||'Final result')}</p>`:'<b>Live probability unavailable</b><p>A frozen prior and verified score/clock are required.</p>'}</section>`+html;
  }return '<div id="us-awm-panel">'+html+'</div>';
 }
 return {forecast,panel,card:g=>A.card(forecast(g)),data};
})();
