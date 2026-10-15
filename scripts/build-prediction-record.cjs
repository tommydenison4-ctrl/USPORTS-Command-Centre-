const fs=require('node:fs'),path=require('node:path'),{kickoff}=require('../game-day'),scoring=require('../internal/prediction-score.cjs');
const slug=s=>({mountallison:'mount-allison',saintmarys:'saint-marys'}[s]||s);
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
function audit(schedule,ledger,archives,results,kickoffs={}){
 results=results.map(r=>({...r,away:slug(r.away),home:slug(r.home)}));
 const finals=new Map(results.map(r=>[r.date+'-'+r.away+'-'+r.home,r])),games=[];let unproven=0;
 for(const g of schedule){if(g.exhibition||g.pendingParticipants||['cancelled','canceled','postponed'].includes(g.status))continue;
  const p=ledger[g.id],end=kickoff({...g,time:g.time||kickoffs[g.id]?.time})?.getTime()||Date.parse(g.date+'T00:00:00Z');
  const valid=q=>q?.available&&q.modelVersion?.includes('2026')&&Number.isFinite(q.home_win_prob)&&q.home_win_prob>=0&&q.home_win_prob<=1;
  // Use the earliest dated, saved forecast. Never regenerate historical picks.
  // When an old game's kickoff is absent, require publication before its UTC date.
  const evidence=[];
  if(valid(p)&&Number.isFinite(Date.parse(p.lockedAt))&&Date.parse(p.lockedAt)<end)evidence.push({publishedAt:p.lockedAt,source:'data/pregame-predictions-usports.json',forecast:p});
  for(const archive of archives){if(!Number.isFinite(Date.parse(archive.createdAt))||Date.parse(archive.createdAt)>=end)continue;const q=(archive.predictions||[]).find(q=>q.gameId===g.id&&q.date===g.date&&valid(q));if(q)evidence.push({publishedAt:archive.createdAt,source:archive.source,forecast:q})}
  evidence.sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt));if(!evidence.length){if(valid(p))unproven++;continue}
  const selected=evidence[0],forecast=selected.forecast;if(forecast.home_win_prob===.5)continue;
  const pick=forecast.home_win_prob>.5?g.home:g.away;
  const r=finals.get(g.id),verified=!!r?.source&&Number.isFinite(r.awayScore)&&Number.isFinite(r.homeScore),tie=verified&&r.awayScore===r.homeScore,winner=verified&&!tie?(r.awayScore>r.homeScore?g.away:g.home):null;
  games.push({gameId:g.id,date:g.date,away:g.away,home:g.home,pick,probability:Math.max(forecast.home_win_prob,1-forecast.home_win_prob),publishedAt:selected.publishedAt,source:selected.source,status:verified?(tie?'tie':winner===pick?'correct':'incorrect'):'pending',winner,awayScore:verified?r.awayScore:null,homeScore:verified?r.homeScore:null,resultSource:verified?r.source:null});
 }
 games.sort((a,b)=>a.date.localeCompare(b.date)||a.gameId.localeCompare(b.gameId));
 const finalIds=new Set(games.filter(g=>g.status!=='pending').map(g=>g.gameId));
 return {games,firstPick:games[0]?.date||null,coverage:{unprovenForecasts:unproven,unscoredFinals:results.filter(r=>!finalIds.has(r.date+'-'+r.away+'-'+r.home)).length}};
}
function build(){const files=fs.readdirSync(path.join(root,'data/advantage-snapshots')).filter(f=>/^usports-.*\.json$/.test(f)),archives=files.map(f=>({...read('data/advantage-snapshots/'+f),source:'data/advantage-snapshots/'+f}));
 const results=read('data/verified-results-usports.json'),data={asOf:results.asOf,...audit(read('data/advantage-schedule-usports.json'),read('data/pregame-predictions-usports.json').predictions,archives,results.games,read('data/prediction-kickoffs.json'))};
 fs.writeFileSync(path.join(root,'data/prediction-record.json'),JSON.stringify(data,null,2)+'\n');fs.writeFileSync(path.join(root,'prediction-record-data.js'),'window.US_PREDICTION_RECORD='+JSON.stringify(scoring.record(data)).replace(/</g,'\\u003c')+';\n');console.log(JSON.stringify(scoring.record(data).season));console.log(data.coverage,'first pick',data.firstPick);
}
if(require.main===module)build();module.exports={audit};
