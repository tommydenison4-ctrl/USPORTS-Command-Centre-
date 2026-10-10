const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('api/presto-live.js','utf8'),ctx={};
vm.runInNewContext(src.slice(src.indexOf('function scoringTeamCode'),src.indexOf('function flattenDrives')),ctx);
const source={awayId:'WSR',homeId:'QUE'},play=(description,possession='QUE')=>({description,possession});
for(const description of ['Kick attempt good','PAT kick attempt good','Convert GOOD','Extra point SUCCESSFUL'])assert.equal(ctx.scoringDelta(description),1);
assert.equal(ctx.scoringDelta('Two-point pass attempt successful'),2);
for(const description of ['Kick attempt NO GOOD','PAT failed','Convert blocked','Kick attempt good, NO PLAY'])assert.equal(ctx.scoringDelta(description),0);
const plays=[play('Kick attempt good'),play('Pass TOUCHDOWN')],fallback=ctx.scoreFallbackFromPlays(plays,source);
assert.equal(fallback.home,7);
let result=ctx.reconcileConversionScore(0,6,{},fallback,plays,source);assert.equal(result.home,7);assert.equal(result.adjusted,true);
result=ctx.reconcileConversionScore(0,7,{away:0,home:7},fallback,plays,source);assert.equal(result.home,7);assert.equal(result.adjusted,false);
result=ctx.reconcileConversionScore(15,26,{away:15,home:27},{away:0,home:7},plays,source);assert.equal(result.home,27);
result=ctx.reconcileConversionScore(15,26,{away:16,home:27},{away:0,home:7},plays,source);assert.equal(result.adjusted,false);
result=ctx.reconcileConversionScore(0,6,{},fallback,[play('Kick attempt NO GOOD'),play('Pass TOUCHDOWN')],source);assert.equal(result.home,6);
result=ctx.reconcileConversionScore(0,6,{away:0,home:8},{away:0,home:8},[play('Two-point rush attempt good'),play('Rush TOUCHDOWN')],source);assert.equal(result.home,8);
console.log('PASS: successful one/two-point tries bridge delayed scoring summaries once; missed, blocked, reversed and unrelated score changes are rejected');

assert.equal(ctx.reconcileConversionScore(6,0,{away:7,home:0},{},[play('Kick attempt good','WSR')],{awayId:'WIN',homeId:'QUE'}).away,7);
