const SOURCE_DEF = {
  page: 'https://oua.ca/sports/fball/2026-27/boxscores/20260906_zejw.xml',
  fallbackEvent: 'zejwko398jziv641',
  fallbackHash: 'jaZCLnq6vCM3X/A8apbO3cnD8QKvJYUz',
  awayId: 'MAC',
  homeId: 'GUE'
};
const SOURCES = {
  '2026-09-06-mcmaster-guelph': SOURCE_DEF,
  '20260906_zejw': SOURCE_DEF,
  'zejw': SOURCE_DEF
};
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}
function text(v){ return v == null ? '' : String(v); }
function num(v){ const n=Number(String(v??'').replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:null; }
function walk(root, cb, path='$', seen=new WeakSet()){
  if(!root||typeof root!=='object'||seen.has(root)) return; seen.add(root); cb(root,path);
  if(Array.isArray(root)) root.forEach((v,i)=>walk(v,cb,`${path}[${i}]`,seen));
  else Object.entries(root).forEach(([k,v])=>walk(v,cb,`${path}.${k}`,seen));
}
function periodLabel(status){ const raw=Array.isArray(status?.period)?status.period[0]:status?.period; const p=text(raw).trim(); if(!p)return''; return /^\d+$/.test(p)?`Q${p}`:p.toUpperCase(); }
function numericScore(v){
  if(v==null) return null;
  if(typeof v==='number') return Number.isFinite(v)&&v>=0&&v<200?v:null;
  if(typeof v==='string' && /^\s*\d{1,3}\s*$/.test(v)){ const n=Number(v); return n<200?n:null; }
  return null;
}
function scoreFromSideNode(node){
  if(node==null) return null;
  const direct=numericScore(node); if(direct!=null) return direct;
  if(Array.isArray(node)){
    // Quarter-by-quarter arrays are common in line-score payloads. If no explicit
    // total is present, sum plausible quarter values.
    const vals=node.map(x=>numericScore(x)).filter(x=>x!=null);
    if(vals.length && vals.length===node.length && vals.every(x=>x<=60)) return vals.reduce((a,b)=>a+b,0);
    let best=null;
    for(const x of node){ const n=scoreFromSideNode(x); if(n!=null) best=n; }
    return best;
  }
  if(typeof node==='object'){
    for(const k of ['total','score','points','pts','totpts','tot_points','teamScore','team_score']){
      const n=numericScore(node[k]); if(n!=null) return n;
    }
    // Line-score objects can be q1/q2/q3/q4/ot without a total.
    const qvals=Object.entries(node).filter(([k])=>/^(?:q|quarter|period)?[1-9]|ot\d*$/i.test(k)).map(([,v])=>numericScore(v)).filter(v=>v!=null);
    if(qvals.length>=2) return qvals.reduce((a,b)=>a+b,0);
  }
  return null;
}

function scalarScoreCandidates(data, source){
  const rows=[];
  walk(data,(o,path)=>{
    if(!o||Array.isArray(o)||typeof o!=='object') return;
    const low=String(path).toLowerCase();
    const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr||o.team).toUpperCase();
    const vh=text(o.vh||o.side||o.homeAway||o.home_away).toUpperCase();
    for(const [k,v] of Object.entries(o)){
      const n=numericScore(v); if(n==null) continue;
      const key=String(k).toLowerCase();
      let side=''; let weight=0;
      if(/^(vscore|visitorscore|visitor_score|awayscore|away_score|v_score|scorev|score_v)$/.test(key)){side='away';weight=120;}
      else if(/^(hscore|homescore|home_score|hostscore|host_score|h_score|scoreh|score_h)$/.test(key)){side='home';weight=120;}
      else if(/^(score|points|pts|total|tot)$/.test(key)){
        if(id===source.awayId.toUpperCase()||vh==='V'||vh==='A'||/visitor|away/.test(low)){side='away';weight=95;}
        if(id===source.homeId.toUpperCase()||vh==='H'||/home|host/.test(low)){side='home';weight=95;}
      }
      if(!side && /score|points|pts/.test(key)){
        if(/visitor|away/.test(low)){side='away';weight=75;}
        if(/home|host/.test(low)){side='home';weight=75;}
      }
      if(side) rows.push({side,n,weight,path:`${path}.${k}`});
    }
  });
  rows.sort((a,b)=>b.weight-a.weight);
  return rows;
}
function scorePairFromPlayState(plays, source){
  // Presto football play objects frequently carry the running scoreboard alongside
  // the play. Prefer the newest play that exposes both sides.
  let pair={away:null,home:null};
  walk(plays,(o)=>{
    if(!o||Array.isArray(o)||typeof o!=='object') return;
    const av=firstVal(o,['vscore','visitorScore','visitor_score','awayScore','away_score','scoreV','score_v']);
    const hv=firstVal(o,['hscore','homeScore','home_score','hostScore','host_score','scoreH','score_h']);
    const a=numericScore(av), h=numericScore(hv);
    if(a!=null&&h!=null) pair={away:a,home:h};
  });
  return pair;
}
function bestDeepScorePair(data, source){
  const rows=scalarScoreCandidates(data,source);
  const a=rows.find(x=>x.side==='away');
  const h=rows.find(x=>x.side==='home');
  return {away:a?.n??null,home:h?.n??null,source:a&&h?'deep-score-fields':''};
}

