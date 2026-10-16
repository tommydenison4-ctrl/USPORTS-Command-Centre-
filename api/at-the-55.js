const {event,extract,ids,match}=require('../internal/at-the-55.cjs');
const path='canu/promotions/'+event.gameId+'.json';
const blob=()=>require('@vercel/blob');
let cached=null,nextCheck=0;
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(6000),headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'en-CA,en;q=0.9'}});if(!r.ok)throw Error('YouTube unavailable');return r.text()}
async function resolve(){if(cached||Date.now()<nextCheck)return cached;nextCheck=Date.now()+300000;
 // Durable selection keeps the same recording even after it leaves the channel listing.
 try{const saved=await blob().get(path,{access:'private',useCache:false});if(saved){const v=JSON.parse(await new Response(saved.stream).text());if(v.gameId===event.gameId&&/^[\w-]{11}$/.test(v.videoId)){cached=v;return cached}}}catch{}
 try{const tree=extract(await get(event.channelUrl+'/streams'),'ytInitialData');const channel=tree?.metadata?.channelMetadataRenderer?.externalId;if(!channel)return null;const candidates=await Promise.all(ids(tree).slice(0,12).map(async id=>{try{return match(extract(await get('https://www.youtube.com/watch?v='+id),'ytInitialPlayerResponse'),channel)}catch{return null}}));const verified=candidates.filter(Boolean);if(verified.length!==1)return null;const v=verified[0];
 // Only publish a discovered video once its selection is stored permanently.
 await blob().put(path,JSON.stringify(v),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false});cached=v;return cached;}catch{}
 return null;}
module.exports=async(req,res)=>{if(req.method!=='GET')return res.status(405).json({error:'GET only'});const video=await resolve();res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=60');return res.status(200).json({...event,video})};
