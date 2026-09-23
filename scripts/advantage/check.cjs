const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'../..'),A=require(path.join(root,'advantage-model.js'));
for(const league of JSON.parse(fs.readFileSync(path.join(root,'data/advantage-leagues.json')))){
 const d=JSON.parse(fs.readFileSync(path.join(root,`data/advantage-${league.toLowerCase()}.json`)));
 const games=league==='USPORTS'?JSON.parse(fs.readFileSync(path.join(root,'data/advantage-schedule-usports.json'))):d.schedule;
 let count=0;for(const g of games){const p=A.project(d,g);if(!p.available)continue;count++;assert(p.home_win_prob>=0&&p.home_win_prob<=1);assert.deepEqual(A.project(d,{...g,market:{home_margin:99}}),p);assert(!A.card(p,true,d).includes('NaN'));}
 assert(count>0);assert(d.model.trainedThrough<d.model.report.testStart);console.log(league,count,'grounded forecasts checked');
}
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(m[2].trim()&&!/application\/(json|ld\+json)/.test(m[1]))new vm.Script(m[2]);
console.log('Inline scripts and forecast invariants passed');