function extractScorePair(data,source){
  const scores=data?.scores;
  const aliases={
    away:[source.awayId,'away','visitor','vis','v','awayteam','visitorTeam'],
    home:[source.homeId,'home','host','h','hometeam','homeTeam']
  };
  const out={away:null,home:null};
  if(scores && typeof scores==='object'){
    for(const side of ['away','home']){
      for(const a of aliases[side]){
        for(const [k,v] of Object.entries(scores)){
          if(String(k).toLowerCase()===String(a).toLowerCase()){
            const n=scoreFromSideNode(v); if(n!=null){ out[side]=n; break; }
          }
        }
        if(out[side]!=null) break;
      }
    }
    if(Array.isArray(scores)){
      for(const o of scores){
        if(!o||typeof o!=='object') continue;
        const vh=text(o.vh||o.side||o.homeAway||o.home_away).toUpperCase();
        const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr).toUpperCase();
        const n=scoreFromSideNode(o); if(n==null) continue;
        if(vh==='V'||vh==='A'||id===source.awayId.toUpperCase()) out.away=n;
        if(vh==='H'||id===source.homeId.toUpperCase()) out.home=n;
      }
    }
  }
  // Look for explicit home/visitor scoreboard fields anywhere in the payload.
  walk(data,(o,path)=>{
    if(Array.isArray(o)) return;
    const low=path.toLowerCase();
    const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr).toUpperCase();
    const vh=text(o.vh||o.side||o.homeAway||o.home_away).toUpperCase();
    const n=scoreFromSideNode(o);
    if(n!=null){
      if(out.away==null && (id===source.awayId.toUpperCase()||vh==='V'||vh==='A'||/visitor|away/.test(low))) out.away=n;
      if(out.home==null && (id===source.homeId.toUpperCase()||vh==='H'||/home|host/.test(low))) out.home=n;
    }
    for(const [k,v] of Object.entries(o)){
      const sv=numericScore(v); if(sv==null) continue;
      const key=k.toLowerCase();
      if(out.away==null && /^(?:visitor|vis|away)(?:score|points|pts)?$/.test(key)) out.away=sv;
      if(out.home==null && /^(?:home|host)(?:score|points|pts)?$/.test(key)) out.home=sv;
    }
  });
  return out;
}
function findTeamScore(data,teamId,source){
  const pair=extractScorePair(data,source);
  return teamId.toUpperCase()===source.awayId.toUpperCase()?pair.away:pair.home;
}
function firstVal(o, keys){ for(const k of keys){ if(o && o[k]!=null && o[k]!=='' ) return o[k]; } return null; }
function normalizeDown(v){ const n=num(v); if(n!=null && n>=1 && n<=4) return n; const m=text(v).match(/\b([1-4])(?:st|nd|rd|th)?\b/i); return m?Number(m[1]):null; }
function parseSituationText(desc=''){
  const t=String(desc);
  let down=null,distance=null,spot='',pos='';
  let m=t.match(/\b([1-4])(?:st|nd|rd|th)?\s*(?:&|and)\s*(goal|\d+)\s+(?:at|on)\s+([A-Z]{2,5})\s*0?(\d{1,2})\b/i);
  if(m){ down=Number(m[1]); distance=/goal/i.test(m[2])?'Goal':Number(m[2]); pos=m[3].toUpperCase(); spot=`${pos} ${Number(m[4])}`; }
  if(!m){ m=t.match(/\b([1-4])(?:st|nd|rd|th)?\s*(?:&|and)\s*(goal|\d+)\b/i); if(m){down=Number(m[1]);distance=/goal/i.test(m[2])?'Goal':Number(m[2]);} }
  return {down,distance,spot,pos};
}
function playTypeFromDescription(desc='', raw=''){
  const t=(String(raw)+' '+String(desc)).toUpperCase();
  if(/PICK SIX|INTERCEPTION.*TOUCHDOWN/.test(t)) return 'PICK SIX';
  if(/TOUCHDOWN/.test(t)) return 'TOUCHDOWN';
  if(/INTERCEPT/.test(t)) return 'INTERCEPTION';
  if(/FUMBLE/.test(t) && /RECOVER|LOST|TURNOVER/.test(t)) return 'FUMBLE';
  if(/SAFETY/.test(t)) return 'SAFETY';
  if(/FIELD GOAL.*GOOD|FIELD GOAL IS GOOD|GOOD FIELD GOAL/.test(t)) return 'FIELD GOAL';
  if(/FIELD GOAL.*MISS|MISSED FIELD GOAL/.test(t)) return 'MISSED FG';
  if(/BLOCKED/.test(t) && /KICK|PUNT|FIELD GOAL/.test(t)) return 'BLOCKED KICK';
  if(/FIRST DOWN/.test(t)) return 'FIRST DOWN';
  const y=t.match(/(?:FOR|GAIN OF)\s+(-?\d+)\s+YARDS?/); if(y && Number(y[1])>=15) return 'EXPLOSIVE';
  return text(raw||'PLAY').toUpperCase()||'PLAY';
}
function flattenPlays(data){
  const out=[],seen=new Set();
  walk(data?.plays,(o)=>{
    if(Array.isArray(o))return;
    const desc=o.description??o.desc??o.text??o.play??o.summary??o.pbp;
    if(typeof desc!=='string'||desc.trim().length<4)return;
    const clock=text(firstVal(o,['clock','time','gameclock','game_clock','clk']));
    const q=text(firstVal(o,['qtr','quarter','period','q','prd']));
    const parsed=parseSituationText(desc);
    const down=normalizeDown(firstVal(o,['down','dn','dwn','currentDown'])) ?? parsed.down;
    let distance=firstVal(o,['distance','dist','ytg','yardsToGo','yards_to_go','togo']);
    if(distance!=null && /^\d+$/.test(String(distance))) distance=Number(distance); else if(distance==null) distance=parsed.distance;
    const spotRaw=firstVal(o,['spot','yardline','yard_line','ballOn','ball_on','location','yard']);
    const possession=text(firstVal(o,['possession','poss','offense','team','teamId','team_id','side'])) || parsed.pos;
    const spot=text(spotRaw)||parsed.spot;
    const rawType=text(firstVal(o,['type','result','event','category']));
    const type=playTypeFromDescription(desc,rawType);
    const key=`${q}|${clock}|${desc}`; if(seen.has(key))return; seen.add(key);
    out.push({q,clock,description:desc.trim(),type,down,distance,spot,possession});
  });
  return out.slice(-100).reverse();
}

