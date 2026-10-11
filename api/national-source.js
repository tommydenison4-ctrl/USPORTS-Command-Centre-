// Public official gamebooks for the national refresh, fetched from the same
// deployment network as the live scoreboard. No arbitrary upstream URLs.
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.statusCode=405;return res.end('GET only')}
  const path=String(req.query.path||'');
  if(!/^\/sports\/fball\/(?:composite(?:\?d=2026-\d{2}-\d{2})?|2026-27\/boxscores\/2026\d{4}_[a-zA-Z0-9_-]+\.xml(?:\?view=plays)?)$/.test(path)){
    res.statusCode=400;return res.end('Unsupported official football path');
  }
  try{
    const response=await fetch('https://en.usports.ca'+path,{headers:{
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      'Accept-Language':'en-CA,en;q=0.9','Cache-Control':'no-cache','Pragma':'no-cache',
      'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },signal:AbortSignal.timeout(15000)});
    const html=await response.text();
    if(!response.ok||!/event-row|stats-header|<table\b/i.test(html)){
      res.statusCode=502;return res.end('Official source temporarily unavailable');
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
  }catch{res.statusCode=502;res.end('Official source temporarily unavailable')}
};
