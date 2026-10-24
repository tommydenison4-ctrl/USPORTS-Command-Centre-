const PAGE='https://varsityblues.ca/sidearmstats/football/summary';
const FEED='https://sidearmstats.com/toronto/football/game.json?detail=full';
const clock=n=>Number.isFinite(Number(n))&&Number(n)>=0?`${Math.floor(Number(n)/60)}:${String(Number(n)%60).padStart(2,'0')}`:'';
function normalize(payload,expected){
 const g=payload?.Game;
 const team=require('../api/scoreboard').team;
 if(!g||!expected||team(g.VisitingTeam?.Name)!==expected.away||team(g.HomeTeam?.Name)!==expected.home||new Date(g.Date).toISOString().slice(0,10)!==expected.date||!g.HasStarted)return null;
 const code=t=>t==='VisitingTeam'?g.VisitingTeam.Id:t==='HomeTeam'?g.HomeTeam.Id:'';
 const ctx=payload.FootballGame?.Context||{};
 const plays=(payload.Plays||[]).slice().reverse().map(p=>({q:String(p.Period||''),clock:clock(p.ClockSeconds),description:p.Narrative||'',type:p.Type||'',down:p.Down??null,distance:p.ToGo??null,spot:p.Spot||'',possession:code(p.Team)}));
 const drives=(payload.FootballGame?.Drives||[]).slice().reverse().map(d=>({team:code(d.Team),plays:d.Plays,yards:d.Yards,time:clock(d.TOPSeconds),result:d.EndHow||'',startSpot:d.StartSpot,endSpot:d.EndSpot}));
 const totals=t=>payload.Stats?.[t]?.Totals?.Values||{};
 const a=totals('VisitingTeam'),h=totals('HomeTeam');
 const defs=[['Total Yards',x=>Number(x.PassYards||0)+Number(x.RushYards||0)],['Passing Yards',x=>x.PassYards],['Rushing Yards',x=>x.RushYards],['First Downs',x=>x.FirstDowns],['3rd Down',x=>x.ThirdEff],['Penalties',x=>x.Penalties],['Time of Possession',x=>x.Possession],['Punts',x=>x.Punts]];
 const statComparison=payload.Stats?defs.map(([label,value])=>({label,away:value(a),home:value(h)})):[];
 const groups={Passing:['passing',{cmp:'PassCompletions',att:'PassAttempts',yds:'PassYards',td:'PassTouchdowns',int:'PassIntercepted'}],Rushing:['rushing',{att:'RushingAttempts',yds:'RushingNetYards',td:'RushingTouchdowns'}],Receiving:['receiving',{rec:'ReceivingReceptions',yds:'ReceivingYards',td:'ReceivingTouchdowns'}],Tackling:['defense',{tkl:'TotalTackles'}]};
 const playerStats=[];
 for(const [key,side]of [['VisitingTeam','away'],['HomeTeam','home']])for(const [name,[category,fields]]of Object.entries(groups))for(const p of payload.Stats?.[key]?.PlayerGroups?.[name]?.Values||[])playerStats.push({name:p.Name,team:code(key),side,category,stats:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,p[v]??null]))});
 return {source:'Official host SIDEARM live stats',status:{complete:g.IsComplete===true,period:g.IsComplete?'FINAL':`Q${g.Period}`,clock:clock(g.ClockSeconds)},game:{awayId:g.VisitingTeam.Id,homeId:g.HomeTeam.Id,awayScore:g.VisitingTeam.Score,homeScore:g.HomeTeam.Score,awayLogo:g.VisitingTeam.Logo,homeLogo:g.HomeTeam.Logo,scoreSource:'official-team-totals'},identity:{gameId:`${expected.date}-${expected.away}-${expected.home}`,...expected},situation:{possession:code(ctx.Possession),down:Number(ctx.Down)||null,distance:ctx.ToGo||null,spot:ctx.Spot||''},plays,drives,statComparison,playerStats,teamStats:[]};
}
async function load(expected){
 const hosts={toronto:'toronto',regina:'regina',saskatchewan:'saskatchewan'};
 const host=hosts[expected?.home];if(!host)return null;
 const feed='https://sidearmstats.com/'+host+'/football/game.json?detail=full';
 const r=await fetch(feed+'&_='+Date.now(),{signal:AbortSignal.timeout(6000),headers:{'Cache-Control':'no-cache','User-Agent':'Mozilla/5.0'}});
 if(!r.ok)return null;
 const raw=await r.json(),data=normalize(raw,expected);
 return data?{data,raw,page:raw.Game.ClientLiveStatsUrl||PAGE,visitor:raw.Game.VisitingTeam.Name,home:raw.Game.HomeTeam.Name}:null;
}
module.exports={normalize,load,PAGE};
