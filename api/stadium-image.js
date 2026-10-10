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
 }catch(e){console.warn('Stadium page image unavailable',name,e.message)}
 // For venues with no Wikipedia lead image, search Wikimedia Commons for the actual venue.
 try{
  const commons='https://commons.wikimedia.org/w/api.php?';
  const search= name+' football stadium';
  const data=await fetchJson(commons+new URLSearchParams({action:'query',generator:'search',gsrsearch:'filetype:bitmap '+search,gsrnamespace:'6',gsrlimit:'20',prop:'imageinfo',iiprop:'url|size',iiurlwidth:'960',format:'json',formatversion:'2'}));
  const significant=name.toLowerCase().split(/\s+/).filter(w=>w.length>=4&&!['stadium','field','memorial','alumni','university'].includes(w));
  const pages=(data.query?.pages||[]).filter(p=>/\.(?:jpe?g|png|webp)$/i.test(p.title||'')&&(p.imageinfo?.[0]?.width||0)>=500);
  pages.sort((a,b)=>{
   const score=p=>significant.filter(word=>(p.title||'').toLowerCase().includes(word)).length*5-(/logo|crest|badge|map|diagram|illustration|poster|render/i.test(p.title||'')?30:0);
   return score(b)-score(a);
  });
  const best=pages.find(p=>significant.some(word=>(p.title||'').toLowerCase().includes(word)));
  const image=best?.imageinfo?.[0]?.thumburl||best?.imageinfo?.[0]?.url;
  if(image&&/^https:\/\//.test(image))return res.redirect(302,image);
 }catch(e){console.warn('Stadium Commons search unavailable',name,e.message)}
 return res.status(404).end();
};
