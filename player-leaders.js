(function(root){
 const A=root.AdvantageModel;
 function project(data,g){
  if(data?.season!==2026||!String(g.date).startsWith('2026-')||g.date.slice(0,10)<data.asOf)return [];
  return ['passing','rushing','receiving'].map(category=>({category,teams:[g.away,g.home].map(team=>{
   const history=data.games.filter(b=>b.date.startsWith('2026-')&&b.date<g.date.slice(0,10)).map(b=>({b,key:Object.keys(b.teams).find(k=>A.canonical(k)===A.canonical(team))})).filter(x=>x.key&&Array.isArray(x.b.teams[x.key][category])).sort((a,b)=>a.b.date.localeCompare(b.b.date));
   if(!history.length)return {team,leader:null};
   const latest=history.at(-1),names=latest.b.teams[latest.key][category].map(p=>p.name);
   const candidates=names.map(name=>({name,yards:history.reduce((n,x)=>n+(x.b.teams[x.key][category].find(p=>A.canonical(p.name)===A.canonical(name))?.yards||0),0)/history.length})).filter(p=>p.yards>0).sort((a,b)=>b.yards-a.yards||a.name.localeCompare(b.name));
   return {team,leader:candidates[0]||null,games:history.length,lastGame:latest.b.date,sources:history.map(x=>x.b.source)};
  })}));
 }
 function card(data,g){
  const rows=project(data,g);if(!rows.length)return '';
  return '<section class="awm-card awm-player-leaders"><small>PROJECTED PLAYER LEADERS · 2026 ONLY</small><p>Expected team leaders by yards</p><div class="awm-player-grid">'+rows.map(r=>'<div><b>'+A.esc(r.category.toUpperCase())+'</b>'+r.teams.map(t=>'<div class="awm-player"><small>'+A.esc(t.team)+'</small>'+(t.leader?'<strong>'+A.esc(t.leader.name)+'</strong><b>~'+Math.round(t.leader.yards)+' yards</b><small>'+t.games+' box score'+(t.games===1?'':'s')+' · latest '+t.lastGame+'</small>':'<span>2026 player data unavailable</span>')+'</div>').join('')+'</div>').join('')+'</div><details><summary>How these projections work</summary><p>Simple early-season estimates: average yards across available complete 2026 team box scores. A missing player row counts as zero in that category. Candidates must appear in the latest available box score. These estimates do not adjust for opponent, injuries or confirmed starters.</p>'+[...new Set(rows.flatMap(r=>r.teams.flatMap(t=>t.sources||[])))].filter(s=>/^https:\/\//.test(s)).map((s,i)=>'<a target="_blank" rel="noopener" href="'+A.esc(s)+'">2026 box score '+(i+1)+'</a> ').join('')+'</details></section>';
 }
 root.US_PlayerLeaders={project,card};
})(typeof globalThis!=='undefined'?globalThis:this);
