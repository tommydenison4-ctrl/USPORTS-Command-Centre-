const assert = require('node:assert/strict');
const { rank, compare } = require('../playoff-tiebreaks.js');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS', name); }
let gameId = 0;
const game = (away, home, a, h, extra = {}) => ({ id: String(++gameId), away, home, result: a == null ? null : { away: a, home: h }, ...(a == null ? { scenario: true, pick: { winner: away } } : {}), ...extra });
function records(slugs, games) {
 const out = Object.fromEntries(slugs.map(slug => [slug, { slug, w: 0, l: 0, gp: 0, pf: 0, pa: 0 }]));
 for (const g of games) { const a = out[g.away], h = out[g.home]; a.gp++; h.gp++; const win = g.scenario ? g.pick.winner : g.result.away > g.result.home ? g.away : g.home; out[win].w++; out[win === g.away ? g.home : g.away].l++; }
 return out;
}
const fixed = (...rows) => Object.fromEntries(rows.map(([slug, w, gp = 8]) => [slug, { slug, w, l: gp - w, gp }]));
const order = r => r.rows.map(r => r.slug);
const group = (r, ids) => order(r).filter(s => ids.includes(s));
test('Exact rational comparisons and zero denominators', () => {
 assert.equal(compare({n:1,d:3},{n:2,d:6}),0);
 assert.equal(compare({n:1,d:0},{n:999,d:1}),1);
 assert.equal(compare({n:3,d:0},{n:4,d:0}),0);
});
test('OUA skips inapplicable head-to-head and uses common opponents', () => {
 const r = rank('OUA',fixed(['a',4],['b',4],['x',7]),[game('a','x',20,10),game('b','x',10,20)]);
 assert.deepEqual(group(r,['a','b']),['a','b']); assert.equal(r.unresolvedTies,false);
 assert(r.decisions.some(d=>d.label==='Record against common opponents'));
});
test('OUA caps each game independently at 25 points', () => {
 const games=[game('a','b',60,0),game('b','c',20,0),game('c','a',10,0)];
 const r=rank('OUA',records(['a','b','c'],games),games);
 assert.deepEqual(order(r),['a','b','c']); assert.equal(r.decisions[0].values.a,'15');
});
test('OUA restarts with head-to-head after separating a team', () => {
 const games=[game('a','b',25,0),game('b','c',20,0),game('c','a',15,0)];
 const r=rank('OUA',records(['a','b','c'],games),games);
 assert.deepEqual(order(r),['a','b','c']);assert.equal(r.decisions.at(-1).label,'Head-to-head record');
});
test('OUA re-adds removed teams to common-opponent calculations', () => {
 const games=[game('a','b',20,10),game('c','a',20,10),game('a','x',20,10),game('b','x',10,20),game('c','x',10,20)];
 const r=rank('OUA',fixed(['a',4],['b',4],['c',4],['x',7]),games);
 assert.deepEqual(group(r,['a','b','c']),['a','c','b']);assert.equal(r.unresolvedTies,false);
});
test('OUA independently resolves ranked opponent ties', () => {
 const games=[game('x','y',20,10),game('a','x',10,20),game('b','x',20,10),game('a','y',20,10),game('b','y',10,20)];
 const r=rank('OUA',fixed(['a',4],['b',4],['x',7],['y',7]),games);
 assert.deepEqual(order(r),['x','y','b','a']);assert.equal(r.unresolvedTies,false);
});
test('OUA examines ranked opponents beyond the third', () => {
 const games=[game('a','b',10,0),game('b','a',10,0)];
 for(let n=1;n<=5;n++){games.push(game('a','x'+n,n===4?20:10,0));games.push(game('b','x'+n,n===5?20:10,0));}
 const r=rank('OUA',fixed(['a',6,7],['b',6,7],...Array.from({length:5},(_,i)=>['x'+(i+1),12-i,15])),games);
 assert.deepEqual(group(r,['a','b']),['a','b']);assert(r.decisions.some(d=>d.label.includes('x4')));
});
test('OUA actual records use percentages, not raw wins, with uneven comparison games', () => {
 const games=[game('a','x',20,10),game('a','x',20,10),game('a','x',10,20),game('b','x',20,10)];
 const r=rank('OUA',fixed(['a',4],['b',4],['x',7]),games);
 assert.deepEqual(group(r,['a','b']),['b','a']);
});
test('CW uses season differential after split head-to-head games', () => {
 const games=[game('a','b',20,10),game('b','a',20,10),game('a','x',40,10),game('b','x',20,10)];
 const r=rank('CW',fixed(['a',4],['b',4],['x',1]),games);
 assert.deepEqual(group(r,['a','b']),['a','b']);assert.equal(r.decisions[0].label,'Season point difference');
});
test('CW stops at the official coin toss instead of inventing points-allowed criteria', () => {
 const games=[game('a','b',20,10),game('b','a',20,10),game('a','x',10,0),game('b','x',100,90)];
 const r=rank('CW',fixed(['a',4],['b',4],['x',1]),games);
 assert.equal(r.unresolvedTies,true);assert.equal(r.issues[0].type,'draw');
});
test('CW selects the top team then restarts for the final pair', () => {
 const games=[game('a','b',30,0),game('b','c',10,0),game('c','a',15,0)];
 const r=rank('CW',records(['a','b','c'],games),games);
 assert.deepEqual(order(r),['a','b','c']); // A +15 is first; B beats C when the two-team sequence restarts.
});
test('AUS uses points ratio rather than point difference for a circular tie', () => {
 const games=[game('a','b',100,70),game('b','c',40,0),game('c','a',200,190)];
 const r=rank('AUS',records(['a','b','c'],games),games);
 assert.deepEqual(order(r),['b','c','a']);assert.equal(r.decisions[0].label,'Head-to-head points for/against ratio');
});
test('AUS uses season quotient rather than season net points', () => {
 const games=[game('a','b',20,10),game('b','a',20,10),game('a','x',30,0),game('b','x',90,50)];
 const r=rank('AUS',fixed(['a',4],['b',4],['x',1]),games);
 assert.deepEqual(group(r,['a','b']),['a','b']);assert.equal(r.decisions[0].label,'Season points for/against ratio');
});
test('RSEQ head-to-head standings points are a total, not a percentage', () => {
 const games=[game('a','b',20,10),game('b','a',20,10),game('b','c',20,10),game('c','b',20,10)];
 const r=rank('RSEQ',fixed(['a',2,4],['b',4,8],['c',2,4]),games);
 assert.equal(order(r)[0],'b');assert.equal(r.decisions[0].label,'Head-to-head standings points');
});
test('RSEQ excludes forfeits from point calculations', () => {
 const games=[game('a','b',100,0,{forfeit:true}),game('b','a',20,10)];
 const r=rank('RSEQ',records(['a','b'],games),games);
 assert.deepEqual(order(r),['b','a']);assert.equal(r.decisions[0].values.b,'20/10');
});
test('RSEQ coefficient standings skip season points against globally', () => {
 const games=[game('a','b',10,0),game('b','a',10,0),game('a','x',20,10),game('b','x',100,30)];
 const r=rank('RSEQ',records(['a','b','x'],games),games);
 assert(r.coefficient);assert.deepEqual(group(r,['a','b']),['b','a']);assert.equal(r.decisions[0].label,'Season points for/against ratio');
});
test('RSEQ restarts the sequence for remaining equal teams', () => {
 const games=[game('a','b',25,0),game('b','c',20,0),game('c','a',15,0)];
 const r=rank('RSEQ',records(['a','b','c'],games),games);
 assert.equal(order(r)[0],'a');assert.equal(r.unresolvedTies,false);
});
test('Decisive win records need no speculative scores', () => {
 for(const conf of ['OUA','CW','AUS','RSEQ']){
  const r=rank(conf,fixed(['a',4],['b',4]),[game('a','b',null,null)]);
  assert.deepEqual(order(r),['a','b']);assert.equal(r.unresolvedTies,false);
 }
});
test('Missing scores block only the next required criterion and identify exact games', () => {
 const first=game('a','b',null,null), second=game('b','a',10,0), other=game('x','y',null,null);
 for(const conf of ['OUA','CW','AUS','RSEQ']){
  const r=rank(conf,fixed(['a',4],['b',4],['x',7],['y',1]),[first,second,other]);
  assert.equal(r.issues[0].type,'scores');assert.deepEqual(r.issues[0].games,[first.id]);
 }
});
test('Three-team statistics never include games a team did not play', () => {
 const games=[game('a','b',25,0),game('b','c',20,0),game('c','a',15,0),game('x','y',500,0)];
 const r=rank('OUA',fixed(['a',4],['b',4],['c',4],['x',7],['y',0]),games);
 assert.deepEqual(group(r,['a','b','c']),['a','b','c']);assert.equal(r.decisions[0].values.a,'10');
});
test('CW does not invent a multi-team coin-toss rule', () => {
 const games=[game('a','b',10,0),game('b','c',10,0),game('c','a',10,0)];
 const r=rank('CW',records(['a','b','c'],games),games);
 assert.equal(r.issues[0].label,'Canada West conference decision for an exact multi-team tie');
});
test('Final draw orders are explicit, complete and marked simulated', () => {
 const games=[game('a','b',10,0),game('b','a',10,0)];
 for(const conf of ['OUA','CW','AUS','RSEQ']){
  const rec=records(['a','b'],games), raw=rank(conf,rec,games);
  assert.equal(raw.issues[0].type,'draw');
  const r=rank(conf,rec,games,{'a|b':['b','a']});
  assert.deepEqual(order(r),['b','a']);assert.equal(r.unresolvedTies,false);assert(r.decisions.at(-1).simulated);
  assert.equal(rank(conf,rec,games,{'a|b':['a','a']}).unresolvedTies,true);
 }
});
test('Ranking is independent of team and game input order', () => {
 let seed=42;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const conf of ['OUA','CW','AUS','RSEQ'])for(let run=0;run<100;run++){
  const ids=['a','b','c','d','e','f'],games=[];
  for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){let as=Math.floor(random()*50),hs=Math.floor(random()*50);if(as===hs)as++;games.push(game(ids[a],ids[b],as,hs));}
  const rec=records(ids,games),r=rank(conf,rec,games),reverse=rank(conf,Object.fromEntries(Object.entries(rec).reverse()),games.slice().reverse());
  assert.deepEqual(order(r),order(reverse));assert.deepEqual(r.unresolvedGroups,reverse.unresolvedGroups);
  assert(!r.issues.some(i=>i.type==='scores'||i.type==='comparison'));
 }
});
console.log(`${count} test groups passed (including 400 generated conference seasons).`);
