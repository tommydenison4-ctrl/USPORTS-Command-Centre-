const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const page=require('../internal/presto-page-live.cjs'),handler=require('../api/presto-live');
const expected={date:'2026-10-24',away:'laurier',home:'western'};
const html=(score=0,pregame=false,final=false)=>`<script>conf.visitor='Laurier';conf.home='Western';conf.eventId='fixture';conf.eventIdHashCode='hash';conf.pregame=${pregame};conf.statusFinal=${final};</script><table><tr><th>Team</th><th>1</th><th>Total</th></tr><tr><td>Laurier</td><td>${score}</td><td>${score}</td></tr><tr><td>Western</td><td>0</td><td>0</td></tr></table>`;
test('HTML fallback needs official start/final and exact teams/date; zero is a score',()=>{
 const url='https://oua.ca/sports/fball/2026-27/boxscores/20261024_xmef.xml';
 assert.equal(page.normalize(html(0,true),expected,url),null);
 const d=page.normalize(html(),expected,url);assert.equal(d.game.awayScore,0);assert.equal(d.status.period,'LIVE');assert.equal(d.status.complete,false);assert.deepEqual(d.plays,[]);
 assert.equal(page.normalize(html(),{...expected,away:'toronto'},url),null);
 assert.equal(page.normalize(html(),{...expected,date:'2026-10-17'},url),null);
 assert.equal(page.normalize(html(7,false,true),expected,url).status.period,'FINAL');
});
test('real handler keeps scores refreshing when AJAX fails and never declares a live page final',async()=>{
 let score=0,ajax=0;const original=global.fetch;
 global.fetch=async url=>{if(String(url).includes('sidearmstats.com'))return {ok:false,status:503};const live=String(url).includes('/liveupdate');if(live)ajax++;return {ok:!live,status:live?403:200,headers:new Headers(),text:async()=>live?'Unavailable':html(score)}};
 const query={game:'2026-10-24-laurier-western',page:'https://oua.ca/sports/fball/2026-27/boxscores/20261024_xmef.xml',awayId:'WLU',homeId:'WES'};
 const request=()=>new Promise(async(resolve,reject)=>{try{await handler({method:'GET',query},{setHeader(){},end(body){resolve(JSON.parse(body))}})}catch(e){reject(e)}});
 try{for(const value of [0,7,14]){score=value;const r=await request();assert.equal(r.ok,true);assert.equal(r.data.game.awayScore,value);assert.equal(r.data.game.homeScore,0);assert.equal(r.data.status.complete,false);assert.equal(r.data.identity.gameId,query.game);}assert.equal(ajax,3);}finally{global.fetch=original;}
});
test('official host feed rejects stale and unrelated payloads',()=>{
 const {normalize,HOSTS}=require('../internal/host-live.cjs');assert.equal(HOSTS.western,'uwo');
 const raw={Game:{Date:'10/24/2026',HasStarted:true,IsComplete:false,Period:2,ClockSeconds:500,VisitingTeam:{Name:'Laurier',Id:'WLU',Score:7},HomeTeam:{Name:'Western',Id:'UWO',Score:3}}};
 assert.equal(normalize(raw,expected).game.awayScore,7);assert.equal(normalize(raw,{...expected,date:'2026-10-17'}),null);raw.Game.HomeTeam.Name='Western Colorado';raw.Game.HomeTeam.Id='WCU';assert.equal(normalize(raw,expected),null);
});
test('schedule gameCard renders final scores without crashing initialization',()=>{
 const s=fs.readFileSync(require.resolve('../index.html'),'utf8'),a=s.indexOf('gameCard=function(g){'),b=s.indexOf('\n',a),ctx={TEAM:{a:{},h:{}},mark:()=>'',esc:String,cl:String};vm.runInNewContext(s.slice(a,b),ctx);assert.match(ctx.gameCard({id:'g',away:'a',home:'h',status:'final',awayScore:0,homeScore:7}),/FINAL/);
});
