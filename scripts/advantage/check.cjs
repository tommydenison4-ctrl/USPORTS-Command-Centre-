const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');const root=path.resolve(__dirname,'../..'),A=require(path.join(root,'advantage-model.js')),d=JSON.parse(fs.readFileSync(path.join(root,'data/advantage-usports.json'))),games=JSON.parse(fs.readFileSync(path.join(root,'data/advantage-schedule-usports.json'))).filter(g=>g.date>=d.asOf);
assert.equal(d.dataPolicy.season,2026);assert.equal(d.dataPolicy.trainingSeason,2026);assert(d.model.trainingDates.every(x=>x.startsWith('2026-')));assert(Object.values(d.profiles).every(p=>p.season===2026&&p.lastGame.startsWith('2026-')));if(d.model.provisional){assert.equal(d.model.report,null);assert.equal(d.model.marginInterval80,null);}
let count=0;for(const g of games){const p=A.project(d,g);if(!p.available)continue;count++;if(d.model.provisional){assert(p.confidence.includes('2026 only'));assert.equal(p.marginInterval,null);}assert.deepEqual(A.project(d,{...g,market:{home_margin:99}}),p);assert(!A.card(p,true,d).includes('NaN'));}
assert(count>0);const g={...games.find(g=>g.status==='scheduled'&&g.date>d.asOf&&A.project(d,{...g,id:''}).available),id:'test-unlocked-forecast'};assert(!A.project({...d,dataPolicy:{season:2025}},g).available);assert(!A.project(d,{...g,away:'not-a-verified-team'}).available);assert.equal(A.project({...d,frozen:{[g.id]:{available:true,league:'USPORTS',date:g.date,modelVersion:'AWM-V3-reconstructed-1',home_win_prob:1}}},g).modelVersion,A.project(d,g).modelVersion);
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(m[2].trim()&&!/application\/(json|ld\+json)/.test(m[1]))new vm.Script(m[2]);console.log(JSON.stringify({games:games.length,provisionalPredictions:count,unavailable:games.length-count,trainingGames:d.model.trainingGames,seasonGuard:'passed',marketExclusion:'passed',oldForecastRejection:'passed'}));
const national=JSON.parse(fs.readFileSync(path.join(root,'data/national-schedule-usports.json'))).games;
const finals=national.filter(g=>g.status==='final'&&!g.exhibition&&g.date<=d.asOf);
assert.equal(d.coverage.resultGames,finals.length);
for(const p of Object.values(d.profiles)){
 const rows=finals.filter(g=>[g.away,g.home].some(s=>A.canonical(s)===A.canonical(p.id)));
 assert.equal(p.resultGames,rows.length,p.name+' all results counted');
 const own=g=>A.canonical(g.home)===A.canonical(p.id)?'home':'away';
 assert(Math.abs(p.pf-rows.reduce((n,g)=>n+g[own(g)+'Score'],0)/rows.length)<1e-9);
 assert(Math.abs(p.pa-rows.reduce((n,g)=>n+g[(own(g)==='home'?'away':'home')+'Score'],0)/rows.length)<1e-9);
}
assert(d.profiles.laval.resultGames>=4&&d.profiles.montreal.resultGames>=4&&d.profiles.mcgill.resultGames>=4);
console.log('Every national regular-season final contributes to result profiles; missing gamebooks and exhibitions cannot bias result counts');
