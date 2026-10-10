/* Compact, sourced facts beside the postgame Summary. */
(function(){
 const esc=x=>AdvantageModel.esc(String(x??''));
 const safe=x=>/^https:\/\//.test(x||'')?esc(x):'';
 let resources;
 function load(){return resources||(resources=Promise.all(['/data/game-info-usports.json','/data/stadium-media.json'].map(u=>fetch(u).then(r=>r.ok?r.json():{}).catch(()=>({})))))}
 function card(title,body,cls){return '<section class="postgame-side-card '+(cls||'')+'"><h2>'+title+'</h2>'+body+'</section>'}
 function news(host){const stories=window.US_NEWS_SEED?.stories||[];const chosen=[],seen=new Set();for(const x of stories){const key=window.TEAM?.[x.teams?.[0]]?.conf||x.teams?.[0];if(seen.has(key))continue;seen.add(key);chosen.push(x);if(chosen.length===4)break}host.insertAdjacentHTML('beforeend',card('Around U SPORTS',chosen.map(x=>'<a class="postgame-news-item" href="'+safe(x.url)+'" target="_blank" rel="noopener"><small>'+esc(x.source)+' · '+esc(x.date)+'</small><strong>'+esc(x.title)+'</strong></a>').join(''),'postgame-side-news'))}
 function mount(g,r,rows,a,h){const host=document.querySelector('.postgame-sidebar');if(!host)return;host.dataset.gameId=g.id;
  const totals=r.teamTotals||{},away=totals[g.away]||{},home=totals[g.home]||{};
  const selected=[];
  const add=(label,av,hv)=>{if(av!=null&&hv!=null)selected.push([label,av,hv])};
  add('Passing yards',away.passing,home.passing);add('Rushing yards',away.rushing,home.rushing);
  for(const [label,pattern] of [['Total yards',/total offense.*yards/i],['First downs',/first downs.*total/i],['Possession',/poss\. time|time of possession/i],['Penalties–yards',/penalties.*yds/i]]){const x=rows.find(row=>pattern.test(row[0]));if(x)add(label,x[1],x[2])}
  if(selected.length)host.insertAdjacentHTML('beforeend',card('Team stats','<div class="postgame-stat-head"><span>'+esc(a.short)+'</span><span>'+esc(h.short)+'</span></div>'+selected.map(x=>'<div class="postgame-stat-row"><b>'+esc(x[1])+'</b><span>'+esc(x[0])+'</span><b>'+esc(x[2])+'</b></div>').join(''),'postgame-side-stats'));
  news(host);
  load().then(([infos,venues])=>{if(!host.isConnected||host.dataset.gameId!==g.id)return;host.insertAdjacentHTML('beforeend',facts(g,infos[g.id]||{},venues,r.source,false));});
 }
 function facts(g,info={},venues={},source='',pre=false){
  const venue=window.USGameVenues.resolve(g,info,venues);
  let body='<p class="postgame-venue-name">'+esc(venue.name)+'</p>'+(venue.city?'<p class="pregame-venue-city">'+esc(venue.city)+'</p>':'');
  if(venue.fallback)body+='<small class="venue-default-label">Home venue</small>';
  const photo=venue.image||('/api/stadium-image?name='+encodeURIComponent(venue.name)+'&source='+encodeURIComponent(venue.source||''));
  body='<img class="postgame-stadium-photo" src="'+safe(photo)+'" alt="'+esc(venue.name)+' stadium" loading="lazy" onerror="this.style.display=\'none\'">'+body;
  if(venue.imageSource)body+='<small>Photo: '+esc(venue.credit||'')+' · <a href="'+safe(venue.imageSource)+'" target="_blank" rel="noopener">Source and licence ↗</a></small>';
  if(venue.source)body+='<a class="postgame-venue-link" href="'+safe(venue.source)+'" target="_blank" rel="noopener">Stadium details &amp; photos ↗</a>';
  const att=Number(String(info.attendance||'').replace(/,/g,'')),kick=pre?g.time:info['kickoff time'];
  body+='<dl>'+(pre?'<div><dt>Date</dt><dd>'+esc(g.date)+'</dd></div>':'<div><dt>Attendance</dt><dd>'+(att>0?att.toLocaleString('en-CA'):'Not reported')+'</dd></div>')+(kick?'<div><dt>Kickoff</dt><dd>'+esc(kick)+'</dd></div>':'')+(info.weather?'<div><dt>Weather</dt><dd>'+esc(info.weather)+'</dd></div>':'')+'</dl>';
  const link=info.source||source;if(link)body+='<a class="postgame-facts-source" href="'+safe(link)+'" target="_blank" rel="noopener">'+(pre?'Official schedule':'Official gamebook')+' ↗</a>';
  return card('Game information',body,'postgame-side-info');
 }
 function mountPregame(g){
  const host=document.querySelector('.pregame-sidebar');if(!host||host.dataset.gameId===g.id)return;host.dataset.gameId=g.id;
  load().then(([infos,venues])=>{if(!host.isConnected||host.dataset.gameId!==g.id)return;host.insertAdjacentHTML('afterbegin',facts(g,infos[g.id]||{},venues,g.source||'',true));});news(host);
  const watch=window.USGameCardDetails?.watch(g)||'';if(watch)host.insertAdjacentHTML('afterbegin',card('Watch the game',watch,'pregame-watch-card'));
 }

 window.PostgameSidebar={mount,mountPregame,facts};
})();
