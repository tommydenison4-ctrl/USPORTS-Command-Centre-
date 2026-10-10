const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('live-gamecast.js','utf8'),ctx={};vm.runInNewContext(src.match(/  function liveEvent\([\s\S]*?(?=  function recordEvent)/)[0],ctx);
vm.runInNewContext(src.match(/  function eventKind[^\n]+/)[0],ctx);
const data=(text,as=0,hs=0)=>({plays:[{description:text}],game:{awayScore:as,homeScore:hs},status:{period:'Q2'},situation:{possession:'home'}});
assert.equal(ctx.liveEvent({away:0,home:0},data('Touchdown',7)),'SCORE UPDATE');
assert.equal(ctx.liveEvent(null,data('Pass intercepted')),'TURNOVER — INTERCEPTION');
assert.equal(ctx.liveEvent(null,data('Pass intercepted, play reversed')),'');
assert.equal(ctx.liveEvent({pos:'home'},data('Fumble recovered by home')),'');
assert.equal(ctx.liveEvent({pos:'away'},data('Fumble recovered by home')),'TURNOVER — FUMBLE');
assert.equal(ctx.liveEvent(null,data('Sacked')),'');
assert.equal(ctx.liveEvent(null,data('Rush'),true),'RED ZONE');
const final=data('Touchdown',7);final.status.period='FINAL';assert.equal(ctx.liveEvent({away:0,home:0},final),'');
console.log('Score changes, red zone, confirmed turnovers, reversals and finals classified correctly');

vm.runInNewContext(src.match(/  function trailTransition\([\s\S]*?(?=  function recordEvent)/)[0],ctx);
const before={id:'game-a',poss:'away',key:'p1',x:30},after={id:'game-a',poss:'away',key:'p2',x:45};
assert.equal(ctx.trailTransition(before,after,'pass complete for 20 yards'),true);
assert.equal(ctx.trailTransition(before,{...after,x:20},'rush for loss of 10 yards'),true);
for(const next of [{...after,id:'game-b'},{...after,poss:'home'},{...after,key:'p1'}])assert.equal(ctx.trailTransition(before,next,'rush for 20 yards'),false);
assert.equal(ctx.trailTransition(before,after,'pass intercepted'),false);
assert.equal(ctx.trailTransition(before,after,'pass complete no play'),false);
console.log('Run/pass trails preserve direction and reject game changes, possession changes, repeated and reversed plays');
ctx.GAMES=[{id:'one',date:'2026-10-09',away:'a',home:'b'},{id:'two',date:'2026-10-09',away:'c',home:'d'},{id:'three',date:'2026-10-09',away:'e',home:'f'}];ctx.game=id=>ctx.GAMES.find(g=>g.id===id);ctx.team=id=>({abbr:id.toUpperCase()});ctx.esc2=String;ctx.validIdentity=(g,d)=>d.identity?.gameId===g.id;ctx.possSlug=(g,d)=>d.situation.possession;ctx.liveEvents=new Map([['two',{label:'TURNOVER'}]]);ctx.LIVE_STORE={games:{two:{_realLive:true,_feedIdentity:{gameId:'two'},pos:'c',q:'Q2',as:7,hs:3,down:2,distance:4},three:{_realLive:true,_feedIdentity:{gameId:'WRONG'},pos:'e',as:99,hs:99}}};
vm.runInNewContext(src.match(/  function rail\([\s\S]*?(?=  const chartCache)/)[0],ctx);
ctx.L={selected:'one'};ctx.img=()=>'<img class="canu-chip-logo">';const rail=ctx.rail('one');assert.match(rail,/Possession/);assert.match(rail,/TURNOVER/);assert.match(rail,/canu-chip-score\">7/);assert.doesNotMatch(rail,/99/);
console.log('Top scoreboard uses each game’s own verified scores, possession and event');
vm.runInNewContext(src.match(/  function scoreboardWeek\([\s\S]*?(?=  function rail)/)[0],ctx);
assert.equal(ctx.scoreboardWeek('2026-10-10','2026-10-09'),true);
assert.equal(ctx.scoreboardWeek('2026-10-03','2026-10-09'),false);
assert.equal(ctx.scoreboardWeek('2026-10-12','2026-10-09'),false);
console.log('Shared scoreboard includes the full current week, including tomorrow’s games');

ctx.LIVE_STORE.games.two.q="PRE";assert.doesNotMatch(ctx.rail("one"),/aria-label="Possession"/,"Pregame feed must not imply an active live possession");

ctx.LIVE_STORE.games.two.q='Q2';
for(const [label,kind] of [['SCORE UPDATE','score'],['TURNOVER','turnover'],['RED ZONE','redzone']]){ctx.liveEvents.set('two',{label});assert.match(ctx.rail('one'),new RegExp('has-event event-'+kind));}
ctx.GAMES[1].status='final';assert.doesNotMatch(ctx.rail('one'),/has-event|RED ZONE/);
console.log('Scoreboard event colours distinguish scores, turnovers and red zone; finals clear alerts');

ctx.GAMES[1].status='live';ctx.LIVE_STORE.games.two.q='Q2';
assert.match(ctx.rail('one'),/canu-chip-situation">2nd & 4/);
for(const distance of [null,undefined,'',0,-1]){ctx.LIVE_STORE.games.two.distance=distance;assert.doesNotMatch(ctx.rail('one'),/canu-chip-situation/);}
ctx.LIVE_STORE.games.two.distance='Goal';assert.match(ctx.rail('one'),/2nd & Goal/);
ctx.GAMES[1].status='final';assert.doesNotMatch(ctx.rail('one'),/canu-chip-situation/);
console.log('Live scoreboard shows verified down and distance, hides missing situations and clears on final');

assert.equal(ctx.liveEvent(null,data('Turnover on downs')),'TURNOVER — ON DOWNS');
assert.equal(ctx.liveEvent(null,data('Fumble lost')),'TURNOVER — FUMBLE');
for(const label of ['TURNOVER — INTERCEPTION','TURNOVER — FUMBLE','TURNOVER — ON DOWNS']){assert.equal(ctx.eventKind(label),'turnover');}
console.log('Turnover alerts name interception, lost fumble and downs while retaining orange styling');
