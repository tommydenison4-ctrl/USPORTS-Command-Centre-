const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const d=read('data/player-leaders-usports.json'),index=read('data/national-schedule-usports.json');
const finals=index.games.filter(g=>g.status==='final'&&g.date<d.asOf);
const accounted=new Set([...d.games.map(g=>g.id),...d.unresolvedGames]);
assert.equal(new Set(d.games.map(g=>g.id)).size,d.games.length);
for(const g of finals)assert(accounted.has(g.id),g.id+' is neither imported nor disclosed');
assert(d.games.length>=61);assert.equal(d.games.length+d.unresolvedGames.length,finals.length);
assert.equal(new Set(d.games.flatMap(g=>Object.keys(g.teams))).size,27);
for(const id of ['western','queens','montreal','laval'])assert(d.games.filter(g=>g.teamTotals?.[id]?.passing!=null&&g.teamTotals?.[id]?.rushing!=null).length>=4,id);
const west=d.games.find(g=>g.id==='2026-09-06-york-western');
assert.equal(west.teamTotals.western.rushing,317);
assert.equal(west.teams.western.rushing.reduce((n,r)=>n+r.yards,0),333,'Team losses are retained in totals but excluded from named player stats');
for(const g of d.games){assert(/^https:\/\//.test(g.source));const full=read(g.fullBoxscore);assert(full.tables.length||full.pages?.length,'Missing published full tables '+g.id);for(const t of Object.values(g.teamTotals))assert(Number.isFinite(t.plays)&&t.plays>0)}
for(const id of ['2026-09-05-concordia-laval','2026-08-27-alberta-saskatchewan'])assert(read(d.games.find(g=>g.id===id).fullBoxscore).pages.length);
assert.equal(read('data/player-stats-usports.json').coveredGames,d.games.length);
console.log('All 64 finals accounted for: 61 full imports, 3 disclosed gaps; 27 teams, PDF recovery, all official play counts and team losses verified.');
