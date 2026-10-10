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

const queenTry={description:'Jayden Gurzi-MacDonald rush attempt good, clock 10:34.',q:'4',clock:'10:34',possession:'QUE'},queenTD={description:'Ashton St.Germain rush for 2 yards to the WSR00, TOUCHDOWN, clock 10:34.',q:'4',clock:'10:34',possession:'QUE'},summary={away:25,home:20,row:{time:'10:34',qtr:'4'},previous:{away:25,home:14}};
assert.equal(ctx.scoringDelta(queenTry.description),2);
assert.equal(ctx.scoringDelta('Player pass attempt good, clock 10:34.'),2);
result=ctx.reconcileConversionScore(25,20,{},{away:13,home:15},[queenTry,queenTD],source,summary);assert.equal(result.home,22);
result=ctx.reconcileConversionScore(25,22,{},{away:13,home:15},[queenTry,queenTD],source,{...summary,home:22});assert.equal(result.home,22);assert.equal(result.adjusted,false);
result=ctx.reconcileConversionScore(25,20,{},{},[queenTry,queenTD],source,{...summary,row:{time:'14:47',qtr:'4'}});assert.equal(result.home,20);
result=ctx.reconcileConversionScore(25,20,{},{},[queenTry,queenTD],source,{...summary,row:{time:'10:34',qtr:'3'}});assert.equal(result.home,20);
console.log('PASS: actual Queen’s rush conversion adds two to the matching touchdown summary even when older play history is truncated; updated/mismatched summaries never add twice');
