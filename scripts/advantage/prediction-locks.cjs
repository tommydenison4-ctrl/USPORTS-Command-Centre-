// First published pregame forecast wins. Never replace a saved game's values.
function retain(locked,predictions,publishedAt){for(const p of predictions||[]){if(!p?.available||!p.gameId||!p.modelVersion?.includes('2026')||locked[p.gameId])continue;if(String(publishedAt).slice(0,10)>=p.date)continue;locked[p.gameId]={...p,lockedAt:publishedAt,permanent:true};}return locked;}
module.exports={retain};