function latestScoringScorePair(data){
  const rows = Array.isArray(data?.scores?.score) ? data.scores.score : [];
  // Presto's scoring array is chronological and every scoring row carries the
  // cumulative visitor/home score after that event. The LAST valid row is the
  // authoritative running scoreboard.
  for(let i=rows.length-1;i>=0;i--){
    const r=rows[i]||{};
    const away=numericScore(r.vscore), home=numericScore(r.hscore);
    if(away!=null && home!=null) return {away,home,index:i,source:'latest-scoring-event'};
  }
  return {away:null,home:null,index:null,source:''};
}

function parseDestinationSpot(desc=''){
  const m=String(desc).match(/\bto the ([A-Z]{2,5})-?0?(\d{1,2})\b/i);
  return m ? `${m[1].toUpperCase()}${Number(m[2])}` : '';
}
function parseGain(desc=''){
  const t=String(desc);
  let m=t.match(/\bfor loss of (\d+) yards?\b/i); if(m) return -Number(m[1]);
  if(/\bfor no gain\b/i.test(t)) return 0;
  m=t.match(/\bfor (-?\d+) yards?\b/i); if(m) return Number(m[1]);
  return null;
}
function isSubstantiveSnap(p){
  if(!p?.description) return false;
  const t=String(p.description).toUpperCase();
  if(/^CLOCK\s/.test(t) || /^(START OF|END OF|TIMEOUT|\d+(?:ST|ND|RD|TH) AND )/.test(t)) return false;
  if(/PENALTY/.test(t)) return false;
  return /RUSH|PASS|SACK|PUNT|KICKOFF|FIELD GOAL|FUMBLE|INTERCEPT/.test(t);
}
function currentSituationFromLatestPlay(plays,drives){
  const p=(plays||[]).find(isSubstantiveSnap) || (plays||[])[0];
  if(!p) return {down:null,distance:null,spot:'',possession:text(drives?.[0]?.team)};
  let down=p.down, distance=p.distance, spot=parseDestinationSpot(p.description)||p.spot||'', possession=p.possession||text(drives?.[0]?.team);
  const t=String(p.description).toUpperCase();
  const gain=parseGain(p.description);
  // For normal scrimmage snaps, Presto's down/distance fields describe the snap
  // that just occurred. Convert them to the NEXT live situation when possible.
  if(Number.isFinite(Number(down)) && Number.isFinite(Number(distance)) && /RUSH|PASS|SACK/.test(t) && !/TOUCHDOWN|TURNOVER|INTERCEPT|FUMBLE LOST/.test(t)){
    down=Number(down); distance=Number(distance);
    if(gain!=null){
      const remain=Math.max(0,distance-gain);
      if(remain<=0){ down=1; distance=10; }
      else { down=down+1; distance=remain; }
    } else if(/INCOMPLETE/.test(t)){
      down=down+1;
    }
    if(down>3){ down=null; distance=null; }
  }
  return {down,distance,spot,possession};
}

