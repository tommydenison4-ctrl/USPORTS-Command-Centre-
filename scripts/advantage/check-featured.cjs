const assert=require('assert'),F=require('../../featured-matchup.js'),fs=require('fs');
const schools={a:{},b:{},c:{},d:{},e:{},f:{}};
const finals=(a,h,as,hs)=>({id:a+h,date:'2026-09-01',away:a,home:h,status:'final',awayScore:as,homeScore:hs});
const upcoming=(id,a,h,date='2026-10-03')=>({id,date,away:a,home:h,status:'scheduled',time:'1:00 PM EDT'});
const games=[finals('a','e',10,0),finals('b','e',10,0),finals('c','f',10,0),finals('c','d',0,10),{...finals('e','a',50,0),exhibition:true},upcoming('strong','a','b'),upcoming('weak','a','c'),upcoming('later','a','d','2026-10-10'),{...upcoming('cancel','a','d'),status:'cancelled'}];
assert.equal(F.select(games,schools,'2026-10-03').game.id,'strong');assert.equal(F.select(games,schools,'2026-10-03').away.w,1);assert.equal(F.select(games,schools,'2026-10-11'),null);
assert.equal(F.select([...games,{...upcoming('finished','a','b'),status:'final',awayScore:0,homeScore:0}],schools,'2026-10-03').game.id,'strong');
const indexed=JSON.parse(fs.readFileSync('data/national-schedule-usports.json')).games,teams=Object.fromEntries(JSON.parse(fs.readFileSync('data/usports-teams.json')).map(t=>[t.slug,t]));const pick=F.select(indexed,teams,'2026-10-03');assert(pick);assert.equal(pick.game.date,'2026-10-03');console.log('Featured next-slate selection, stronger opponent records, exhibitions, cancelled games and season-end fallback passed:',pick.game.id,pick.away,pick.home);
