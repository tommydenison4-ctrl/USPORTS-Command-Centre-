
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseRoster } from '../scripts/roster-parser.mjs';

export default async function handler(req,res){
  const team=String(req.query?.team||'').toLowerCase();
  const sources=JSON.parse(await fs.readFile(path.join(process.cwd(),'data/roster-sources.json'),'utf8'));
  const source=sources[team];
  if(!source) return res.status(404).json({error:'Unknown team'});
  try{
    const r=await fetch(source.url,{headers:{
      'user-agent':'Mozilla/5.0 U-Sports-Football-Independent-Media/1.0',
      'accept':'text/html,application/xhtml+xml'
    }});
    if(!r.ok) return res.status(502).json({error:`Roster source returned ${r.status}`,source:source.url});
    const html=await r.text();
    const players=parseRoster(html,source).map(p=>({
      ...p,team,season:source.season||'2026',
      roster_id:`${team}-${(p.number||'x')}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`
    }));
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({team,source:source.url,fetched_at:new Date().toISOString(),count:players.length,players});
  }catch(e){
    return res.status(500).json({error:e.message,source:source.url});
  }
}
