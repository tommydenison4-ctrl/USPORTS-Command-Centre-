(function () {
  'use strict';

  const CONFERENCES = [
    { id: 'OUA', name: 'OUA', spots: 7 },
    { id: 'RSEQ', name: 'RSEQ', spots: 4 },
    { id: 'CW', name: 'Canada West', spots: 4 },
    { id: 'AUS', name: 'AUS', spots: 3 }
  ];
  const OUA_RULES_URL = 'https://www.oua.ca/sports/fball/2025-26/files/operations';
  const RSEQ_RULES_URL = 'https://rseq.ca/media/875453/2627_uni_reglements_secteur.pdf';
  const STORE_KEY = 'canufootball:playoff-projections:v1';
  const conferenceFor = id => CONFERENCES.find(c => c.id === id) || CONFERENCES[0];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const validScore = value => value != null && String(value).trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
  const numeric = value => validScore(value) ? Number(value) : null;
  const nameOf = slug => {
    const team = typeof TEAM !== 'undefined' ? TEAM[slug] : null;
    return team?.short || team?.name || String(slug || 'Team').replace(/-/g, ' ');
  };
  const logoOf = slug => {
    const team = typeof TEAM !== 'undefined' ? TEAM[slug] : null;
    if (!team?.logo) return '';
    return `<img class="pp-logo" src="${esc(team.logo)}" alt="" onerror="this.hidden=true">`;
  };

  function loadPicks() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  const picksByConference = loadPicks();
  let bound = false;
  function picksFor(conf) { return picksByConference[conf] || (picksByConference[conf] = {}); }
  function savePicks() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(picksByConference)); } catch (_) { /* Private browsing can disable storage. */ }
  }

  function conferenceGames(conf) {
    if (typeof GAMES === 'undefined' || !Array.isArray(GAMES)) return [];
    return GAMES.filter(g => g && g.conference === conf && g.exhibition !== true && g.playoff !== true && g.postseason !== true)
      .slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  }

  function leagueTeams(conf) {
    return (typeof TEAMS !== 'undefined' ? TEAMS : []).filter(t => t.conference === conf);
  }

  function scoredFinal(g) {
    return String(g.status).toLowerCase() === 'final' && numeric(g.awayScore) !== null && numeric(g.homeScore) !== null && Number(g.awayScore) !== Number(g.homeScore);
  }

  function scoreForScenario(g, pick) {
    if (!pick || !validScore(pick.awayScore) || !validScore(pick.homeScore) || Number(pick.awayScore) === Number(pick.homeScore)) return null;
    return { away: Number(pick.awayScore), home: Number(pick.homeScore) };
  }

  function scenarioGames(conf) {
    const picks = picksFor(conf);
    return conferenceGames(conf).map(g => {
      if (scoredFinal(g)) return { ...g, scenario: false, result: { away: Number(g.awayScore), home: Number(g.homeScore) } };
      const p = picks[g.id];
      if (!p || ![g.away, g.home].includes(p.winner)) return null;
      const invalid = [p.awayScore, p.homeScore].some(v => v != null && v !== '' && !validScore(v));
      if (invalid || (validScore(p.awayScore) && validScore(p.homeScore) && Number(p.awayScore) === Number(p.homeScore))) return null;
      const result = scoreForScenario(g, p);
      return { ...g, scenario: true, pick: { ...p, winner: result ? (result.away > result.home ? g.away : g.home) : p.winner }, result };
    }).filter(Boolean);
  }

  function recordsFor(conf) {
    const records = Object.fromEntries(leagueTeams(conf).map(t => [t.slug, { slug: t.slug, w: 0, l: 0, pf: 0, pa: 0, gp: 0, scoredGames: 0 }]));
    for (const g of scenarioGames(conf)) {
      const a = records[g.away], h = records[g.home];
      if (!a || !h) continue;
      a.gp++; h.gp++;
      if (g.result) {
        a.pf += g.result.away; a.pa += g.result.home;
        h.pf += g.result.home; h.pa += g.result.away;
        a.scoredGames++; h.scoredGames++;
      }
      const awayWon = g.scenario ? g.pick.winner === g.away : g.result.away > g.result.home;
      if (awayWon) { a.w++; h.l++; }
      else { h.w++; a.l++; }
    }
    return records;
  }

  let drawScenarios;
  try { drawScenarios = JSON.parse(localStorage.getItem(STORE_KEY + ':draws') || '{}'); } catch (_) { drawScenarios = {}; }
  function saveDrawScenarios() {
    try { localStorage.setItem(STORE_KEY + ':draws', JSON.stringify(drawScenarios)); } catch (_) {}
  }
  function scenarioSignature(conf) {
    return JSON.stringify(scenarioGames(conf).map(g => [g.id, g.result, g.pick?.winner, !!g.forfeit, !!g.forfeited]));
  }
  function rankedRows(conf) {
    const signature = scenarioSignature(conf), saved = drawScenarios[conf];
    return window.FootballTiebreaks.rank(conf, recordsFor(conf), scenarioGames(conf), saved?.signature === signature ? saved.orders : {});
  }

  function remainingGames(conf) {
    return conferenceGames(conf).filter(g => !scoredFinal(g) && !['cancelled', 'canceled', 'postponed'].includes(String(g.status).toLowerCase()));
  }

  function renderGame(g, conf) {
    const p = picksFor(conf)[g.id] || {};
    const date = new Date(`${g.date}T12:00:00Z`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    const score = side => `<input class="pp-score" type="number" min="0" step="1" inputmode="numeric" aria-label="${esc(nameOf(side))} score" data-score="${esc(g.id)}:${side}" value="${esc(p[side === g.away ? 'awayScore' : 'homeScore'] ?? '')}">`;
    const invalid = [p.awayScore, p.homeScore].some(v => v != null && v !== '' && !validScore(v));
    const tied = validScore(p.awayScore) && validScore(p.homeScore) && Number(p.awayScore) === Number(p.homeScore);
    const error = invalid ? 'Use non-negative whole-number final scores.' : tied ? 'Final scores must differ; include overtime.' : '';
    return `<article class="pp-game" data-game="${esc(g.id)}"><div class="pp-game-meta"><span>${esc(date)}</span><span>${esc(g.time || 'Time TBA')}</span></div><div class="pp-matchup"><button type="button" class="pp-team-pick ${p.winner === g.away ? 'is-picked' : ''}" aria-pressed="${p.winner === g.away}" data-pick="${esc(g.id)}:${esc(g.away)}">${logoOf(g.away)}<span>${esc(nameOf(g.away))}</span></button><span class="pp-vs">at</span><button type="button" class="pp-team-pick ${p.winner === g.home ? 'is-picked' : ''}" aria-pressed="${p.winner === g.home}" data-pick="${esc(g.id)}:${esc(g.home)}">${logoOf(g.home)}<span>${esc(nameOf(g.home))}</span></button></div><div class="pp-scoreline"><label><span>${esc(nameOf(g.away))}</span>${score(g.away)}</label><span>Final score</span><label><span>${esc(nameOf(g.home))}</span>${score(g.home)}</label></div><p class="pp-error" role="status">${error}</p></article>`;
  }

  function standingsMarkup(conf) {
    const cfg = conferenceFor(conf), result = rankedRows(conf), rows = result.rows;
    const standings = rows.map((r, i) => {
      const tieGroup = (result.unresolvedGroups || []).find(group => group.includes(r.slug));
      const rank = tieGroup ? `T-${rows.findIndex(row => row.slug === tieGroup[0]) + 1}` : String(i + 1);
      return { ...r, rank, tie: !!tieGroup, tieGroup };
    });
    const tieAcrossCut = standings.some((r, i) => i < cfg.spots && r.tieGroup && standings[i + 1]?.tieGroup === r.tieGroup && i + 1 >= cfg.spots);
    const body = standings.map((r, i) => {
      const position = r.rank;
      const crossesCut = tieAcrossCut && !!r.tieGroup && r.tieGroup === standings[cfg.spots - 1]?.tieGroup;
      const status = crossesCut ? 'TIE' : (i < cfg.spots ? 'IN' : 'OUT');
      const statusClass = status === 'IN' ? 'pp-in' : status === 'OUT' ? 'pp-out' : 'pp-tie';
      return `<tr><td data-label="Seed"><span class="pp-rank">${position}</span></td><td data-label="Team"><div class="pp-table-team">${logoOf(r.slug)}<b>${esc(nameOf(r.slug))}</b></div></td><td data-label="W-L">${r.w}-${r.l}</td><td data-label="PTS">${r.w * 2}</td><td data-label="GP">${r.gp}</td><td data-label="PF">${r.pf}</td><td data-label="PA">${r.pa}</td><td data-label="Field"><span class="pp-status ${statusClass}">${status}</span></td></tr>`;
    }).join('');
    const sources = {
      OUA: [OUA_RULES_URL, 'OUA Football Operations, Appendix C'],
      CW: ['https://www.canadawest.org/documents/playingregs/2026-27/Football_2026-27_-_-July_13_2026-_FINAL.pdf', 'Canada West Football Regulations, §3.4'],
      AUS: ['https://www.atlanticuniversitysport.com/about/member_info/playing_regs/SECTION2-PlayingRegulations-2026_FB.pdf', 'AUS 2026 Football Regulations, Tie-Breaking'],
      RSEQ: [RSEQ_RULES_URL, 'RSEQ 2026–27 University Sector Rules, §15.2']
    };
    const explanations = result.decisions.map(d => `<div class="pp-rule-note"><b>${d.teams.map(nameOf).map(esc).join(' / ')}</b><br>${esc(d.label)}${d.values ? ': ' + d.teams.map(slug => `${esc(nameOf(slug))} ${esc(d.values[slug])}`).join(' · ') : ''}${d.simulated ? '<br>Scenario choice; not an official conference decision.' : ''}</div>`).join('');
    const needs = result.issues.map(issue => {
      if (issue.type === 'scores') return `<div class="pp-rule-note pp-required"><b>Enter scores to decide ${issue.teams.map(nameOf).map(esc).join(' / ')}</b><br>${esc(issue.label)} requires these games:<ul>${issue.games.map(id => { const g = conferenceGames(conf).find(g => g.id === id); return `<li><button type="button" data-needed-game="${esc(id)}">${esc(g ? nameOf(g.away) + ' at ' + nameOf(g.home) + ' · ' + g.date : id)}</button></li>`; }).join('')}</ul></div>`;
      if (issue.type === 'draw') return `<div class="pp-rule-note pp-required"><b>${esc(issue.label)}</b><p>Every statistical criterion is equal. Choose the outcome for this scenario:</p><div data-draw-group="${esc(window.FootballTiebreaks.keyFor(issue.teams.map(slug => ({ slug }))))}">${issue.teams.map((slug, i) => `<label class="pp-draw-label">Place ${i + 1}<select aria-label="Scenario draw place ${i + 1}"><option value="">Choose team</option>${issue.teams.map(team => `<option value="${esc(team)}">${esc(nameOf(team))}</option>`).join('')}</select></label>`).join('')}<button type="button" data-save-draw>Apply scenario order</button><p class="pp-error" role="status"></p></div></div>`;
      return `<div class="pp-rule-note pp-required"><b>Comparison order needed</b><p>${esc(issue.reason)} Resolve the score or draw requests for the other tied group first; this comparison then recalculates automatically.</p></div>`;
    }).join('');
    const state = result.unresolvedTies ? 'Action needed to finish seeding' : 'All ties resolved for these results';
    const note = `<p class="pp-rule-note"><b>${state}</b><br>Conference tie-breakers recalculate after every pick or score change. ${conf === 'OUA' ? 'OUA point differences are capped at ±25 per game. ' : ''}${result.coefficient ? 'RSEQ uses coefficient standings while games played differ. ' : ''}<a href="${sources[conf][0]}" target="_blank" rel="noopener">${sources[conf][1]} ↗</a></p>${needs}${explanations ? `<details class="pp-decisions"><summary>How ties were decided</summary>${explanations}</details>` : ''}`;
    return `<section class="pp-panel pp-standing-panel"><div class="pp-panel-head"><div><div class="pp-eyebrow">LIVE SCENARIO</div><h2>${esc(cfg.name)} standings</h2></div><span class="pp-count">Top ${cfg.spots} qualify</span></div><div class="pp-table-wrap"><table class="pp-table"><thead><tr><th>Seed</th><th>Team</th><th>W-L</th><th>PTS</th><th>GP</th><th>PF</th><th>PA</th><th>Field</th></tr></thead><tbody>${body || `<tr><td colspan="8">Standings are not available.</td></tr>`}</tbody></table></div>${note}</section>`;
  }

  function styles() {
    if (document.getElementById('pp-styles')) return;
    const style = document.createElement('style'); style.id = 'pp-styles';
    style.textContent = `
      .pp-required{border-color:#aa8545}.pp-required button{color:#f2c94c;background:#101b27;border:1px solid #344455;border-radius:8px;padding:9px;text-align:left;cursor:pointer}.pp-required li{margin:6px 0}.pp-draw-label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0}.pp-draw-label select{min-width:0;max-width:75%;padding:8px;background:#101b27;color:white;border:1px solid #344455;border-radius:8px}.pp-decisions{margin-top:12px}.pp-decisions summary{cursor:pointer;color:#f2c94c;font-size:12px;font-weight:800}
      .pp-new{display:inline-flex;align-items:center;margin-left:5px;padding:3px 6px;border-radius:999px;background:#df3445;color:#fff;font-size:9px;font-weight:1000;letter-spacing:.08em;line-height:1}
      .pp-wrap{max-width:1280px;margin:0 auto;padding:22px 18px 60px;color:var(--text,#f4f7fa)}.pp-hero{padding:28px;border:1px solid var(--line,#263241);border-radius:22px;background:radial-gradient(circle at 85% 10%,rgba(242,201,76,.11),transparent 34%),linear-gradient(135deg,#111a25,#080d13);margin-bottom:16px}.pp-eyebrow{font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase;color:var(--gold,#f2c94c)}.pp-hero h1{font-size:clamp(28px,4vw,44px);margin:8px 0}.pp-hero p{max-width:850px;color:#aebdcb;line-height:1.55;margin:0}.pp-confs{display:flex;gap:8px;overflow:auto;margin:16px 0}.pp-confs button{white-space:nowrap;border:1px solid var(--line,#263241);background:#0b1118;color:#d6e0eb;border-radius:999px;padding:9px 14px;font-weight:900;cursor:pointer}.pp-confs button.active{background:#f2c94c;color:#10151b;border-color:#f2c94c}.pp-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:16px;align-items:start}.pp-panel{border:1px solid var(--line,#263241);background:#0a1017;border-radius:20px;padding:16px}.pp-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}.pp-panel-head h2{margin:4px 0 0;font-size:21px}.pp-count{font-size:10px;color:#aebdcb;border:1px solid #344455;border-radius:999px;padding:6px 9px;font-weight:850}.pp-game-list{display:grid;gap:10px}.pp-game{border:1px solid #223142;background:#0d151e;border-radius:15px;padding:12px}.pp-game-meta{display:flex;justify-content:space-between;color:#91a0b2;font-size:10px;margin-bottom:9px}.pp-matchup{display:grid;grid-template-columns:1fr 22px 1fr;gap:5px;align-items:center}.pp-team-pick{display:flex;align-items:center;gap:8px;min-width:0;border:1px solid #26384a;background:#101b27;color:#f4f7fa;border-radius:12px;padding:9px 8px;text-align:left;font-weight:900;cursor:pointer}.pp-team-pick span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pp-team-pick.is-picked{border-color:#f2c94c;background:rgba(242,201,76,.12);box-shadow:inset 0 0 0 1px #f2c94c}.pp-logo{width:30px;height:30px;object-fit:contain;background:#fff;border-radius:8px;padding:3px;flex:0 0 auto}.pp-vs{text-align:center;color:#78889a;font-size:10px}.pp-scoreline{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-top:9px;color:#8d9bad;font-size:9px}.pp-scoreline label{display:flex;align-items:center;gap:7px;min-width:0}.pp-scoreline label:last-child{justify-content:flex-end}.pp-scoreline label:first-child{flex-direction:row-reverse;justify-content:flex-end}.pp-score{width:50px;border:1px solid #334355;border-radius:8px;background:#070c11;color:#fff;padding:6px;text-align:center;font:inherit;font-size:12px}.pp-empty{border:1px dashed #344455;border-radius:14px;padding:24px;color:#9aa9b9;text-align:center}.pp-tools{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 10px}.pp-tools button{border:1px solid #35465a;background:#111b26;color:#dbe4ec;border-radius:9px;padding:7px 10px;font-size:10px;font-weight:850;cursor:pointer}.pp-table-wrap{overflow:auto}.pp-table{width:100%;border-collapse:collapse;min-width:430px}.pp-table th,.pp-table td{padding:10px 7px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;text-align:left}.pp-table th{color:#92a1b1;text-transform:uppercase;font-size:9px;letter-spacing:.08em}.pp-table td:nth-child(n+3),.pp-table th:nth-child(n+3){text-align:center}.pp-table-team{display:flex;align-items:center;gap:7px;white-space:nowrap}.pp-table-team .pp-logo{width:24px;height:24px}.pp-rank{font-weight:950;color:#f2c94c}.pp-status{display:inline-flex;min-width:30px;justify-content:center;border-radius:999px;padding:4px 6px;font-size:8px;font-weight:1000}.pp-in{color:#71e0ab;background:rgba(50,213,131,.12)}.pp-out{color:#ff98a0;background:rgba(255,91,101,.12)}.pp-tie{color:#f2c94c;background:rgba(242,201,76,.12)}.pp-rule-note{border:1px solid #28394b;background:#101924;color:#9eafbf;border-radius:12px;padding:11px;margin:12px 0 0;font-size:10px;line-height:1.5}.pp-rule-note a{color:#f2c94c;font-weight:900}.pp-disclaimer{font-size:10px;line-height:1.5;color:#8f9eae;margin:10px 2px 0}.pp-panel .pp-error{color:#ff9aa3;font-size:10px;margin:8px 2px 0}
      @media(max-width:760px){
        .topbar{height:auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:6px!important;padding:8px 0 7px!important}
        .topbar .brand{align-self:flex-start!important;flex:0 0 auto!important}
        .topbar .nav{display:flex!important;width:100%!important;min-width:0!important;max-width:100%!important;flex:0 0 auto!important;flex-wrap:nowrap!important;justify-content:flex-start!important;gap:7px!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch!important;touch-action:pan-x!important;scrollbar-width:thin!important;padding:2px 12px 7px!important;margin:0!important}
        .topbar .nav button,.topbar .nav button:nth-child(n){display:inline-flex!important;flex:0 0 auto!important;width:auto!important;min-width:max-content!important;white-space:nowrap!important;padding:9px 12px!important;font-size:12px!important;line-height:1!important;touch-action:manipulation!important}
      }
            .pp-wrap,.pp-layout,.pp-panel,.pp-game-list,.pp-game,.pp-standings{min-width:0;max-width:100%}
      .pp-logo{max-width:100%;object-fit:contain}
      @media(max-width:900px){.pp-layout{grid-template-columns:minmax(0,1fr)}.pp-standing-panel{order:-1}}
      @media(max-width:520px){
        .pp-wrap{width:100%;max-width:100%;padding:14px 10px 40px;overflow-x:clip}
        .pp-hero{padding:20px}.pp-hero h1{font-size:clamp(27px,8vw,36px)}
        .pp-panel{width:100%;padding:12px}.pp-panel-head{align-items:flex-start;flex-wrap:wrap}
        .pp-team-pick{font-size:11px;padding:7px 5px}.pp-logo{width:24px;height:24px}
        .pp-matchup{grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr)}
        .pp-scoreline{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:4px;font-size:8px}
        .pp-scoreline label{min-width:0;overflow:hidden;gap:4px}
        .pp-scoreline label>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pp-scoreline label:first-child{flex-direction:row-reverse}
        .pp-score{width:40px;min-width:40px;padding:6px 2px}
        .pp-matchup{grid-template-columns:minmax(0,1fr)}
        .pp-team-pick{min-height:44px;font-size:12px}.pp-team-pick span{white-space:normal;overflow-wrap:anywhere}.pp-vs{padding:2px}
        .pp-table-wrap{overflow:visible}.pp-table{min-width:0;display:block}.pp-table thead{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%)}
        .pp-table tbody{display:grid;gap:10px}.pp-table tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #26384a;border-radius:12px;padding:8px}
        .pp-table td{display:flex;flex-direction:column;gap:5px;text-align:left!important;padding:8px 5px;border:0;min-width:0}
        .pp-table td::before{content:attr(data-label);color:#92a1b1;font-size:9px;font-weight:800}
        .pp-table td:nth-child(2){grid-column:span 2}.pp-table-team{white-space:normal;overflow-wrap:anywhere}.pp-table td[colspan]{grid-column:1/-1}
        .pp-score{min-height:44px}
        .pp-scoreline{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;font-size:10px}
        .pp-scoreline>span{grid-column:1/-1;grid-row:1;text-align:center}
        .pp-scoreline label,.pp-scoreline label:first-child{flex-direction:column;align-items:flex-start;overflow:visible;gap:5px}
        .pp-scoreline label:last-child{align-items:flex-end}
        .pp-scoreline label>span{white-space:normal;overflow:visible;overflow-wrap:anywhere}
      }
    `;
    document.head.appendChild(style);
  }

  function page(conf = 'OUA') {
    conf = conferenceFor(conf).id;
    styles();
    const cfg = conferenceFor(conf), games = remainingGames(conf), picks = picksFor(conf);
    const pickedCount = scenarioGames(conf).filter(g => g.scenario).length;
    const gameCards = games.map(g => renderGame(g, conf)).join('') || `<div class="pp-empty">No remaining regular-season games are listed for ${esc(cfg.name)}.</div>`;
    const app = document.getElementById('app');
    app.innerHTML = shell(`<main class="pp-wrap"><section class="pp-hero"><div class="pp-eyebrow">2026 PLAYOFF PROJECTIONS</div><h1>Build your playoff picture.</h1><p>Pick the winner of each remaining game and enter final scores to resolve any points-based tie-breakers. Actual results stay locked; scenario picks are saved on this device only.</p></section><nav class="pp-confs" aria-label="Select conference">${CONFERENCES.map(c => `<button type="button" class="${c.id === conf ? 'active' : ''}" aria-pressed="${c.id === conf}" data-conference="${c.id}">${esc(c.name)}</button>`).join('')}</nav><div class="pp-layout"><section class="pp-panel"><div class="pp-panel-head"><div><div class="pp-eyebrow">REMAINING SCHEDULE</div><h2>${esc(cfg.name)} games</h2></div><span class="pp-count">${games.length} games left</span></div><div class="pp-tools"><span class="pp-count">${pickedCount} picks</span><button type="button" data-reset>Reset picks</button></div><div class="pp-game-list">${gameCards}</div><p class="pp-disclaimer">Pick winners to update records. Enter unequal, non-negative whole-number final scores to apply points-based tie-breakers. Any required scores are listed beside the standings. Your scenario never changes official results.</p></section><div class="pp-standings">${standingsMarkup(conf)}</div></div></main>`, 'projections');
    if (location.hash !== `#projections=${conf}`) history.replaceState(null, '', `#projections=${conf}`);
    if (!bound) {
      app.addEventListener('click', onClick);
      app.addEventListener('input', onInput);
      bound = true;
    }
  }

  function refreshStandings(conf) {
    const slot = document.querySelector('.pp-standings');
    if (slot) slot.innerHTML = standingsMarkup(conf);
  }

  function onClick(event) {
    const needed = event.target.closest('[data-needed-game]');
    if (needed) {
      const card = [...document.querySelectorAll('.pp-game')].find(n => n.dataset.game === needed.dataset.neededGame);
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inputs = [...card.querySelectorAll('[data-score]')]; (inputs.find(n => !validScore(n.value)) || inputs[0])?.focus({ preventScroll: true }); }
      return;
    }
    if (event.target.closest('[data-save-draw]')) {
      const host = event.target.closest('[data-draw-group]'), order = [...host.querySelectorAll('select')].map(n => n.value);
      if (order.some(v => !v) || new Set(order).size !== order.length) { host.querySelector('.pp-error').textContent = 'Choose every team exactly once.'; return; }
      const conf = location.hash.split('=')[1] || 'OUA', signature = scenarioSignature(conf);
      if (drawScenarios[conf]?.signature !== signature) drawScenarios[conf] = { signature, orders: {} };
      drawScenarios[conf].orders[host.dataset.drawGroup] = order;
      saveDrawScenarios();
      refreshStandings(conf); return;
    }
    const confButton = event.target.closest('[data-conference]');
    if (confButton) { page(confButton.dataset.conference); return; }
    if (event.target.closest('[data-reset]')) {
      const conf = new URLSearchParams(location.hash.split('?')[1] || '').get('conf') || location.hash.split('=')[1] || 'OUA';
      picksByConference[conf] = {}; delete drawScenarios[conf]; saveDrawScenarios(); savePicks(); page(conf); return;
    }
    const pickButton = event.target.closest('[data-pick]');
    if (!pickButton) return;
    const [gameId, winner] = pickButton.dataset.pick.split(':');
    const conf = location.hash.split('=')[1] || 'OUA';
    const card = pickButton.closest('[data-game]');
    const scoreInputs = [...card.querySelectorAll('[data-score]')];
    const game = conferenceGames(conf).find(g => g.id === gameId);
    let awayScore = '', homeScore = '';
    if (scoreInputs.length === 2) {
      const values = Object.fromEntries(scoreInputs.map(input => [input.dataset.score.split(':')[1], input.value]));
      awayScore = values[game.away] ?? ''; homeScore = values[game.home] ?? '';
      if (validScore(awayScore) && validScore(homeScore) && ((winner === game.away && Number(awayScore) <= Number(homeScore)) || (winner === game.home && Number(homeScore) <= Number(awayScore)))) awayScore = homeScore = '';
    }
    picksFor(conf)[gameId] = { winner, awayScore, homeScore };
    savePicks(); page(conf);
  }

  function onInput(event) {
    const input = event.target.closest('[data-score]');
    if (!input) return;
    const [gameId, side] = input.dataset.score.split(':');
    const conf = location.hash.split('=')[1] || 'OUA';
    const game = conferenceGames(conf).find(g => g.id === gameId);
    if (!game) return;
    const card = input.closest('[data-game]');
    const values = [...card.querySelectorAll('[data-score]')].map(el => ({ slug: el.dataset.score.split(':')[1], value: el.value }));
    const away = values.find(x => x.slug === game.away)?.value ?? '', home = values.find(x => x.slug === game.home)?.value ?? '';
    const pick = picksFor(conf)[gameId] || {};
    pick.awayScore = away; pick.homeScore = home;
    if (validScore(away) && validScore(home) && Number(away) !== Number(home)) pick.winner = Number(away) > Number(home) ? game.away : game.home;
    const invalid = [away, home].some(v => v !== '' && !validScore(v));
    const tied = validScore(away) && validScore(home) && Number(away) === Number(home);
    if (invalid || tied) delete pick.winner;
    let error = card.querySelector('.pp-error');
    if (!error) { error = document.createElement('p'); error.className = 'pp-error'; error.setAttribute('role', 'status'); card.append(error); }
    error.textContent = invalid ? 'Use non-negative whole-number final scores.' : tied ? 'Final scores must differ; include overtime.' : '';
    picksFor(conf)[gameId] = pick; savePicks();
    card.querySelectorAll('[data-pick]').forEach(button => {
      const slug = button.dataset.pick.split(':')[1], selected = pick.winner === slug;
      button.classList.toggle('is-picked', selected); button.setAttribute('aria-pressed', String(selected));
    });
    const counter = document.querySelector('.pp-tools .pp-count');
    if (counter) counter.textContent = scenarioGames(conf).filter(g => g.scenario).length + ' picks';
    refreshStandings(conf);
  }

  window.playoffProjectionsPage = page;
  window.PlayoffProjectionCore = Object.freeze({ conferenceGames, recordsFor, rankedRows, remainingGames });
  const oldShell = window.shell;
  window.shell = function (content, active = 'schedule') {
    let html = oldShell(content, active);
    const button = `<button class="${active === 'projections' ? 'active' : ''}" onclick="playoffProjectionsPage()">Playoff Projections <span class="pp-new">NEW</span></button>`;
    if (html.includes('</div><details class="clean-more"')) return html.replace('</div><details class="clean-more"', button + '</div><details class="clean-more"');
    if (html.includes('<details class="clean-more"')) return html.replace('<details class="clean-more"', button + '<details class="clean-more"');
    return html.replace('</nav>', button + '</nav>');
  };
  const oldRoute = window.route;
  window.route = function () {
    const hash = location.hash.slice(1);
    if (hash.startsWith('projections')) return page(hash.split('=')[1] || 'OUA');
    return oldRoute();
  };
  window.addEventListener('hashchange', () => {
    if (location.hash.slice(1).startsWith('projections')) page(location.hash.slice(1).split('=')[1] || 'OUA');
  });
  function renderInitialProjection() {
    if (location.hash.slice(1).startsWith('projections')) page(location.hash.slice(1).split('=')[1] || 'OUA');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderInitialProjection, { once: true });
  else renderInitialProjection();
  window.addEventListener('load', () => setTimeout(renderInitialProjection, 0), { once: true });
  setTimeout(renderInitialProjection, 150);
})();
