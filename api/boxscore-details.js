/* Parse the published individual tables even when a live-update endpoint has stopped. */
const {team}=require('./scoreboard');
const clean=s=>String(s||'').replace(/<span\b[^>]*class=["'][^"']*(?:hide-on-medium|sr-only)[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#(?:39|x27);|&apos;|&rsquo;/gi,"'").replace(/\s+/g,' ').trim();
const norm=s=>clean(s).toLowerCase().replace(/[^a-z]/g,'');
function tables(html){const stack=[],out=[];for(const m of html.matchAll(/<\/?table\b[^>]*>/gi)){if(m[0][1]!=='/'){if(stack.length)stack.at(-1).nested=true;stack.push({start:m.index,nested:false})}else{const t=stack.pop();if(t&&!t.nested){const raw=html.slice(t.start,m.index+m[0].length),rows=[...raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>clean(c[1]))).filter(r=>r.length);if(rows.length)out.push({title:clean(raw.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1])||rows[0].join(' '),rows})}}}return out}
function parse(html,g){
 if(!g.final&&!/conf\.statusFinal\s*=\s*["']?true/i.test(html))return null;
 const ts=tables(html),scoring=ts.find(t=>t.rows[0].some(x=>/^(?:final|total)$/i.test(x))&&t.rows.length>=3);if(!scoring)return null;
 const scoreRows=scoring.rows.slice(1).filter(r=>r.length>=3);const ids=scoreRows.slice(0,2).map(r=>team(r[0]));
 const canonical=s=>String(s||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 if(ids.length!==2||canonical(ids[0])!==canonical(g.away)||canonical(ids[1])!==canonical(g.home))return null;
 const date=String(g.date).slice(0,10),parts=date.split('-').map(Number);if(!html.includes(parts[1]+'/'+parts[2]+'/'+parts[0])&&!html.includes(date)&&!g.source?.includes(date.replace(/-/g,'')))return null;
 const scores=scoreRows.slice(0,2).map(r=>/^\d+$/.test(r.at(-1))?Number(r.at(-1)):null);if(scores.some(x=>x===null))return null;
 const record={...g,source:g.source,final:true,awayScore:scores[0],homeScore:scores[1],teams:{},tables:ts};
 for(const category of ['passing','rushing','receiving']){
  const cat=ts.filter(t=>norm(t.rows[0][0])===category||new RegExp('(?:^|[- ])'+category+'$', 'i').test(t.title));if(cat.length!==2)continue;
  for(let side=0;side<2;side++){const t=cat[side],h=t.rows[0].map(norm),yi=h.indexOf(category==='rushing'&&h.includes('net')?'net':'yds');if(yi<0)continue;
   const val=(row,k)=>{const v=row[h.indexOf(k)];return /^-?\d+$/.test(v||'')?Number(v):null};
   const rows=t.rows.slice(1).filter(r=>r.length>yi&&!/^(team|totals?)$/i.test(r[0])&&/^-?\d+$/.test(r[yi])).map(r=>({name:r[0],yards:Number(r[yi]),touchdowns:val(r,'td'),interceptions:val(r,'int'),completions:val(r,'cmp'),attempts:val(r,'att'),receptions:val(r,'rec')??val(r,'no')}));
   record.teams[canonical(ids[side])]={...(record.teams[canonical(ids[side])]||{}),[category]:rows};
  }
 }
 return Object.keys(record.teams).length?record:null;
}
function response(r){const leaders={};for(const [category,key] of [['passing','pass'],['rushing','rush'],['receiving','receive']])leaders[key]=Object.entries(r.teams).flatMap(([team,cats])=>(cats[category]||[]).map(p=>({...p,team}))).sort((a,b)=>b.yards-a.yards);return {page:r.source,visitor:r.away,home:r.home,final:true,awayScore:r.awayScore,homeScore:r.homeScore,leaders,record:r}}
module.exports={parse,response,tables};
