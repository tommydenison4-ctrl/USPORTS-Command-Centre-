// Presto TD rows carry cumulative totals before their own attached conversion.
// Compare each row with the corrected previous total to avoid counting a PAT twice.
function latestScoringScorePair(data){
  const scalar=v=>Array.isArray(v)?v[0]:v;
  const num=v=>{v=scalar(v);return v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null};
  const str=v=>String(scalar(v)??'').trim().toUpperCase();
  const rows=Array.isArray(data?.scores?.score)?data.scores.score:[];
  let previous={away:0,home:0},latest={away:null,home:null,index:null,source:''};
  for(let i=0;i<rows.length;i++){
    const row=rows[i]||{};let away=num(row.vscore),home=num(row.hscore);
    if(away===null||home===null)continue;
    const points=num(row.patpts),result=str(row.patres);
    let conversionIncluded=false,adjusted=false;
    if(str(row.type)==='TD'&&/^(GOOD|SUCCESS|SUCCESSFUL)$/.test(result)&&(points===1||points===2)){
      const side=str(row.vh)==='V'?'away':str(row.vh)==='H'?'home':null;
      if(side){
        const delta=(side==='away'?away:home)-previous[side];
        const opponentUnchanged=side==='away'?home===previous.home:away===previous.away;
        if(opponentUnchanged&&delta===6){if(side==='away')away+=points;else home+=points;adjusted=true;conversionIncluded=true;}
        else if(opponentUnchanged&&delta===6+points)conversionIncluded=true;
      }
    }
    latest={away,home,index:i,row,previous,conversionIncluded,source:'latest-scoring-event'+(adjusted?' + recorded-conversion':'')};
    previous={away,home};
  }
  return latest;
}
module.exports={latestScoringScorePair};
