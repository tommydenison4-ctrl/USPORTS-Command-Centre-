const H=require('../internal/live-history.cjs'),live=require('./presto-live');
module.exports=async(req,res)=>{
 if(!process.env.CRON_SECRET||req.headers.authorization!=='Bearer '+process.env.CRON_SECRET)return res.status(401).json({error:'Unauthorized'});
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const clock=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).split(':').map(Number),now=clock[0]*60+clock[1];
 const games=require('../data/advantage-schedule-usports.json').filter(g=>g.date===date&&!g.exhibition),results=[];
 await Promise.allSettled(games.map(async g=>{
  try{await H.baseline(g.id);const t=String(g.time||'').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i),kick=t?(Number(t[1])%12+(t[3].toUpperCase()==='PM'?12:0))*60+Number(t[2]):null;
  if(kick===null||now<kick-30||now>kick+360){results.push({game:g.id,status:'outside game window'});return;}
  const old=await H.history(g.id);if(old?.complete){results.push({game:g.id,status:'final archived'});return;}
  const teams=require('../data/usports-teams.json'),a=teams.find(t=>t.slug===g.away),h=teams.find(t=>t.slug===g.home);
  await live({method:'GET',query:{game:g.id,page:g.boxscore||'',discover:'1',date:date.replace(/-/g,''),away:g.away,home:g.home,awayId:a?.abbr||'',homeId:h?.abbr||''}},{setHeader(){},status(code){this.code=code;return this;},json(body){results.push({game:g.id,status:body.ok?(body.archiveSaved?'captured':'capture failed'):'feed unavailable'});return this;}});
  }catch{results.push({game:g.id,status:'capture failed'});}
 }));return res.status(200).json({date,results});
};
