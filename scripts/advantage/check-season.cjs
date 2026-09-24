const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'../..');global.AdvantageModel=require(path.join(root,'advantage-model.js'));require(path.join(root,'season-watch.js'));const watch=JSON.parse(fs.readFileSync(path.join(root,'data/season-watch.json')));
for(const [league,w] of Object.entries(watch)){
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/advantage-'+league.toLowerCase()+'.json')));
 assert.equal(w.season,2026);assert(w.players.every(p=>p.firstGame>='2026-08-01'&&p.lastGame<w.asOf&&p.games>=2));
 for(const p of w.players){let score=0;for(const [cat,s] of Object.entries(p.stats))score+=s.yards/(cat==='passing'?25:10)+s.touchdowns*(cat==='passing'?4:6)-s.interceptions*2;assert(Math.abs(p.score-score/p.games)<.011);if(w.eligibleTeamIds)assert(w.eligibleTeamIds.includes(p.teamId));}
 const ranked=SeasonWatch.contenders(league,data,w);assert(ranked.length>1);assert(Math.abs(ranked.reduce((s,p)=>s+p.rating,0)/ranked.length-.5)<1e-10);if(league==='USPORTS')assert.deepEqual(SeasonWatch.contenders(league,{...data,dataPolicy:{season:2025}},w),[]);
}
const req={targets:[3,5,7,9],plusOneTurnover50:1,median:4,negativeCeiling:.2},html=AdvantageModel.winGuide(null,{available:true,awayName:'Team A',homeName:'Team B',requirements:{away:req,home:req}});assert(html.includes('at least 5 big plays'));assert(html.includes('at least 1 big play'));assert(!html.includes('NaN'));console.log('Season cutoff, production arithmetic, team membership, symmetric strength ranking and workbook scenarios passed');
