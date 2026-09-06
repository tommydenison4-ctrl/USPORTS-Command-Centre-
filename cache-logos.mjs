
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=process.cwd();
const sources=JSON.parse(await fs.readFile(path.join(root,'data/logo-sources.json'),'utf8'));
const outDir=path.join(root,'assets','teams');
await fs.mkdir(outDir,{recursive:true});

for(const [slug,entry] of Object.entries(sources)){
  if(!entry.url) continue;
  try{
    const r=await fetch(entry.url,{headers:{'user-agent':'Mozilla/5.0'}});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const bytes=Buffer.from(await r.arrayBuffer());
    await sharp(bytes,{animated:true})
      .resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}})
      .png()
      .toFile(path.join(outDir,`${slug}.png`));
    console.log(`logo ${slug}: ok`);
  }catch(e){
    console.error(`logo ${slug}: ${e.message}`);
  }
}
