/* Resolve venue-specific, real stadium photographs from Wikimedia metadata. */
const memo=new Map();
module.exports=async function handler(req,res){
 const name=String(req.query.name||'').trim().slice(0,120);
 const source=String(req.query.source||'');
 if(!name)return res.status(400).end();
 res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
 const title=source.startsWith('https://en.wikipedia.org/wiki/')?decodeURIComponent(source.split('/wiki/')[1]).replace(/_/g,' '):name;
 const fetchJson=async(url)=>{const r=await fetch(url,{headers:{'User-Agent':'CanUFootball/1.0 (stadium photo metadata; contact via canufootball.com)','Accept':'application/json'},signal:AbortSignal.timeout(6500)});if(!r.ok)throw Error('Image source '+r.status);return r.json()};
 try{
  let image=memo.get(title);
  if(!image){
   const data=await fetchJson('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',prop:'pageimages',piprop:'thumbnail',pithumbsize:'960',format:'json',redirects:'1',titles:title}));
   image=Object.values(data.query?.pages||{})[0]?.thumbnail?.source;
   if(image&&/^https:\/\//.test(image))memo.set(title,image);
  }
  if(image&&/^https:\/\//.test(image))return res.redirect(302,image);
 }catch(e){console.warn('Stadium image unavailable',name,e.message)}
 return res.status(404).end();
};
