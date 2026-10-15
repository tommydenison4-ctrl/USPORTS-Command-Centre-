const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const data=require('../data/game-previews.json'),schedule=require('../data/national-schedule-usports.json');
const context={window:{},URL};vm.createContext(context);
for(const f of ['game-previews-data.js','game-previews.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
const render=context.window.USGamePreviews.card;
const upcoming=schedule.games.filter(g=>g.date>=data.asOf&&g.status==='scheduled'&&!g.pendingParticipants&&!g.exhibition);
assert.equal(data.games.length,upcoming.length);assert.deepEqual([...new Set(data.games.map(g=>g.conference))].sort(),['AUS','CW','OUA','RSEQ']);
for(const g of upcoming){const p=data.games.find(p=>p.id===g.id);assert.ok(p);assert.ok(p.asOf<=g.date);const html=render(g);assert.ok(html.includes('data-preview-game="'+g.id+'"'));assert.ok(p.sources.every(s=>s.url.startsWith('https://')));assert.ok(p.paragraphs.join(' ').split(/\s+/).length>=250);for(const status of ['final','live','cancelled','postponed'])assert.equal(render({...g,status}), '');assert.equal(render({...g,home:'wrong'}),'');}
assert.equal(render({...upcoming[0],pendingParticipants:true}),'');
context.window.AWM_DATA={USPORTS:{}};context.window.AdvantageModel={project:()=>({available:false}),card:()=>'<section>Forecast</section>',esc:s=>s,live:()=>null};context.TEAM={};context.LIVE_STORE={games:{}};context.document={readyState:'loading',addEventListener(){},querySelectorAll(){return []}};context.setInterval=()=>{};context.window.addEventListener=()=>{};context.fetch=async()=>({ok:false});
vm.runInContext(fs.readFileSync('usports-awm.js','utf8'),context);
const g=upcoming[0];assert.ok(context.window.US_AWM.panel(g).includes('class="pregame-main"><article'));
const live=context.window.US_AWM.panel(g,{status:{period:'Q1',clock:'12:00'},game:{awayScore:0,homeScore:0}});assert.ok(live.includes('data-game-state="live"'));assert.ok(!live.includes('game-preview'));
assert.ok(!context.window.US_AWM.panel({...g,status:'final'},{status:{period:'Final'},game:{awayScore:20,homeScore:21}}).includes('game-preview'));
console.log('PASS: all '+upcoming.length+' previews; four conferences; source URLs; 250+ words; matchup guards; real pregame/live/final transitions.');
