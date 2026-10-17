const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../../api/final-games');
const schedule = require('../../data/national-schedule-usports.json');
const registry = require('../../data/completed-boxscores.json');

(async () => {
  for (const g of schedule.games.filter(g => g.status === 'final' && !g.exhibition)) {
    const file = path.join(__dirname, '../../data/boxscores', g.id + '.json');
    if (!fs.existsSync(file)) continue; // Official gamebooks can be published after the final.
    const r = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!r.final || !r.source || !(r.tables?.length || r.pages?.some(p => typeof p === 'string' && p.trim())) ||
        r.id !== g.id || r.away !== g.away || r.home !== g.home || r.awayScore !== g.awayScore || r.homeScore !== g.homeScore) continue;
    assert.ok(registry.some(r => r.id === g.id), 'Missing final gamebook: ' + g.id);
  }
  let body;
  await handler({method: 'GET', query: {date: '20260905', away: 'concordia', home: 'laval', detail: '1'}}, {
    setHeader() {}, end(s) { body = JSON.parse(s); }
  });
  const game = body.games[0];
  assert.equal(game.final, true);
  assert.equal(game.awayScore, 0);
  assert.equal(game.homeScore, 14);
  assert.match(game.page, /rougeetor\.ulaval\.ca\/.*\.pdf$/);
  assert.equal(game.record.pages.length, 17);
  assert.ok(game.leaders.pass.length && game.leaders.rush.length && game.leaders.receive.length);
  console.log('PASS: saved final gamebooks are indexed; official PDF gamebook and leaders served through final API.');
})().catch(e => { console.error(e); process.exitCode = 1; });