function extractSituation(data, plays){
  let out={down:null,distance:null,spot:'',possession:''};
  const candidates=[data?.status,data?.primetime,data?.game,data?.network];
  for(const o of candidates){ if(!o||typeof o!=='object')continue; out.down??=normalizeDown(firstVal(o,['down','dn','dwn'])); out.distance??=num(firstVal(o,['distance','dist','ytg','yardsToGo'])); out.spot ||= text(firstVal(o,['spot','yardline','yard_line','ballOn'])); out.possession ||= text(firstVal(o,['possession','poss','offense','team'])); }
  const p=(plays||[])[0]; if(p){ out.down??=p.down; out.distance??=p.distance; out.spot ||= p.spot||''; out.possession ||= p.possession||''; }
  return out;
}
function scoringDelta(desc=''){
  const t=String(desc).toUpperCase();
  if(/TOUCHDOWN/.test(t)) return 6;
  if(/FIELD GOAL/.test(t) && /GOOD|IS GOOD/.test(t) && !/NO GOOD|MISS/.test(t)) return 3;
  if(/SAFETY/.test(t)) return 2;
  if(/ROUGE|SINGLE POINT/.test(t)) return 1;
  if(/CONVERT|EXTRA POINT|PAT/.test(t) && /GOOD|SUCCESS/.test(t)) return /TWO|2-POINT|2 POINT/.test(t)?2:1;
  return 0;
}
function scoreFallbackFromPlays(plays,source){
  let away=0,home=0,seenAny=false;
  for(const p of [...(plays||[])].reverse()){
    const pts=scoringDelta(p.description); if(!pts) continue;
    const who=String(p.possession||'').toUpperCase(); const d=String(p.description||'').toUpperCase();
    if(who===source.awayId.toUpperCase()||d.includes('MCMASTER')||d.includes('MAC ')){ away+=pts; seenAny=true; }
    else if(who===source.homeId.toUpperCase()||d.includes('GUELPH')||d.includes('GUE ')){ home+=pts; seenAny=true; }
  }
  return seenAny?{away,home}:{away:null,home:null};
}
function flattenDrives(data){ const out=[]; walk(data?.drives,(o)=>{ if(Array.isArray(o))return; const plays=num(o.plays??o.playCount??o.numplays),yards=num(o.yards??o.yds??o.netyards),team=text(o.team??o.teamId??o.team_id??o.id),result=text(o.result??o.end??o.summary??o.outcome),time=text(o.time??o.elapsed??o.top); if(plays!=null||yards!=null||result||time)out.push({team,plays,yards,result,time}); }); return out.slice(-24).reverse(); }
function teamAndPlayerStats(data){
  const teamStats=[], playerStats=[], seen=new Set();
  const roots=Array.isArray(data?.team)?data.team:(data?.team&&typeof data.team==='object'?Object.values(data.team):[]);
  const scalarStats=(o)=>{const stats={}; for(const [k,v] of Object.entries(o||{})){ if(!['string','number'].includes(typeof v)) continue; if(/(?:^|_)(?:yds?|yards?|att|attempts?|cmp|comp|completions?|td|touchdowns?|int|interceptions?|rec|receptions?|car|carries?|rush|pass|tkl|tackles?|sack|fg|xp|punt|avg|long)(?:$|_)/i.test(k) || /^(?:pass|rush|receiv|def|tack|sack|kick|punt)/i.test(k)) stats[k]=v; } return stats; };
  const playerName=(o)=> text(o?.name||o?.player||o?.fullname||o?.full_name||o?.displayName||o?.display_name||o?.athlete||o?.playerName||o?.player_name||([o?.firstName||o?.first_name,o?.lastName||o?.last_name].filter(Boolean).join(' '))).trim();
  const teamId=(o,fallback='')=>text(o?.id||o?.teamId||o?.team_id||o?.code||o?.abbr||o?.team||fallback).trim();
  function scan(root,tid,path){
    walk(root,(o,p)=>{
      if(Array.isArray(o)||!o||typeof o!=='object') return;
      const stats=scalarStats(o); if(!Object.keys(stats).length) return;
      const nm=playerName(o), id=teamId(o,tid);
      // player rows are often nested under category arrays and inherit the team id from their parent team object.
      if(nm && nm.toUpperCase()!==id.toUpperCase() && !/^(TEAM|TOTALS?|OFFENSE|DEFENSE)$/i.test(nm)){
        const key=id+'|'+nm+'|'+p; if(seen.has(key)) return; seen.add(key);
        playerStats.push({team:id,name:nm,stats,path:`${path}${p.replace(/^\$/,'')}`});
      } else if(id){
        teamStats.push({team:id,stats,path:`${path}${p.replace(/^\$/,'')}`});
      }
    });
  }
  if(roots.length){
    roots.forEach((r,i)=>scan(r,teamId(r),`$.team[${i}]`));
  } else {
    // Some Presto hosts expose the player tables outside data.team. Scan the payload as a fallback,
    // and infer the team from explicit fields/path when available.
    scan(data,'','$');
  }
  return {teamStats:teamStats.slice(0,60),playerStats:playerStats.slice(0,300)};
}

