const LOGOS = {
  carleton: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Carleton%20Ravens%20Wordmark.png',
  ottawa: 'https://content.sportslogos.net/logos/78/2398/full/atgnysfpsgdp1ohxkeye.gif',
  queens: 'https://content.sportslogos.net/logos/78/2399/full/3480_queens_golden_gaels-primary-2009.png',
  toronto: 'https://content.sportslogos.net/logos/78/2402/full/esgfgr3xf651g33fwpnu.gif',
  waterloo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Waterloo%20warriors%20wmark.svg',
  western: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Western%20mustangs%20wmark.png',
  windsor: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Windsor%20lancers%20shield%20logo.png',
  laurier: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Laurier%20goldenhawks%20wmark.png',
  york: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/York%20lions%20wordmark.png',
  bishops: 'https://content.sportslogos.net/logos/183/5406/full/8221_bishops__gaiters_-primary-0.png',
  concordia: 'https://content.sportslogos.net/logos/183/5396/full/8360_concordia_stingers-primary-0.png',
  laval: 'https://content.sportslogos.net/logos/183/5397/full/7652_laval_rouge_et_or-primary-2012.png',
  mcgill: 'https://cdn.brandfetch.io/idz8kxT5Ro/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1767567759945',
  montreal: 'https://content.sportslogos.net/logos/183/5399/full/8386_montreal_carabins-primary-0.png',
  sherbrooke: 'https://content.sportslogos.net/logos/183/5401/full/7360_sherbrooke__vert_et_or-primary-0.png',
  acadia: 'https://content.sportslogos.net/logos/76/2365/full/5335_acadia_axemen-primary-2007.png',
  'mount-allison': 'https://content.sportslogos.net/logos/76/2369/full/4380_mount_allison_mounties-primary-2011.png',
  'saint-marys': 'https://content.sportslogos.net/logos/76/2373/full/3697_saint_marys_huskies-primary-2012.png',
  stfx: 'https://content.sportslogos.net/logos/76/2374/full/1543_st_francis_xavier_x-men-primary-2010.png',
  alberta: 'https://content.sportslogos.net/logos/77/2377/full/4199_alberta_golden_bears-primary-0.png',
  calgary: 'https://content.sportslogos.net/logos/77/2379/full/5456_calgary_dinos-primary-2013.png',
  manitoba: 'https://images.sidearmdev.com/convert?type=webp&url=https%3A%2F%2Fdxbhsrqyrr690.cloudfront.net%2Fsidearm.nextgen.sites%2Fgoheat.ca%2Fimages%2F2025%2F9%2F22%2FUMBisons_crest_fullcolour_whitestroke.png',
  regina: 'https://content.sportslogos.net/news/2025/08/ram-logo-905x590-20250818-university-of-regina-rams-cougars-football-U-Sports-athletics-unified-brand-visual-identity.jpg',
  saskatchewan: 'https://content.sportslogos.net/logos/77/2384/full/3037_saskatchewan_huskies-primary-0.gif',
  ubc: 'https://content.sportslogos.net/logos/77/2378/full/3060_ubc_thunderbirds-primary-0.gif'
};

function fallbackSvg(team){
  const text=String(team||'?').replace(/[^a-z0-9-]/gi,'').slice(0,4).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="24" fill="#111b29"/><rect x="8" y="8" width="144" height="144" rx="20" fill="none" stroke="#52657b" stroke-width="4"/><text x="80" y="92" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="36" fill="#ffffff">${text}</text></svg>`;
}

module.exports = async function handler(req,res){
  const team=String(req.query?.team||'').toLowerCase();
  const url=LOGOS[team];
  if(!url){
    res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=300');
    return res.status(404).send(fallbackSvg(team));
  }
  try{
    const ac=new AbortController();
    const timer=setTimeout(()=>ac.abort(),7000);
    const r=await fetch(url,{redirect:'follow',signal:ac.signal,headers:{
      'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36',
      'accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'referer': url.includes('sportslogos.net') ? 'https://www.sportslogos.net/' : 'https://usports.ca/'
    }});
    clearTimeout(timer);
    if(!r.ok) throw new Error(`upstream ${r.status}`);
    const ct=r.headers.get('content-type')||'';
    if(!ct.startsWith('image/')) throw new Error('not image');
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type',ct);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Logo-Source','proxy');
    return res.status(200).send(buf);
  }catch(e){
    res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=300');
    res.setHeader('X-Logo-Source','fallback');
    return res.status(200).send(fallbackSvg(team));
  }
};
