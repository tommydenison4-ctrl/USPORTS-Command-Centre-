const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'../..');global.AdvantageModel=require(path.join(root,'advantage-model.js'));require(path.join(root,'season-watch.js'));const watch=JSON.parse(fs.readFileSync(path.join(root,'data/season-watch.json')));
for(const [league,w] of Object.entries(watch)){
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/advantage-'+league.toLowerCase()+'.json')));
 assert.equal(w.season,2026);assert(w.players.every(p=>p.firstGame>='2026-08-01'&&p.lastGame<=w.asOf&&p.games>=2));
 for(const p of w.players){let score=0;for(const [cat,s] of Object.entries(p.stats))score+=s.yards/(cat==='passing'?25:10)+s.touchdowns*(cat==='passing'?4:6)-s.interceptions*2;assert(Math.abs((p.productionScore??p.score)-score/p.games)<.011);if(league==='USPORTS'){const r=w.records[p.teamId];assert.equal(p.teamWinPercentage,(r.wins+.5*r.ties)/(r.wins+r.losses+r.ties));assert(Math.abs(p.productionNormalized-Math.max(0,p.productionScore)/w.productionMaximum)<1e-12);assert(Math.abs(p.score-(85*p.productionNormalized+15*p.teamWinPercentage))<.011)}if(w.eligibleTeamIds)assert(w.eligibleTeamIds.includes(p.teamId));}
 const ranked=SeasonWatch.contenders(league,data,w);assert(ranked.length>1);assert(Math.abs(ranked.reduce((s,p)=>s+p.rating,0)/ranked.length-.5)<1e-10);if(league==='USPORTS')assert.deepEqual(SeasonWatch.contenders(league,{...data,dataPolicy:{season:2025}},w),[]);
}
const req={targets:[3,5,7,9],plusOneTurnover50:1,median:4,negativeCeiling:.2},html=AdvantageModel.winGuide(null,{available:true,awayName:'Team A',homeName:'Team B',requirements:{away:req,home:req}});assert(html.includes('at least 5 big plays'));assert(html.includes('at least 1 big play'));assert(!html.includes('NaN'));console.log('Season cutoff, production arithmetic, team membership, symmetric strength ranking and workbook scenarios passed');

const d=JSON.parse(fs.readFileSync(path.join(root,'data/advantage-usports.json'))),A=AdvantageModel;
const futureDate=new Date(Date.parse(d.asOf)+86400000).toISOString().slice(0,10);
for(const id of ['acadia','bishops','mountallison','saintmarys','stfx']) {
 const a=d.profiles[id],h=d.profiles.laval;
 assert.equal(A.conferenceStrength(d,a),2);
 for(const [away,home] of [[a,h],[h,a]]) {
  const p=A.matchupProbability(d,away,home,true),base=p.conferenceStrength.baseHomeWin;
  assert(home===a?p.homeWin<base:p.homeWin>base);
  const g=A.project(d,{away:away.id,home:home.id,date:futureDate,neutral:true});
  assert.equal(g.home_win_prob,p.homeWin);
 }
}
const same=A.matchupProbability(d,d.profiles.acadia,d.profiles.bishops,true);
assert.equal(same.homeWin,same.conferenceStrength.baseHomeWin);
const equal=A.matchupProbability({...d,model:{...d.model,football:{mean:Array(6).fill(0),scale:Array(6).fill(1),coef:Array(7).fill(0),logistic:true},power:{mean:[0,0],scale:[1,1],coef:[0,0,0],logistic:true},form:{mean:[0,0],scale:[1,1],coef:[0,0,0],logistic:true}}},d.profiles.laval,d.profiles.acadia,true);
assert(Math.abs(equal.homeWin-1/6)<1e-12);
const w=watch.USPORTS, ranked=SeasonWatch.contenders('USPORTS',d,w);
const results=JSON.parse(fs.readFileSync(path.join(root,'data/verified-results-usports.json')));
for(const team of Object.keys(d.profiles)){
 const games=results.games.filter(g=>g.away===team||g.home===team),record={wins:0,losses:0,ties:0};
 for(const g of games){const own=g.away===team?g.awayScore:g.homeScore,other=g.away===team?g.homeScore:g.awayScore;record[own>other?'wins':own<other?'losses':'ties']++}
 assert.deepEqual(w.records[team],record);assert.equal(games.length,d.profiles[team].resultGames);
}
global.SEASON_WATCH=watch;global.AWM_DATA={USPORTS:d};
const rankingHtml=SeasonWatch.render('USPORTS');
assert(rankingHtml.includes('Top 27'));assert.equal((rankingHtml.match(/Model rating /g)||[]).length,27);
for(const team of ['laval','montreal','mcgill']){const p=d.profiles[team],r=w.records[team];assert(rankingHtml.includes('<b>'+p.name+'</b> <span>'+r.wins+'–'+r.losses+'</span>'))}
console.log('Top 27 includes every team, with records matched to all verified finals and separate play coverage');
const sos=SeasonWatch.scheduleStrength(ranked,w),ratings=new Map(ranked.map(p=>[p.id,p.rating]));
for(const p of ranked){const expectedOpponents=results.games.filter(g=>g.away===p.id||g.home===p.id).map(g=>g.away===p.id?g.home:g.away);assert.deepEqual(w.opponents[p.id],expectedOpponents);assert.equal(sos[p.id].covered,p.resultGames);assert(Math.abs(sos[p.id].score-expectedOpponents.reduce((sum,id)=>sum+ratings.get(id),0)/expectedOpponents.length)<1e-12)}
const fixture=SeasonWatch.scheduleStrength([{id:'a',rating:.2},{id:'b',rating:.9},{id:'c',rating:.3}],{opponents:{a:['b','b','c'],b:['a'],c:['missing']}});
assert(Math.abs(fixture.a.score-.7)<1e-12);assert.equal(fixture.a.rank,1);assert.equal(fixture.c.score,null);
assert.equal((rankingHtml.match(/<small>SOS /g)||[]).length,27);
console.log('SOS matches all completed opponents, counts repeat meetings, excludes unknown ratings and appears for all 27 teams');
for(const p of ranked){const opponents=ranked.filter(o=>o.id!==p.id);const expected=opponents.reduce((sum,o)=>sum+(A.matchupProbability(d,o,p,true).homeWin+1-A.matchupProbability(d,p,o,true).homeWin)/2,0)/opponents.length;assert(Math.abs(p.rating-expected)<1e-12)}
assert(!['acadia','bishops','mountallison','saintmarys','stfx'].includes(ranked[0].id));
console.log('AUS 2/10: all five teams, both venues, same-conference invariance and shared Vanier ranking passed; pick:',ranked[0].name);