function scalarLeaves(root, prefix='', out=[], depth=0){
  if(depth>5 || root==null) return out;
  if(['string','number'].includes(typeof root)){ out.push({path:prefix,value:root}); return out; }
  if(Array.isArray(root)) return out; // player arrays / tables are handled elsewhere
  if(typeof root!=='object') return out;
  for(const [k,v] of Object.entries(root)){
    if(/player|roster|individual/i.test(k)) continue;
    scalarLeaves(v,prefix?`${prefix}.${k}`:k,out,depth+1);
  }
  return out;
}
function teamRootObjects(data,source){
  const arr=Array.isArray(data?.team)?data.team:(data?.team&&typeof data.team==='object'?Object.values(data.team):[]);
  const out={away:null,home:null};
  for(const o of arr){
    if(!o||typeof o!=='object') continue;
    const id=text(o.id||o.teamId||o.team_id||o.code||o.abbr||o.name).toUpperCase();
    const vh=text(o.vh||o.side||o.homeAway||o.home_away).toUpperCase();
    if(id===source.awayId.toUpperCase()||vh==='V'||vh==='A') out.away=o;
    if(id===source.homeId.toUpperCase()||vh==='H') out.home=o;
  }
  return out;
}
function pickLeaf(leaves, patterns){
  for(const p of patterns){
    const x=leaves.find(r=>p.test(r.path));
    if(x) return x.value;
  }
  return null;
}
function cleanStat(v){
  if(v==null||v==='') return null;
  if(typeof v==='number') return v;
  const t=String(v).trim();
  return t.length<40?t:null;
}
function teamComparison(data,source){
  const roots=teamRootObjects(data,source), A=scalarLeaves(roots.away), H=scalarLeaves(roots.home);
  const defs=[
    ['Total Yards',[/total.*(?:yards|yds)/i,/(?:yards|yds).*total/i,/total.*off/i,/offense.*(?:yards|yds)/i]],
    ['Passing Yards',[/pass.*(?:yards|yds)/i,/(?:yards|yds).*pass/i]],
    ['Rushing Yards',[/rush.*(?:yards|yds)/i,/(?:yards|yds).*rush/i]],
    ['First Downs',[/first.*down/i,/firstdowns/i]],
    ['3rd Down',[/third.*down/i,/3rd.*down/i]],
    ['Turnovers',[/turnover/i,/giveaway/i]],
    ['Penalties',[/penalt/i]],
    ['Time of Possession',[/time.*poss/i,/possession.*time/i,/(?:^|\.)top$/i]],
    ['Sacks',[/sacks?(?:\.|$)/i,/sack.*total/i]],
    ['Punts',[/punts?(?:\.|$)/i,/punt.*count/i]]
  ];
  const rows=[];
  for(const [label,pats] of defs){
    const av=cleanStat(pickLeaf(A,pats)), hv=cleanStat(pickLeaf(H,pats));
    if(av!=null||hv!=null) rows.push({label,away:av,home:hv});
  }
  return rows;
}
function normalize(data,source){
  const status=data?.status||{};
  const ps=teamAndPlayerStats(data);
  const plays=flattenPlays(data);
  const drives=flattenDrives(data);
  const latestScore=latestScoringScorePair(data);
  const pair=extractScorePair(data,source);
  const playPair=scorePairFromPlayState(data?.plays,source);
  const deep=bestDeepScorePair(data,source);
  const fb=scoreFallbackFromPlays(plays,source);
  let away=latestScore.away, home=latestScore.home, scoreSource=latestScore.source;
  if(away==null||home==null){
    away=pair.away; home=pair.home; scoreSource='scores';
    if(away==null||home==null){
      if(playPair.away!=null&&playPair.home!=null){away=playPair.away;home=playPair.home;scoreSource='play-state';}
      else if(deep.away!=null&&deep.home!=null){away=deep.away;home=deep.home;scoreSource=deep.source;}
      else {if(away==null)away=fb.away;if(home==null)home=fb.home;scoreSource='scoring-plays';}
    }
  }
  const situation=currentSituationFromLatestPlay(plays,drives);
  return {
    source:data?.source||'PrestoSports',version:data?.version||null,platformId:data?.platformId||null,
    lastUpdated:data?.network?.lastUpdated||data?.generated||new Date().toISOString(),
    status:{complete:text(status.complete).toUpperCase()==='Y',period:periodLabel(status),clock:text(status.clock),running:text(status.running)},
    game:{awayId:source.awayId,homeId:source.homeId,awayScore:away,homeScore:home,scoreSource,awayLogo:source.awayLogo||'',homeLogo:source.homeLogo||''},
    situation,plays,drives,teamStats:ps.teamStats,playerStats:ps.playerStats,statComparison:teamComparison(data,source),rawKeys:Object.keys(data||{}),
    scoreDebug:{latestScoringEventIndex:latestScore.index,scores:data?.scores??null,candidates:scalarScoreCandidates(data,source).slice(0,12)}
  };
}
function isLivePayload(json){ return !!(json && typeof json==='object' && !json.error && (json.status || json.plays || json.drives || json.team || json.scores || json.source==='PrestoSports')); }

