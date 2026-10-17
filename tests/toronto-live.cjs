const assert=require('node:assert/strict'),{normalize}=require('../internal/toronto-live.cjs');
const expected={date:'2026-10-17',away:'york',home:'toronto'};
const raw={Game:{Date:'10/17/2026',HasStarted:true,Period:3,ClockSeconds:615,VisitingTeam:{Id:'YRK',Score:21},HomeTeam:{Id:'TOR',Score:10}},FootballGame:{Context:{Possession:'VisitingTeam',Down:'2',ToGo:'7',Spot:'YRK45'}},Plays:[{Narrative:'First play',Period:2,ClockSeconds:10},{Narrative:'Latest play',Period:3,ClockSeconds:615}]};
const d=normalize(raw,expected);assert.equal(d.game.awayScore,21);assert.equal(d.status.clock,'10:15');assert.equal(d.status.period,'Q3');assert.equal(d.plays[0].description,'Latest play');assert.equal(d.situation.spot,'YRK45');assert.equal(d.situation.possession,'YRK');
assert.equal(normalize(raw,{...expected,date:'2026-10-24'}),null);assert.equal(normalize({...raw,Game:{...raw.Game,HomeTeam:{Id:'QUE'}}},expected),null);assert.equal(normalize(raw,{...expected,away:'western'}),null);
raw.Game.IsComplete=true;assert.equal(normalize(raw,expected).status.period,'FINAL');
console.log('PASS: official Toronto score, clock, plays, situation, final status and strict teams/date verification');
