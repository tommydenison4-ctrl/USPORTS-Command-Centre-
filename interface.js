/* Presentation only: retain the existing routes, data and game controllers. */
(function(){
  const items=[['schedule','Schedule','goHome()'],['live','Live','openLiveV32()'],['matchup','Build Matchup','matchup72()'],['teams','Teams','showTeams()']];
  const groups=[['Statistics',[['leaders','Players & Leaders','showLeaders()'],['teamstats','Team Stats','showTeamStats()']]],['Season',[['rankings','Top 10','rankingsPage65()'],['playoffs','Playoffs','playoffs72()'],['award','Hec Crighton Watch','', 'USPORTS:award'],['title','Vanier Cup Watch','', 'USPORTS:title'],['conferences','Conferences','showConferences()']]],['Coverage',[['media','Media','showMedia()'],['highlights','Highlights','highlights65()'],['podcasts','Podcasts','podcasts83()']]]];
  function button(x,active){return `<button type="button" class="${x[0]===active?'active':''}" ${x[3]?`data-watch="${x[3]}"`:`onclick="${x[2]}"`} ${x[0]===active?'aria-current="page"':''}>${x[1]}</button>`}
  function header(active){return `<header class="topbar clean-header"><button class="brand" type="button" onclick="goHome()" aria-label="Can-U Football home"><img class="canu-brand-logo" src="assets/canu-football.png" alt="Can-U Football maple leaf and football"><span class="canu-wordmark">Can-U <strong>FOOTBALL</strong><small>CANADIAN UNIVERSITY FOOTBALL</small></span></button><nav class="nav" aria-label="Primary navigation">${items.map(x=>button(x,active)).join('')}<details class="clean-more"><summary>Explore <span aria-hidden="true">⌄</span></summary><div class="clean-menu">${groups.map(g=>`<div><span class="clean-menu-title">${g[0]}</span>${g[1].map(x=>button(x,active)).join('')}</div>`).join('')}</div></details></nav></header>`}
  const stripMarkup=new WeakMap();
  const previous=window.shell;
  if(typeof previous==='function')window.shell=function(content,active){return previous.apply(this,arguments).replace(/<header class="topbar"[\s\S]*?<\/header>/,header(active||'schedule')).replace('class="shell"','class="shell clean-ui"')};
  function fold(node,label){if(!node||node.parentElement?.classList.contains('clean-disclosure'))return;const d=document.createElement('details');d.className='clean-disclosure';const s=document.createElement('summary');s.textContent=label;node.before(d);d.append(s,node)}
  function enhance(){
    const copy=document.createTreeWalker(document.getElementById('app')||document.body,NodeFilter.SHOW_TEXT);let textNode;const changes=[];
    while(textNode=copy.nextNode()){if(/The forecast uses the shared Advantage model|Available imported box scores:/.test(textNode.nodeValue))changes.push(textNode)}
    changes.forEach(n=>{n.nodeValue=n.nodeValue.replace(/The forecast uses the shared Advantage model[\s\S]*/,'').replace(/Available imported box scores:[\s\S]*/,'')});

    document.querySelectorAll('p').forEach(n=>{if(/Hypothetical forecasts use the same Advantage/.test(n.textContent))n.textContent='Choose two teams and a venue.';else if(/fitted league coefficients|Available imported box scores:|Complete passing\/rushing totals:/.test(n.textContent))n.remove()});
    document.querySelectorAll('.awm-metrics>div').forEach(n=>{if(/80% ERROR BAND[\s\S]*Not supplied/i.test(n.textContent))n.remove()});
    document.querySelectorAll('.season-note').forEach(n=>n.remove());
    document.querySelectorAll('details').forEach(n=>{const label=n.querySelector(':scope > summary')?.textContent||'';if(/Why this position|What could change the pick|Model and source details/.test(label))n.remove()});
    document.querySelectorAll('.season-watch p,.awm-card p').forEach(n=>{if(/model weights|Ranking method|editorial AUS|strength-based winner pick|playoff-bracket simulation|Early-season estimate|Projected score reconciled/.test(n.textContent))n.remove()});
    document.querySelectorAll('.gameCard[data-game-id]').forEach(card=>{
      const game=(typeof GAMES!=='undefined'?GAMES:[]).find(g=>g.id===card.dataset.gameId);
      if(!game||card.dataset.cleanAccent===game.away+'|'+game.home)return;
      const teams=typeof TEAM!=='undefined'?TEAM:{};
      card.style.setProperty('--game-away',teams[game.away]?.primary||'#42678d');
      card.style.setProperty('--game-home',teams[game.home]?.primary||'#b99a50');
      card.dataset.cleanAccent=game.away+'|'+game.home;
    });
    document.querySelectorAll('.shell').forEach(root=>{
      root.classList.add('clean-ui');const footer=root.querySelector(':scope > .footer');if(footer&&footer.textContent!=='Can-U Football · Canadian University Football')footer.textContent='Can-U Football · Canadian University Football';const old=root.querySelector(':scope > .topbar:not(.clean-header)');if(old){const active=old.querySelector('button.active')?.textContent.trim();const key=items.concat(groups.flatMap(g=>g[1])).find(x=>x[1]===active)?.[0]||'schedule';old.outerHTML=header(key)}
      const top=root.querySelector(':scope > .clean-header');
      if(top&&window.V102_LIVE?.scoreboardHtml){
        const html='<div class="canu-scoreboard-label">THIS WEEK · SCOREBOARD</div>'+V102_LIVE.scoreboardHtml();let strip=root.querySelector(':scope > .canu-scoreboard');
        if(!strip){strip=document.createElement('section');strip.className='canu-scoreboard';top.after(strip)}
        if(stripMarkup.get(strip)!==html){stripMarkup.set(strip,html);strip.innerHTML=html;}
      }
      const match=location.hash.match(/^#(?:game|live)=(.+)$/);
      if(match&&window.V102_LIVE?.renderHistory){
        let host=root.querySelector('#canu-probability-history');
        if(!host){host=document.createElement('section');host.id='canu-probability-history';host.className='panel canu-history-chart';const score=root.querySelector('.v102-score,.gameHero6,.boxHero');if(score)score.after(host);else root.querySelector(':scope > .footer')?.before(host)}
        if(host){host.dataset.gameId=match[1];V102_LIVE.renderHistory(host,match[1])}
      }
      const postgame=root.querySelector('.postgame-page');
      if(postgame){
        root.classList.add('postgame-shell');
        const target=postgame.querySelector('.postgame-summary-content');
        ['#game-home-recap','#canu-probability-history','#locked-pregame-comparison','#game-podcast-reaction'].forEach(sel=>{const node=root.querySelector(sel);if(node&&target&&!target.contains(node))target.append(node)});
        const grid=postgame.querySelector('.postgame-player-grid');
        if(grid&&!grid.dataset.paired){const nodes=Array.from(grid.children);['passing','rushing','receiving'].forEach(cat=>nodes.filter(n=>n.dataset.category===cat).forEach(n=>grid.append(n)));grid.dataset.paired='true'}
      }
      const calendar=root.querySelector(':scope > .calendar'),hero=root.querySelector(':scope > .featured-game');if(calendar&&hero&&hero.nextElementSibling!==calendar)hero.after(calendar);
      if(calendar){fold(root.querySelector(':scope > #socialPulseV24'),'Around the league · social updates');fold(root.querySelector(':scope > #us-standings-live'),'Conference standings');fold(root.querySelector(':scope > #us-news-live'),'Latest football news');fold(root.querySelector(':scope > #home-news-v20'),'More football coverage');fold(root.querySelector(':scope > #teams'),'Explore teams');Array.from(root.children).filter(n=>n.matches('section.section')&&!n.id).forEach(n=>fold(n,n.querySelector('h2,h3')?.textContent.trim()||'More from U SPORTS'))}
    });
  }
  window.addEventListener('canu-scores-updated',enhance);
  setInterval(()=>window.V102_LIVE?.refreshScoreboard?.(),15000);
  window.V102_LIVE?.refreshScoreboard?.();
  let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}}).observe(document.body,{childList:true,subtree:true});enhance();
  document.addEventListener('click',e=>{const tab=e.target.closest('[data-postgame-tab]');if(!tab)return;const page=tab.closest('.postgame-page');page.querySelectorAll('[data-postgame-panel]').forEach(n=>n.hidden=n.dataset.postgamePanel!==tab.dataset.postgameTab);page.querySelectorAll('[data-postgame-tab]').forEach(n=>n.setAttribute('aria-pressed',String(n===tab)));});
  document.addEventListener('click',e=>{const menu=document.querySelector('.clean-more[open]');if(!menu)return;if(!menu.contains(e.target)||e.target.closest('button'))queueMicrotask(()=>menu.removeAttribute('open'))},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.querySelector('.clean-more[open]');if(m){m.removeAttribute('open');m.querySelector('summary').focus()}}});
})();
