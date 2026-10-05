const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
async function load(name){
 const code=fs.readFileSync(path.join(root,'api',name+'.js'),'utf8').replace('export default async function handler','async function handler');
 const module={exports:{}};
 const context={module,exports:module.exports,require,fetch,AbortSignal,AbortController,URL,console,setTimeout,clearTimeout,Buffer};
 vm.runInNewContext(code+'\n;globalThis.feedHandler=typeof handler==="function"?handler:module.exports;',context);
 let data;
 await context.feedHandler({query:{days:14}},{setHeader(){},status(){return this},json(value){data=value;return value}});
 if(!data?.ok){
  const seed=path.join(root,name+'-data.js');
  if(fs.existsSync(seed)){
   const saved={window:{}};vm.runInNewContext(fs.readFileSync(seed,'utf8'),saved);
   const [key,previous]=Object.entries(saved.window)[0]||[];
   if(key&&previous){previous.refreshError=data?.error||'Source unavailable';previous.lastAttemptAt=new Date().toISOString();fs.writeFileSync(seed,'window.'+key+'='+JSON.stringify(previous).replace(/</g,'\\u003c')+';\n');}
  }
  throw Error(name+' source refresh failed: '+JSON.stringify(data));
 }
 if(name==='standings'&&data.rows.some(r=>r.stale)){
  const index=JSON.parse(fs.readFileSync(path.join(root,'data/national-schedule-usports.json'),'utf8'));
  for(const row of data.rows.filter(r=>r.stale)){
   const games=index.games.filter(g=>g.status==='final'&&!g.exhibition&&g.date<=index.asOf&&[g.away,g.home].includes(row.slug));
   if(!games.length)throw Error('No verified results for '+row.slug);
   const record={w:0,l:0,t:0,g:games.length,pf:0,pa:0};
   for(const g of games){const own=g.home===row.slug?'home':'away',opp=own==='home'?'away':'home',a=g[own+'Score'],b=g[opp+'Score'];record.pf+=a;record.pa+=b;record[a>b?'w':a<b?'l':'t']++;}
   Object.assign(row,{record,url:index.source,position:null,season:2026,verifiedAt:new Date().toISOString(),stale:false,recordSource:'Verified national regular-season finals; official conference tie-break order unavailable',sourceError:row.error});delete row.error;
  }
 }
 const variable={standings:'US_STANDINGS_SEED',rankings:'US_RANKINGS_SEED',news:'US_NEWS_SEED',podcasts:'PODCASTS_SEED'}[name];
 fs.writeFileSync(path.join(root,name+'-data.js'),'window.'+variable+'='+JSON.stringify(data).replace(/</g,'\\u003c')+';\n');
 if(name==='standings')fs.writeFileSync(path.join(root,'data/standings-usports.json'),JSON.stringify(data));
 console.log(name,JSON.stringify({checkedAt:data.checkedAt||data.generatedAt,published:data.published,rows:data.rows?.length,stories:data.stories?.length,shows:data.shows?.map(s=>({title:s.title,status:s.status,latest:s.episodes?.[0]?.published})),failures:data.sourceStatus?.filter(s=>s.status!==200)}));
}
Promise.allSettled(['standings','rankings','news','podcasts'].map(load)).then(results=>{results.forEach(r=>{if(r.status==='rejected'){console.error(r.reason);process.exitCode=1}})});
