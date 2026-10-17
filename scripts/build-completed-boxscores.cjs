// Publish every verified final gamebook to the postgame API's durable registry.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const index=read('data/national-schedule-usports.json'),saved=read('data/completed-boxscores.json'),records=new Map(saved.map(r=>[r.id,r]));
for(const g of index.games.filter(g=>g.status==='final')){
 const file=path.join(root,'data/boxscores',g.id+'.json');if(!fs.existsSync(file))continue;
 const r=JSON.parse(fs.readFileSync(file,'utf8'));
 if(r.id!==g.id||r.away!==g.away||r.home!==g.home||r.awayScore!==g.awayScore||r.homeScore!==g.homeScore||!r.final||!r.source||!r.tables?.length||!Object.keys(r.teams||{}).length)continue;
 if(!records.get(g.id)?.teams)records.set(g.id,{id:g.id,date:g.date,away:g.away,home:g.home,awayScore:g.awayScore,homeScore:g.homeScore,source:r.source,final:true,fullBoxscore:'data/boxscores/'+g.id+'.json'});
}
fs.writeFileSync(path.join(root,'data/completed-boxscores.json'),JSON.stringify([...records.values()]));
console.log('Published full final gamebooks:',records.size);
