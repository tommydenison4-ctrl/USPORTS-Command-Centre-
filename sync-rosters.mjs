
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseRoster } from './roster-parser.mjs';

const root=process.cwd();
const sources=JSON.parse(await fs.readFile(path.join(root,'data/roster-sources.json'),'utf8'));
const outDir=path.join(root,'data','rosters');
await fs.mkdir(outDir,{recursive:true});
const all={generated_at:new Date().toISOString(),teams:{}};

for(const [slug,source] of Object.entries(sources)){
  try{
    const r=await fetch(source.url,{headers:{
      'user-agent':'Mozilla/5.0 U-Sports-Football-Independent-Media/1.0',
      'accept':'text/html,application/xhtml+xml'
    }});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const html=await r.text();
    const players=parseRoster(html,source).map((p,i)=>({
      ...p, team:slug, season:source.season||'2026',
      roster_id:`${slug}-${(p.number||'x')}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`
    }));
    const payload={team:slug,source:source.url,adapter:source.adapter,fetched_at:new Date().toISOString(),count:players.length,players};
    await fs.writeFile(path.join(outDir,`${slug}.json`),JSON.stringify(payload,null,2));
    all.teams[slug]=payload;
    console.log(`${slug}: ${players.length}`);
  }catch(e){
    console.error(`${slug}: ${e.message}`);
    all.teams[slug]={team:slug,source:source.url,error:e.message,count:0,players:[]};
  }
}
await fs.writeFile(path.join(outDir,'all.json'),JSON.stringify(all,null,2));
