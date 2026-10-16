/* Browser-local scoreboard order; live data and game navigation stay authoritative. */
(()=>{
 const app=document.getElementById('app'),key='canu-scoreboard-order-v1';if(!app)return;
 let saved=[];try{const value=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(value))saved=value.filter(x=>typeof x==='string').slice(0,300)}catch{}
 let dragging=null,queued=false,suppressUntil=0,hold=null,pointer=null;
 const rail=()=>document.getElementById('canu-top-scores');
 const items=()=>Array.from(rail()?.querySelectorAll(':scope > .canu-scoreboard-game')||[]);
 const id=n=>n.querySelector('.canu-game-chip[data-game-id]')?.dataset.gameId;
 const final=n=>n.querySelector('.canu-game-chip > small > span:last-child')?.textContent.trim()==='FINAL';
 function ordered(){return items().sort((a,b)=>Number(final(a))-Number(final(b))||Number(a.style.order)-Number(b.style.order))}
 function paint(){const list=items();for(const n of list){n.draggable=true;const chip=n.querySelector('.canu-game-chip');if(!chip)continue;if(!n.querySelector('.scoreboard-drag-handle')){const h=document.createElement('button');h.type='button';h.className='scoreboard-drag-handle';h.textContent='⠿ Drag to reorder';h.setAttribute('aria-label','Reorder '+(chip.querySelectorAll('.canu-chip-team b')[0]?.textContent||'')+' game. Use left and right arrow keys.');n.prepend(h)}}
 const rank=n=>{const i=saved.indexOf(id(n));return i<0?10000+list.indexOf(n):i};
 list.sort((a,b)=>Number(final(a))-Number(final(b))||(saved.length?rank(a)-rank(b):Number(b.classList.contains('at55-score-featured'))-Number(a.classList.contains('at55-score-featured'))));list.forEach((n,i)=>n.style.setProperty('order',String(i),'important'));
 }
 function persist(){saved=ordered().map(id).filter(Boolean);try{localStorage.setItem(key,JSON.stringify(saved))}catch{}}
 function move(source,target,after=false){if(!source||!target||source===target||final(source)!==final(target))return;const list=ordered().filter(n=>n!==source),at=list.indexOf(target);list.splice(at+(after?1:0),0,source);list.forEach((n,i)=>n.style.setProperty('order',String(i),'important'))}
 function end(){clearTimeout(hold);hold=null;if(dragging){dragging.classList.remove('scoreboard-dragging');suppressUntil=Date.now()+400;persist()}dragging=null;pointer=null;}
 app.addEventListener('dragstart',e=>{const n=e.target.closest('#canu-top-scores > .canu-scoreboard-game');if(!n)return;clearTimeout(hold);pointer=null;dragging=n;n.classList.add('scoreboard-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id(n));});
 app.addEventListener('dragover',e=>{if(!dragging)return;const r=rail(),n=e.target.closest('.canu-scoreboard-game');if(!r?.contains(e.target))return;e.preventDefault();if(n){const b=n.getBoundingClientRect();move(dragging,n,e.clientX>b.x+b.width/2)}scrollEdge(e.clientX)});
 app.addEventListener('drop',e=>{if(!dragging)return;e.preventDefault();end()});app.addEventListener('dragend',end);
 function scrollEdge(x){const r=rail();if(!r)return;const b=r.getBoundingClientRect();if(x<b.left+35)r.scrollLeft-=18;else if(x>b.right-35)r.scrollLeft+=18}
 app.addEventListener('pointerdown',e=>{const h=e.target.closest('.scoreboard-drag-handle');if(!h||e.button!==0)return;const n=h.closest('.canu-scoreboard-game');pointer={id:e.pointerId,x:e.clientX,y:e.clientY,node:n,handle:h};if(e.pointerType==='mouse'){e.preventDefault();dragging=n;n.classList.add('scoreboard-dragging');h.setPointerCapture(e.pointerId);return}hold=setTimeout(()=>{if(!pointer)return;dragging=n;n.classList.add('scoreboard-dragging');h.setPointerCapture(e.pointerId)},220)});
 app.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;if(!dragging){if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>8){clearTimeout(hold);pointer=null}return}e.preventDefault();const n=document.elementFromPoint(e.clientX,e.clientY)?.closest('.canu-scoreboard-game');if(n&&rail()?.contains(n)){const b=n.getBoundingClientRect();move(dragging,n,e.clientX>b.x+b.width/2)}scrollEdge(e.clientX)});
 app.addEventListener('pointerup',()=>{if(pointer)end()});app.addEventListener('pointercancel',()=>{if(pointer)end()});
 app.addEventListener('click',e=>{if(e.target.closest('.scoreboard-drag-handle')||Date.now()<suppressUntil&&e.target.closest('#canu-top-scores')){e.preventDefault();e.stopPropagation()}},true);
 app.addEventListener('keydown',e=>{const h=e.target.closest('.scoreboard-drag-handle');if(!h||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const source=h.closest('.canu-scoreboard-game'),list=ordered().filter(n=>final(n)===final(source)),i=list.indexOf(source),target=list[i+(e.key==='ArrowLeft'?-1:1)];if(target){move(source,target,e.key==='ArrowRight');persist();source.scrollIntoView({block:'nearest',inline:'nearest'})}});
 new MutationObserver(()=>{if(queued||dragging)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}).observe(app,{childList:true,subtree:true});window.addEventListener('canu-scores-updated',paint);window.addEventListener('hashchange',paint);window.addEventListener('storage',e=>{if(e.key===key){try{const x=JSON.parse(e.newValue||'[]');saved=Array.isArray(x)?x.filter(v=>typeof v==='string'):[]}catch{}paint()}});paint();
})();
