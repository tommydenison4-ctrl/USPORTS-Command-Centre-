(function(root){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function classify(p){
  const text=String(p?.description||p?.text||p?.shortText||''),type=typeof p?.type==='object'?p.type.text:p?.type||'',s=(type+' '+text).toLowerCase();
  if(/no[ -]play|play (?:was )?nullified|overturned|reversed/.test(s))return null;
  const m=text.match(/(?:for|gain of)\s+(-?\d+)\s*(?:yards?|yds?)\b/i),raw=p?.statYardage??p?.yards,y=raw!==null&&raw!==undefined&&raw!==''&&Number.isFinite(Number(raw))?Number(raw):m?Number(m[1]):null;
  let label='',kind='play';
  if(/touchdown|pick[ -]?six/.test(s)){label=/intercept|pick[ -]?six/.test(s)?'PICK SIX':'TOUCHDOWN';kind='score';}
  else if(/intercept/.test(s)){label='INTERCEPTION';kind='turnover';}
  else if(/fumble/.test(s)){label='FUMBLE';kind='turnover';}
  else if(/turnover on downs/.test(s)){label='TURNOVER ON DOWNS';kind='turnover';}
  else if(/block(?:ed)?/.test(s)&&/kick|punt|field goal/.test(s)){label='BLOCKED KICK';kind='turnover';}
  else if(/field goal/.test(s)){label=/no good|miss|wide|short/.test(s)?'MISSED FIELD GOAL':/good|made/.test(s)?'FIELD GOAL':'FIELD GOAL ATTEMPT';kind='score';}
  else if(/\bsafety\b/.test(s)){label='SAFETY';kind='score';}
  else if(/sack/.test(s)){label='SACK';kind='turnover';}
  else if(!/penalty|punt|kick|return/.test(s)&&y!==null&&((/pass|complete/.test(s)&&y>=20)||(/rush|run/.test(s)&&y>=15))){label='EXPLOSIVE PLAY';kind='explosive';}
  else if(/first down|1st down/.test(s)||p?.firstDown===true||(!/penalty|incomplete|kick|punt/.test(s)&&/rush|run|pass/.test(s)&&y!==null&&Number(p?.start?.distance)>0&&y>=Number(p.start.distance))){label='FIRST DOWN';kind='firstdown';}
  return label?{label,kind,text,yards:y}:null;
 }
 const states=new WeakMap();
 function update(el,gameId,plays,live=true){
  if(!el)return;
  let st=states.get(el);
  if(!st||st.gameId!==gameId){if(st)clearTimeout(st.timer);st={gameId,seen:new Set(),queue:[],initialized:false,timer:null,active:false};states.set(el,st);el.innerHTML='';}
  const rows=(plays||[]).map(p=>({p,key:String(p.id??[p.q??p.period?.number,p.clock?.displayValue??p.clock,p.description??p.text??p.shortText].join('|'))}));
  if(!live){clearTimeout(st.timer);st.active=false;st.queue=[];el.innerHTML='';rows.forEach(x=>st.seen.add(x.key));st.initialized=rows.length>0;return;}
  const fresh=rows.filter(x=>!st.seen.has(x.key));rows.forEach(x=>st.seen.add(x.key));
  const chosen=st.initialized?fresh.reverse():rows.slice(0,1);st.initialized=true;
  for(const x of chosen){const event=classify(x.p);if(event)st.queue.push(event);}
  function next(){
   if(states.get(el)!==st)return;
   const e=st.queue.shift();if(!e){st.active=false;st.timer=null;el.innerHTML='';return;}st.active=true;
   el.innerHTML='<div class="play-event-ribbon '+e.kind+'" role="status"><b>'+esc(e.label)+'</b><span>'+esc(e.text)+'</span></div>';
   st.timer=setTimeout(next,6000);
  }
  if(!st.active)next();
 }
 if(root.document){const style=document.createElement('style');style.textContent='.play-ribbon-host:empty{display:none}.play-ribbon-host{height:auto!important;overflow:visible!important}.play-event-ribbon{display:flex;flex-direction:column;gap:7px;padding:18px 22px;margin:12px 0;border:2px solid #f5c542;border-radius:12px;background:linear-gradient(110deg,#303019,#101b29);color:#fff;animation:playRibbonIn .25s ease-out}.play-event-ribbon b{font-size:24px;letter-spacing:.06em;color:#f5c542}.play-event-ribbon span{font-size:14px;line-height:1.5}.play-event-ribbon.turnover{border-color:#ff5268}.play-event-ribbon.turnover b{color:#ff7588}.play-event-ribbon.score{border-color:#52e7a0}.play-event-ribbon.score b{color:#52e7a0}@keyframes playRibbonIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.play-event-ribbon{animation:none}}';document.head.appendChild(style);}
 root.PlayRibbons={classify,update};if(typeof module==='object')module.exports=root.PlayRibbons;
})(typeof globalThis!=='undefined'?globalThis:this);
