const assert=require('node:assert/strict'),V=require('../../game-venues.js'),S=require('../../data/advantage-schedule-usports.json');
for(const home of new Set(S.map(g=>g.home)))assert.ok(V.homes[home]?.name&&V.homes[home]?.city,'Every team needs a home venue and location');
assert.equal(V.resolve({home:'windsor'}).name,'Alumni Field');assert.equal(V.resolve({home:'western'},{site:'London ON'}).name,'Western Alumni Stadium');
assert.equal(V.resolve({home:'windsor'},{stadium:'Alumni Stadium',site:'Windsor ON'}).source,V.homes.windsor.source,'Windsor Alumni Stadium must not use Guelph photos');
assert.equal(V.resolve({home:'ottawa',venue:'TD Place Stadium'}).name,'TD Place Stadium','A listed neutral/event stadium overrides the home ground');
assert.equal(V.resolve({home:'calgary'},{site:'Medicine Hat AB'}).name,'Medicine Hat AB','An out-of-town event must not be assigned Calgary\'s stadium');
assert.equal(V.resolve({home:'western',neutral:true}).name,'Venue to be confirmed');
console.log('PASS: all 27 home venues; Windsor/Western fallback; explicit and out-of-town venues preserved; neutral grounds not guessed.');
