const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),A=require(path.join(root,'advantage-model.js')),S=require(path.join(root,'national-schedule.js'));
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const d=read('data/advantage-usports.json'),schedule=read('data/advantage-schedule-usports.json'),teams=read('data/usports-teams.json');
const ctx={window:{AWM_DATA:{USPORTS:d},AdvantageModel:A},document:{readyState:'loading',visibilityState:'hidden',addEventListener(){}},setInterval(){}};
vm.runInNewContext(fs.readFileSync(path.join(root,'usports-awm.js'),'utf8'),ctx);
assert.equal(new Set(schedule.map(g=>g.id)).size,schedule.length);
assert.equal(teams.length,27);
for(const t of teams){assert(A.team(d,t.slug),'Missing profile: '+t.slug);assert.equal(A.team(d,t.short).id,A.team(d,t.slug).id);assert.equal(A.team(d,t.name).id,A.team(d,t.slug).id);}
const counts={};
for(const g of schedule.filter(g=>g.date>=d.asOf&&g.status==='scheduled')){
 const p=A.project(d,g);assert(p.available,`${g.id}: ${p.reason}`);assert(p.home_win_prob>=0&&p.home_win_prob<=1);
 assert.equal(JSON.stringify(ctx.window.US_AWM.forecast(g)),JSON.stringify(p));
 assert(!ctx.window.US_AWM.card(g).includes('NaN'));counts[g.conference]=(counts[g.conference]||0)+1;
 const {id,...hypothetical}=g;const fresh=A.project(d,hypothetical);assert(fresh.available);assert.equal(fresh.home_win_prob,A.project({...d,frozen:{}},g).home_win_prob);
 if(d.frozen[id])assert.equal(p.home_win_prob,d.frozen[id].home_win_prob);
 assert.equal(A.project(d,{...g,conference:'ANY'}).home_win_prob,p.home_win_prob);
}
assert(['OUA','RSEQ','AUS','CW'].every(c=>counts[c]>0));
const old={id:'same',status:'final',awayScore:0,homeScore:17,venue:'Original stadium',liveId:'keep'};
const merged=S.merge([old,{id:'removed'}],{games:[{id:'same',awayScore:null,homeScore:null,status:'scheduled',venue:''}]});
assert.equal(merged.length,1);assert.equal(merged[0].awayScore,0);assert.equal(merged[0].status,'final');assert.equal(merged[0].liveId,'keep');assert.equal(merged[0].venue,'Original stadium');
assert.deepEqual(S.merge([old],null),[old]);
console.log(JSON.stringify({profiles:teams.length,scheduledPredictions:counts,sharedModel:'passed',finalPreservation:'passed'}));
