const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const handler=require('../../api/presto-live');
const requested='2026-10-03-mount-allison-stfx',page='https://en.usports.ca/sports/fball/2026-27/boxscores/20261003_wrong.xml';
let calls=[];global.fetch=async url=>{calls.push(String(url));return {ok:true,status:200,headers:{get:()=>''},text:async()=>String(url).includes('boxscores')?`conf.visitor="Laval";conf.home="Concordia";conf.eventId="event";conf.eventIdHashCode="hash";`:`<a href="${page}">Box score</a>`}};
function request(query){return new Promise(async resolve=>{const res={setHeader(){},end(body){resolve({status:this.statusCode,body:JSON.parse(body)})}};await handler({method:'GET',query},res)})}
(async()=>{
 let r=await request({game:requested,page,awayId:'MTA',homeId:'STF'});assert.equal(r.status,409);assert(!calls.some(x=>x.includes('liveupdate')),'Wrong participants must be rejected before fetching live scores');
 calls=[];r=await request({game:requested,discover:'1',date:'20261003',away:'mount-allison',home:'stfx'});assert.equal(r.status,404,'Discovery must not fall back to an unrelated box score');
 const oldFetch=global.fetch;calls=[];
 global.fetch=async url=>{const u=String(url);calls.push(u);return {ok:!u.includes('en.usports.ca'),status:u.includes('en.usports.ca')?403:200,headers:{get:()=>''},text:async()=>u.includes('liveupdate')?JSON.stringify({status:{period:'2',clock:'10:00'},scores:{score:[{vscore:'7',hscore:'0'}]}}):`conf.visitor="Queen's";conf.home='Western';conf.eventId='event';conf.eventIdHashCode='hash';`}};
 r=await request({game:'2026-10-03-queens-western',page:'https://en.usports.ca/sports/fball/2026-27/boxscores/20261003_7san.xml',awayId:'QUE',homeId:'WES'});
 assert.equal(r.status,200,'Unavailable national page must retry verified OUA event');assert.equal(r.body.visitor,"Queen's");assert.equal(r.body.data.identity.away,'queens');assert(calls.some(u=>u.startsWith('https://oua.ca/')));
 global.fetch=oldFetch;
 const code=fs.readFileSync(require('path').join(__dirname,'../../live-gamecast.js'),'utf8');const prefix=code.slice(code.indexOf('  const esc2'),code.indexOf('  function prob'));
 const a={id:'2026-10-03-laval-concordia',date:'2026-10-03',away:'laval',home:'concordia'},b={id:requested,date:'2026-10-03',away:'mount-allison',home:'stfx'};let resolve;
 const ctx={L:{selected:a.id,source:{page},lastDiscover:0},GAMES:[a,b],TEAM:{laval:{short:'Laval'},concordia:{short:'Concordia'}},LIVE_STORE:{games:{[b.id]:{_realLive:true,as:42,hs:7}}},window:{},esc:String,localStorage:{getItem(){},setItem(){}},sessionStorage:{getItem(){},setItem(){}},fetch:()=>new Promise(r=>resolve=r),console};vm.runInNewContext(prefix,ctx);
 assert.equal(ctx.LIVE_STORE.games[b.id].as,undefined,'Old unverified score cache must be cleared');
 const work=ctx.fetchSnap();ctx.L.selected=b.id;resolve({json:async()=>({ok:true,game:a.id,page,visitor:'Laval',home:'Concordia',data:{identity:{gameId:a.id,...a},game:{awayScore:42,homeScore:7},status:{period:'Q2'}}})});await work;
 assert.equal(ctx.L.snap,undefined);assert.equal(ctx.LIVE_STORE.games[b.id].as,undefined,'Late response must never write scores into newly selected game');
 console.log('Wrong-game source rejected; unrelated discovery fallback removed; contaminated cache cleared; late response cannot change another game.');
})().catch(e=>{console.error(e);process.exitCode=1});
