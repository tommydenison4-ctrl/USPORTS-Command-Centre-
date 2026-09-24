(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const base=location.protocol==='file:'?'https://usports-command-centre.vercel.app':'';
 function saved(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v&&(v.checkedAt||v.generatedAt)>(fallback?.checkedAt||fallback?.generatedAt||'')?v:fallback}catch{return fallback}}
 let standings=saved('us-standings-2026',window.US_STANDINGS_SEED),news=saved('us-news-2026',window.US_NEWS_SEED),busy=false,standError='',newsError='';
 if(standings?.season!==2026)standings=window.US_STANDINGS_SEED;
 const time=s=>s?new Date(s).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Not yet verified';
 function table(conf){const rows=(standings?.rows||[]).filter(r=>r.conference===conf).sort((a,b)=>(a.position??99)-(b.position??99));return '<div class="us-table-scroll"><table><thead><tr><th>Team</th><th>Played</th><th>Wins</th><th>Losses</th><th>Points for</th><th>Points against</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><a target="_blank" rel="noopener" href="'+esc(r.url)+'">'+esc(r.name)+'</a>'+(r.stale?' <small>last verified</small>':'')+'</td>'+['g','w','l','pf','pa'].map(k=>'<td>'+(r.record?.[k]??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
 function standingBody(){return ['OUA','RSEQ','AUS','CW'].map(c=>{const rows=(standings?.rows||[]).filter(r=>r.conference===c),old=rows.some(r=>r.stale);const verified=rows.map(r=>r.verifiedAt).filter(Boolean).sort()[0];return '<section><h3>'+(c==='CW'?'Canada West':c)+'</h3><p class="us-feed-note">'+(old?'Source unavailable — showing last verified records. ':'Official conference order. ')+'Verified '+esc(time(verified))+'</p>'+table(c)+'</section>'}).join('')}
 function newsBody(){const today=new Date().toISOString().slice(0,10);const rows=(news?.stories||[]).filter(n=>n.date?.startsWith('2026-')&&n.date<=today&&/^https:\/\//.test(n.url));return rows.slice(0,12).map(n=>'<article><a href="'+esc(n.url)+'" target="_blank" rel="noopener">'+esc(n.title)+'</a><small>'+esc(n.source)+' · '+esc(n.date)+'</small></article>').join('')||'<p>Official stories are temporarily unavailable.</p>'}
 const painted=new WeakMap();function htmlIf(el,html){if(el&&painted.get(el)!==html){painted.set(el,html);el.innerHTML=html}}
 function textIf(el,value){if(el&&el.textContent!==value)el.textContent=value}
 function paint(){
  htmlIf(document.getElementById('us-standings-tables'),standingBody());htmlIf(document.getElementById('us-current-news'),newsBody());
  const status=document.getElementById('us-standings-status');textIf(status,(standError?'Refresh unavailable. ':'')+'Last checked '+time(standings?.checkedAt)+' · '+(standings?.rows||[]).filter(r=>r.record).length+'/27 verified team records');
  const ns=document.getElementById('us-news-status');textIf(ns,(newsError?'Refresh unavailable — showing saved stories. ':'')+'Last checked '+time(news?.generatedAt)+' · '+(news?.sourceStatus||[]).filter(s=>s.status===200).length+'/27 school sources responded');
 }
 function mount(){const hero=document.querySelector('#app .hero'),host=document.querySelector('[data-us-standings-host]');if(!hero&&!host)return;
  if(!document.getElementById('us-standings-live')){const h='<section class="us-live-data" id="us-standings-live"><h2>2026 conference standings</h2><p id="us-standings-status"></p><p class="us-feed-note">Checks official sources every minute while this page is open. Records change when conferences publish updates.</p><details'+(host?' open':'')+'><summary>View all four conferences</summary><div id="us-standings-tables" class="us-conferences"></div></details></section>';if(host)host.innerHTML=h;else hero.insertAdjacentHTML('afterend',h);}
  if(hero&&!document.getElementById('us-news-live'))document.getElementById('us-standings-live').insertAdjacentHTML('afterend','<section class="us-live-data" id="us-news-live"><h2>Latest official football news</h2><p id="us-news-status"></p><p class="us-feed-note">Checks every minute. Headlines link to the original school stories.</p><details><summary>Read the latest stories</summary><div id="us-current-news"></div></details></section>');paint();
 }
 async function refresh(){if(busy||document.hidden)return;busy=true;
  const tasks=await Promise.allSettled(['standings','news?days=14'].map(async path=>{const r=await fetch(base+'/api/'+path,{signal:AbortSignal.timeout(40000),cache:'no-store'});if(!r.ok)throw Error('Source unavailable');const j=await r.json();if(!j.ok)throw Error('No source responded');return j}));
  const sr=tasks[0];if(sr.status==='fulfilled'&&sr.value.season===2026){const old=new Map((standings?.rows||[]).map(r=>[r.slug,r]));standings={...sr.value,rows:sr.value.rows.map(r=>r.record?r:old.get(r.slug)?.record?{...old.get(r.slug),checkedAt:r.checkedAt,stale:true}:r)};standError='';try{localStorage.setItem('us-standings-2026',JSON.stringify(standings))}catch{}}else standError='Unavailable';
  const nr=tasks[1];if(nr.status==='fulfilled'){const incoming=nr.value;const rows=new Map([...(news?.stories||[]),...(incoming.stories||[])].filter(n=>n.date?.startsWith('2026-')).map(n=>[n.url,n]));news={...incoming,stories:[...rows.values()].filter(n=>n.date>=incoming.minDate).sort((a,b)=>b.date.localeCompare(a.date))};newsError='';try{localStorage.setItem('us-news-2026',JSON.stringify(news))}catch{};try{mergeFreshNewsV61(news.stories);repaintNewsV61()}catch{}}else newsError='Unavailable';
  busy=false;paint();
 }
 window.USRealtime={table,refresh,get standings(){return standings}};
 const previousTable=window.standingsTableHTML;
 window.standingsTableHTML=function(conf,current){return !current||current.date>=new Date().toISOString().slice(0,10)?table(conf):previousTable(conf,current)};
 window.refreshNewsV61=refresh;
 const showStandings=function(conf='OUA'){document.getElementById('app').innerHTML=shell('<div class="v65-wrap"><div data-us-standings-host></div></div>','playoffs');location.hash='playoffs='+conf;mount()};
 window.playoffs65=showStandings;window.playoffs72=showStandings;

 const style=document.createElement('style');style.textContent='.us-live-data{padding:22px;margin:16px 0;background:#101925;color:#eaf0f7;border:1px solid #293b50;border-radius:16px}.us-live-data h2{font-size:23px;margin:0 0 10px}.us-live-data p{font-size:13px}.us-live-data .us-feed-note{color:#a7b8cc;font-size:12px;line-height:1.6}.us-live-data summary{cursor:pointer;color:#9cd5f5;padding:10px 0}.us-conferences{display:grid;grid-template-columns:1fr 1fr;gap:22px}.us-table-scroll{overflow-x:auto}.us-live-data table{width:100%;border-collapse:collapse;font-size:13px}.us-live-data th,.us-live-data td{padding:9px 6px;border-bottom:1px solid #ffffff20;text-align:right}.us-live-data th:first-child,.us-live-data td:first-child{text-align:left}.us-live-data a{color:#8eceff;text-decoration:none}.us-live-data small{display:block;color:#a7b8cc;font-size:11px;margin-top:7px}.us-live-data article{padding:12px 0;border-bottom:1px solid #ffffff20}@media(max-width:900px){.us-conferences{grid-template-columns:1fr}}';document.head.append(style);
 if(location.hash.startsWith('#playoffs'))showStandings();
 mount();new MutationObserver(mount).observe(document.getElementById('app'),{childList:true,subtree:true});
 // This replaces the legacy collector so only one request loop refreshes these feeds.
 clearInterval(window.NEWS_REFRESH_TIMER_V70);refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('online',refresh);
})();
