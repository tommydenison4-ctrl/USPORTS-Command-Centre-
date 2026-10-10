const crypto=require('node:crypto');
const schedules=require('../data/advantage-schedule-usports.json');
const forecasts=require('../data/forecasts-usports.json').predictions;
const VERSION='CANU-live-prior-score-v1';
const blob=()=>require('@vercel/blob');
const prefix=id=>'canu/live/'+id+'/';
const game=id=>schedules.find(g=>g.id===id);
const prior=id=>forecasts.find(p=>p.gameId===id&&p.available&&p.permanent);
async function read(path){const r=await blob().get(path,{access:'private',useCache:false});return r?JSON.parse(await new Response(r.stream).text()):null;}
async function write(path,data){try{await blob().put(path,JSON.stringify(data),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false});}catch(e){if(e.name!=='BlobAlreadyExistsError')throw e;}}
async function baseline(id){const g=game(id);if(!g)throw Error('Unknown game');let old=await read(prefix(id)+'pregame.json');if(old)return old;const p=prior(id);if(!p)return null;old={gameId:id,date:g.date,away:g.away,home:g.home,p:p.home_win_prob,x:0,label:'Pregame',modelVersion:p.modelVersion,lockedAt:p.lockedAt||p.asOf,forecast:p};await write(prefix(id)+'pregame.json',old);return await read(prefix(id)+'pregame.json');}
function point(d,p){
 const a=d?.game?.awayScore,h=d?.game?.homeScore;if(a==null||h==null||!Number.isFinite(Number(a))||!Number.isFinite(Number(h)))return null;
 const final=/final|complete/i.test(d.status?.period||''),q=Number(String(d.status?.period||'').match(/[1-9]/)?.[0]),c=String(d.status?.clock||'').match(/^(\d{1,2}):(\d{2})$/);
 if(!final&&(!q||!c||Number(c[1])>15||Number(c[2])>59))return null;
 const x=final?3600:Math.min(3600,(q-1)*900+900-Number(c[1])*60-Number(c[2]));
 const r=Math.max(0,1-x/3600),logit=Math.log(Math.max(.001,Math.min(.999,p.p))/(1-Math.max(.001,Math.min(.999,p.p))))+(Number(h)-Number(a))/Math.max(2.75,10*Math.sqrt(r+.08));
 return {x,p:final?(Number(h)===Number(a)?.5:Number(h)>Number(a)?1:0):1/(1+Math.exp(-logit)),label:final?'Final':d.status.period+' '+d.status.clock,awayScore:Number(a),homeScore:Number(h),final,modelVersion:VERSION};
}
async function capture(id,d,raw){const g=game(id);if(!g||d?.identity?.gameId!==id||d.identity.date!==g.date||d.identity.away!==g.away||d.identity.home!==g.home)throw Error('Feed identity mismatch');const p=await baseline(id),pt=p?point(d,p):null;
 const capturedAt=new Date().toISOString(),adjusted=p?.forecast?require('./player-availability.cjs').adjust(p.forecast,g,capturedAt):null;
 const livePoint=adjusted?.availabilityAdjusted?point(d,{...p,p:adjusted.home_win_prob}):pt;
 const stable={data:d,raw},hash=crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex').slice(0,24);
 // Probability and clock in the filename let charts list points without reading every full feed.
 const name=livePoint?`${livePoint.x}_${livePoint.p.toFixed(8)}_${livePoint.awayScore}_${livePoint.homeScore}_${livePoint.final?1:0}`:'feed';
 await write(prefix(id)+'snapshots/'+name+'_'+hash+'.json',{gameId:id,capturedAt,point:livePoint,...stable});return livePoint;
}
async function history(id){
 const g=game(id);if(!g)return null;
 let p;try{p=await baseline(id)}catch{const forecast=prior(id);if(forecast)p={gameId:id,p:forecast.home_win_prob,x:0,label:'Pregame',lockedAt:forecast.lockedAt||forecast.asOf,modelVersion:forecast.modelVersion};}
 if(!p)p=require('../data/historical-priors-usports.json').priors[id];
 if(p){try{const record=require('../data/boxscores/'+id+'.json'),reconstruction=require('./historical-game-events.cjs').reconstruct(record,p,point);if(reconstruction)return {gameId:id,away:g.away,home:g.home,...reconstruction,modelVersion:VERSION};}catch{}}
 const points=p?[{...p,forecast:undefined}]:[];let cursor;
 try{do{const r=await blob().list({prefix:prefix(id)+'snapshots/',limit:1000,cursor});for(const b of r.blobs){const m=b.pathname.split('/').at(-1).match(/^(\d+)_([\d.]+)_(\d+)_(\d+)_([01])_/);if(m)points.push({x:Number(m[1]),p:Number(m[2]),awayScore:Number(m[3]),homeScore:Number(m[4]),final:m[5]==='1',capturedAt:b.uploadedAt,label:m[5]==='1'?'Final':`Q${Math.min(4,Math.floor(Number(m[1])/900)+1)} · ${Math.floor(Number(m[1])/60)} min elapsed`});}cursor=r.hasMore?r.cursor:undefined;}while(cursor);}catch{}
 points.sort((a,b)=>a.x-b.x||String(a.capturedAt||'').localeCompare(String(b.capturedAt||'')));
 return {gameId:id,away:g.away,home:g.home,points,complete:points.some(p=>p.final),modelVersion:VERSION,reconstructionAvailable:false};
}
module.exports={game,prior,baseline,point,capture,history,VERSION};
