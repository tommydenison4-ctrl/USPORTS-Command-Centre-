const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../playoff-projections.js'),'utf8');
const FootballTiebreaks=require('../playoff-tiebreaks.js');
const key='canufootball:playoff-projections:v1';
function app(games,picks={},draws={}){
 const slugs=[...new Set(games.flatMap(g=>[g.away,g.home]))],teams=slugs.map(slug=>({slug,conference:'CW'}));
 const data={[key]:JSON.stringify({CW:picks}),[key+':draws']:JSON.stringify(draws)};
 const window={FootballTiebreaks,shell:x=>x,route(){},addEventListener(){}};
 const context={window,document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>data[k],setItem:(k,v)=>data[k]=v},TEAMS:teams,TEAM:{},GAMES:games,location:{hash:''},setTimeout(){}};
 vm.runInNewContext(source,context);return window.PlayoffProjectionCore;
}
const future={id:'future',conference:'CW',away:'a',home:'b',date:'2099-01-01',status:'scheduled'};
for(const scores of [[-1,20],[1.5,20],[20,20],[' ',20]]){
 const core=app([future],{future:{winner:'a',awayScore:scores[0],homeScore:scores[1]}});
 assert.equal(core.recordsFor('CW').a.gp,0,'Invalid final scores must not become a played game');
}
let core=app([future],{future:{winner:'a',awayScore:10,homeScore:20}});
assert.equal(core.recordsFor('CW').b.w,1,'Entered valid scores take precedence over a stale persisted winner');
core=app([future],{future:{winner:'a',awayScore:'',homeScore:''}});
assert.equal(core.recordsFor('CW').a.w,1,'Winner-only choices still count toward records');
core=app([{...future,status:'final',awayScore:null,homeScore:20}]);
assert.equal(core.recordsFor('CW').a.gp,0,'A null official score is not zero');
core=app([{...future,date:'2000-01-01'}]);
assert.equal(core.remainingGames('CW').length,1,'Missing past results remain available for scenario entry');
const finals=[{...future,id:'one',status:'final',awayScore:10,homeScore:0},{...future,id:'two',status:'final',away:'b',home:'a',awayScore:10,homeScore:0}];
const signature=JSON.stringify(finals.map(g=>[g.id,{away:g.awayScore,home:g.homeScore},null,false,false]));
core=app(finals,{}, {CW:{signature,orders:{'a|b':['b','a']}}});
assert.equal(core.rankedRows('CW').rows[0].slug,'b');
assert.equal(core.rankedRows('CW').unresolvedTies,false);
core=app(finals,{}, {CW:{signature:'stale',orders:{'a|b':['b','a']}}});
assert.equal(core.rankedRows('CW').unresolvedTies,true,'Saved draw choices must match the exact current results');
console.log('PASS projection input validation, score-derived winners, missing finals, old games, and draw invalidation');
