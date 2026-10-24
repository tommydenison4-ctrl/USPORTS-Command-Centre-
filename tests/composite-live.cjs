const {test}=require('node:test'),assert=require('node:assert/strict'),{parseLive}=require('../api/scoreboard');
const row=(label='1st 6:37',away='7',home='0')=>`<div class="event-row"><div class="list-events-participants"><span class="team-name">Toronto</span><span class="team-result">${away}</span></div><div class="list-events-participants"><span class="team-name">Carleton</span><span class="team-result">${home}</span></div><span class="cal-status">${label}</span></div>`;
test('official composite requires an explicit live status and numeric team totals',()=>{
 const parse=s=>parseLive(s,'2026-10-24','https://oua.ca/sports/fball/2026-27/schedule');
 const g=parse(row())[0];assert.equal(g.awayScore,7);assert.equal(g.homeScore,0);assert.equal(g.period,'Q1');assert.equal(g.clock,'6:37');assert.equal(g.id,'2026-10-24-toronto-carleton');
 for(const label of ['Final','1:00 PM EDT','Scheduled','Postponed'])assert.equal(parse(row(label)).length,0,label);
 assert.equal(parse(row('LIVE','','')).length,0);assert.equal(parse(row('HALFTIME'))[0].period,'HALFTIME');
});