for(const id of ['acadia','bishops','mountallison','saintmarys','stfx'])for(const [away,home] of [[id,'laval'],['laval',id]]){
 const g=A.project(d,{away,home,date:futureDate,neutral:true});
 assert(g.available);assert(away===id?g.scoreAdjustment>0:g.scoreAdjustment<0);
 assert(g.home_score>=0&&g.away_score>=0);
 assert(Math.abs(g.total-(g.home_score+g.away_score))<1e-9);
 assert(A.strengthNote(g).includes('2/10'));
 assert(A.strengthNote(g).includes('before →'));
}
assert.equal(A.project(d,{away:'acadia',home:'stfx',date:futureDate,neutral:true}).scoreAdjustment,0);
console.log('Build Matchup conference disclosure, score adjustment, both orientations and same-conference invariance passed');

for(const away of Object.keys(d.profiles))for(const home of Object.keys(d.profiles))if(away!==home)for(const neutral of [true,false]){
 const p=A.project(d,{away,home,neutral,date:futureDate});assert(p.available);
 assert((p.home_win_prob-.5)*(p.home_score-p.away_score)>=0,away+' '+home);
 assert(p.home_score>=0&&p.away_score>=0);
}
for(const [away,home] of [['york','mount-allison'],['mount-allison','york']]){
 const p=A.project(d,{away,home,neutral:true,date:futureDate});assert(p.available);assert((p.home_win_prob-.5)*p.margin>0);
 console.log(away,home,p.away_win_prob,p.away_score,p.home_score);
}
assert(A.card({...A.project(d,{away:'york',home:'mount-allison',date:futureDate}),awayLogo:'https://example.com/york.png',homeLogo:'https://example.com/mta.png'}).includes('alt="York logo"'));
console.log('All 1,404 matchup/venue score directions agree with probabilities; York–Mount Allison and logo rendering passed');
let venueChecks=0;
for(const a of Object.keys(d.profiles))for(const b of Object.keys(d.profiles))if(a!==b){
 const neutral=A.project(d,{away:a,home:b,neutral:true,date:futureDate});
 const reversed=A.project(d,{away:b,home:a,neutral:true,date:futureDate});
 const aHome=A.project(d,{away:b,home:a,neutral:false,date:futureDate});
 const bHome=A.project(d,{away:a,home:b,neutral:false,date:futureDate});
 assert(Math.abs(neutral.away_win_prob-reversed.home_win_prob)<1e-10);
 assert(Math.abs(neutral.away_score-reversed.home_score)<1e-10);
 const nm=neutral.away_score-neutral.home_score,am=aHome.home_score-aHome.away_score,bm=bHome.away_score-bHome.home_score;
 assert(am>=nm-1e-10&&bm<=nm+1e-10,a+' '+b+' home margin improves');
 assert(aHome.home_win_prob>=neutral.away_win_prob-1e-10);
 assert(bHome.away_win_prob<=neutral.away_win_prob+1e-10);
 assert(Math.abs(am-Math.min(neutral.total,nm+3))<1e-9);
 assert.equal(aHome.homeFieldPoints,3);assert.equal(neutral.homeFieldPoints,0);venueChecks++;
}
console.log(venueChecks+' pairings: neutral side-swap invariance, both home margins and probabilities improve, three-point venue prior passed');
