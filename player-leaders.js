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
 function shortName(name){const parts=String(name||'').trim().split(/\s+/);return parts.length>1?parts[0][0]+'. '+parts.slice(1).join(' '):parts[0]||''}
 function school(t){return typeof TEAM!=='undefined'?Object.values(TEAM).find(x=>A.canonical(x.slug)===A.canonical(t)):null}
 function leaderHTML(p){const t=school(p.team),src=(typeof REMOTE_TEAM_LOGOS!=='undefined'?REMOTE_TEAM_LOGOS[t?.slug]:null)||t?.logo;const logo=src?'<img class="leader-team-logo" src="'+A.esc(src)+'" alt="'+A.esc(t.short||t.name)+' logo">':'';return logo+A.esc(shortName(p.name))+' · '+A.esc(t?.short||teamName(p.team))+' · '+p.yards+' YDS · '+(p.touchdowns==null?'—':p.touchdowns)+' TD'}
 function teamName(t){return typeof TEAM!=='undefined'?(TEAM[t]?.short||t):t}
 function indexedGames(){return typeof GAMES!=='undefined'?GAMES:root.US_NATIONAL_SCHEDULE?.games||[]}
 function matches(b,g){return b.date===String(g.date).slice(0,10)&&[g.away,g.home].every(t=>Object.keys(b.teams||{}).some(k=>A.canonical(k)===A.canonical(t)))}
 function season(data,g){
  if(data?.season!==2026||!String(g.date).startsWith('2026-'))return [];
  const schedule=indexedGames();
  return ['passing','rushing','receiving'].map(category=>({category,teams:[g.away,g.home].map(team=>{
   const totals=new Map();let games=0;
   for(const b of data.games||[]){if(!b.date.startsWith('2026-')||b.date>=String(g.date).slice(0,10))continue;
    const indexed=schedule.find(x=>matches(b,x));if(b.exhibition||indexed?.exhibition)continue;
    const key=Object.keys(b.teams||{}).find(k=>A.canonical(k)===A.canonical(team));const rows=b.teams?.[key]?.[category];if(!Array.isArray(rows))continue;games++;
    for(const p of rows){if(!Number.isFinite(p.yards))continue;const k=A.canonical(p.name),old=totals.get(k)||{name:p.name,yards:0};old.yards+=p.yards;totals.set(k,old)}
   }
   return {team,games,leader:[...totals.values()].sort((a,b)=>b.yards-a.yards||a.name.localeCompare(b.name))[0]||null};
  })}));
 }
 function postgame(data,g,fallback){
  const b=(data?.games||[]).find(x=>matches(x,g));
  return [['passing','pass'],['rushing','rush'],['receiving','receive']].map(([category,k])=>{
   let rows=b?[g.away,g.home].flatMap(team=>{const key=Object.keys(b.teams||{}).find(t=>A.canonical(t)===A.canonical(team));return (b.teams?.[key]?.[category]||[]).map(p=>({...p,team}))}):[];
   if(!rows.length)rows=(fallback?.[k]||[]).map(p=>Array.isArray(p)?{name:p[0],team:p[1],yards:p[2],touchdowns:p[3]}:{name:p.name||p.player,team:p.team,yards:p.yards??p.yds,touchdowns:p.touchdowns??p.td});
   rows=rows.filter(p=>p.name&&p.yards!=null&&p.yards!==''&&Number.isFinite(Number(p.yards))).sort((a,b)=>Number(b.yards)-Number(a.yards)||a.name.localeCompare(b.name));
   return {category,leader:rows[0]||null};
  });
 }
 function compact(data,g,final=false,fallback){const rows=final?postgame(data,g,fallback):season(data,g);if(!rows.some(r=>final?r.leader:r.teams.some(t=>t.leader)))return '';
  return '<section class="game-card-leaders"><small>'+(final?'GAME LEADERS':'SEASON LEADERS · BEFORE KICKOFF')+'</small>'+rows.map(r=>'<div><b>'+A.esc(r.category==='passing'?'PASS':r.category==='rushing'?'RUSH':'REC')+'</b> '+(final?(r.leader?leaderHTML(r.leader):'—'):r.teams.map(t=>A.esc(teamName(t.team))+': '+(t.leader?A.esc(shortName(t.leader.name))+' '+t.leader.yards+' YDS':'—')).join('<br>'))+'</div>').join('')+(!final?'<small>Available regular-season box scores; missing games are not counted.</small>':'')+'</section>';
 }
 function card(data,g){const rows=season(data,g);if(!rows.length)return '';
  return '<section class="awm-card awm-player-leaders"><small>SEASON PLAYER LEADERS · BEFORE KICKOFF</small><p>Recorded regular-season yards</p><div class="awm-player-grid">'+rows.map(r=>'<div><b>'+A.esc(r.category.toUpperCase())+'</b>'+r.teams.map(t=>'<div class="awm-player"><small>'+A.esc(teamName(t.team))+'</small>'+(t.leader?'<strong>'+A.esc(t.leader.name)+'</strong><b>'+t.leader.yards+' yards</b><small>'+t.games+' available box scores</small>':'<span>Player data unavailable</span>')+'</div>').join('')+'</div>').join('')+'</div><p><small>Totals use available 2026 regular-season box scores before this game. Exhibition games are excluded. Missing box scores may affect leaders.</small></p></section>';
 }
 root.US_PlayerLeaders={project,season,postgame,shortName,compact,card};
})(typeof globalThis!=='undefined'?globalThis:this);
