const assert=require('node:assert/strict'),fs=require('node:fs');
global.AdvantageModel=require('../advantage-model');global.TEAMS=require('../data/usports-teams.json');global.GAMES=require('../data/national-schedule-usports.json').games;global.FootballTiebreaks=require('../playoff-tiebreaks');global.PostseasonStatus=require('../postseason-status');global.AWM_DATA={USPORTS:require('../data/advantage-usports.json')};global.SEASON_WATCH=require('../data/season-watch.json');require('../season-watch');
const w=SEASON_WATCH.USPORTS,d=AWM_DATA.USPORTS,ranked=SeasonWatch.contenders('USPORTS',d,w),p=SeasonWatch.awardProbabilities(w,ranked,GAMES),status=PostseasonStatus.current(),t=SeasonWatch.vanierProbabilities(d,ranked,GAMES,TEAMS,status);
assert(w.regularSeasonOnly);const ids=new Set(w.regularSeasonGameIds);
for(const g of GAMES.filter(PostseasonStatus.isPlayoff))assert(!ids.has(g.id));
for(const candidate of w.eligiblePlayers){assert(candidate.games<=8);assert(candidate.sources.every(s=>!/2026-27p\//.test(s)));}
assert(Math.abs(p.reduce((sum,r)=>sum+r.winProbability,0)-1)<1e-12);
assert(Math.abs(t.reduce((sum,r)=>sum+r.winProbability,0)-1)<1e-12);
for(const id of ['calgary','alberta','bishops','sherbrooke','mountallison','guelph','laurier','mcmaster'])assert.equal(t.find(r=>r.id===id).winProbability,0);
const playoff={date:'2026-11-07',status:'final',postseason:true,away:'windsor',home:'western',awayScore:3,homeScore:70};
assert.deepEqual(SeasonWatch.awardProbabilities(w,ranked,[...GAMES,playoff]),p,'Postseason results cannot change Hec estimates');
const html=SeasonWatch.render('USPORTS');assert.equal((html.match(/Real contender/g)||[]).length,t.filter(r=>r.winProbability>.18).length);assert.equal(html.includes('Expected Hec Crighton winner'),p[0].winProbability>.6);assert(!/Watch score|formula|how it works|Why this team|Model rating/.test(html));
const original=w.eligiblePlayers;w.eligiblePlayers=[original[0]];assert.match(SeasonWatch.render('USPORTS'),/Expected Hec Crighton winner/);w.eligiblePlayers=original;
const slate=GAMES.filter(g=>g.date==='2026-11-07');assert.equal(slate.length,7);assert.equal(slate.filter(g=>g.conference==='CW').length,2);assert(slate.every(PostseasonStatus.isPlayoff));
const core=fs.readFileSync('game-centre-core.js','utf8');assert.match(core,/"2026-11-02","2026-11-08"/);assert.match(core,/"Vanier Cup","NOV 28"/);
console.log('PASS: regular-season Hec cutoff, probability totals, exact labels, eliminated teams, seven playoff fixtures and postseason calendar');
