/* Written previews only enter the existing pregame branch of the GameCast. */
window.USGamePreviews=(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function card(g){
  if(!g||g.pendingParticipants||['final','live','inprogress','cancelled','postponed'].includes(g.status))return '';
  const p=window.US_GAME_PREVIEWS?.games?.find(p=>p.id===g.id&&p.away===g.away&&p.home===g.home);
  if(!p||p.asOf>g.date)return '';
  const sources=p.sources.filter(s=>{try{return new URL(s.url).protocol==='https:'}catch{return false}});
  return `<article class="game-preview" data-preview-game="${esc(g.id)}" aria-labelledby="game-preview-title"><header><small>CANUFOOTBALL · NATIONAL GAME PREVIEW</small><h2 id="game-preview-title">${esc(p.title)}</h2><p class="game-preview-dateline">Published ${esc(p.asOf)}</p></header>${p.paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}<details><summary>Sources and reporting</summary><p>${esc(window.US_GAME_PREVIEWS.method)}</p>${(p.notes||[]).map(note=>`<p>${esc(note)}</p>`).join('')}<ul>${sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join('')}</ul><a href="#watch=USPORTS:award">Explore the Hec Crighton Watch</a></details></article>`;
 }
 return {card};
})();
