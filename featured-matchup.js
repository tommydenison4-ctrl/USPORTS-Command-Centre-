(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.USFeatured=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 function today(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-')}
 function select(games,schools,date=today()){
  const records={};for(const id of Object.keys(schools))records[id]={w:0,l:0,t:0,g:0};
  for(const g of games){if(g.status!=='final'||g.exhibition||g.date>date||!Number.isFinite(g.awayScore)||!Number.isFinite(g.homeScore))continue;const a=records[g.away],h=records[g.home];if(!a||!h)continue;a.g++;h.g++;if(g.awayScore===g.homeScore){a.t++;h.t++}else if(g.awayScore>g.homeScore){a.w++;h.l++}else{h.w++;a.l++}}
  const next=games.filter(g=>g.date>=date&&!g.exhibition&&!g.pendingParticipants&&!['final','cancelled','postponed'].includes(g.status)&&schools[g.away]&&schools[g.home]).sort((a,b)=>a.date.localeCompare(b.date));
  if(!next.length)return null;
  const slate=next.filter(g=>g.date===next[0].date),pct=r=>r.g?(r.w+r.t/2)/r.g:0;
  const strength=g=>{const a=records[g.away],h=records[g.home];return [Math.min(pct(a),pct(h)),pct(a)+pct(h),a.w+h.w]};
  slate.sort((a,b)=>{const x=strength(a),y=strength(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return y[i]-x[i];return String(a.time||'').localeCompare(String(b.time||''))||a.id.localeCompare(b.id)});
  return {game:slate[0],away:records[slate[0].away],home:records[slate[0].home]};
 }
 function html(games,schools,esc,logo,prediction){const pick=select(games,schools);if(!pick)return '<section class="hero featured-game"><div><div class="kicker">NEXT GAME UP</div><h2>Season schedule</h2><p>No upcoming matchup is scheduled.</p></div></section>';const {game:g,away:a,home:h}=pick,record=r=>r.w+'–'+r.l+(r.t?'–'+r.t:'');return '<section class="hero featured-game"><div><div class="kicker">FEATURED MATCHUP</div><h2>'+esc(schools[g.away].short)+' at '+esc(schools[g.home].short)+'</h2><p>'+esc(new Date(g.date+'T12:00:00').toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'}))+(g.time?' · '+esc(g.time):'')+(g.venue?' · '+esc(g.venue):'')+'</p><div class="featured-teams">'+logo(schools[g.away],true)+'<b>'+esc(schools[g.away].short)+' <span>'+record(a)+'</span></b><span>at</span>'+logo(schools[g.home],true)+'<b>'+esc(schools[g.home].short)+' <span>'+record(h)+'</span></b></div><button class="featured-open" onclick="V102_LIVE.open(\''+esc(g.id)+'\')">Open matchup →</button></div><div>'+prediction(g)+'</div></section>'}
 return {select,today,html};
});
