const {test}=require('node:test'),assert=require('node:assert/strict');
const host=require('../internal/host-live.cjs'),handler=require('../api/presto-live');
const expected={date:'2026-10-24',away:'toronto',home:'carleton'};
function payload(date='10/24/2026'){return {Game:{Date:date,HasStarted:true,IsComplete:false,Period:1,ClockSeconds:397,VisitingTeam:{Id:'TOR',Name:'Toronto',Score:7},HomeTeam:{Id:'CAR',Name:'Carleton',Score:0}}};}
test('away school live feed is used without national discovery',async()=>{
 const original=global.fetch,urls=[];
 global.fetch=async url=>{urls.push(String(url));assert.match(String(url),/sidearmstats.com\/toronto\/football\/game.json/);return {ok:true,json:async()=>payload()};};
 try{
  let result;await handler({method:'GET',query:{game:'2026-10-24-toronto-carleton',discover:'1'}},{setHeader(){},end(body){result=JSON.parse(body)}});
  assert.equal(result.ok,true);assert.equal(result.data.game.awayScore,7);assert.equal(result.data.game.homeScore,0);assert.equal(result.data.status.period,'Q1');assert.equal(result.data.status.clock,'6:37');assert.equal(result.data.identity.home,'carleton');assert.equal(urls.length,1);
 }finally{global.fetch=original;}
});
test('away feed cannot leak old scores or scores for other participants',async()=>{
 const original=global.fetch;
 try{
  global.fetch=async()=>({ok:true,json:async()=>payload('10/17/2026')});assert.equal(await host.load(expected),null);
  global.fetch=async()=>({ok:true,json:async()=>payload()});assert.equal(await host.load({...expected,home:'york'}),null);
 }finally{global.fetch=original;}
});

test('current team codes identify a game when provider display labels are stale',()=>{
 const raw=payload();raw.Game.VisitingTeam={Id:'QUE',Name:'Western Mustangs',Score:6};raw.Game.HomeTeam={Id:'MAC',Name:'McMaster Marauders',Score:0};
 const d=host.normalize(raw,{date:'2026-10-24',away:'queens',home:'mcmaster'});assert.equal(d.game.awayScore,6);assert.equal(d.identity.away,'queens');
 assert.equal(host.normalize(raw,{date:'2026-10-24',away:'western',home:'mcmaster'}),null);
});
