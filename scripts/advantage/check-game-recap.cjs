const assert=require('node:assert/strict'),api=require('../../api/game-recap.js'),known=require('../../data/game-recaps.json');
const g={date:'2026-10-03',away:'guelph',home:'toronto'},origin='https://varsityblues.ca';
const rss=(title,url,date)=>`<rss><item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate></item></rss>`;
const url=known['2026-10-03-guelph-toronto'].url;
assert.equal(api.discover(rss('Football: Blues lose to Guelph',url,'Sat, 03 Oct 2026 20:00:00 GMT'),g,origin).length,1);
for(const [title,u,date] of [['Football: Preview Guelph',url,'Sat, 03 Oct 2026 20:00:00 GMT'],['Football: Blues lose to York',url,'Sat, 03 Oct 2026 20:00:00 GMT'],['Football: Blues lose to Guelph','https://other.example/story','Sat, 03 Oct 2026 20:00:00 GMT'],['Football: Blues lose to Guelph',url,'Sat, 26 Sep 2026 20:00:00 GMT']])assert.equal(api.discover(rss(title,u,date),g,origin).length,0);
(async()=>{let body;await api({method:'GET',query:{game:'2026-10-03-guelph-toronto'}},{setHeader(){},status(){return this},json(v){body=v}});assert.equal(body.recap.source,'Toronto Varsity Blues');assert.ok(body.recap.summary.includes('46–0'));console.log('PASS: home-team recap, exact game identity, dates, previews and external links');})().catch(e=>{console.error(e);process.exitCode=1});
