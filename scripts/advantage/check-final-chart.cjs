const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('live-gamecast.js','utf8'),ctx={team:id=>({short:id}),img:()=>'',esc2:String};
vm.runInNewContext(s.slice(s.indexOf('  function chartHtml('),s.indexOf('  L.renderHistory=')),ctx);
const g={status:'final',away:'Ottawa',home:'York',awayScore:12,homeScore:19},history={points:[{x:0,p:.25},{x:1800,p:.6},{x:3400,p:.801}]};
const html=ctx.chartHtml(g,history);assert.match(html,/York 100.0%/);assert.match(html,/Ottawa 0.0%/);assert.equal(history.points.length,3);assert.equal(history.points[2].p,.801);
assert.match(ctx.chartHtml({...g,status:'live'},history),/York 80.1%/);
console.log('PASS: verified final result closes a stale archived curve at 100/0 without modifying saved live or pregame history');
