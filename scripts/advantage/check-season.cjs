const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'../..');global.AdvantageModel=require(path.join(root,'advantage-model.js'));require(path.join(root,'season-watch.js'));const watch=JSON.parse(fs.readFileSync(path.join(root,'data/season-watch.json')));
for(const [league,w] of Object.entries(watch)){
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/advantage-'+league.toLowerCase()+'.json')));
 assert.equal(w.season,2026);assert(w.players.every(p=>p.firstGame>='2026-08-01'&&p.lastGame<w.asOf&&p.games>=2));
 for(const p of w.players){let score=0;for(const [cat,s] of Object.entries(p.stats))score+=s.yards/(cat==='passing'?25:10)+s.touchdowns*(cat==='passing'?4:6)-s.interceptions*2;assert(Math.abs(p.score-score/p.games)<.011);if(w.eligibleTeamIds)assert(w.eligibleTeamIds.includes(p.teamId));}
 const ranked=SeasonWatch.contenders(league,data,w);assert(ranked.length>1);assert(Math.abs(ranked.reduce((s,p)=>s+p.rating,0)/ranked.length-.5)<1e-10);if(league==='USPORTS')assert.deepEqual(SeasonWatch.contenders(league,{...data,dataPolicy:{season:2025}},w),[]);
}
const req={targets:[3,5,7,9],plusOneTurnover50:1,median:4,negativeCeiling:.2},html=AdvantageModel.winGuide(null,{available:true,awayName:'Team A',homeName:'Team B',requirements:{away:req,home:req}});assert(html.includes('at least 5 big plays'));assert(html.includes('at least 1 big play'));assert(!html.includes('NaN'));console.log('Season cutoff, production arithmetic, team membership, symmetric strength ranking and workbook scenarios passed');

const d=JSON.parse(fs.readFileSync(path.join(root,'data/advantage-usports.json'))),A=AdvantageModel;
for(const id of ['acadia','bishops','mountallison','saintmarys','stfx']) {
 const a=d.profiles[id],h=d.profiles.laval;
 assert.equal(A.conferenceStrength(d,a),2);
 for(const [away,home] of [[a,h],[h,a]]) {
  const p=A.matchupProbability(d,away,home,true),base=p.conferenceStrength.baseHomeWin;
  assert(home===a?p.homeWin<base:p.homeWin>base);
  const g=A.project(d,{away:away.id,home:home.id,date:d.asOf,neutral:true});
  assert.equal(g.home_win_prob,p.homeWin);
 }
}
const same=A.matchupProbability(d,d.profiles.acadia,d.profiles.bishops,true);
assert.equal(same.homeWin,same.conferenceStrength.baseHomeWin);
const equal=A.matchupProbability({...d,model:{...d.model,football:{mean:Array(6).fill(0),scale:Array(6).fill(1),coef:Array(7).fill(0),logistic:true},power:{mean:[0,0],scale:[1,1],coef:[0,0,0],logistic:true},form:{mean:[0,0],scale:[1,1],coef:[0,0,0],logistic:true}}},d.profiles.laval,d.profiles.acadia,true);
assert(Math.abs(equal.homeWin-1/6)<1e-12);
const w=watch.USPORTS, ranked=SeasonWatch.contenders('USPORTS',d,w);
for(const p of ranked){const opponents=ranked.filter(o=>o.id!==p.id);const expected=opponents.reduce((sum,o)=>sum+(A.matchupProbability(d,o,p,true).homeWin+1-A.matchupProbability(d,p,o,true).homeWin)/2,0)/opponents.length;assert(Math.abs(p.rating-expected)<1e-12)}
assert(!['acadia','bishops','mountallison','saintmarys','stfx'].includes(ranked[0].id));
console.log('AUS 2/10: all five teams, both venues, same-conference invariance and shared Vanier ranking passed; pick:',ranked[0].name);

for(const id of ['acadia','bishops','mountallison','saintmarys','stfx'])for(const [away,home] of [[id,'laval'],['laval',id]]){
 const g=A.project(d,{away,home,date:d.asOf,neutral:true});
 assert(g.available);assert(away===id?g.scoreAdjustment>0:g.scoreAdjustment<0);
 assert(g.home_score>=0&&g.away_score>=0);
 assert(Math.abs(g.total-(g.home_score+g.away_score))<1e-9);
 assert(A.strengthNote(g).includes('2/10'));
 assert(A.strengthNote(g).includes('before →'));
}
assert.equal(A.project(d,{away:'acadia',home:'stfx',date:d.asOf,neutral:true}).scoreAdjustment,0);
console.log('Build Matchup conference disclosure, score adjustment, both orientations and same-conference invariance passed');