const BASE_HEADERS={
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'Accept-Language':'en-CA,en;q=0.9',
  'Cache-Control':'no-cache','Pragma':'no-cache'
};
function cookieHeader(r){
  try{ if(typeof r.headers.getSetCookie==='function'){ const a=r.headers.getSetCookie(); if(a?.length)return a.map(x=>x.split(';')[0]).join('; '); } }catch{}
  const raw=r.headers.get('set-cookie'); return raw?raw.split(/,(?=[^;,]+=)/).map(x=>x.split(';')[0]).join('; '):'';
}
function htmlDecode(s=''){ return s.replace(/&amp;/g,'&').replace(/&#x2F;/gi,'/').replace(/&#47;/g,'/'); }
function discover(html){
  html=htmlDecode(html||'');
  // Presto's football page exposes the event id and its hash separately in the
  // bootstrap config. Prefer that explicit pair because the liveupdate URL itself
  // may contain only the `e` parameter.
  const confEvent = html.match(/conf\.eventId\s*=\s*['"]([^'"]+)['"]/i);
  const confHash = html.match(/conf\.eventIdHashCode\s*=\s*['"]([^'"]+)['"]/i);
  if(confEvent && confHash) return {event:confEvent[1], hash:confHash[1]};

  const patterns=[
    /liveupdate\?e=([^&"'<>\\]+)&h=([^"'<>\\\s]+)/i,
    /liveupdate\?e=([^&"'<>\\]+)&amp;h=([^"'<>\\\s]+)/i,
    /liveupdate[^\n]{0,300}?[?&]e(?:=|%3D)([^&"'<>\\\s]+)[&%][^\n]{0,80}?h(?:=|%3D)([^"'<>\\\s&]+)/i,
    /["']e["']\s*:\s*["']([^"']+)["'][\s\S]{0,500}?["']h["']\s*:\s*["']([^"']+)["']/i,
    /["']event["']\s*:\s*["']([^"']+)["'][\s\S]{0,500}?["'](?:hash|h)["']\s*:\s*["']([^"']+)["']/i
  ];
  for(const p of patterns){ const m=html.match(p); if(m) return {event:decodeURIComponent(m[1]),hash:decodeURIComponent(m[2])}; }
  return null;
}
async function bootstrap(source){
  const r=await fetch(source.page,{redirect:'follow',headers:{...BASE_HEADERS,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Upgrade-Insecure-Requests':'1','Sec-Fetch-Site':'none','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'}});
  const html=await r.text();
  const found=discover(html); const li=html.toLowerCase().indexOf('liveupdate'); const ei=html.toLowerCase().indexOf('zejwko'); const vm=html.match(/conf\.visitorTeamLogo\s*=\s*['"]([^'"]+)['"]/i); const hm=html.match(/conf\.homeTeamLogo\s*=\s*['"]([^'"]+)['"]/i); return {status:r.status,ok:r.ok,cookie:cookieHeader(r),found,visitorLogo:htmlDecode(vm?.[1]||''),homeLogo:htmlDecode(hm?.[1]||''),sample:html.slice(0,120),liveupdateSnippet:li>=0?html.slice(Math.max(0,li-180),li+500):'',eventSnippet:ei>=0?html.slice(Math.max(0,ei-180),ei+500):''};
}
async function fetchLive(source,creds,cookie=''){
  const origin=new URL(source.page).origin;
  const u=new URL('/action/sports/liveupdate',origin); u.searchParams.set('e',creds.event); u.searchParams.set('h',creds.hash);
  const headers={...BASE_HEADERS,'Accept':'application/json,text/plain,*/*','X-Requested-With':'XMLHttpRequest','Referer':source.page,'Origin':origin,'Sec-Fetch-Site':'same-origin','Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'empty'};
  if(cookie) headers.Cookie=cookie;
  const r=await fetch(u,{method:'GET',redirect:'follow',headers}); const body=await r.text();
  let json=null; try{json=JSON.parse(body)}catch{}
  return {status:r.status,ok:r.ok,json,body:body.slice(0,240),url:u.toString()};
}

module.exports=async function handler(req,res){
  if(req.method==='OPTIONS') return send(res,200,{ok:true});
  if(req.method!=='GET') return send(res,405,{ok:false,error:'GET only'});
  const requestedGame=String(req.query.game||'');
  const dynamicPage=String(req.query.page||'').trim();
  let source=SOURCES[requestedGame]||null;
  let game = source ? '2026-09-06-mcmaster-guelph' : requestedGame;
  if(!source && dynamicPage){
    try{
      const u=new URL(dynamicPage);
      const host=u.hostname.toLowerCase();
      const allowedHosts=new Set(['oua.ca','www.oua.ca','en.usports.ca','usports.ca','www.usports.ca','atlanticuniversitysport.com','www.atlanticuniversitysport.com','aus.prestosports.com','smuhuskies.ca','www.smuhuskies.ca','mountiepride.ca','www.mountiepride.ca']);
      const allowed=allowedHosts.has(host)||host.endsWith('.prestosports.com');
      const validPath=/^\/sports\/fball\/2026-27\/boxscores\/\d{8}_[A-Za-z0-9]+\.xml$/i.test(u.pathname);
      if(!allowed||!validPath) return send(res,400,{ok:false,error:'Unsupported live-stat source page'});
      source={page:u.toString(),fallbackEvent:'',fallbackHash:'',awayId:String(req.query.awayId||'').toUpperCase(),homeId:String(req.query.homeId||'').toUpperCase()};
    }catch{return send(res,400,{ok:false,error:'Invalid source page'});}
  }
  if(!source) return send(res,404,{ok:false,error:'No verified Presto source registered for this game',game:requestedGame});
  let boot={status:null,ok:false,cookie:'',found:null,sample:''}, attempts=[];
  try{ boot=await bootstrap(source); }catch(e){ boot.error=String(e?.message||e); }
  const candidates=[];
  if(boot.found) candidates.push({...boot.found,kind:'discovered'});
  if(source.fallbackEvent&&source.fallbackHash) candidates.push({event:source.fallbackEvent,hash:source.fallbackHash,kind:'verified-fallback'});
  const unique=candidates.filter((x,i,a)=>a.findIndex(y=>y.event===x.event&&y.hash===x.hash)===i);
  for(const c of unique){
    try{
      const lr=await fetchLive(source,c,boot.cookie||'');
      attempts.push({kind:c.kind,status:lr.status,url:lr.url,body:lr.body});
      if(lr.ok&&isLivePayload(lr.json)){
        return send(res,200,{ok:true,game,upstreamStatus:lr.status,cadenceSeconds:10,sourcePage:source.page,bootstrapStatus:boot.status,credentialMode:c.kind,data:normalize(lr.json,{...source,awayLogo:boot.visitorLogo||'',homeLogo:boot.homeLogo||''})});
      }
      if(lr.json?.error){ attempts[attempts.length-1].upstreamError=String(lr.json.error); }
    }catch(e){ attempts.push({kind:c.kind,status:null,error:String(e?.message||e)}); }
  }
  return send(res,502,{ok:false,game,error:'PrestoSports returned a response, but it was not a usable live-stat payload',sourcePage:source.page,bootstrapStatus:boot.status,bootstrapOk:boot.ok,discoveredCredentials:!!boot.found,bootstrapLiveupdateSnippet:boot.liveupdateSnippet||'',bootstrapEventSnippet:boot.eventSnippet||'',attempts});
};
