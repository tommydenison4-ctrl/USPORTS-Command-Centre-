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
  load().then(([infos,venues])=>{if(!host.isConnected||host.dataset.gameId!==g.id)return;const info=infos[g.id]||{};const site=info.stadium||info.site||'';const normalize=x=>String(x).toLowerCase().replace(/[^a-z0-9]/g,'');const venue=Object.values(venues).find(v=>normalize(site).includes(normalize(v.name)))||null;
   let body=site?'<p class="postgame-venue-name">'+esc(site)+'</p>':'<p>Venue not reported in the gamebook.</p>';
   if(venue?.image)body='<img class="postgame-stadium-photo" src="'+safe(venue.image)+'" alt="'+esc(venue.name)+'" loading="lazy">'+body+'<small>Photo: '+esc(venue.credit)+' · <a href="'+safe(venue.licenseUrl)+'" target="_blank" rel="noopener">'+esc(venue.license)+'</a> · <a href="'+safe(venue.imageSource)+'" target="_blank" rel="noopener">source</a> · cropped</small>';
   if(venue)body+='<a class="postgame-venue-link" href="'+safe(venue.source)+'" target="_blank" rel="noopener">Stadium details &amp; photos ↗</a>';
   const att=Number(String(info.attendance||'').replace(/,/g,''));body+='<dl><div><dt>Attendance</dt><dd>'+(att>0?att.toLocaleString('en-CA'):'Not reported')+'</dd></div>'+(info['kickoff time']?'<div><dt>Kickoff</dt><dd>'+esc(info['kickoff time'])+'</dd></div>':'')+(info.weather?'<div><dt>Weather</dt><dd>'+esc(info.weather)+'</dd></div>':'')+'</dl>';
   body+='<a class="postgame-facts-source" href="'+safe(info.source||r.source)+'" target="_blank" rel="noopener">Official gamebook ↗</a>';
   host.insertAdjacentHTML('beforeend',card('Game information',body,'postgame-side-info'));
  });
 }
 window.PostgameSidebar={mount};
})();
