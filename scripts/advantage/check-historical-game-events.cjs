const assert=require('node:assert/strict'),E=require('../../internal/historical-game-events.cjs'),H=require('../../internal/live-history.cjs');
const record=require('../../data/boxscores/2026-10-03-guelph-toronto.json'),forecast=H.prior(record.id),prior={p:forecast.home_win_prob,lockedAt:forecast.lockedAt,x:0};
const chart=E.reconstruct(record,prior,H.point);assert.equal(chart.coverage,'play-by-play');assert.equal(chart.points[0].p,forecast.home_win_prob);assert.equal(chart.points.at(-1).p,0);assert.equal(chart.points.at(-1).awayScore,46);
const fg=chart.points.find(p=>p.description?.includes('field goal attempt from 23 GOOD'));assert.equal(fg.x,1112,'Drive began in Q1 but field goal occurred Q2 11:28');assert.equal(fg.awayScore,24);
const td=chart.points.find(p=>p.description?.includes('Jordan Buick')&&p.kind==='score');assert.equal(td.x,2713,'Drive crossing Q3/Q4 is placed in Q4');
assert.ok(chart.points.some(p=>p.kind==='turnover'&&p.description.includes('intercepted')));
assert.ok(!chart.points.some(p=>p.description?.includes('TOUCHDOWN, PENALTY GUE')));
for(let i=1;i<chart.points.length;i++){assert.ok(chart.points[i].x>=chart.points[i-1].x);assert.ok(chart.points[i].p>=0&&chart.points[i].p<=1);}
assert.equal(E.reconstruct({...record,awayScore:47},prior,H.point),null,'No fabricated curve when scores disagree');
assert.equal(E.reconstruct(record,{...prior,lockedAt:'2026-10-04'},H.point),null,'No forecast from after the game');
const panda=require('../../data/boxscores/2026-10-04-carleton-ottawa.json'),pp=H.prior(panda.id),pc=E.reconstruct(panda,{p:pp.home_win_prob,x:0},H.point);assert.equal(pc.coverage,'scoring-only');assert.equal(pc.points.find(p=>p.awayScore===24).x,2860,'Quarter totals corroborate the mislabeled Q4 scoring row');
const broken=require('../../data/boxscores/2026-10-03-laurier-waterloo.json');assert.equal(E.reconstruct(broken,{p:.5,x:0},H.point),null,'Conflicting line score is not silently reconciled');
console.log('PASS: verified scores, quarter boundaries, turnovers, nullified plays, missing data, forecast timing and scoring-only fallback');
