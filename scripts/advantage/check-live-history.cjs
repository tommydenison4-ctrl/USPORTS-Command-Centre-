const assert=require('node:assert/strict'),Module=require('node:module'),store=new Map(),old=Module._load;
Module._load=function(id,...args){if(id==='@vercel/blob')return {get:async path=>store.has(path)?{stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(store.get(path).text));c.close()}})}:null,put:async(path,text)=>{if(store.has(path)){const e=Error();e.name='BlobAlreadyExistsError';throw e;}store.set(path,{text,uploadedAt:new Date().toISOString()});},list:async({prefix})=>({blobs:[...store.entries()].filter(([p])=>p.startsWith(prefix)).map(([pathname,v])=>({pathname,uploadedAt:v.uploadedAt})),hasMore:false})};return old.call(this,id,...args)};
const H=require('../../internal/live-history.cjs'),id='2026-10-09-toronto-mcmaster',g=H.game(id),prior=H.prior(id);
const snap=(q,clock,a,h)=>({identity:{gameId:id,date:g.date,away:g.away,home:g.home},game:{awayScore:a,homeScore:h},status:{period:q,clock},situation:{possession:'TOR'},plays:[]});
(async()=>{
 const base=await H.baseline(id);assert.equal(base.p,prior.home_win_prob);
 assert.equal(H.point(snap('Q1','15:00',0,0),base).p,prior.home_win_prob);
 assert.equal(H.point(snap('Q2','09:00',0,7),base).p>base.p,true);
 assert.equal(H.point(snap('Q1','19:99',0,0),base),null);
 await Promise.all([H.capture(id,snap('Q1','14:30',0,0),{}),H.capture(id,snap('Q1','14:30',0,0),{})]);assert.equal(store.size,2);
 await assert.rejects(H.capture(id,{...snap('Q2','09:00',7,0),identity:{...snap('Q2','09:00',7,0).identity,away:'laval'}},{}),/identity mismatch/);
 await H.capture(id,snap('FINAL','00:00',7,21),{verifiedFootball:'raw retained'});
 let history=await H.history(id);assert.equal(history.points[0].p,prior.home_win_prob);assert.equal(history.points.at(-1).p,1);assert.equal(history.complete,true);
 assert.equal([...store.values()].some(v=>JSON.parse(v.text).raw?.verifiedFootball==='raw retained'),true);
 const model=require('../../advantage-model.js'),p={available:true,home_win_prob:.7,away_win_prob:.3,awayName:'Away',homeName:'Home',away_score:10,home_score:20,total:30,margin:10,confidence:'Provisional',expected:null};const html=model.card(p,true,{model:{provisional:true}});assert.doesNotMatch(html,/Provisional|Model and source|Early-season|60%|How each team/);
 console.log('PASS: exact pregame baseline, concurrent deduplication, identity rejection, immutable raw feed retention, final probability and clean public predictions');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>Module._load=old);
