const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const A=require('../../advantage-model.js'),ctx={AdvantageModel:A};vm.createContext(ctx);vm.runInContext(fs.readFileSync('score-simulation.js','utf8'),ctx);
for(const prob of [.05,.2,.5,.8,.95]){const p={available:true,gameId:String(prob),modelVersion:'2026-test',home_win_prob:prob,home_score:30+10*(prob-.5),away_score:30-10*(prob-.5),homeName:'Home',awayName:'Away'};
 const s=ctx.USScoreSimulation.run(p);assert.equal(s.count,10000);assert.equal(s.results.length,10000);assert.equal(s.bins.reduce((a,b)=>a+b,0),10000);assert.equal(s.homeWins+s.awayWins,10000);assert.ok(Math.abs(s.homeWins/10000-prob)<.02);assert.ok(s.results.every(r=>Number.isInteger(r.away)&&Number.isInteger(r.home)&&r.away>=0&&r.home>=0&&r.away!==r.home));assert.equal(s,ctx.USScoreSimulation.run(p));assert.match(ctx.USScoreSimulation.card(p),/10,000 GAMES/);assert.equal(ctx.USScoreSimulation.csv(s).split('\n').length,10001)}
assert.equal(ctx.USScoreSimulation.run({available:false}),null);
console.log('PASS: 10,000 seeded score outcomes, all bins accounted for, nonnegative scores, same winner prior.');
