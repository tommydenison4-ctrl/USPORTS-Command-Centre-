
(()=>{
  const graphicsStyle=document.createElement('style');graphicsStyle.textContent='.canu-chip-situation{display:block;margin-top:5px;color:#d7e3ef;font-size:11px;font-weight:700;line-height:1.3}.canu-live-event{display:block;color:#ff627b;font-size:11px;font-weight:900;font-style:normal;letter-spacing:.08em;margin:6px 0}.canu-live-event:empty{display:none}.v102-score{position:relative}#canu-selected-event{position:absolute;bottom:2px;left:0;right:0;text-align:center}.canu-drive-trail{position:absolute;inset:0;pointer-events:none;z-index:7}.canu-drive-step{position:absolute;width:1px;background:rgba(255,255,255,.55)}.canu-trail-end{position:absolute;top:50%;width:14px;height:14px;transform:translate(-50%,-50%);border:2px solid #fff;border-radius:50%;background:inherit;color:#fff;font:900 9px/10px sans-serif;text-align:center;box-shadow:0 1px 3px #000}.canu-ball-trail{pointer-events:auto!important;cursor:help}.canu-drive-legend{display:flex;gap:14px;font-size:10px;font-weight:800;color:#cbd9e7;padding:8px 12px}.canu-drive-legend span:before{content:"";display:inline-block;width:20px;height:5px;border:1px solid #fff;border-radius:4px;margin-right:5px;background:#000}.canu-drive-legend .pass:before{background:#ff334b}.canu-ball-trail{position:absolute;top:52%;height:5px;background:#000;border-radius:8px;pointer-events:none;z-index:5;box-shadow:0 0 0 1px rgba(255,255,255,.35)}.canu-ball-trail.pass{background:#ff334b}';document.head.appendChild(graphicsStyle);
  const L={selected:'',source:null,snap:null,cat:{away:'passing',home:'passing'},tab:'overview',pbp:false,inflight:false,timer:null,lastDiscover:0,rendered:false,lastUserScroll:0,scrollRAF:0};
  window.V102_LIVE=L;
  try{if('scrollRestoration' in history)history.scrollRestoration='auto'}catch{}
  const esc2=v=>esc(v==null?'':String(v));
  const now=()=>Date.now();
  const game=id=>(GAMES||[]).find(g=>g.id===id);
  const team=s=>TEAM?.[s]||{};
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/saint/g,'st').replace(/[^a-z0-9]+/g,' ').trim();
  const aliases=slug=>{const t=team(slug);return [slug,t.abbr,t.short,t.name,...(slug==='windsor'?['WSR']:[]),...(slug==='laurier'?['WLU']:[]),...(slug==='stfx'?['St. Francis Xavier','St. Francis Xavier X-Men']:[]),...(slug==='mount-allison'?['Mt. Allison']:[])].map(norm).filter(Boolean)};
  const tm=(slug,label)=>{const q=norm(label);return q&&aliases(slug).some(v=>q===v)};
  function sourceKey(id){return 'usports:v115:source:'+id} function snapKey(id){return 'usports:v116:snap:'+id} function scrollKey(id){return 'usports:v104:scroll:'+id}
  function readSession(k){for(const st of [localStorage,sessionStorage]){try{const raw=st.getItem(k);if(raw)return JSON.parse(raw)}catch{}}return null} function saveSession(k,v){for(const st of [localStorage,sessionStorage]){try{st.setItem(k,JSON.stringify(v))}catch{}}}
  function validIdentity(g,d){const x=d?.identity;return !!g&&x?.gameId===g.id&&x.date===g.date&&x.away===g.away&&x.home===g.home;}
  function verified(g,j){return j?.ok&&j.game===g.id&&validIdentity(g,j.data)&&tm(g.away,j.visitor)&&tm(g.home,j.home);}
  for(const g of GAMES||[]){const st=LIVE_STORE.games[g.id];if(st?._realLive&&!validIdentity(g,{identity:st._feedIdentity})){for(const k of ['_realLive','as','hs','q','clock','pos','down','distance','spot'])delete st[k];}}
  function isFinal(g,d){return g?.status==='final'||d?.status?.complete===true||/final|complete/i.test(d?.status?.period||'');}
  function finalSnapshot(g,d){
    if(!isFinal(g,d))return d;
    const scores=g?.status==='final'?{awayScore:g.awayScore,homeScore:g.homeScore}:{};
    return {...d,game:{...d?.game,...scores},status:{...d?.status,complete:true,period:'FINAL',clock:'',running:'N'},situation:{}};
  }
  function saveScroll(){}
  function savedScroll(){return window.scrollY||0}
  function restoreScroll(){}
  const renderedMarkup=new WeakMap();
  function htmlIfChanged(el,html){if(el&&renderedMarkup.get(el)!==html){renderedMarkup.set(el,html);el.innerHTML=html}}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function ymd(s){return String(s||'').replace(/\D/g,'').slice(0,8)}
  function matchSource(x,date){let best=null,score=-999;for(const g of (GAMES||[])){if(g.status==='final')continue;if(date&&g.date!==date)continue;const pd=x.page?.match(/boxscores\/(\d{8})_/)?.[1];if(pd&&pd!==ymd(g.date))continue;let s=0;if(tm(g.away,x.visitor))s+=100;if(tm(g.home,x.home))s+=100;if(tm(g.away,x.home))s-=80;if(tm(g.home,x.visitor))s-=80;if(s>score){score=s;best=g}}return score>=180?best:null}
  // Per-game event state is never shared with the selected game's feed.
  const liveEvents=new Map(),fieldFrames=new WeakMap();
  function eventKind(label){return label==='SCORE UPDATE'?'score':/^TURNOVER(?:$| — )/.test(label)?'turnover':label==='RED ZONE'?'redzone':'';}
  function liveEvent(previous,d,redZone=false){
    const text=String(d?.plays?.[0]?.description||'').toLowerCase();
    if(/final|complete/i.test(d?.status?.period||''))return '';
    if(previous&&((Number(d?.game?.awayScore)>previous.away)||(Number(d?.game?.homeScore)>previous.home)))return 'SCORE UPDATE';
    if(!/no[ -]play|nullified|overturned|reversed/.test(text)&&(/intercept|turnover on downs|fumble.*(?:lost|recovered by)/.test(text))){
      if(/intercept/.test(text))return 'TURNOVER — INTERCEPTION';
      if(/turnover on downs/.test(text))return 'TURNOVER — ON DOWNS';
      if(/fumble.*lost/.test(text)||previous?.pos&&d?.situation?.possession&&previous.pos!==d.situation.possession)return 'TURNOVER — FUMBLE';
    }
    return redZone?'RED ZONE':'';
  }
  function trailTransition(prev,next,text){
    return !!prev&&prev.id===next.id&&!!next.poss&&prev.poss===next.poss&&prev.key!==next.key&&prev.x!==next.x&&/rush|run|pass|complete/.test(text)&&!/no[ -]play|nullified|overturned|reversed|intercept|fumble|punt|kick/.test(text);
  }
  function recordEvent(g,d){
    if(!d.situation&&!d.plays)return;
    const prev=liveEvents.get(g.id),pos=possSlug(g,d),m=String(d.situation?.spot||'').replace(/[^a-z0-9]/gi,'').match(/^([a-z]+)(\d+)$/i);
    const opponent=pos===g.away?g.home:pos===g.home?g.away:'';
    const red=!!opponent&&!!m&&feedAliases(g,d,opponent===g.away?'away':'home').some(v=>v.replace(/ /g,'')===norm(m[1]).replace(/ /g,''))&&Number(m[2])<=20;
    const key=JSON.stringify(d.plays?.[0]||{}),changed=!prev||prev.key!==key||prev.away!==Number(d.game?.awayScore)||prev.home!==Number(d.game?.homeScore);
    let label=changed?liveEvent(prev,d,red):prev.label;
    if(!changed&&prev.until<Date.now())label=red?'RED ZONE':'';
    liveEvents.set(g.id,{away:Number(d.game?.awayScore),home:Number(d.game?.homeScore),pos:d.situation?.possession,key,label,until:changed?Date.now()+15000:prev.until});
  }
  function setLiveState(id,d){const g=game(id);if(!validIdentity(g,d))return;d=finalSnapshot(g,d);if(Object.prototype.hasOwnProperty.call(d,'availabilityForecast')){window.US_LIVE_PLAYER_AVAILABILITY??={};if(d.availabilityForecast&&!isFinal(g,d))window.US_LIVE_PLAYER_AVAILABILITY[id]=d.availabilityForecast;else delete window.US_LIVE_PLAYER_AVAILABILITY[id];}if(Array.isArray(d.plays)||Array.isArray(d.playerStats))saveSession(snapKey(id),d);recordEvent(g,d);const st=LIVE_STORE.games[id]||(LIVE_STORE.games[id]={id,away:g.away,home:g.home});st._realLive=true;st._feedIdentity=d.identity;if(d?.game?.awayScore!=null)st.as=Number(d.game.awayScore);if(d?.game?.homeScore!=null)st.hs=Number(d.game.homeScore);st.q=d?.status?.period||st.q||'LIVE';if(/final/i.test(st.q))window.USFinalScores?.accept?.(g,{identity:d.identity,final:true,awayScore:st.as,homeScore:st.hs});st.clock=isFinal(g,d)?'':d?.status?.clock||st.clock||'';st.pos=possSlug(g,d)||d?.situation?.possession||st.pos||'';if(d.situation){st.down=d.situation.down??'';st.distance=d.situation.distance??null;st.spot=d.situation.spot||'';}if(isFinal(g,d)){st.pos='';st.down='';st.distance=null;st.spot=''}}
  async function discover(force=false){
    if(!L.selected)return null;
    if(!force&&L.source&&now()-L.lastDiscover<30000)return L.source;
    const selected=L.selected,g=game(selected); if(!g)return null;
    L.lastDiscover=now();
    // Keep a previously proven source forever unless a newer verified one appears.
    const cached=L.source||readSession(sourceKey(L.selected)); if(cached?.page)L.source=cached;
    try{
      const r=await fetch(`/api/live-games?date=${ymd(g.date||today())}&game=${encodeURIComponent(L.selected)}&_=${now()}`,{cache:'no-store'});
      const j=await r.json();
      if(selected!==L.selected)return null;
      if(j?.ok){
        const pool=[...(j.games||[]),...(j.candidates||[])];
        for(const x of pool){
          const m=matchSource(x,g.date);
          if(m?.id===L.selected&&x?.page){L.source=x;saveSession(sourceKey(L.selected),x);return x}
        }
      }
    }catch(e){console.warn('V104 discover',e)}
    return L.source||cached||null;
  }
  function sourceIds(g){return {awayId:String(team(g.away).abbr||'').toUpperCase(),homeId:String(team(g.home).abbr||'').toUpperCase()}}
  async function fetchSnap(){
    const selected=L.selected; if(!selected)return null; const g=game(selected); if(!g)return null;
    if(!L.source)L.source=readSession(sourceKey(L.selected));
    const ids=sourceIds(g);
    // Primary path: use the last known good source page.
    const tryPage=async(page)=>{
      if(!page)return null;
      try{const u=`/api/presto-live?game=${encodeURIComponent(selected)}&page=${encodeURIComponent(page)}&awayId=${encodeURIComponent(ids.awayId)}&homeId=${encodeURIComponent(ids.homeId)}&_=${now()}`;const r=await fetch(u,{cache:'no-store'});const j=await r.json();return verified(g,j)?j:null}catch{return null}
    };
    let j=await tryPage(L.source?.page);
    if(!j&&g.boxscore)j=await tryPage(g.boxscore);
    // Secondary path: let the server rediscover the source itself. This removes the
    // browser's dependency on /api/live-games succeeding at the exact same moment.
    if(!j){
      try{const u=`/api/presto-live?game=${encodeURIComponent(selected)}&discover=1&date=${ymd(g.date||today())}&away=${encodeURIComponent(g.away)}&home=${encodeURIComponent(g.home)}&awayId=${encodeURIComponent(ids.awayId)}&homeId=${encodeURIComponent(ids.homeId)}&_=${now()}`;const r=await fetch(u,{cache:'no-store'});const z=await r.json();if(verified(g,z))j=z}catch(e){console.warn('V104 direct discover',e)}
    }
    if(!j&&selected===L.selected){await discover(true);if(selected===L.selected)j=await tryPage(L.source?.page)}
    if(!verified(g,j)||selected!==L.selected)return null;
    if(j.page){L.source={...(L.source||{}),page:j.page,visitor:j.visitor||L.source?.visitor,home:j.home||L.source?.home};saveSession(sourceKey(L.selected),L.source)}
    L.snap=finalSnapshot(g,j.data||{}); saveSession(snapKey(L.selected),L.snap); setLiveState(L.selected,L.snap); return L.snap;
  }
  function prob(g,d=L.snap){
    d=finalSnapshot(g,d);
    const store=LIVE_STORE?.games?.[g.id];
    const inProgress=store?._realLive || (d?.plays?.length && /[1-4]/.test(String(d?.status?.period||'')));
    if(!inProgress && g.status!=='final'){
      const prior=US_AWM.forecast(g);
      return prior.available?prior.away_win_prob:NaN;
    }
    const as=Number(d?.game?.awayScore),hs=Number(d?.game?.homeScore);
    if(!Number.isFinite(as)||!Number.isFinite(hs)) return .5;
    const qtxt=String(d?.status?.period||'').toUpperCase();
    const qm=qtxt.match(/(?:Q|QUARTER\s*)?(\d+)/i); const q=qm?Math.max(1,Math.min(4,Number(qm[1]))):0;
    const cm=String(d?.status?.clock||'').match(/(\d+):(\d+)/); const sec=cm?Math.max(0,Math.min(900,Number(cm[1])*60+Number(cm[2]))):900;
    // Before the feed reports an actual quarter, stay neutral rather than showing device-specific cached priors.
    if(/final|complete/i.test(qtxt))return as===hs?.5:as>hs?1:0;
    if(!q) return .5;
    const prior=US_AWM.forecast(g);if(!prior.available)return NaN;
    if(/final|complete/i.test(qtxt))return as===hs?.5:as>hs?1:0;
    const remain=Math.max(0,(4-q)*900+sec),r=remain/3600,p=Math.max(.001,Math.min(.999,prior.home_win_prob));
    const home=1/(1+Math.exp(-(Math.log(p/(1-p))+(hs-as)/Math.max(2.75,10*Math.sqrt(r+.08)))));
    return 1-home;
  }
  const SCOREBOARD_LOGOS={"montreal":"assets/team-logos/montreal.png","ottawa":"assets/team-logos/ottawa.gif","york":"assets/team-logos/york.png","waterloo":"assets/team-logos/waterloo.svg","laurier":"assets/team-logos/laurier.png","manitoba":"assets/team-logos/manitoba.webp","toronto":"assets/team-logos/toronto.gif","ubc":"assets/team-logos/ubc.gif","alberta":"assets/team-logos/alberta.png","concordia":"assets/team-logos/concordia.png","western":"assets/team-logos/western.png","mount-allison":"assets/team-logos/mount-allison.png","sherbrooke":"assets/team-logos/sherbrooke.png","laval":"assets/team-logos/laval.png","mcgill":"assets/team-logos/mcgill.jpg","stfx":"assets/team-logos/stfx.png","calgary":"assets/team-logos/calgary.png","queens":"assets/team-logos/queens.png","bishops":"assets/team-logos/bishops.png","windsor":"assets/team-logos/windsor.png","acadia":"assets/team-logos/acadia.png","saint-marys":"assets/team-logos/saint-marys.png","regina":"assets/team-logos/regina.jpg","saskatchewan":"assets/team-logos/saskatchewan.gif","carleton":"assets/team-logos/carleton.png","guelph":"assets/team-logos/guelph.png","mcmaster":"assets/team-logos/mcmaster.png"};
  function img(t,cls=''){
    // Use the same team crest across the top scoreboard and game pages.
    const src=t?.logo||'';
    const fallback=t?.localLogo||'';
    return src?`<img class="${cls}" src="${esc2(src)}" alt="${esc2(t?.short||t?.name||'Team')} logo" data-fallback="${esc2(fallback)}" onerror="if(this.dataset.fallback&&this.getAttribute('src')!==this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback=''}">`:'';
  }
  function feedAliases(g,d,side){const values=[...aliases(g[side]),d?.game?.[side+'Id'],d?.game?.[side+'FeedId'],...(d?.playerStats||[]).filter(p=>p.side===side).map(p=>p.team)];return [...new Set(values.map(norm).filter(Boolean))];}
  function possSlug(g,d){const p=norm(d?.situation?.possession);if(!p)return'';for(const side of ['away','home'])if(feedAliases(g,d,side).includes(p))return g[side];return'';}
  function fieldPosition(g,d){
    if(!g||isFinal(g,d))return null;
    const spot=String(d?.situation?.spot||'').toUpperCase().replace(/\s+/g,''),m=spot.match(/^([A-Z]{2,8})(\d{1,3})$/);if(!m)return null;
    const yd=Number(m[2]);if(!Number.isFinite(yd)||yd<0||yd>55)return null;
    const side=['away','home'].find(side=>feedAliases(g,d,side).includes(norm(m[1])));if(!side)return null;
    const coord=side==='away'?yd:110-yd,poss=possSlug(g,d),dir=poss===g.away?1:poss===g.home?-1:0,raw=d.situation?.distance,dist=raw==null||raw===''?null:Number(raw);
    const first=dir&&Number.isFinite(dist)&&dist>0?Math.max(0,Math.min(110,coord+dir*dist)):null;
    return {coord,first,poss,spot};
  }
  function driveTrail(g,d){
    const poss=possSlug(g,d);if(!poss||isFinal(g,d))return [];
    const dir=poss===g.away?1:-1,out=[],seen=new Set(),limit=Number(d.drives?.[0]?.plays)||60;let snaps=0;
    for(const p of d.plays||[]){
      const text=String(p.description||''),key=[p.q,p.clock,text].join('|');if(seen.has(key))continue;seen.add(key);
      if(/no[ -]play|overturned|reversed/i.test(text))continue;
      // Boundaries stop history even if the same team starts the next drive.
      if(/kickoff|punt|field goal|touchdown|intercept|turnover on downs|fumble.*lost/i.test(text))break;
      if(!/rush|run|pass|sack/i.test(text)||/penalty/i.test(text))continue;
      const playPoss=possSlug(g,{...d,situation:{possession:p.possession}});if(playPoss&&playPoss!==poss)break;
      if(++snaps>limit)break;
      let gain=null;const loss=text.match(/for loss of (\d+) yards?/i),yards=text.match(/for (-?\d+) yards?/i);
      if(loss)gain=-Number(loss[1]);else if(yards)gain=Number(yards[1]);else if(/no gain|incomplete/i.test(text))gain=0;
      if(gain===null)continue;
      const dest=[...text.matchAll(/\bto (?:the )?([A-Z]{2,8})(-?\d{1,2})\b/gi)].at(-1);let end=null,start=null;
      if(dest){const position=fieldPosition(g,{...d,situation:{spot:dest[1]+dest[2],possession:poss}});if(position)end=position.coord;}
      if(end!==null)start=end-dir*gain;
      else{const position=fieldPosition(g,{...d,situation:{spot:p.spot,possession:poss}});if(position){start=position.coord;end=start+dir*gain;}}
      if(start===null||end===null||start<0||start>110||end<0||end>110)continue;
      out.push({key,start,end,gain,down:Number(p.down)>=1&&Number(p.down)<=3?Number(p.down):null,kind:/pass|sack/i.test(text)?'pass':'run'});
    }
    return out.reverse();
  }
  function driveTrailHtml(segments,pct){
    const step=Math.min(3,24/Math.max(1,segments.length-1));
    return segments.map((segment,i)=>{
      const top=52-(segments.length-1-i)*step,start=pct(segment.start),end=pct(segment.end),label=[segment.down?`${segment.down}${segment.down===1?'st':segment.down===2?'nd':'rd'} down`:`Play ${i+1}`,segment.kind==='pass'?'Pass':'Run',`${segment.gain>0?'+':''}${segment.gain} yards`].join(' · ');
      const connector=i<segments.length-1?`<div class="canu-drive-step" style="left:${end}%;top:${top}%;height:${step}%"></div>`:'';
      return `${connector}<div class="canu-ball-trail ${segment.kind}" title="${esc2(label)}" aria-label="${esc2(label)}" data-start="${segment.start}" data-end="${segment.end}" style="top:${top}%;left:${Math.min(start,end)}%;width:${Math.abs(end-start)}%"><span class="canu-trail-end" style="left:${end>=start?100:0}%">${segment.down||''}</span></div>`;
    }).join('');
  }
  function downText(d){const x=d?.situation||{};const n=Number(x.down);if(!n)return'';return `${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'} & ${x.distance??''}`}
  function scoreboardWeek(date,anchor){
    const start=new Date(anchor+'T12:00:00');start.setDate(start.getDate()-(start.getDay()+6)%7);
    const end=new Date(start);end.setDate(end.getDate()+7);
    const value=new Date(date+'T12:00:00');return value>=start&&value<end;
  }
  function rail(id){
    const dates=(GAMES||[]).map(g=>g.date).sort(),d=game(id)?.date||(dates.includes(today())?today():dates.find(d=>d>today())||dates.at(-1)||today());
    return `<div class="v102-other" id="v102-national-rail">${(GAMES||[]).filter(x=>(id?x.date===d:scoreboardWeek(x.date,d))&&x.id!==id).map(x=>{
      const st=LIVE_STORE?.games?.[x.id],verified=st?._realLive&&validIdentity(x,{identity:st._feedIdentity}),final=x.status==='final'||/final|complete/i.test(verified?st.q:x.status||''),live=verified&&!final&&/Q?[1-4]|OT/i.test(st.q||''),pos=live?possSlug(x,{situation:{possession:st.pos}}):'',event=live?(liveEvents.get(x.id)?.label||''):'',dn=Number(st?.down),distance=st?.distance,validDistance=(distance!==null&&distance!==undefined&&String(distance).trim()!==''&&Number.isFinite(Number(distance))&&Number(distance)>0)||/^goal$/i.test(String(distance)),situation=live&&dn>=1&&dn<=3&&validDistance?`${dn}${dn===1?'st':dn===2?'nd':'rd'} & ${/^goal$/i.test(String(distance))?'Goal':distance}`:'';
      return `<button data-game-id="${esc2(x.id)}" class="canu-game-chip ${live?'is-live':''} ${event?'has-event event-'+eventKind(event):''} ${x.id===L.selected?'is-selected':''}" onclick="V102_LIVE.open('${x.id}')"><small><span>${esc2(x.conference||'')} · ${esc2(x.date.slice(5))}</span><span>${final?'FINAL':live?esc2([st.q,st.clock].filter(Boolean).join(' ')):esc2(x.time||'')}</span></small>${['away','home'].map(side=>`<span class="canu-chip-team"><span>${img(team(x[side]),'canu-chip-logo')}<b>${esc2(team(x[side]).short||team(x[side]).abbr||x[side])}</b>${pos===x[side]?'<span aria-label="Possession">🏈</span>':''}</span><strong class="canu-chip-score">${final?(side==='away'?x.awayScore:x.homeScore)??'—':live?(side==='away'?st.as:st.hs)??'—':'—'}</strong></span>`).join('')}${situation?`<span class="canu-chip-situation">${esc2(situation)}</span>`:''}${event?`<em class="canu-live-event event-${eventKind(event)}">${esc2(event)}</em>`:''}</button>`;
    }).join('')}</div>`;
  }
  const chartCache=new Map();
  function chartHtml(g,history){
    const points=(history?.points||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.p)&&p.p>=0&&p.p<=1);
    if(!points.length)return '<h3>Win probability</h3><p>Game history is unavailable.</p>';
    if(g.status==='final'&&!history?.reconstructed&&points.length<3)return '<h3>Win probability</h3><p class="canu-history-note">A complete historical curve is unavailable for this game. The published event timeline or pregame forecast could not be verified.</p>';
    const end=Math.max(3600,points.at(-1).x),x=v=>42+v/end*540,y=v=>22+(1-v)*150;
    const line=home=>points.map((p,i)=>{const px=x(p.x),py=y(home?p.p:1-p.p);if(!i)return `M${px},${py}`;if(history.coverage==='quarter-only')return `L${px},${py}`;const prev=points[i-1],ax=x(prev.x),ay=y(home?prev.p:1-prev.p),mid=(ax+px)/2;return `C${mid},${ay} ${mid},${py} ${px},${py}`}).join(' ');
    const latest=points.at(-1),a=team(g.away),h=team(g.home);
    const grid=[0,.25,.5,.75,1].map(p=>`<line x1="42" x2="582" y1="${y(p)}" y2="${y(p)}" stroke="#294354" stroke-dasharray="3 4"/><text x="36" y="${y(p)+4}" text-anchor="end" fill="#9ab0c0" font-size="10">${p*100}%</text>`).join('');
    return `<h3>${history?.reconstructed?'Reconstructed win probability':'Win probability'}</h3><div class="canu-chart-legend"><span style="color:#ffad66">${img(a,'canu-chip-logo')}${esc2(a.short||g.away)} ${((1-latest.p)*100).toFixed(1)}%</span><span style="color:#76caff">${img(h,'canu-chip-logo')}${esc2(h.short||g.home)} ${(latest.p*100).toFixed(1)}%</span></div><svg viewBox="0 0 610 205" role="img" aria-label="Win probability from pregame through ${esc2(latest.final?'the final score':'the current game')}">${grid}${[0,900,1800,2700,3600,...(end>3600?Array.from({length:Math.round((end-3600)/900)},(_,i)=>4500+i*900):[])].map((v,i)=>`<text x="${x(v)}" y="193" text-anchor="middle" fill="#9ab0c0" font-size="10">${i>4?'OT'+(i-4):['Pregame','End Q1','Half','End Q3',end>3600?'Reg.':'Final'][i]}</text>`).join('')}<circle cx="${x(points[0].x)}" cy="${y(1-points[0].p)}" r="3" fill="#ffad66"/><circle cx="${x(points[0].x)}" cy="${y(points[0].p)}" r="3" fill="#76caff"/><path fill="none" stroke="#ffad66" stroke-width="2.5" d="${line(false)}"/><path fill="none" stroke="#76caff" stroke-width="2.5" d="${line(true)}"/>${points.filter(p=>p.kind==='turnover').map(p=>`<circle cx="${x(p.x)}" cy="${y(p.p)}" r="3.5" fill="#ffad49"><title>${esc2(p.description)}</title></circle>`).join('')}${points.map(p=>`<circle cx="${x(p.x)}" cy="${y(p.p)}" r="6" fill="transparent"><title>${esc2(p.label)}${p.description?' · '+esc2(p.description):''} · ${esc2(h.short)} ${(p.p*100).toFixed(1)}% · ${esc2(a.short)} ${((1-p.p)*100).toFixed(1)}%</title></circle>`).join('')}</svg><small>Pregame: ${esc2(a.short)} ${((1-points[0].p)*100).toFixed(1)}% · ${esc2(h.short)} ${(points[0].p*100).toFixed(1)}%${latest.final?' · Final':''}</small>${history?.reconstructed?'<p class="canu-history-note">'+(history.priorKind==='estimated'?'Historical estimate starts from rolling Elo using earlier 2026 results only; no original forecast was archived. ':'Reconstructed from the locked pregame forecast. ')+(history.coverage==='quarter-only'?'Verified period scores only; lines between markers do not show individual plays or scoring times.':history.coverage==='scoring-only'?'Score and clock at verified scoring events only.':'Score and clock from the published play-by-play. Turnovers are marked; the current model does not assign a separate turnover adjustment.')+'</p><a class="sourceBtn" href="'+esc2(history.source)+'" target="_blank" rel="noopener">Official event source ↗</a>':''}`;
  }
  L.renderHistory=async(host,id)=>{
    const g=game(id);if(!g||!host)return;
    let cache=chartCache.get(id);if(!cache){cache={at:0,data:null,busy:false};chartCache.set(id,cache)}
    htmlIfChanged(host,chartHtml(g,cache.data));
    if(cache.busy||Date.now()-cache.at<10000)return;cache.busy=true;cache.at=Date.now();
    try{const r=await fetch('/api/live-history?game='+encodeURIComponent(id),{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(data.gameId!==id)throw Error();cache.data=data;if(host.isConnected&&host.dataset.gameId===id)htmlIfChanged(host,chartHtml(g,data));}catch{}finally{cache.busy=false}
  };
  function value(v){const m=String(v??'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0}
  function statRows(d,g){const rows=d?.statComparison||[];if(!rows.length)return '<div class="v102-empty">Live team statistics are waiting on the official gamebook.</div>';return `<div class="v102-statrows">${rows.map(r=>{const av=value(r.away),hv=value(r.home),mx=Math.max(1,Math.abs(av),Math.abs(hv));return `<div class="v102-statrow"><div class="val">${esc2(r.away??'—')}</div><div class="v102-meter"><i style="width:${Math.max(4,Math.abs(av)/mx*100)}%;background:${team(g.away).primary||'#c79b2e'}"></i></div><div class="lab">${esc2(r.label)}</div><div class="v102-meter"><i style="width:${Math.max(4,Math.abs(hv)/mx*100)}%;background:${team(g.home).primary||'#cf1742'}"></i></div><div class="val r">${esc2(r.home??'—')}</div></div>`}).join('')}</div>`}
  function pcat(p){if(p.category)return p.category;const path=String(p.path||'').toLowerCase();if(/(?:^|\.)(?:pass|passing)(?:\[|\.|$)/.test(path))return'passing';if(/(?:^|\.)(?:rush|rushing)(?:\[|\.|$)/.test(path))return'rushing';if(/(?:^|\.)(?:rcv|receive|receiving)(?:\[|\.|$)/.test(path))return'receiving';if(/defense|defence|tackle/.test(path))return'defense';const keys=Object.keys(p.stats||{});if(keys.some(k=>/^(?:cmp|comp|completions|pass_yds|pass_att)$/i.test(k)))return'passing';if(keys.some(k=>/^(?:car|carries|rush_yds|rush_att)$/i.test(k)))return'rushing';if(keys.some(k=>/^(?:rec|receptions|rec_yds)$/i.test(k)))return'receiving';return'other';}
  function sidePlayer(p,g){if(p.side==='away'||p.side==='home')return p.side;const path=String(p.path||'');if(/\.team\[0\]/.test(path))return'away';if(/\.team\[1\]/.test(path))return'home';const q=norm(p.team);if(q&&aliases(g.away).some(v=>q===v))return'away';if(q&&aliases(g.home).some(v=>q===v))return'home';return''}
  function statPick(s,keys){for(const k of keys){const z=Object.keys(s||{}).find(x=>x.toLowerCase()===k.toLowerCase());if(z!=null)return s[z]}return null}
  function officialRows(side,cat,d,g){return (d?.playerStats||[]).filter(p=>sidePlayer(p,g)===side&&pcat(p)===cat)}
  function playSide(p,g,d){const q=norm(p?.possession);if(!q)return'';if(aliases(g.away).some(v=>q===v))return'away';if(aliases(g.home).some(v=>q===v))return'home';const src=sideSourceLabels();if(src.away&&q.includes(norm(src.away)))return'away';if(src.home&&q.includes(norm(src.home)))return'home';return''}
  function sideSourceLabels(){return {away:L.source?.visitor||'',home:L.source?.home||''}}
  function add(map,name,patch){name=String(name||'').trim().replace(/\s+/g,' ');if(!name||/^team$/i.test(name))return;const r=map.get(name)||{name,att:0,cmp:0,yds:0,td:0,int:0,rec:0,tkl:0,sack:0};for(const [k,v] of Object.entries(patch))r[k]=(r[k]||0)+(Number(v)||0);map.set(name,r)}
  function derivedRows(side,cat,d,g){
    const plays=(d?.plays||[]).map(p=>({...p,_side:playSide(p,g,d)}));
    // Presto does not stamp team/possession on every row. Propagate the nearest known possession
    // through adjacent PBP rows so individual totals can still populate from the official feed.
    let carry=''; for(let i=plays.length-1;i>=0;i--){if(plays[i]._side)carry=plays[i]._side;else if(carry)plays[i]._side=carry}
    carry=''; for(let i=0;i<plays.length;i++){if(plays[i]._side)carry=plays[i]._side;else if(carry)plays[i]._side=carry}
    const m=new Map();
    for(const p of plays){if(p._side!==side)continue;const t=String(p.description||'').trim();let x;
      if(cat==='passing'){
        x=t.match(/^(.+?)\s+pass(?:es)?\s+(complete|incomplete)(?:\s+to\s+.+?)?(?:\s+for\s+(-?\d+)\s+yards?)?/i)
          ||t.match(/^(.+?)\s+pass\s+to\s+.+?\s+(complete|incomplete)(?:\s+for\s+(-?\d+)\s+yards?)?/i);
        if(x){const complete=/^complete$/i.test(x[2]);add(m,x[1],{att:1,cmp:complete?1:0,yds:complete?Number(x[3]||0):0,td:/touchdown/i.test(t)?1:0,int:/intercept/i.test(t)?1:0});continue}
        if(/intercept/i.test(t)){x=t.match(/^(.+?)\s+pass/i);if(x){add(m,x[1],{att:1,int:1});continue}}
      }
      if(cat==='rushing'){
        x=t.match(/^(.+?)\s+(?:rush(?:es)?|run(?:s)?)\s+for\s+(-?\d+)\s+yards?/i);
        if(x){add(m,x[1],{att:1,yds:Number(x[2]||0),td:/touchdown/i.test(t)?1:0});continue}
      }
      if(cat==='receiving'){
        x=t.match(/^.+?\s+pass(?:es)?\s+complete\s+to\s+(.+?)(?:\s+for\s+(-?\d+)\s+yards?)?(?:,|\(|$)/i);
        if(x){add(m,x[1],{rec:1,yds:Number(x[2]||0),td:/touchdown/i.test(t)?1:0});continue}
      }
      if(cat==='defense'){
        const par=[...t.matchAll(/\(([^)]+)\)/g)].pop();
        if(par)par[1].split(/;|,/).map(z=>z.trim()).filter(Boolean).forEach(n=>add(m,n,{tkl:1,sack:/sack/i.test(t)?1:0,int:/intercept/i.test(t)&&/return/i.test(t)?1:0}))
      }
    }
    return [...m.values()]
  }
  function playerTable(side,cat,d,g){const rows=officialRows(side,cat,d,g);let cols;if(cat==='passing')cols=[['cmp','CMP'],['att','ATT'],['yds','YDS'],['td','TD'],['int','INT']];else if(cat==='rushing')cols=[['att','CAR'],['yds','YDS'],['td','TD'],['fum','FUM']];else if(cat==='receiving')cols=[['targets','TGT'],['rec','REC'],['yds','YDS'],['td','TD'],['fum','FUM']];else cols=[['tkl','TKL'],['sack','SACK'],['int','INT']];let data=[],derived=false;if(rows.length){data=rows.map(p=>{const s=p.stats||{};return {name:p.name,cmp:statPick(s,['cmp','comp','completions']),att:statPick(s,['att','attempts','pass_att','rush_att','carries','car']),yds:statPick(s,['yds','yards','pass_yds','rush_yds','rec_yds']),td:statPick(s,['td','touchdowns','pass_td','rush_td','rec_td']),int:statPick(s,['int','interceptions']),rec:statPick(s,['rec','receptions','no']),targets:statPick(s,['targets','target','tgt']),fum:statPick(s,['fum','fumbles','fumble']),tkl:statPick(s,['tkl','tackles','total_tackles']),sack:statPick(s,['sack','sacks'])}})}else{data=derivedRows(side,cat,d,g);derived=true}if(!data.length)return '<div class="v102-empty">No individual totals posted yet.</div>';return `<table class="v102-table"><thead><tr><th>Player</th>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${data.slice(0,24).map(r=>`<tr><td>${esc2(r.name)}</td>${cols.map(c=>`<td>${esc2(r[c[0]]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table>${derived?'<div class="v102-derived">Live totals derived from the official play-by-play until the official individual table posts.</div>':''}`}
  function pcard(side,d,g){const slug=side==='away'?g.away:g.home,t=team(slug),cat=L.cat[side];return `<details class="v102-card v102-collapsible" open><summary><div class="v102-phead">${img(t,'box-team-logo')}<div><b>${esc2(t.name||slug)} — Individual Stats</b><div class="v102-sub">Live official box score</div></div></div></summary><div class="v102-ptabs">${['passing','rushing','receiving','defense'].map(c=>`<button class="${cat===c?'active':''}" onclick="V102_LIVE.cat('${side}','${c}')">${c[0].toUpperCase()+c.slice(1)}</button>`).join('')}</div><div id="v102-${side}-players">${playerTable(side,cat,d,g)}</div></details>`}
  function drive(d){const x=d?.drives?.[0];if(!x)return '<div class="v102-empty">Drive information is waiting on the live gamebook.</div>';return `<div class="v102-drive">${esc2(x.plays??'—')} plays • ${esc2(x.yards??'—')} yards${x.time?` • ${esc2(x.time)}`:''}<small>${esc2(x.result||x.team||'Current drive')}</small></div>`}
  function plays(d){return (d?.plays||[]).map(p=>`<div class="v102-play"><div class="v102-playtime">${esc2([p.q,p.clock].filter(Boolean).join(' '))}</div><div class="v102-playtext">${esc2(p.description)}</div></div>`).join('')||'<div class="v102-empty">Waiting for the first official play.</div>'}
  function field(g){return `<div id="v102-play-ribbon" class="play-ribbon-host"></div><section class="v102-field" id="v102-field"><div class="v102-fieldhead"><span>LIVE FIELD</span><span id="v102-fieldstate"></span></div>${buildField(team(g.away),team(g.home))}</section>`}
  function content(id,d){d=finalSnapshot(game(id),d);const g=game(id),a=team(g.away),h=team(g.home),st=LIVE_STORE?.games?.[id]||{},pre=g.status!=='final'&&!/final|complete|Q?[1-4]|OT/i.test(d?.status?.period||st.q||''),p=prob(g,d),ap=Number.isFinite(p)?Math.round(p*100):'—',hp=Number.isFinite(p)?100-ap:'—',w=p>=.5?a:h,as=pre?'—':d?.game?.awayScore??st.as??'—',hs=pre?'—':d?.game?.homeScore??st.hs??'—',q=pre?'PREGAME':d?.status?.period||st.q||'Awaiting feed',clock=isFinal(g,d)?'':d?.status?.clock||st.clock||'',poss=possSlug(g,d),spot=isFinal(g,d)?'':String(d?.situation?.spot||st.spot||'').replace(/\s+/g,'').toUpperCase();return `<div class="v102-live ${pre?'awm-pregame':''}" style="--away:${a.primary||'#b58b2a'};--home:${h.primary||'#ca173f'}">${rail(id)}<div class="v102-crumb"><span>Live › <b>${esc2(a.short||a.name||g.away)} at ${esc2(h.short||h.name||g.home)}</b></span><span>${esc2(g.conference||'')} · ${esc2(g.date||'')}</span></div><section class="v102-predict"><div class="v102-team">${img(a)}<div><h2>${esc2(a.name||g.away)}</h2><small>${esc2(a.record||'')}</small></div></div><div class="v102-team home"><div><h2>${esc2(h.name||g.home)}</h2><small>${esc2(h.record||'')}</small></div>${img(h)}</div></section>${US_AWM.panel(g,d)}<section class="v102-score"><div class="v102-score-side"><span>${esc2(a.abbr||'')}</span><span class="v102-num" id="v102-as">${as}</span></div><div class="v102-score-center"><div class="v102-status" id="v102-status">${esc2([q,clock].filter(Boolean).join(' • '))}</div><div class="v102-sit" id="v102-sit">${esc2([downText(d),spot].filter(Boolean).join(' · '))}</div><div class="v102-pos" id="v102-pos">${poss?esc2((team(poss).abbr||poss)+' ball'):''}</div></div><div class="v102-score-side home"><span class="v102-num" id="v102-hs">${hs}</span><span>${esc2(h.abbr||'')}</span></div></section><div class="v102-tabs">${[['overview','Overview',true],['box','Box Score',false],['team','Team Stats',true],['players','Player Stats',true],['drives','Drives',false],['pbp','Play-by-Play',false]].map(([key,label,on])=>`<button data-live-section="${key}" class="${on?'active':''}" aria-pressed="${on}" onclick="V102_LIVE.toggleSection('${key}',this)">${label}</button>`).join('')}</div><div id="v102-overview"><div id="v102-overview-summary"><div class="v102-grid2"><section class="v102-card"><h3>Last Play</h3><div class="v102-last" id="v102-last">${esc2(d?.plays?.[0]?.description||'Waiting for the next official play.')}</div><div class="v102-sub" id="v102-lasttime">${esc2([d?.plays?.[0]?.q,d?.plays?.[0]?.clock].filter(Boolean).join(' • '))}</div></section><section class="v102-card"><h3>Current Drive</h3><div id="v102-drive">${drive(d)}</div></section></div>${field(g)}</div><details id="v102-team-section" class="v102-card v102-collapsible" open><summary>Team Stats</summary><div id="v102-teamstats">${statRows(d,g)}</div></details><div class="v102-playergrid" id="v102-playergrid">${pcard('away',d,g)}${pcard('home',d,g)}</div><button class="v102-action" onclick="V102_LIVE.view('box')">▣ View Full Box Score ›</button><section id="v102-pbp-section" class="v102-card" style="display:none"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><h3 style="margin-bottom:3px">Play-by-Play</h3><div class="v102-sub">Show full play-by-play feed</div></div><button class="v102-action" style="width:auto;margin:0;padding:10px 14px" onclick="V102_LIVE.togglePbp()">Show Play-by-Play</button></div><div class="v102-pbp" id="v102-pbp">${plays(d)}</div></section></div><div id="v102-box" style="display:none"><details class="v102-card v102-collapsible" open><summary>Full Team Box Score</summary><div id="v102-boxstats">${statRows(d,g)}</div></details></div><section id="v102-drives-section" class="v102-card" style="display:none"><h3>Drives</h3><div id="v102-drives">${(d?.drives||[]).map(x=>`<div class="v102-play"><div class="v102-playtime">${esc2(x.team||'')}</div><div class="v102-playtext">${esc2(x.plays??'—')} plays • ${esc2(x.yards??'—')} yards ${x.time?`• ${esc2(x.time)}`:''} ${x.result?`• ${esc2(x.result)}`:''}</div></div>`).join('')||'<div class="v102-empty">No drive rows yet.</div>'}</div></section></div></div>`}
  function render(){if(!L.selected)return;const g=game(L.selected);if(!g)return;const d=finalSnapshot(g,L.snap||readSession(snapKey(L.selected))||{game:{awayScore:LIVE_STORE?.games?.[L.selected]?.as||0,homeScore:LIVE_STORE?.games?.[L.selected]?.hs||0},status:{period:LIVE_STORE?.games?.[L.selected]?.q||'LIVE',clock:LIVE_STORE?.games?.[L.selected]?.clock||''},situation:{},plays:[],drives:[],statComparison:[],playerStats:[]});L.snap=d;document.getElementById('app').innerHTML=shell(content(L.selected,d),'live');L.rendered=true;patchField();patchRibbon()}
  function patchRibbon(){const d=L.snap||{},g=game(L.selected);PlayRibbons.update(document.getElementById('v102-play-ribbon'),L.selected,d.plays||[],g?.status!=='final'&&!/final|complete/i.test(d.status?.period||'')&&!!d.plays?.length)}
  function patchText(id,v){const e=document.getElementById(id);if(e)e.textContent=v??''}
  function ensureV107Extras(){
    const scoreSides=document.querySelectorAll('.v102-score-side');
    if(scoreSides.length>=2){
      if(!document.getElementById('v107-pos-away')){const b=document.createElement('span');b.id='v107-pos-away';b.className='v107-posball';b.setAttribute('aria-label','possession');const score=scoreSides[0].querySelector('.v102-num');scoreSides[0].insertBefore(b,score||null)}
      if(!document.getElementById('v107-pos-home')){const b=document.createElement('span');b.id='v107-pos-home';b.className='v107-posball';b.setAttribute('aria-label','possession');const score=scoreSides[1].querySelector('.v102-num');scoreSides[1].insertBefore(b,score||scoreSides[1].firstChild)}
    }
    const vp=document.querySelector('.v102-field .field3DViewport.v9');
    if(vp){
      if(!document.getElementById('v107-chain-los'))vp.insertAdjacentHTML('beforeend','<div class="v107-chain los" id="v107-chain-los"><span class="downbox" id="v107-downbox">1</span></div>');
      const oldFirst=document.getElementById('v107-chain-first');if(oldFirst)oldFirst.remove();
    }
  }
  function patchField(){
    if(!L.snap||!L.selected)return;
    ensureV107Extras();
    const g=game(L.selected),x=L.snap.situation||{},gm=L.snap.game||{};
    const spot=String(x.spot||L.snap?.plays?.[0]?.spot||'').toUpperCase().replace(/\s+/g,'').replace(/-/g,'');
    patchText('v102-fieldstate',[downText(L.snap),spot].filter(Boolean).join(' • '));
    const hud=document.getElementById('fieldHudV9');
    const poss=/final|complete/i.test(L.snap.status?.period||'')?'':possSlug(g,L.snap);
    const pab=document.getElementById('v107-pos-away'),phb=document.getElementById('v107-pos-home');
    if(pab)pab.classList.toggle('on',poss===g.away);
    if(phb)phb.classList.toggle('on',poss===g.home);
    if(hud)hud.textContent=[poss?(team(poss).abbr||poss).toUpperCase()+' BALL':'',downText(L.snap),spot].filter(Boolean).join(' • ')||'LIVE';
    let badge=document.getElementById('canu-selected-event');
    if(!badge){badge=document.createElement('div');badge.id='canu-selected-event';badge.className='canu-live-event';badge.setAttribute('role','status');document.querySelector('.v102-score')?.appendChild(badge)}
    if(badge){const label=isFinal(g,L.snap)?'':liveEvents.get(g.id)?.label||'';badge.textContent=label;badge.className='canu-live-event event-'+eventKind(label);}
    const position=fieldPosition(g,L.snap);
    if(!position){document.querySelector('.v102-field .canu-drive-trail')?.replaceChildren();for(const id of ['fieldBallV9','losLineV9','firstLineV9','v107-chain-los']){const node=document.getElementById(id);if(node)node.style.setProperty('display','none','important');}return;}
    const coord=position.coord;
    const pct=c=>13.333+(Math.max(0,Math.min(110,c))/110)*73.334;
    const bx=pct(coord),ball=document.getElementById('fieldBallV9'),los=document.getElementById('losLineV9'),first=document.getElementById('firstLineV9');
    if(ball){
      const viewport=ball.parentElement,prev=fieldFrames.get(viewport),play=L.snap.plays?.[0],key=JSON.stringify(play||{}),text=String(play?.description||'').toLowerCase();
      let trail=viewport.querySelector('.canu-drive-trail');
      if(!trail){trail=document.createElement('div');trail.className='canu-drive-trail';viewport.appendChild(trail)}
      const segments=driveTrail(g,L.snap);
      htmlIfChanged(trail,driveTrailHtml(segments,pct));
      if(!viewport.parentElement.querySelector('.canu-drive-legend')){const legend=document.createElement('div');legend.className='canu-drive-legend';legend.innerHTML='<span class="pass">PASS</span><span>RUN</span><b>Current drive · hover for down and yards</b>';viewport.parentElement.appendChild(legend)}
      if(trailTransition(prev,{id:g.id,poss,key,x:bx},text)&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)ball.animate?.([{left:prev.x+'%'},{left:bx+'%'}],{duration:900,easing:'ease-out'});
      fieldFrames.set(viewport,{id:g.id,poss,key,x:bx});ball.style.setProperty('display','block','important');ball.style.left=bx+'%';
    }
    if(los){los.style.setProperty('display','block','important');los.style.left=bx+'%'}
    const losStick=document.getElementById('v107-chain-los'),downBox=document.getElementById('v107-downbox');
    const dn=Number(x.down);if(downBox)downBox.textContent=Number.isFinite(dn)&&dn>0?String(dn):'•';
    let fpct=null;
    if(first){
      if(position.first!==null){fpct=pct(position.first);first.style.setProperty('display','block','important');first.style.left=fpct+'%'}
      else first.style.setProperty('display','none','important');
    }
    if(losStick){
      // Keep the marker visually centered between the blue LOS and yellow line-to-gain.
      // If the line-to-gain is unavailable, hover directly above the LOS instead.
      const markerX=fpct==null?bx:(bx+fpct)/2;
      losStick.style.setProperty('display','block','important');
      losStick.style.left=markerX+'%';
    }
  }
  // V106: never programmatically move the viewport during live polling.
  // Browser scroll anchoring is allowed to do its native job; polling only patches data nodes.
  function patch(){
    if(!L.rendered||!document.querySelector('.v102-live')||!L.snap)return;
    const g=game(L.selected);L.snap=finalSnapshot(g,L.snap);const d=L.snap,st=LIVE_STORE?.games?.[L.selected]||{};patchRibbon();
    const awm=document.getElementById('us-awm-panel');if(awm){const box=document.createElement('div');box.innerHTML=US_AWM.panel(g,d);htmlIfChanged(awm,box.firstElementChild.innerHTML);}
    const pre=g.status!=='final'&&!/final|complete|Q?[1-4]|OT/i.test(d?.status?.period||st.q||'');document.querySelector('.v102-live')?.classList.toggle('awm-pregame',pre);patchText('v102-as',pre?'—':d?.game?.awayScore??st.as??'—');patchText('v102-hs',pre?'—':d?.game?.homeScore??st.hs??'—');
    patchText('v102-status',isFinal(g,d)?'FINAL':pre?'PREGAME':[d?.status?.period||st.q||'Awaiting feed',d?.status?.clock||st.clock||''].filter(Boolean).join(' • '));
    patchText('v102-sit',isFinal(g,d)?'':[downText(d),String(d?.situation?.spot||st.spot||'').replace(/\s+/g,'').toUpperCase()].filter(Boolean).join(' · '));
    const ps=possSlug(g,d);patchText('v102-pos',ps?(team(ps).abbr||ps)+' ball':'');
    patchText('v102-last',d?.plays?.[0]?.description||'Waiting for the next official play.');patchText('v102-lasttime',[d?.plays?.[0]?.q,d?.plays?.[0]?.clock].filter(Boolean).join(' • '));
    htmlIfChanged(document.getElementById('v102-teamstats'),statRows(d,g));htmlIfChanged(document.getElementById('v102-boxstats'),statRows(d,g));htmlIfChanged(document.getElementById('v102-drive'),drive(d));
    if(L.pbp)htmlIfChanged(document.getElementById('v102-pbp'),plays(d));
    for(const side of ['away','home'])for(const el of document.querySelectorAll(`[id="v102-${side}-players"]`))htmlIfChanged(el,playerTable(side,L.cat[side],d,g));
    const pr=prob(g,d),ap=Math.round(pr*100),hp=100-ap;patchText('v102-ap',ap+'%');patchText('v102-hp',hp+'%');
    const ab=document.getElementById('v102-ab'),hb=document.getElementById('v102-hb');if(ab)ab.style.width=ap+'%';if(hb)hb.style.width=hp+'%';
    patchText('v102-winner',(pr>=.5?team(g.away):team(g.home)).name||'');patchField();
    // No scrollBy / scrollTo / automatic viewport correction here. Ever.
  }
  async function fetchNationalGame(g){
    if(!g||g.status==='final')return null;
    if(g.id===L.selected&&L.snap&&location.hash==='#live='+g.id){setLiveState(g.id,L.snap);return L.snap}
    const ids=sourceIds(g),key=sourceKey(g.id),cached=readSession(key);
    const tryPage=async(page)=>{
      if(!page)return null;
      try{
        const u=`/api/presto-live?game=${encodeURIComponent(g.id)}&page=${encodeURIComponent(page)}&awayId=${encodeURIComponent(ids.awayId)}&homeId=${encodeURIComponent(ids.homeId)}&_=${now()}`;
        const r=await fetch(u,{cache:'no-store'}),j=await r.json();
        if(verified(g,j)){if(j.page)saveSession(key,{page:j.page});setLiveState(g.id,j.data||{});return j.data||{}}
      }catch{}
      return null;
    };
    let d=await tryPage(cached?.page||g.boxscore);
    if(d)return d;
    try{
      const u=`/api/presto-live?game=${encodeURIComponent(g.id)}&discover=1&date=${ymd(g.date||today())}&away=${encodeURIComponent(g.away)}&home=${encodeURIComponent(g.home)}&awayId=${encodeURIComponent(ids.awayId)}&homeId=${encodeURIComponent(ids.homeId)}&_=${now()}`;
      const r=await fetch(u,{cache:'no-store'}),j=await r.json();
      if(verified(g,j)){if(j.page)saveSession(key,{page:j.page});setLiveState(g.id,j.data||{});return j.data||{}}
    }catch{}
    return null;
  }
  async function pollNational(force=false){
    if(!L.selected||document.visibilityState==='hidden')return;
    if(!force&&now()-(L.lastNational||0)<5000)return; L.lastNational=now();
    const gsel=game(L.selected),date=gsel?.date||today();
    const todays=(GAMES||[]).filter(g=>g.date===date&&g.status!=='final');
    try{
      // Primary national path: probe each scheduled game through the same official
      // live endpoint used by the selected GameCenter. This prevents the rail from
      // depending on one aggregate discovery response or stale kickoff cards.
      await Promise.allSettled(todays.map(fetchNationalGame));
      // Secondary path: merge anything the aggregate scanner has discovered too.
      try{
        const r=await fetch(`/api/live-games?date=${ymd(date)}&_=${now()}`,{cache:'no-store'}),j=await r.json();
        if(j?.ok)for(const x of (j.games||[])){
          const g=matchSource(x,date); if(!g)continue;
          const st=LIVE_STORE.games[g.id]||(LIVE_STORE.games[g.id]={id:g.id,away:g.away,home:g.home});
          setLiveState(g.id,{identity:{gameId:g.id,date:g.date,away:g.away,home:g.home},game:{awayScore:x.awayScore,homeScore:x.homeScore},status:{period:x.period,clock:x.clock}});
          if(x.page)saveSession(sourceKey(g.id),{page:x.page});
        }
      }catch{}
      const el=document.getElementById('v102-national-rail');
      if(el){const fresh=rail(L.selected),box=document.createElement('div');box.innerHTML=fresh;const next=box.firstElementChild;if(next&&el.innerHTML!==next.innerHTML)el.innerHTML=next.innerHTML}
    }catch(e){console.warn('V109 national rail',e)}
  }
  function completedToBox(id,snapshot){
    const g=game(id);
    if(!validIdentity(g,snapshot))snapshot=null;
    if(!g||!(g.status==='final'||snapshot?.status?.complete===true||/^(?:FINAL|COMPLETE|COMPLETED)$/i.test(String(snapshot?.status?.period||'').trim())))return false;
    clearInterval(L.timer);
    if(g.status!=='final'&&snapshot?.status?.complete===true&&typeof window.archiveVerifiedGameFinalV53==='function'){
      window.archiveVerifiedGameFinalV53(id,snapshot,L.source?.page||g.boxscore||'');
    }
    if(g.status!=='final')return false;
    L.selected=null;
    if(location.hash==='#live='+id){
      history.replaceState(null,'','#game='+encodeURIComponent(id));
      if(typeof showGame==='function')showGame(id);
    }
    return true;
  }
  async function tick(){if(L.inflight||!L.selected||document.visibilityState==='hidden'||location.hash!=='#live='+L.selected||!document.querySelector('.v102-live'))return;const selected=L.selected;if(completedToBox(selected,L.snap))return;L.inflight=true;try{const d=await fetchSnap();if(selected!==L.selected||location.hash!=='#live='+selected)return;if(completedToBox(selected,d))return;if(d){patch()}else{if(now()-L.lastDiscover>8000)discover(true);}pollNational()}finally{L.inflight=false}}
  function startTimer(){clearInterval(L.timer);L.timer=setInterval(tick,4000)}
  function open(id,push=true){const g=game(id);if(!g)return;if(g.status==='final'){if(push)history.pushState(null,'','#game='+encodeURIComponent(id));showGame(id);return}if(completedToBox(id,L.snap))return;const same=L.selected===id&&document.querySelector('.v102-live');if(same){if(push&&location.hash.slice(1)!=='live='+id)history.pushState(null,'','#live='+id);tick();startTimer();return}L.selected=id;L.source=readSession(sourceKey(id));L.snap=readSession(snapKey(id));if(!validIdentity(g,L.snap))L.snap=null;L.rendered=false;LIVE_STORE.selected=id;if(push&&location.hash.slice(1)!=='live='+id)history.pushState(null,'','#live='+id);render();tick();pollNational(true);startTimer()}
  L.scoreboardHtml=()=>rail('').replace('id="v102-national-rail"','id="canu-top-scores" aria-label="National football scoreboard"');
  let topBusy=false;
  L.refreshScoreboard=async()=>{
    if(topBusy||document.visibilityState==='hidden')return;
    topBusy=true;
    try{await Promise.allSettled((GAMES||[]).filter(g=>g.date===today()&&g.status!=='final').map(fetchNationalGame));window.dispatchEvent(new Event('canu-scores-updated'));}finally{topBusy=false}
  };
  L.isLive=id=>{const g=game(id),st=LIVE_STORE.games[id];return !!(st?._realLive&&validIdentity(g,{identity:st._feedIdentity})&&!isFinal(g,{status:{period:st.q}})&&/^(?:Q?[1-4]|OT)/i.test(st.q||''))};
  L.patchSchedule=()=>{
    for(const card of document.querySelectorAll('.gameCard[data-game-id]')){
      const id=card.dataset.gameId;if(!L.isLive(id))continue;
      const st=LIVE_STORE.games[id],rows=card.querySelectorAll('.teamRow');
      rows.forEach((row,i)=>{const score=row.querySelector('.score,.at'),value=String((i===0?st.as:st.hs)??'—');if(score){score.classList.remove('at');score.classList.add('score');if(score.textContent!==value)score.textContent=value}});
      const status=card.querySelector('.gameStatus'),label=[st.q,st.clock].filter(Boolean).join(' ');
      if(status){status.classList.add('live');if(status.textContent!==label)status.textContent=label}
      card.querySelectorAll('.awm-card,.schedule-card-leaders').forEach(n=>n.remove());
    }
    const hub=document.getElementById('canu-live-hub');if(hub)htmlIfChanged(hub,rail(''));
  };
  L.open=open;L.tick=tick;L.discover=discover;
  const initialPlayerCategories=L.cat;
  L.cat=(side,cat)=>{L.cat[side]=cat;for(const e of document.querySelectorAll(`[id="v102-${side}-players"]`))if(L.snap)e.innerHTML=playerTable(side,cat,L.snap,game(L.selected));document.querySelectorAll(`.v102-playergrid .v102-card:nth-child(${side==='away'?1:2}) .v102-ptabs button`).forEach(b=>b.classList.toggle('active',b.textContent.trim().toLowerCase()===cat))};
  Object.assign(L.cat,initialPlayerCategories);
  L.scroll=id=>{const el=document.getElementById(id);if(!el)return;const panel=el.closest('details');if(panel)panel.open=true;el.scrollIntoView({behavior:'smooth',block:'start'})};
  L.togglePbp=()=>L.toggleSection('pbp');
  const sectionIds={overview:'v102-overview-summary',box:'v102-box',team:'v102-team-section',players:'v102-playergrid',drives:'v102-drives-section',pbp:'v102-pbp-section'};
  L.toggleSection=(key,button)=>{const el=document.getElementById(sectionIds[key]);if(!el)return;const show=el.style.display==='none';el.style.display=show?(key==='players'?'grid':'block'):'none';const b=button||document.querySelector(`[data-live-section="${key}"]`);b?.classList.toggle('active',show);b?.setAttribute('aria-pressed',String(show));if(key==='pbp'){L.pbp=show;document.getElementById('v102-pbp')?.classList.toggle('open',show);if(show)htmlIfChanged(document.getElementById('v102-pbp'),plays(L.snap||{}));}};
  L.view=(v)=>{const el=document.getElementById(sectionIds[v]);if(el?.style.display==='none')L.toggleSection(v);};
  // This is the only live renderer after V102. Earlier generic schedule/game functions stay intact.
  window.showGameCast=(id)=>open(id,true);
  window.openLiveV32=()=>{document.getElementById('app').innerHTML=shell(`<div style="max-width:1180px;margin:auto;padding:18px"><h2>Live scores</h2><div id="canu-live-hub">${rail('')}</div></div>`,'live');L.refreshScoreboard();};
  const routeBefore=window.route;window.route=function(){const h=location.hash.slice(1);if(h==='live'){openLiveV32();return}if(h.startsWith('live=')){const id=h.slice(5);if(game(id)?.status==='final'){completedToBox(id,L.snap);return}if(L.selected===id&&document.querySelector('.v102-live')){tick();startTimer();return}open(id,false);return}return routeBefore?.()};
  window.addEventListener('hashchange',()=>window.route());
  window.addEventListener('scroll',()=>{if(document.visibilityState==='visible')L.lastUserScroll=Date.now()},{passive:true});
  window.addEventListener('touchstart',()=>{L.lastUserScroll=Date.now()},{passive:true});
  window.addEventListener('touchmove',()=>{L.lastUserScroll=Date.now()},{passive:true});
  window.addEventListener('pageshow',()=>{if(location.hash.slice(1).startsWith('live=')){tick();startTimer()}});
  window.addEventListener('online',tick);
  window.addEventListener('canu-game-final',e=>{if(e.detail?.id!==L.selected)return;L.snap=finalSnapshot(game(L.selected),L.snap||{});saveSession(snapKey(L.selected),L.snap);if(L.rendered)patch();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&location.hash.slice(1).startsWith('live=')){L.lastUserScroll=Date.now();tick();startTimer()}});
  // Render the final route once after all older boot scripts have completed.
  const boot=()=>setTimeout(()=>{if(location.hash.slice(1).startsWith('live'))window.route()},0);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
