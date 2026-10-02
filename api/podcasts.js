// Fixed publisher feeds: no client-supplied fetch URLs.
const SOURCES=[
 {id:'at-the-55',title:'At The 55',feedUrl:'https://feeds.soundcloud.com/users/soundcloud:users:501236826/sounds.rss',subscribeUrl:'https://podcasts.apple.com/ca/podcast/at-the-55/id1434836140',videoUrl:'https://www.youtube.com/@atthe55podcast/videos'},
];
function decode(v){return String(v||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return c>0&&c<=0x10ffff?String.fromCodePoint(c):''}).replace(/&(amp|quot|apos|lt|gt);/g,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[n]));}
const plain=v=>decode(v).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function tag(x,n){return (x.match(new RegExp('<'+n+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+n+'>','i'))||[])[1]||''}
function attr(x,n){return decode((x.match(new RegExp('\\b'+n+'\\s*=\\s*["\x27]([^"\x27]*)["\x27]','i'))||[])[1]||'')}
function url(v,secure=false){try{const u=new URL(decode(v).trim());return (secure?u.protocol==='https:':['https:','http:'].includes(u.protocol))&&!u.username&&!u.password?u.href:''}catch{return ''}}
function parseFeed(xml,source,now=Date.now()){
 if(!/<channel[\s>]/i.test(xml))throw Error('Invalid RSS feed');
 const header=xml.split(/<item[\s>]/i)[0],title=plain(tag(header,'title'))||source.title;
 const artwork=url(attr((header.match(/<itunes:image\b[^>]*>/i)||[])[0],'href'),true)||url(tag(tag(header,'image'),'url'),true);
 const publisher=plain(tag(header,'itunes:author'))||title,website=url(tag(header,'link'));
 const seen=new Set(),episodes=[];
 for(const b of xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[]){
  const enc=(b.match(/<enclosure\b[^>]*>/i)||[])[0]||'',audioUrl=url(attr(enc,'url'),true),type=attr(enc,'type');
  const published=Date.parse(plain(tag(b,'pubDate'))),name=plain(tag(b,'title')),id=plain(tag(b,'guid'))||audioUrl;
  if(!audioUrl||!/^audio\//i.test(type)||!name||!Number.isFinite(published)||published>now||seen.has(id))continue;
  seen.add(id);episodes.push({id,title:name,published:new Date(published).toISOString().slice(0,10),audioUrl,audioType:type,url:url(tag(b,'link'))||website,duration:plain(tag(b,'itunes:duration')),description:plain(tag(b,'itunes:summary')||tag(b,'description')).slice(0,320)});
 }
 episodes.sort((a,b)=>b.published.localeCompare(a.published));
 return {...source,title,publisher,website,artwork,copyright:plain(tag(header,'copyright')),episodes:episodes.slice(0,8),status:'ok'};
}
async function loadShow(source){const r=await fetch(source.feedUrl,{signal:AbortSignal.timeout(12000),headers:{'user-agent':'USportsGameCentre/1.0','accept':'application/rss+xml, application/xml, text/xml'}});if(!r.ok)throw Error('Feed unavailable');const xml=await r.text();if(xml.length>5000000)throw Error('Feed too large');return parseFeed(xml,source)}
async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
 const results=await Promise.allSettled(SOURCES.map(loadShow));
 const shows=results.map((r,i)=>r.status==='fulfilled'?r.value:{...SOURCES[i],status:'unavailable',episodes:[]});
 return res.status(200).json({ok:shows.some(s=>s.status==='ok'),checkedAt:new Date().toISOString(),shows});
}
module.exports=handler;module.exports.parseFeed=parseFeed;module.exports.SOURCES=SOURCES;
