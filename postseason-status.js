(function(root){
 'use strict';
 const spots={OUA:7,CW:4,RSEQ:4,AUS:3};
 const norm=s=>String(s||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 function isPlayoff(g){return !!(g.playoff||g.postseason||/\/\d{4}-\d{2}p\//.test(g.boxscore||'')||/\b(playoff|postseason|quarter.?final|semi.?final|yates cup|hardy cup|loney bowl|dussault|vanier cup|uteck|mitchell bowl)\b/i.test(g.note||''));}
 function calculate(teams,games,engine){
  const status={};teams.forEach(t=>status[norm(t.slug)]={eliminated:false,conference:t.conference});
  for(const [conf,cut] of Object.entries(spots)){
   const ts=teams.filter(t=>t.conference===conf),ids=new Set(ts.map(t=>t.slug));
   const regular=games.filter(g=>ids.has(g.away)&&ids.has(g.home)&&!g.exhibition&&!isPlayoff(g)&&!['cancelled','canceled'].includes(g.status));
   // An incomplete season index cannot establish mathematical elimination.
   if(!ts.length||ts.some(t=>regular.filter(g=>g.away===t.slug||g.home===t.slug).length<8))continue;
   const final=g=>g.status==='final'&&Number.isFinite(g.awayScore)&&Number.isFinite(g.homeScore)&&g.awayScore!==g.homeScore;
   const done=regular.filter(final),left=regular.filter(g=>!final(g));
   const records=Object.fromEntries(ts.map(t=>[t.slug,{slug:t.slug,w:0,l:0,gp:0,pf:0,pa:0}]));
   function add(rs,g,winner){for(const side of ['away','home']){const r=rs[g[side]];r.gp++;r[g[side]===winner?'w':'l']++;if(final(g)){r.pf+=g[side+'Score'];r.pa+=g[(side==='away'?'home':'away')+'Score'];}}}
   done.forEach(g=>add(records,g,g.awayScore>g.homeScore?g.away:g.home));
   const alive=new Set();
   if(engine&&left.length<=10){
    for(let mask=0;mask<2**left.length;mask++){
     const rs=JSON.parse(JSON.stringify(records)),gs=done.map(g=>({...g,result:{away:g.awayScore,home:g.homeScore}}));
     left.forEach((g,i)=>{const winner=(mask>>i)&1?g.home:g.away;add(rs,g,winner);gs.push({...g,scenario:true,pick:{winner},result:null});});
     const ranked=engine.rank(conf,rs,gs);ranked.rows.slice(0,cut).forEach(r=>alive.add(r.slug));
     // Unknown future margins and official draws must keep every tied contender alive.
     for(const group of ranked.unresolvedGroups||[])if(group.some(s=>ranked.rows.findIndex(r=>r.slug===s)<cut))group.forEach(s=>alive.add(s));
    }
    ts.forEach(t=>{status[norm(t.slug)].eliminated=!alive.has(t.slug);});
   }else{
    ts.forEach(t=>{const max=records[t.slug].w+left.filter(g=>g.away===t.slug||g.home===t.slug).length;status[norm(t.slug)].eliminated=ts.filter(o=>records[o.slug].w>max).length>=cut;});
   }
  }
  // A verified postseason loss ends the championship route, regardless of conference.
  for(const g of games.filter(isPlayoff))if(g.status==='final'&&Number.isFinite(g.awayScore)&&Number.isFinite(g.homeScore)&&g.awayScore!==g.homeScore){const loser=g.awayScore<g.homeScore?g.away:g.home;if(status[norm(loser)])status[norm(loser)].eliminated=true;}
  return status;
 }
 let signature='',cached={};
 function current(){const teams=typeof TEAMS!=='undefined'?TEAMS:root.TEAMS||[],games=typeof GAMES!=='undefined'?GAMES:root.GAMES||[];const key=String(!!root.FootballTiebreaks)+JSON.stringify(games.map(g=>[g.id,g.status,g.awayScore,g.homeScore,isPlayoff(g)]));if(key!==signature){cached=calculate(teams,games,root.FootballTiebreaks);signature=key;}return cached;}
 function eliminated(id){return !!current()[norm(id)]?.eliminated;}
 function badge(id){return eliminated(id)?' <abbr class="eliminated-badge" title="Eliminated from playoff / Vanier Cup contention" aria-label="Eliminated from playoff contention">E</abbr>':'';}
 const api={isPlayoff,calculate,current,eliminated,badge};root.PostseasonStatus=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
