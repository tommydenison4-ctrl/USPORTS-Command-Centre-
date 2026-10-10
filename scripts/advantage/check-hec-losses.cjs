const assert=require('node:assert/strict');require('../../season-watch.js');
const ranked=[{id:'top'},{id:'bottom'}];
const fixture=(losses,teamId='top')=>({asOf:'2026-10-04',productionMaximum:100,records:{[teamId]:{wins:4,losses,ties:0}},players:[{name:'Player',teamId,productionNormalized:1,productionScore:100,score:100}]});
for(const [losses,multiplier] of [[0,1],[1,1],[2,.95],[3,.9],[6,.75],[21,0]]){
 const p=SeasonWatch.awardPlayers(fixture(losses),ranked)[0];assert(Math.abs(p.score-p.baseScore*multiplier)<.0051);assert.equal(p.teamLosses,losses);
}
const top=SeasonWatch.awardPlayers(fixture(1),ranked)[0],bottom=SeasonWatch.awardPlayers(fixture(1,'bottom'),ranked)[0];assert.equal(top.score-bottom.score,10);
const extra=[{date:'2026-10-10',status:'final',away:'top',home:'other',awayScore:12,homeScore:19}];
const p=SeasonWatch.awardPlayers(fixture(1),ranked,extra)[0];assert.equal(p.teamLosses,2);assert.equal(p.lossPenalty,.05);
assert.equal(SeasonWatch.awardPlayers(fixture(1),ranked,[{...extra[0],exhibition:true}])[0].teamLosses,1);
const w={...fixture(1),eligiblePlayers:[{name:'Top team',teamId:'top',productionNormalized:.95},{name:'Losing team',teamId:'bottom',productionNormalized:1}],records:{top:{wins:4,losses:1,ties:0},bottom:{wins:1,losses:4,ties:0}}};
assert.equal(SeasonWatch.awardPlayers(w,ranked)[0].name,'Top team');
console.log('One free loss, additive 5% penalties, zero floor, team-ranking points, new finals, exhibition exclusion and reranking passed.');
