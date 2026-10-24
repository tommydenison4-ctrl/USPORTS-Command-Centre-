// A published official box-score page can keep updating while its AJAX service
// is unavailable. Read only explicit totals; never manufacture a clock or plays.
const {tables}=require('../api/boxscore-details');
const {team}=require('../api/scoreboard');
function normalize(html,expected,source){
 const final=/conf\.statusFinal\s*=\s*["']?true\b/i.test(html);
 const started=/conf\.pregame\s*=\s*["']?false\b/i.test(html);
 if(!final&&!started)return null;
 if(!source.match(new RegExp('/'+expected.date.replace(/-/g,'')+'_')))return null;
 const ts=tables(html),line=ts.find(t=>t.rows[0].some(c=>/^(final|total)$/i.test(c))&&t.rows.length>=3);
 if(!line)return null;
 const rows=line.rows.slice(1).filter(r=>r.length>=3).slice(0,2);
 if(rows.length!==2||team(rows[0][0])!==expected.away||team(rows[1][0])!==expected.home)return null;
 const scores=rows.map(r=>/^\d{1,3}$/.test(r.at(-1))?Number(r.at(-1)):null);
 if(scores.some(s=>s===null||s>=200))return null;
 const playerStats=[];
 for(const category of ['passing','rushing','receiving']){
  const groups=ts.filter(t=>new RegExp('(?:^|[- ])'+category+'$','i').test(t.title)||t.rows[0][0]?.toLowerCase()===category);
  if(groups.length!==2)continue;
  groups.forEach((t,i)=>{const headers=t.rows[0].map(c=>c.toLowerCase().replace(/[^a-z]/g,''));
   for(const row of t.rows.slice(1)){
    if(/^(?:team|totals?)$/i.test(row[0]))continue;
    const stats={};for(const [k,names]of Object.entries({yds:category==='rushing'?['net','yds']:['yds'],td:['td'],int:['int'],cmp:['cmp','comp'],att:['att'],rec:['rec','no']})){
     const n=names.map(x=>headers.indexOf(x)).find(x=>x>=0);if(n!==undefined&&/^-?\d+$/.test(row[n]||''))stats[k]=Number(row[n]);
    }
    if(stats.yds!=null)playerStats.push({name:row[0],team:i?expected.home:expected.away,side:i?'home':'away',category,stats});
   }
  });
 }
 return {source:'Official published scoreboard',coverage:'scoreboard',lastUpdated:new Date().toISOString(),identity:{gameId:`${expected.date}-${expected.away}-${expected.home}`,...expected},game:{awayId:expected.away,homeId:expected.home,awayScore:scores[0],homeScore:scores[1],scoreSource:'official-page-totals'},status:{complete:final,period:final?'FINAL':'LIVE',clock:''},plays:[],drives:[],playerStats,teamStats:[],statComparison:[]};
}
module.exports={normalize};
