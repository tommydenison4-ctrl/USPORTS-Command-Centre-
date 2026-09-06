
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=process.cwd();
const sources=JSON.parse(await fs.readFile(path.join(root,'data/logo-sources.json'),'utf8'));
const outDir=path.join(root,'assets','teams');
await fs.mkdir(outDir,{recursive:true});

const esc = s => String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));

for(const [slug,entry] of Object.entries(sources)){
  const pngPath=path.join(outDir,`${slug}.png`);
  const svgPath=path.join(outDir,`${slug}.svg`);
  let ok=false;

  if(entry.url){
    try{
      const r=await fetch(entry.url,{headers:{'user-agent':'Mozilla/5.0'}});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const bytes=Buffer.from(await r.arrayBuffer());
      await sharp(bytes,{animated:true})
        .resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}})
        .png()
        .toFile(pngPath);
      ok=true;
      console.log(`logo ${slug}: cached`);
    }catch(e){
      console.error(`logo ${slug}: ${e.message}`);
    }
  }

  if(!ok){
    // keep any prior PNG if the repo already has one
    try{
      await fs.access(pngPath);
      console.log(`logo ${slug}: keeping cached PNG`);
      continue;
    }catch{}

    // deterministic local fallback so the image never disappears entirely.
    // This is intentionally not presented as the official mark.
    const initials=(entry.name||slug).split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="46" fill="#111923"/>
      <rect x="10" y="10" width="236" height="236" rx="38" fill="none" stroke="#536579" stroke-width="6"/>
      <text x="128" y="146" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="900" fill="#ffffff">${esc(initials)}</text>
    </svg>`;
    await fs.writeFile(svgPath,svg);
    console.log(`logo ${slug}: local fallback SVG created`);
  }
}
