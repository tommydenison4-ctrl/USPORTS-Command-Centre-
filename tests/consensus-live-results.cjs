const assert=require('node:assert/strict'),C=require('../internal/fan-consensus.cjs');
const livePath=require.resolve('../api/presto-live'),real=require(livePath);let complete=false,calls=0;
const g=C.game('2026-10-16-calgary-ubc');
require.cache[livePath].exports=async(req,res)=>{calls++;res.end(JSON.stringify({ok:true,page:g.boxscore,data:{identity:{gameId:g.id,date:g.date,away:g.away,home:g.home},status:{complete},game:{awayScore:7,homeScore:21}}}))};
const {createLoader}=require('../internal/consensus-results.cjs');
const records=new Map(),store={read:async p=>records.get(p)||null,put:async(p,v)=>{records.set(p,v)}};
(async()=>{
 const fan='a'.repeat(32),ballots=new Map([[g.id,{latest:new Map([[fan,{winner:g.home}]])}]]),profiles=new Map([[fan,{name:'Test Fan'}]]);
 let finals=await createLoader(store,{scoreboard:async(req,res)=>res.end('{"games":[]}')})([g]);assert(!finals.some(r=>r.id===g.id),'In-progress results cannot award points');assert.equal(C.score(ballots,profiles,{finalResults:finals})[0].pending,1);
 complete=true;finals=await createLoader(store,{scoreboard:async(req,res)=>res.end('{"games":[]}')})([g]);let row=C.score(ballots,profiles,{finalResults:finals})[0];assert.equal(row.correct,1);assert.equal(row.pending,0);assert.equal(records.size,1,'Verified final is persisted');
 const before=calls;await createLoader(store,{scoreboard:async(req,res)=>res.end('{"games":[]}')})([g]);assert.equal(calls,before,'A cold loader reuses the verified final without querying upstream');
 const indexStore={read:async()=>null,put:async()=>{}};const count=calls;const indexed=await createLoader(indexStore,{scoreboard:async(req,res)=>res.end(JSON.stringify({games:[{id:g.id,date:g.date,away:g.away,home:g.home,awayScore:18,homeScore:34,final:true,source:'https://en.usports.ca/sports/fball/composite?d='+g.date}]}))})([g]);assert.equal(indexed.find(r=>r.id===g.id).homeScore,34);assert.equal(calls,count,'Official final index must work without a live-feed request');
 require.cache[livePath].exports=real;console.log('PASS: live games stay pending; official finals grade immediately; final results survive loader restarts.');
})().catch(e=>{console.error(e);process.exitCode=1});
