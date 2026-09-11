const HANDLE_DEFAULT='@atthe55podcast';
const FEATURED='98rPz2OqKok';
function text(v){return String(v||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function entry(block,tag){const m=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?text(m[1].trim()):''}
async function getChannelId(handle){
 const u=`https://www.youtube.com/${encodeURI(handle)}/videos`;
 const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 (compatible; USportsGameCentre/1.0)','accept-language':'en-CA,en;q=0.9'}}); if(!r.ok) throw new Error('channel '+r.status);
 const h=await r.text();
 const patterns=[/"channelId":"(UC[^"]+)"/,/"externalId":"(UC[^"]+)"/,/channel_id=(UC[^&"']+)/];
 for(const p of patterns){const m=h.match(p);if(m)return m[1]}
 throw new Error('channel id unavailable');
}
async function feed(channelId){
 const r=await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,{headers:{'user-agent':'Mozilla/5.0 (compatible; USportsGameCentre/1.0)'}}); if(!r.ok) throw new Error('feed '+r.status);
 const x=await r.text(); const blocks=x.match(/<entry>[\s\S]*?<\/entry>/g)||[];
 const author=(x.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i)||[])[1]||'@atthe55podcast';
 return blocks.slice(0,18).map(b=>({id:entry(b,'yt:videoId'),title:entry(b,'title'),published:(entry(b,'published')||'').slice(0,10),channel:text(author),description:entry(b,'media:description')})).filter(x=>x.id);
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=1800');
 try{const handle=String(req.query?.channel||HANDLE_DEFAULT);const channelId=await getChannelId(handle);const episodes=await feed(channelId);return res.status(200).json({ok:true,channelId,handle,episodes,featured:FEATURED});}
 catch(e){return res.status(200).json({ok:false,error:String(e.message||e),episodes:[{id:FEATURED,title:'The 55 Podcast — @atthe55podcast',published:'Featured episode',channel:'@atthe55podcast',description:'The 55 Podcast from the official @atthe55podcast YouTube channel.'}]});}
}
