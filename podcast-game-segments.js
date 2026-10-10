/* Publisher YouTube embeds use the video's own published chapter boundaries. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 root.USPodcastGameSegments=api;if(typeof document!=='undefined')api.start(root);
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function stamp(seconds){const s=Math.max(0,Math.floor(seconds)),h=Math.floor(s/3600),m=Math.floor(s/60)%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s%60).padStart(2,'0')}
 function find(data,g){if(g?.status!=='final')return null;return data?.segments?.find(s=>s.gameId===g.id&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start)||null}
 function safeUrl(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
 function episode(data,s){return {...data,...(data?.episodes?.find(e=>e.id===s?.episodeId)||{})}}
 function embedUrl(data,s){const ep=episode(data,s);return /^[\w-]{11}$/.test(ep?.videoId||'')&&find(data,{id:s?.gameId,status:'final'})?'https://www.youtube-nocookie.com/embed/'+ep.videoId+'?start='+s.start+'&end='+s.end+'&playsinline=1&rel=0':''}
 function html(data,s){const src=embedUrl(data,s);data=episode(data,s);const audio=!src&&safeUrl(data?.audioUrl);if((!src&&!audio)||!safeUrl(data.url))return '';
  return '<section id="game-podcast-reaction" class="panel game-podcast-reaction" data-game-id="'+esc(s.gameId)+'"><header>'+(safeUrl(data.artwork)?'<img src="'+esc(data.artwork)+'" alt="At The 55 podcast artwork" loading="lazy">':'')+'<div><small>AT THE 55 · GAME REACTION</small><h2>'+esc(s.label)+'</h2><p>'+esc(data.episode)+' · '+esc(data.published)+'</p></div></header><p class="podcast-window">'+stamp(s.start)+'–'+stamp(s.end)+' · '+stamp(s.end-s.start)+' segment'+(s.endsAtEpisodeEnd?' · through episode end':'')+'</p>'+(audio?'<audio class="game-podcast-audio" controls preload="none" src="'+esc(audio)+'#t='+s.start+','+s.end+'" aria-label="At The 55: '+esc(s.label)+' game reaction"></audio><p class="podcast-audio-note">Original audio episode · publisher timestamps verified.</p>':'<iframe class="game-podcast-video" title="At The 55: '+esc(s.label)+' game reaction" src="'+esc(src)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>')+'<button type="button" class="podcast-segment-replay">Play / replay game segment</button><p class="podcast-segment-credit">By '+esc(data.publisher)+'. '+(audio?'Listen to the game discussion in the original episode.':'Watch the game discussion from their original YouTube episode.')+' <a href="'+esc(audio?data.url:data.url+'&t='+s.start)+'" target="_blank" rel="noopener">'+(audio?'Original episode ↗':'Open on YouTube ↗')+'</a> · <a href="'+esc(data.url)+'" target="_blank" rel="noopener">Full episode ↗</a></p></section>';
 }
 function start(root){let active=null;
  function mount(){
   const match=location.hash.match(/^#(?:game|live)=(.+)$/),g=match&&(typeof GAMES!=='undefined'?GAMES:[]).find(g=>g.id===match[1]);
   const data=root.US_PODCAST_GAME_SEGMENTS,segment=find(data,g),host=document.querySelector('.v63-final-wrap,.v102-live,.gameView6,.gamePage,.espnGame');
   if(active&&(!active.card.isConnected||!segment||active.id!==g?.id)){active.card.querySelector('iframe')?.remove();active.card.remove();active=null}
   if(!segment||!host||active)return;
   const anchor=host.querySelector('.gameHero6,.v102-score,.boxHero'),markup=html(data,segment);if(!markup)return;
   (anchor||host).insertAdjacentHTML(anchor?'afterend':'beforeend',markup);
   const card=document.getElementById('game-podcast-reaction');active={id:g.id,card};
   const audio=card.querySelector('audio');if(audio){audio.addEventListener('loadedmetadata',()=>{audio.currentTime=segment.start});audio.addEventListener('play',()=>{if(audio.currentTime<segment.start||audio.currentTime>=segment.end)audio.currentTime=segment.start});audio.addEventListener('timeupdate',()=>{if(audio.currentTime>=segment.end)audio.pause()});}
   card.querySelector('button').addEventListener('click',()=>{if(audio){audio.currentTime=segment.start;audio.play().catch(()=>{})}else card.querySelector('iframe').src=embedUrl(data,segment)});
  }
  new MutationObserver(mount).observe(document.getElementById('app'),{childList:true,subtree:true});root.addEventListener('hashchange',mount);root.addEventListener('canu-game-final',mount);mount();
 }
 return {stamp,find,html,embedUrl,episode,start};
});
