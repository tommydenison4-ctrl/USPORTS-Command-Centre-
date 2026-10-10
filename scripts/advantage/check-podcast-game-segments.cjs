const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),api=require('../../podcast-game-segments');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('podcast-game-segments-data.js','utf8'),ctx);const d=ctx.window.US_PODCAST_GAME_SEGMENTS;
assert.equal(d.segments.length,5);const expected=[[261,1831],[1831,2845],[2845,4179],[4179,4846],[4846,6215]];
for(const [i,s] of d.segments.entries()){
 assert.equal(api.find(d,{id:s.gameId,status:'scheduled'}),null);assert.equal(api.find(d,{id:s.gameId,status:'final'}),s);
 assert.deepEqual([s.start,s.end],expected[i],'Must use YouTube chapters, not audio chapters');
 const u=new URL(api.embedUrl(d,s));assert.equal(u.hostname,'www.youtube-nocookie.com');assert.equal(u.pathname,'/embed/6VUx3by9o6g');assert.equal(u.searchParams.get('start'),String(s.start));assert.equal(u.searchParams.get('end'),String(s.end));assert.equal(u.searchParams.get('autoplay'),null);
 const html=api.html(d,s);assert(html.includes('iframe'));assert(html.includes('referrerpolicy="strict-origin-when-cross-origin"'));assert(!html.includes('<audio'));assert(html.includes('Replay game segment'));assert(!api.html({...d,videoId:'<script>'},s));
}
assert.equal(api.find(d,{id:'2026-10-09-toronto-mcmaster',status:'final'}),null);assert.equal(api.stamp(1831),'30:31');assert.equal(api.stamp(4846),'1:20:46');
// Simulate game navigation and repeated data mutations: mount one player and remove it on departure.
let host=true,card=null,writes=0,handlers={};const c={window:{US_PODCAST_GAME_SEGMENTS:d},GAMES:d.segments.map(s=>({id:s.gameId,status:'final'})),location:{hash:'#game='+d.segments[0].gameId},URL,MutationObserver:class{constructor(fn){this.fn=fn}observe(){handlers.mutate=this.fn}},document:{querySelector:()=>host?{querySelector:()=>null,insertAdjacentHTML(){writes++;card={isConnected:true,querySelector:()=>({remove(){},addEventListener(){}}),remove(){this.isConnected=false}}}}:null,getElementById:id=>id==='app'?{}:card}};c.window.addEventListener=(e,f)=>handlers[e]=f;c.globalThis=c.window;c.document=c.document;c.window.document=c.document;vm.runInNewContext(fs.readFileSync('podcast-game-segments.js','utf8'),c);assert.equal(writes,1);handlers.mutate();assert.equal(writes,1);c.location.hash='#game='+d.segments[1].gameId;handlers.hashchange();assert.equal(writes,2);host=false;c.location.hash='#schedule';handlers.hashchange();assert.equal(card.isConnected,false);
console.log('PASS: five last-week finals; verified YouTube chapter bounds; safe embed; replay; no duplicate mounts; cleanup on navigation.');
