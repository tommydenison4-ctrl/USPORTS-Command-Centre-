/* Reconstruct regulation events from published play-by-play; never guess missing scores. */
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const schools=require('../data/usports-teams.json');
function sideCodes(record){const line=record.tables?.find(t=>/team score by quarter/i.test(t.title)||t.rows[0]?.[0]==='Scoring'&&t.rows[0]?.at(-1)==='Final');const rows=line?.rows?.slice(1,3)||[];return rows.map((r,i)=>{const slug=i===0?record.away:record.home,t=schools.find(t=>norm(t.slug)===norm(slug));const code=/team score by quarter/i.test(line.title)?String(r[0]).replace(/^Winner\s+/i,'').split(/\s+/)[0]:t?.abbr;return {slug,code:code.toUpperCase(),names:[slug,t?.short,t?.name].filter(Boolean).map(norm)}})}
function elapsed(q,clock){const m=String(clock).match(/^(\d{1,2}):(\d{2})$/);if(!m||q<1||q>4||+m[1]>15||+m[2]>59)return null;return (q-1)*900+900-(+m[1]*60+ +m[2]);}
function extract(record){
 const sides=sideCodes(record);if(sides.length!==2||sides.some(s=>!s.code))return null;
 const codeSide=c=>sides.findIndex(s=>s.code===String(c).toUpperCase()),events=[],seen=new Set();let q=1,active=-1,clock='15:00',lastX=0;
 for(const table of record.tables||[]){
  const qm=table.title.match(/Start of Quarter #([1-4])/i);if(qm)q=+qm[1];if(/Halftime/i.test(table.title))q=3;
  if(!table.rows?.some(r=>r[0]==='Down & Distance'&&r[1]==='Play')&&!/Game Start|Halftime/i.test(table.title))continue;
  const header=table.title.match(/^(.+?) at (\d\d?:\d\d)$/),name=header?.[1];if(name){active=sides.findIndex(s=>s.names.includes(norm(name)));const drives=record.tables.find(t=>/^All Drives$/i.test(t.title));const match=drives?.rows.find(r=>codeSide(r[1])===active&&r[4]===header[2]&&Number(String(r[2]).match(/[1-4]/)?.[0])>=q);if(match)q=Number(String(match[2]).match(/[1-4]/)[0]);}
  for(const row of table.rows){
   const text=String(row[1]||row[0]||'');if(/Start of [1-4](?:st|nd|rd|th) quarter/i.test(text))continue;if(/no[ -]play|overturned|reversed|nullified/i.test(text))continue;
   const cm=text.match(/clock (\d{1,2}:\d{2})/i);if(cm)clock=cm[1];else continue;
   let x=elapsed(q,clock);if(x!==null&&x<lastX&&q<4&&lastX-(q-1)*900>=720&&x%900<=180){q++;x=elapsed(q,clock);}if(x===null||x<lastX)continue;
   const key=q+'|'+clock+'|'+text;if(seen.has(key))continue;seen.add(key);lastX=x;
   const spot=String(row[0]).match(/ at ([A-Z]{2,8})-?(\d+)/)?.[1];
   const ball=text.match(/\b([A-Z]{2,8}) ball on/i)?.[1];
   let points=0,scorer=-1,kind='play';
   if(/TOUCHDOWN/i.test(text)&&!(/PENALTY/i.test(text)&&!/declined/i.test(text))){const target=[...text.matchAll(/to the ([A-Z]{2,8})-?0+\b/gi)].at(-1)?.[1];scorer=target?1-codeSide(target):active;points=6;kind='score';}
   else if(/kick attempt good/i.test(text)){scorer=spot?1-codeSide(spot):active;points=1;kind='score';}
   else if(/(?:pass|rush) attempt (?:good|successful)|(?:pass|rush).*two.point.*(?:good|successful)/i.test(text)){scorer=spot?1-codeSide(spot):active;points=2;kind='score';}
   else if(/field goal attempt.*\bGOOD\b/i.test(text)&&!/NO GOOD|MISSED|blocked/i.test(text)){scorer=ball?1-codeSide(ball):active;points=3;kind='score';}
   else if(/\brouge\b/i.test(text)){scorer=ball?1-codeSide(ball):active;points=1;kind='score';}
   else if(/\bsafety\b/i.test(text)){const target=[...text.matchAll(/to the ([A-Z]{2,8})-?0+\b/gi)].at(-1)?.[1];scorer=target?1-codeSide(target):1-active;points=2;kind='score';}
   else if(/intercepted|turnover on downs|fumble.*lost/i.test(text))kind='turnover';
   if(points&&(scorer<0||scorer>1))return null;
   events.push({x,q,clock,description:text,kind,points,scorer});
   if(ball&&codeSide(ball)>=0)active=codeSide(ball);
  }
 }
 if(!events.some(e=>e.points))return null;
 let a=0,h=0;const quarters=[[0,0,0,0],[0,0,0,0]];
 for(const e of events){if(e.points){if(e.scorer===0)a+=e.points;else h+=e.points;quarters[e.scorer][e.q-1]+=e.points;}e.awayScore=a;e.homeScore=h;}
 // Both the final and quarter totals must match the official line score.
 if(a!==record.awayScore||h!==record.homeScore)return null;
 const line=record.tables.find(t=>/team score by quarter/i.test(t.title));
 for(let side=0;side<2;side++){const raw=line.rows[side+1].slice(1,5);if(raw.length===4&&raw.every(v=>/^\d+$/.test(v))&&raw.some((v,i)=>+v!==quarters[side][i]))return null;}
 return {events,sides,coverage:'play-by-play',source:record.source};
}
function scoringOnly(record){
 const sides=sideCodes(record);if(sides.length!==2)return null;
 const table=record.tables?.find(t=>t.rows[0]?.includes('Scoring Play')||t.rows[0]?.includes('Scoring Summary'));if(!table)return null;
 const line=record.tables.find(t=>/team score by quarter/i.test(t.title)||t.rows[0]?.[0]==='Scoring'&&t.rows[0]?.at(-1)==='Final');
 const cumulative=[0,1].map(side=>{let total=0;return line.rows[side+1].slice(1,5).map(v=>total+=Number(v))});
 if(cumulative[0][3]!==record.awayScore||cumulative[1][3]!==record.homeScore)return null;
 const events=[];let lastX=-1,a=0,h=0;
 for(const row of table.rows.slice(1)){
  let q,clock,description,na,nh;
  if(table.rows[0].includes('Scoring Play')){if(row.length<6||!row[3])continue;q=Number(String(row[1]).match(/[1-4]/)?.[0]);clock=row[2];description=row[3];na=Number(row[4]);nh=Number(row[5]);}
  else {const scores=String(row[3]).match(/^(\d+)\s*-\s*(\d+)$/);if(!scores)continue;q=Number(row[0]);clock=row[1];description=row[2];na=+scores[1];nh=+scores[2];}
  if(!Number.isFinite(na)||!Number.isFinite(nh)||na<a||nh<h||na+nh<=a+h||na+nh-a-h>8)return null;
  const scoreQuarter=cumulative[0].findIndex((v,i)=>na<=v&&nh<=cumulative[1][i])+1;
  if(q<scoreQuarter)q=scoreQuarter;
  const x=elapsed(q,clock);if(x===null||x<lastX)return null;
  events.push({x,q,clock,description,kind:'score',awayScore:na,homeScore:nh});lastX=x;a=na;h=nh;
 }
 if(!events.length||a!==record.awayScore||h!==record.homeScore)return null;
 return {events,sides,coverage:'scoring-only',source:record.source};
}
function quarterOnly(record){
 let rows=record.tables?.find(t=>/team score by quarter/i.test(t.title)||t.rows[0]?.[0]==='Scoring'&&t.rows[0]?.at(-1)==='Final')?.rows?.slice(1,3);
 if(!rows?.length&&record.pages?.length){const page=record.pages[0],part=page.split(/SCORING 1 2 3 4 FINAL/i)[1]?.split(/PRD TIME|OTHER INFORMATION/i)[0];if(part)rows=part.split('\n').map(line=>line.match(/^(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/)).filter(Boolean).slice(0,2).map(m=>m.slice(1));}
 if(!rows||rows.length!==2)return null;
 const scores=rows.map(r=>r.slice(1).map(v=>/^\d+$/.test(String(v).trim())?Number(v):NaN));
 if(scores.some(r=>r.length<5||r.some(v=>!Number.isFinite(v))))return null;
 if(scores.some((r,i)=>r.slice(0,-1).reduce((a,b)=>a+b,0)!==[record.awayScore,record.homeScore][i]||r.at(-1)!==[record.awayScore,record.homeScore][i]))return null;
 const n=scores[0].length-1;if(scores[1].length-1!==n)return null;
 let a=0,h=0;const events=[];for(let i=0;i<n;i++){a+=scores[0][i];h+=scores[1][i];events.push({x:(i+1)*900,q:Math.min(i+1,4),clock:'00:00',label:i<4?['End Q1','Halftime','End Q3',n>4?'End regulation':'Final'][i]:'End OT'+(i-3),description:'Verified period score: '+a+'–'+h,kind:'period',awayScore:a,homeScore:h});}
 return {events,coverage:'quarter-only',source:record.source,duration:Math.max(3600,n*900)};
}
function reconstruct(record,prior,point){
 if(!prior||!Number.isFinite(prior.p)||(prior.priorKind!=='estimated'&&String(prior.lockedAt||'').slice(0,10)>record.date))return null;
 const parsed=extract(record)||scoringOnly(record)||quarterOnly(record);if(!parsed)return null;
 const points=[{...prior,forecast:undefined,label:'Pregame',reconstructed:true}],events=parsed.events;
 for(const e of events){const p=point({game:{awayScore:e.awayScore,homeScore:e.homeScore},status:{period:'Q'+e.q,clock:e.clock}},prior);if(p)points.push({...p,x:e.x,label:e.label||'Q'+e.q+' '+e.clock+' · '+(e.kind==='score'?'Score':e.kind==='turnover'?'Turnover':'Play'),description:e.description,kind:e.kind,reconstructed:true});}
 const final=point({game:{awayScore:record.awayScore,homeScore:record.homeScore},status:{period:'FINAL',clock:''}},prior);if(final)points.push({...final,x:parsed.duration||3600,reconstructed:true});
 return {points,reconstructed:true,coverage:parsed.coverage,source:parsed.source,priorKind:prior.priorKind||'locked',priorMethod:prior.method,complete:true};
}
module.exports={elapsed,extract,scoringOnly,quarterOnly,reconstruct};
