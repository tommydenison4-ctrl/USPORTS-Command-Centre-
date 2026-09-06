
import * as cheerio from 'cheerio';

const clean = s => String(s ?? '').replace(/\s+/g,' ').trim();
const absolutize = (url, base) => {
  if(!url) return null;
  try { return new URL(url, base).href; } catch { return url; }
};
function jerseyFromText(x){
  const m=clean(x).match(/(?:^|\s)#?(\d{1,2})(?:\s|$)/);
  return m?m[1]:'';
}
function playerKey(p){
  return `${clean(p.number)}|${clean(p.name).toLowerCase()}`;
}
function dedupe(players){
  const out=[], seen=new Set();
  for(const p of players){
    if(!p.name || p.name.length<3) continue;
    const k=playerKey(p);
    if(seen.has(k)) continue;
    seen.add(k); out.push(p);
  }
  return out;
}
function firstText($el, selectors){
  for(const s of selectors){
    const v=clean($el.find(s).first().text());
    if(v) return v;
  }
  return '';
}
function firstAttr($el, selectors, attr){
  for(const s of selectors){
    const v=$el.find(s).first().attr(attr);
    if(v) return v;
  }
  return '';
}

function parseSidearm(html, base){
  const $=cheerio.load(html);
  const players=[];
  const selectors=[
    '.sidearm-roster-player',
    'li.sidearm-roster-player',
    '.sidearm-roster-player-container',
    '.s-person-card',
    '[class*="roster-player"]'
  ];
  let nodes=$();
  for(const s of selectors){ const q=$(s); if(q.length){nodes=q;break;} }

  nodes.each((_,el)=>{
    const x=$(el);
    const name=firstText(x,['h3 a','h3','.sidearm-roster-player-name a','.sidearm-roster-player-name','[class*="player-name"] a','[class*="player-name"]']);
    if(!name) return;
    const number=firstText(x,['.sidearm-roster-player-jersey-number','.sidearm-roster-player-jersey','.sidearm-roster-player-number','[class*="jersey"]','[class*="number"]']);
    const pos=firstText(x,['.sidearm-roster-player-position-short','.sidearm-roster-player-position-long-short','.sidearm-roster-player-position','[class*="position"]']);
    const height=firstText(x,['.sidearm-roster-player-height','[class*="height"]']);
    const weight=firstText(x,['.sidearm-roster-player-weight','[class*="weight"]']);
    const year=firstText(x,['.sidearm-roster-player-academic-year','[class*="academic-year"]','[class*="year"]']);
    const hometown=firstText(x,['.sidearm-roster-player-hometown','[class*="hometown"]']);
    const major=firstText(x,['.sidearm-roster-player-major','[class*="major"]']);
    const bio=firstAttr(x,['h3 a','.sidearm-roster-player-name a','a[href*="/roster/"]'],'href');
    const img=firstAttr(x,['img[data-src]'],'data-src')||firstAttr(x,['img[src]'],'src');
    players.push({
      number:clean(number).replace(/^#/,''),
      name, position:pos, height, weight, year, hometown, major,
      headshot:absolutize(img,base), bio_url:absolutize(bio,base)
    });
  });

  // Sidearm also exposes a roster table. Use it when card classes changed.
  if(!players.length){
    $('table tbody tr').each((_,el)=>{
      const cells=$(el).find('td').map((_,td)=>clean($(td).text())).get();
      if(cells.length<3) return;
      const link=$(el).find('a').first();
      const name=clean(link.text())||cells[1]||'';
      if(!name || /coach|staff/i.test(name)) return;
      players.push({
        number:cells[0]||'', name, position:cells[2]||'', height:cells[3]||'',
        weight:cells[4]||'', year:cells[5]||'', major:cells[6]||'',
        hometown:cells[7]||'', headshot:null,
        bio_url:absolutize(link.attr('href'),base)
      });
    });
  }
  return dedupe(players);
}

function parsePresto(html,base){
  const $=cheerio.load(html);
  const players=[];
  $('table tbody tr, .roster .player, .roster-player, li.player').each((_,el)=>{
    const x=$(el);
    const cells=x.find('td').map((_,td)=>clean($(td).text())).get();
    let name=clean(x.find('a').first().text());
    if(!name && cells.length>1) name=cells[1];
    if(!name || /coach|staff/i.test(name)) return;
    const img=x.find('img').first();
    players.push({
      number:cells[0]||jerseyFromText(x.text()),
      name,
      position:cells[2]||firstText(x,['.position','.pos']),
      height:cells[3]||firstText(x,['.height','.ht']),
      weight:cells[4]||firstText(x,['.weight','.wt']),
      year:cells[5]||firstText(x,['.year','.yr']),
      major:'',
      hometown:cells[6]||firstText(x,['.hometown']),
      headshot:absolutize(img.attr('data-src')||img.attr('src'),base),
      bio_url:absolutize(x.find('a').first().attr('href'),base)
    });
  });
  return dedupe(players);
}

function parseGeneric(html,base){
  const side=parseSidearm(html,base);
  if(side.length>=15) return side;
  const presto=parsePresto(html,base);
  if(presto.length>=15) return presto;

  const $=cheerio.load(html);
  const players=[];
  $('article,li,.player,.roster-card,[class*="player"]').each((_,el)=>{
    const x=$(el), a=x.find('a').first();
    const name=clean(x.find('h2,h3,h4,.name,[class*="name"]').first().text())||clean(a.text());
    if(!name || name.length>50 || /coach|staff|roster/i.test(name)) return;
    const txt=clean(x.text());
    const pos=(txt.match(/\b(QB|RB|WR|REC|TE|OL|OT|OG|C|DL|DE|DT|LB|DB|CB|S|K|P|LS)\b/i)||[])[1]||'';
    const num=jerseyFromText(txt);
    const img=x.find('img').first();
    players.push({
      number:num,name,position:pos.toUpperCase(),height:'',weight:'',year:'',
      major:'',hometown:'',
      headshot:absolutize(img.attr('data-src')||img.attr('src'),base),
      bio_url:absolutize(a.attr('href'),base)
    });
  });
  return dedupe(players);
}

export function parseRoster(html, source){
  const adapter=source.adapter||'generic';
  let players = adapter==='sidearm' ? parseSidearm(html,source.url)
              : adapter==='presto' ? parsePresto(html,source.url)
              : parseGeneric(html,source.url);
  if(players.length<10 && adapter!=='generic'){
    players=parseGeneric(html,source.url);
  }
  return players;
}
