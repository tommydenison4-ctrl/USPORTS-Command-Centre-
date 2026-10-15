/* Grade only forecasts with evidence of publication before kickoff. */
function periods(now=Date.now()){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto'}).format(new Date(now)),d=new Date(date+'T12:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return {date,weekStart:d.toISOString().slice(0,10),monthStart:date.slice(0,7)+'-01',seasonStart:date.slice(0,4)+'-01-01'};
}
function inPeriod(date,period,now){const p=periods(now),start=p[period+'Start'],end=new Date(start+'T12:00Z');if(period==='week')end.setUTCDate(end.getUTCDate()+7);else if(period==='month')end.setUTCMonth(end.getUTCMonth()+1);else end.setUTCFullYear(end.getUTCFullYear()+1);return date>=start&&date<end.toISOString().slice(0,10)}
function summary(rows,period,now){const eligible=rows.filter(r=>inPeriod(r.date,period,now)),graded=eligible.filter(r=>r.status==='correct'||r.status==='incorrect'),correct=graded.filter(r=>r.status==='correct').length;return {correct,incorrect:graded.length-correct,graded:graded.length,accuracy:graded.length?Math.round(correct/graded.length*1000)/10:null,pending:eligible.filter(r=>r.status==='pending').length,ties:eligible.filter(r=>r.status==='tie').length}}
function record(data,now=Date.now()){return {asOf:data.asOf,firstPick:data.firstPick,coverage:data.coverage,...periods(now),week:summary(data.games,'week',now),month:summary(data.games,'month',now),season:summary(data.games,'season',now),weeks:groups(data.games,'week',now),months:groups(data.games,'month',now),games:data.games}}
function groups(rows,period,now){const ids=[...new Set(rows.filter(r=>r.date<=periods(now).date).map(r=>period==='month'?r.date.slice(0,7):periods(Date.parse(r.date+'T12:00Z')).weekStart))].sort().reverse();return ids.map(id=>{const selected=rows.filter(r=>(period==='month'?r.date.slice(0,7):periods(Date.parse(r.date+'T12:00Z')).weekStart)===id);return {period:id,...summary(selected,'season',now)}})}
function challenge(ballots,profiles,data,period,now=Date.now()){
 const games=data.games.filter(r=>inPeriod(r.date,period,now)),rows=[];
 for(const [fan,profile] of profiles){let correct=0,siteCorrect=0,graded=0,pending=0;
  for(const g of games){const pick=ballots.get(g.gameId)?.latest.get(fan);if(!pick)continue;if(g.status==='pending'){pending++;continue}if(!['correct','incorrect'].includes(g.status))continue;graded++;correct+=pick.winner===g.winner;siteCorrect+=g.pick===g.winner;}
  if(graded||pending)rows.push({name:profile.name,tag:fan.slice(0,6),team:profile.team||null,graded,pending,correct,incorrect:graded-correct,siteCorrect,siteIncorrect:graded-siteCorrect,edge:correct-siteCorrect,status:graded?(correct>siteCorrect?'ahead':correct<siteCorrect?'behind':'tied'):'pending'});
 }
 rows.sort((a,b)=>b.edge-a.edge||b.graded-a.graded||b.correct-a.correct||a.name.localeCompare(b.name));return rows.map((r,i)=>({...r,rank:i+1}));
}
module.exports={periods,inPeriod,summary,record,challenge};
