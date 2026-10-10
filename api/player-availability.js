const schedules=require('../data/advantage-schedule-usports.json');
const forecasts=require('../data/forecasts-usports.json').predictions;
const availability=require('../internal/player-availability.cjs');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const at=new Date().toISOString(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),updates={};
 for(const game of schedules){if(game.date<today||game.status==='final')continue;const prior=forecasts.find(p=>p.gameId===game.id&&p.available);const p=availability.adjust(prior,game,at);if(!p?.availabilityAdjusted)continue;
  updates[game.id]={gameId:game.id,date:game.date,away:game.away,home:game.home,home_win_prob:p.home_win_prob,away_win_prob:p.away_win_prob,home_score:p.home_score,away_score:p.away_score,margin:p.margin,total:p.total,availabilityAdjusted:true,availability:p.availability};
 }
 return res.status(200).json({forecasts:updates});
};
