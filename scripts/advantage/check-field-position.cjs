const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('live-gamecast.js','utf8'),g={id:'live',away:'windsor',home:'queens'},teams={windsor:{abbr:'WIN'},queens:{abbr:'QUE'}};
const ctx={norm:v=>String(v||'').toLowerCase(),aliases:s=>[s,teams[s].abbr].map(v=>v.toLowerCase()),isFinal:(g,d)=>g.status==='final'||d?.status?.period==='FINAL'};
vm.runInNewContext(src.slice(src.indexOf('  function feedAliases'),src.indexOf('  function downText')),ctx);
const snap={game:{awayId:'WIN',homeId:'QUE'},status:{period:'Q3'},situation:{spot:'WSR51',possession:'WSR',down:2,distance:4},playerStats:[{side:'away',team:'WSR'}]};
let x=ctx.fieldPosition(g,snap);assert.equal(x.coord,51);assert.equal(x.first,55);assert.equal(x.poss,'windsor');
x=ctx.fieldPosition(g,{...snap,situation:{spot:'QUE20',possession:'QUE',distance:10}});assert.equal(x.coord,90);assert.equal(x.first,80);assert.equal(x.poss,'queens');
x=ctx.fieldPosition(g,{...snap,situation:{spot:'WSR51',possession:'QUE',distance:10}});assert.equal(x.first,41,'possession decides direction independently of territory');
for(const spot of ['UNKNOWN20','WSR70','','WSR-5']){const d={...snap,situation:{...snap.situation,spot}};assert.equal(ctx.fieldPosition(g,d),null,spot);}
assert.equal(ctx.fieldPosition({...g,status:'final'},snap),null);assert.equal(ctx.fieldPosition(g,{...snap,situation:{...snap.situation,distance:null}}).first,null);
const R=require('../../play-ribbons.js');assert.equal(R.classify({description:'Andrew Delaney rush for 11 yards to the WSR51',down:2,distance:10}).label,'FIRST DOWN');assert.equal(R.classify({description:'Andrew Delaney rush for 11 yards to the WSR51',distance:15}),null);
for(const [description,label] of [['Rush for 15 yards','EXPLOSIVE PLAY'],['Pass complete for 20 yards','EXPLOSIVE PLAY'],['Pass intercepted','INTERCEPTION'],['Rush fumbled','FUMBLE'],['Field goal GOOD','FIELD GOAL'],['Field goal no good','MISSED FIELD GOAL']])assert.equal(R.classify({description}).label,label);
console.log('PASS: WSR/WIN field mapping, territory/possession direction, line to gain, unknown/final suppression and Presto first-down/major-event ribbons');
