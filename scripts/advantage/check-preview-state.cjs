const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const p={available:true,home_win_prob:.6,away_win_prob:.4},g={id:'test',away:'a',home:'h',date:'2026-10-03'};
const context={AWM_BUNDLED:true,AWM_DATA:{USPORTS:{}},AdvantageModel:{project:()=>p,card:()=>'<forecast>',live:()=>null,esc:s=>s},USScoreSimulation:{card:()=>'<simulation>'},US_PlayerLeaders:{card:()=>'<leaders>'},US_PLAYER_DATA:{},LIVE_STORE:{games:{test:{as:0,hs:0,q:'PRE',_realLive:true}}},TEAM:{a:{short:'Away'},h:{short:'Home'}},document:{readyState:'complete'}};context.window=context;vm.runInNewContext(fs.readFileSync('usports-awm.js','utf8'),context);
assert.match(context.US_AWM.panel(g),/data-game-state="pregame"/);assert.match(context.US_AWM.panel(g),/<simulation>/);
const live=context.US_AWM.panel(g,{game:{awayScore:0,homeScore:0},status:{period:'Q1',clock:'15:00'}});assert.match(live,/data-game-state="live"/);assert.ok(!live.includes('<simulation>'));
assert.match(context.US_AWM.panel({...g,status:'final'}),/data-game-state="live"/);
console.log('PASS: PRE/0–0 preserves simulation despite stale live flag; verified kickoff and finals remove it.');
