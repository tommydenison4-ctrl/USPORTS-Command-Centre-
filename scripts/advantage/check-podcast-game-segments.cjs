const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),api=require('../../podcast-game-segments');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('podcast-game-segments-data.js','utf8'),ctx);const d=ctx.window.US_PODCAST_GAME_SEGMENTS;
assert.equal(d.segments.filter(s=>s.kind!=='preview').length,44);assert.equal(d.episodes.filter(e=>!e.id.includes('preview')).length,9);
const expected=[[261,1831],[1831,2845],[2845,4179],[4179,4846],[4846,6215]];
for(const s of d.segments){
 assert.equal(api.find(d,{id:s.gameId,status:'scheduled'}),s.kind==='preview'?s:null);assert.equal(api.find(d,{id:s.gameId,status:'final'}),s);
 const ep=api.episode(d,s);assert.ok(s.start>=0&&s.end>s.start&&s.end<=ep.durationSeconds);
 const html=api.html(d,s);assert.ok(html.includes('game-podcast-reaction'));assert.ok(html.includes(s.gameId));
 if(ep.videoId){const u=new URL(api.embedUrl(d,s));assert.equal(u.hostname,'www.youtube-nocookie.com');assert.equal(u.pathname,'/embed/'+ep.videoId);assert.equal(u.searchParams.get('start'),String(s.start));assert.equal(u.searchParams.get('end'),String(s.end));assert.ok(html.includes('iframe'));assert.ok(!html.includes('<audio'));}
 else{assert.ok(html.includes('<audio'));assert.ok(html.includes('#t='+s.start+','+s.end));assert.ok(!html.includes('iframe'));}
}
for(const [i,s] of d.segments.filter(s=>s.episodeId==='2026-week-6').entries())assert.deepEqual([s.start,s.end],expected[i]);
const week7=[[445,1912],[1912,2987],[2987,4632],[4632,6014]];
for(const [i,s] of d.segments.filter(s=>s.episodeId==='2026-week-7').entries()){assert.deepEqual([s.start,s.end],week7[i]);assert.equal(api.episode(d,s).videoId,'W3smDJ9665E');}
assert.equal(api.stamp(1831),'30:31');assert.equal(api.stamp(4846),'1:20:46');
// Simulate game navigation and repeated data mutations: mount one player and remove it on departure.
let host=true,card=null,writes=0,handlers={};const c={window:{US_PODCAST_GAME_SEGMENTS:d},GAMES:d.segments.map(s=>({id:s.gameId,status:'final'})),location:{hash:'#game='+d.segments[0].gameId},URL,MutationObserver:class{constructor(fn){this.fn=fn}observe(){handlers.mutate=this.fn}},document:{querySelector:()=>host?{querySelector:()=>null,insertAdjacentHTML(){writes++;card={isConnected:true,querySelector:selector=>selector==='audio'?null:({remove(){},addEventListener(){}}),remove(){this.isConnected=false}}}}:null,getElementById:id=>id==='app'?{}:card}};c.window.addEventListener=(e,f)=>handlers[e]=f;c.globalThis=c.window;c.document=c.document;c.window.document=c.document;vm.runInNewContext(fs.readFileSync('podcast-game-segments.js','utf8'),c);assert.equal(writes,1);handlers.mutate();assert.equal(writes,1);c.location.hash='#game='+d.segments[1].gameId;handlers.hashchange();assert.equal(writes,2);host=false;c.location.hash='#schedule';handlers.hashchange();assert.equal(card.isConnected,false);
console.log('PASS: 44 finals across nine weeks; verified YouTube chapter bounds; safe embed; replay; no duplicate mounts; cleanup on navigation.');

const previews=d.segments.filter(s=>s.kind==='preview'&&s.scope==='conference');assert.equal(previews.length,8);for(const s of previews){assert.equal(api.episode(d,s).videoId,'t92jMAVbWJY');assert.equal(s.start,{AUS:203,RSEQ:1555,CW:3175}[s.conference]);assert.ok(api.html(d,s).includes('CONFERENCE PREVIEW'));assert.ok(api.html(d,s).includes('t='+s.start+'s'));}assert.ok(['not-released','awaiting-verified-chapters','verified'].includes(d.previewStatus.shows.oua.status));console.log('PASS: eight scheduled conference previews use verified YouTube clocks and timestamp deep links; OUA pending.');

const week8=d.segments.filter(s=>s.episodeId==='2026-week-8');assert.equal(week8.length,5);assert.deepEqual(Array.from(week8,s=>[s.start,s.end]),[[237,900],[900,2172],[2172,2783],[2783,3693],[3693,4557]]);for(const s of week8)assert.equal(api.episode(d,s).videoId,'20eyAmd44KQ');

const week9=d.segments.filter(s=>s.episodeId==='2026-week-9');assert.equal(week9.length,5);assert.deepEqual(Array.from(week9,s=>[s.start,s.end]),[[318,1630],[1630,3168],[3168,4333],[4333,5446],[5446,6501]]);for(const s of week9){assert.equal(api.episode(d,s).videoId,'N4XiY4DX2qg');assert.ok(s.gameId.startsWith('2026-10-24-'));}console.log('PASS: Week 9 review links five exact October 24 matchups to publisher YouTube chapters.');
